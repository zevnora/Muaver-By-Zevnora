import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage, auth } from './firebase';

export interface ImageUploadResult {
  fullUrl: string;
  thumbUrl: string;
}

/**
 * Validates whether a direct URL points to a valid, reachable image that can be rendered in the browser.
 */
export function validateImageUrl(url: string, timeoutMs = 8000): Promise<{ valid: boolean; error?: string }> {
  return new Promise((resolve) => {
    const trimmed = (url || '').trim();
    if (!trimmed) {
      resolve({ valid: false, error: 'Please enter an image URL.' });
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      resolve({ valid: false, error: 'Image URL must start with https:// or http://' });
      return;
    }

    const timer = setTimeout(() => {
      resolve({ valid: false, error: 'Image loading timed out. Please check if the URL is accessible.' });
    }, timeoutMs);

    const img = new Image();
    img.onload = () => {
      clearTimeout(timer);
      resolve({ valid: true });
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve({ valid: false, error: 'Unable to load image from this URL. Make sure it is a direct image link (e.g. from ibb.co or an image host).' });
    };
    img.src = trimmed;
  });
}

/**
 * Delete an image asset from Firebase Storage
 */
export async function deleteStorageImage(imageUrl?: string | null): Promise<void> {
  if (!imageUrl || typeof imageUrl !== 'string') return;

  const isFirebaseStorage = 
    imageUrl.includes('firebasestorage.googleapis.com') ||
    imageUrl.includes('.appspot.com') ||
    imageUrl.includes('.firebasestorage.app');

  if (!isFirebaseStorage) {
    return;
  }

  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);

    try {
      if (!imageUrl.includes('/thumbs/')) {
        const thumbUrl = imageUrl.replace(/%2F([^%]+)\.([^?]+)/, '%2Fthumbs%2F$1_thumb.$2');
        if (thumbUrl !== imageUrl) {
          const thumbRef = ref(storage, thumbUrl);
          await deleteObject(thumbRef);
        }
      }
    } catch {
      // Thumbnail deletion is best-effort
    }
  } catch (err: any) {
    if (err?.code !== 'storage/object-not-found') {
      console.warn('Firebase Storage asset cleanup notice:', err?.message || err);
    }
  }
}

/**
 * Delete a list of image assets from Firebase Storage
 */
export async function deleteStorageImages(imageUrls: string[]): Promise<void> {
  if (!imageUrls || imageUrls.length === 0) return;
  await Promise.allSettled(imageUrls.map((url) => deleteStorageImage(url)));
}

/**
 * Resizes and compresses an image in the browser via HTML5 Canvas into WebP (or JPEG fallback)
 * - Constrains width to maxWidth (default 1600px)
 * - Constrains height proportionally (also max 1600px to avoid portrait overflow)
 * - WebP format for 80-95% compression ratio, quality 0.8
 * - Returns canvas reference for instant thumbnail generation without re-decoding
 */
export async function compressImageToWebP(
  file: File,
  maxWidth = 1600,
  quality = 0.8
): Promise<{ blob: Blob; mimeType: string; canvas: HTMLCanvasElement }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down proportionally so neither width nor height exceeds maxWidth (1600px)
      if (width > maxWidth || height > maxWidth) {
        if (width >= height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context is unavailable for image compression'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Attempt WebP first
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob) {
            resolve({ blob: webpBlob, mimeType: 'image/webp', canvas });
          } else {
            // Fallback to JPEG if browser cannot encode WebP
            canvas.toBlob(
              (jpegBlob) => {
                if (jpegBlob) {
                  resolve({ blob: jpegBlob, mimeType: 'image/jpeg', canvas });
                } else {
                  reject(new Error('Image compression blob generation failed'));
                }
              },
              'image/jpeg',
              quality
            );
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image file for compression. Please verify the file is a valid image.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Creates a fast thumbnail directly from the already-scaled canvas
 */
export async function createThumbnailFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  thumbWidth = 400,
  quality = 0.75
): Promise<{ blob: Blob; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;

    let width = srcW;
    let height = srcH;
    if (width > thumbWidth || height > thumbWidth) {
      if (width >= height) {
        height = Math.round((height * thumbWidth) / width);
        width = thumbWidth;
      } else {
        width = Math.round((width * thumbWidth) / height);
        height = thumbWidth;
      }
    }

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = Math.max(1, width);
    thumbCanvas.height = Math.max(1, height);

    const ctx = thumbCanvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Thumbnail canvas context unavailable'));
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(sourceCanvas, 0, 0, width, height);

    thumbCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve({ blob, mimeType: 'image/webp' });
        } else {
          thumbCanvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) {
                resolve({ blob: jpegBlob, mimeType: 'image/jpeg' });
              } else {
                reject(new Error('Thumbnail blob generation failed'));
              }
            },
            'image/jpeg',
            quality
          );
        }
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Uploads an image with browser compression:
 * - Pre-compression in browser: max 1600px width/height, WebP, quality 0.8
 * - Instant downscale thumbnail: max 400px, WebP
 * - Fast authentication check to prevent 10-minute retry hangs
 * - Resumable upload (uploadBytesResumable) with real progress tracking (20% -> 90%)
 * - 25-second upload timeout with automatic task cancellation
 * - Clear error messages for permissions, timeouts, and network issues
 */
export async function uploadOptimizedImage(
  file: File,
  folder: 'banners' | 'products' | 'branding' = 'products',
  onProgress?: (percent: number) => void
): Promise<ImageUploadResult> {
  // Pre-compression validation
  if (!file.type.startsWith('image/')) {
    throw new Error('Selected file is not an image.');
  }

  // Phase 1: Local browser compression (0% - 15%)
  if (onProgress) onProgress(5);

  const displayResult = await compressImageToWebP(file, 1600, 0.8);
  if (onProgress) onProgress(15);

  // Phase 2: Instant thumbnail from canvas (15% - 20%)
  const thumbResult = await createThumbnailFromCanvas(displayResult.canvas, 400, 0.75);
  if (onProgress) onProgress(20);

  // Fast authorization check: fail immediately if not signed in to prevent SDK hang
  if (!auth.currentUser) {
    throw new Error('Upload unauthorized: You must be logged into an authorized admin account in order to upload to storage. If testing, please paste an image URL instead.');
  }

  const timestamp = Date.now();
  const cleanName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.[^/.]+$/, '');
  const ext = displayResult.mimeType === 'image/webp' ? 'webp' : 'jpg';

  const fileName = `${timestamp}_${cleanName}.${ext}`;
  const thumbFileName = `${timestamp}_${cleanName}_thumb.${ext}`;

  const mainRef = ref(storage, `${folder}/${fileName}`);
  const thumbRef = ref(storage, `${folder}/thumbs/${thumbFileName}`);

  // Phase 3: Firebase Storage resumable upload with real progress tracking and timeout
  const mainUploadTask = uploadBytesResumable(mainRef, displayResult.blob, {
    contentType: displayResult.mimeType,
    customMetadata: { 
      originalName: file.name,
      targetWidth: '1600',
      format: 'webp',
    },
  });

  try {
    await new Promise<void>((resolve, reject) => {
      let isSettled = false;

      // 25-second upload timeout guard to prevent any indefinite hangs
      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          try {
            mainUploadTask.cancel();
          } catch (e) {
            // Task cancellation is best effort
          }
          reject(new Error('Image upload timed out after 25 seconds. Please check your internet connection or use "Paste Image URL" instead.'));
        }
      }, 25000);

      mainUploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            // Real progress calculated directly from transferred bytes (20% to 90%)
            const transferredPercent = Math.min(
              90,
              Math.round(20 + (snapshot.bytesTransferred / snapshot.totalBytes) * 70)
            );
            onProgress(transferredPercent);
          }
        },
        (uploadError: any) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);

            let msg = uploadError?.message || 'Storage upload failed.';
            if (uploadError?.code === 'storage/unauthorized') {
              msg = 'Storage permission denied: Admin write access is required by security rules. Ensure you are signed into an authorized admin account.';
            } else if (uploadError?.code === 'storage/canceled') {
              msg = 'Upload was canceled or timed out.';
            } else if (uploadError?.code === 'storage/retry-limit-exceeded') {
              msg = 'Upload connection timed out while uploading. Please check your network or try pasting an image URL.';
            } else if (uploadError?.code === 'storage/quota-exceeded') {
              msg = 'Firebase Storage quota exceeded.';
            }
            reject(new Error(msg));
          }
        },
        () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            resolve();
          }
        }
      );
    });

    const fullUrl = await getDownloadURL(mainRef);

    // Phase 4: Fast thumbnail upload (90% - 100%)
    if (onProgress) onProgress(92);
    let thumbUrl = fullUrl;

    try {
      const thumbUploadTask = uploadBytesResumable(thumbRef, thumbResult.blob, {
        contentType: thumbResult.mimeType,
        customMetadata: { 
          originalName: file.name,
          targetWidth: '400',
          isThumb: 'true',
          format: 'webp',
        },
      });

      await new Promise<void>((resThumb, rejThumb) => {
        const thumbTimeout = setTimeout(() => {
          try { thumbUploadTask.cancel(); } catch {}
          resThumb(); // Don't fail the whole upload if only thumbnail fails
        }, 10000);

        thumbUploadTask.on(
          'state_changed',
          undefined,
          () => {
            clearTimeout(thumbTimeout);
            resThumb(); // Fall back to fullUrl gracefully
          },
          () => {
            clearTimeout(thumbTimeout);
            resThumb();
          }
        );
      });

      thumbUrl = await getDownloadURL(thumbRef).catch(() => fullUrl);
    } catch {
      thumbUrl = fullUrl;
    }

    if (onProgress) onProgress(100);
    return { fullUrl, thumbUrl };
  } catch (err: any) {
    console.error('Firebase Storage upload error:', err);
    throw err;
  }
}
