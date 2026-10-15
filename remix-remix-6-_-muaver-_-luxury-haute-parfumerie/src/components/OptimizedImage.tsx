import React, { useState, useEffect, useRef } from 'react';
import royalGoldFront from '../assets/images/royal_gold_front_1791271735003.jpg';

export const FALLBACK_PRODUCT_IMAGE =
  royalGoldFront || '/images/royal_gold_front_1791271735003.jpg';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: 'portrait' | 'square' | 'landscape' | 'banner' | 'auto';
  priority?: boolean;
  sizes?: string;
  width?: number | string;
  height?: number | string;
  objectFit?: 'cover' | 'contain';
}

/**
 * Generate optimized image URL with dynamic dimension and quality parameters
 * for supported image CDNs (Unsplash, Cloudinary, Imgix, Shopify)
 */
export function getOptimizedImageUrl(
  url: string,
  options: { width?: number; quality?: number } = {}
): string {
  if (!url || typeof url !== 'string') return '';
  let trimmed = url.trim();
  if (!trimmed) return '';

  // If path is a local /src/assets/images path, map to /images/ for production static serving compatibility
  if (trimmed.startsWith('/src/assets/images/')) {
    trimmed = trimmed.replace('/src/assets/images/', '/images/');
  }

  const { width, quality = 82 } = options;

  // 1. Unsplash CDN dynamic optimization
  if (trimmed.includes('images.unsplash.com')) {
    try {
      const parsed = new URL(trimmed);
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fm', 'webp');
      parsed.searchParams.set('q', quality.toString());
      if (width) {
        parsed.searchParams.set('w', width.toString());
      }
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  // 2. Cloudinary dynamic resizing
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/image/upload/')) {
    try {
      const wPart = width ? `c_limit,w_${width},` : '';
      return trimmed.replace(
        '/image/upload/',
        `/image/upload/${wPart}q_auto,f_auto/`
      );
    } catch {
      return trimmed;
    }
  }

  // 3. Imgix dynamic resizing
  if (trimmed.includes('imgix.net')) {
    try {
      const parsed = new URL(trimmed);
      parsed.searchParams.set('auto', 'format,compress');
      parsed.searchParams.set('q', quality.toString());
      if (width) parsed.searchParams.set('w', width.toString());
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  // 4. Shopify CDN dynamic resizing
  if (trimmed.includes('cdn.shopify.com')) {
    try {
      const parsed = new URL(trimmed);
      if (width) parsed.searchParams.set('width', width.toString());
      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

/**
 * Generate responsive srcset for CDNs supporting dynamic width sizing
 */
export function generateSrcSet(url: string): string | undefined {
  if (!url || typeof url !== 'string') return undefined;

  if (url.includes('images.unsplash.com') || url.includes('res.cloudinary.com') || url.includes('imgix.net')) {
    const w320 = getOptimizedImageUrl(url, { width: 320, quality: 78 });
    const w640 = getOptimizedImageUrl(url, { width: 640, quality: 80 });
    const w960 = getOptimizedImageUrl(url, { width: 960, quality: 82 });
    const w1200 = getOptimizedImageUrl(url, { width: 1200, quality: 84 });
    return `${w320} 320w, ${w640} 640w, ${w960} 960w, ${w1200} 1200w`;
  }

  return undefined;
}

/**
 * Clean SVG Fallback for permanently broken or missing images
 */
const FallbackPlaceholder: React.FC<{ alt: string }> = ({ alt }) => (
  <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-100 text-slate-400 select-none">
    <svg
      className="w-12 h-12 text-[#D4AF37]/60 mb-2"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="7" y="2" width="10" height="4" rx="1" />
      <path d="M10 6v3" />
      <path d="M14 6v3" />
      <rect x="5" y="9" width="14" height="13" rx="2" />
      <circle cx="12" cy="15" r="2.5" />
    </svg>
    <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider text-center line-clamp-1">
      {alt || 'MUAVER Fragrance'}
    </span>
  </div>
);

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackSrc = FALLBACK_PRODUCT_IMAGE,
  className = '',
  containerClassName = '',
  aspectRatio = 'portrait',
  priority = false,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 800px',
  width,
  height,
  objectFit = 'cover',
  ...props
}) => {
  const getInitialSrc = () => {
    if (src && typeof src === 'string' && src.trim().length > 0) {
      return src.trim();
    }
    return fallbackSrc;
  };

  const [currentSrc, setCurrentSrc] = useState<string>(getInitialSrc);
  const [isLoaded, setIsLoaded] = useState<boolean>(() => priority);
  const [isBroken, setIsBroken] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Sync state when src or fallbackSrc changes
  useEffect(() => {
    const nextSrc = (src && typeof src === 'string' && src.trim().length > 0)
      ? src.trim()
      : fallbackSrc;

    setCurrentSrc(nextSrc);
    setIsBroken(false);

    // If image is already cached and loaded in DOM, immediately mark loaded
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setIsLoaded(true);
      }
    } else if (!priority) {
      setIsLoaded(false);
    }
  }, [src, fallbackSrc, priority]);

  // Fast check on DOM mount for instant cached renders
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [currentSrc]);

  const handleError = () => {
    // If original image failed and we're not yet on fallbackSrc, try fallbackSrc
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setIsLoaded(false);
    } else {
      // Both original and fallback failed -> show clean SVG placeholder
      setIsBroken(true);
      setIsLoaded(true);
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
    setIsBroken(false);
  };

  const aspectClass =
    aspectRatio === 'portrait'
      ? 'aspect-[4/5]'
      : aspectRatio === 'square'
      ? 'aspect-square'
      : aspectRatio === 'landscape'
      ? 'aspect-[16/9]'
      : aspectRatio === 'banner'
      ? 'aspect-[21/9]'
      : '';

  // Optimize target width for CDN images when dimensions are specified
  const targetWidth = typeof width === 'number' ? width : undefined;
  const optimizedSrc = getOptimizedImageUrl(currentSrc, {
    width: targetWidth,
    quality: priority ? 85 : 80,
  });
  const srcSet = !isBroken ? generateSrcSet(currentSrc) : undefined;

  return (
    <div
      className={`relative w-full overflow-hidden bg-slate-50 ${aspectClass} ${containerClassName}`}
    >
      {/* Fallback component if image completely fails */}
      {isBroken ? (
        <FallbackPlaceholder alt={alt} />
      ) : (
        <>
          {/* Subtle light shimmer while downloading (no stuck dark blue overlay, no blur) */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-slate-100 animate-pulse pointer-events-none" />
          )}

          {/* Clean responsive image - no artificial blur, no leftover dark overlay */}
          <img
            ref={imgRef}
            src={optimizedSrc}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt || 'MUAVER Fragrance'}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            width={typeof width === 'number' ? width : undefined}
            height={typeof height === 'number' ? height : undefined}
            onLoad={handleLoad}
            onError={handleError}
            referrerPolicy="no-referrer"
            className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'} object-center block transition-opacity duration-200 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            } ${className}`}
            {...props}
          />
        </>
      )}
    </div>
  );
};
