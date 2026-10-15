import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Image as ImageIcon, 
  Loader2, 
  Check, 
  ExternalLink, 
  AlertCircle,
  Link as LinkIcon
} from 'lucide-react';
import { validateImageUrl } from '../services/imageService';

interface AdminImageUploadProps {
  label: string;
  description?: string;
  currentUrl: string;
  defaultUrl: string;
  onChange: (newUrl: string) => void;
  folder?: 'branding' | 'banners' | 'products';
  aspectRatio?: 'landscape' | 'square' | 'portrait' | 'auto';
  maxPreviewHeight?: string;
}

export const AdminImageUpload: React.FC<AdminImageUploadProps> = ({
  label,
  description,
  currentUrl,
  defaultUrl,
  onChange,
  aspectRatio = 'auto',
  maxPreviewHeight = 'h-28',
}) => {
  // Direct URL input state
  const [inputUrl, setInputUrl] = useState(currentUrl || '');
  const [isValidating, setIsValidating] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<{ valid: boolean; message: string } | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isDefault = (currentUrl || '').trim() === (defaultUrl || '').trim();

  // Sync inputUrl when currentUrl prop updates externally
  useEffect(() => {
    setInputUrl(currentUrl || '');
    setPreviewSrc(null);
    setValidationStatus(null);
  }, [currentUrl]);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleResetToDefault = () => {
    onChange(defaultUrl);
    setInputUrl(defaultUrl);
    setPreviewSrc(null);
    setValidationStatus(null);
    showStatus('Reverted to default image asset', 'success');
  };

  // Test and validate pasted URL before applying
  const handleVerifyUrl = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      setValidationStatus({ valid: false, message: 'Please enter an image URL.' });
      setPreviewSrc(null);
      return;
    }

    try {
      setIsValidating(true);
      setValidationStatus(null);

      const res = await validateImageUrl(trimmed, 7000);
      if (res.valid) {
        setValidationStatus({ valid: true, message: 'Verified successfully! Ready to apply.' });
        setPreviewSrc(trimmed);
      } else {
        setValidationStatus({
          valid: false,
          message: res.error || 'Failed to load image. Ensure it is a direct public link (e.g. from ibb.co or CDN).',
        });
        setPreviewSrc(null);
      }
    } catch {
      setValidationStatus({ valid: false, message: 'Error checking URL.' });
      setPreviewSrc(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Commit verified URL to parent state
  const handleApplyUrl = () => {
    const urlToApply = (previewSrc || inputUrl).trim();
    if (!urlToApply) {
      showStatus('Please enter and verify a valid URL.', 'error');
      return;
    }
    onChange(urlToApply);
    showStatus('Image URL applied! Remember to click "Save Changes" below.', 'success');
    setValidationStatus({ valid: true, message: 'Applied to settings.' });
  };

  const displayedPreview = previewSrc || currentUrl;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--navy-900)] border border-[var(--gold-500)]/25 space-y-3.5 font-montserrat shadow-lg">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pb-2.5 border-b border-white/10">
        <div className="flex-1 min-w-0 pr-2">
          <label className="text-xs uppercase font-heading tracking-wider text-[var(--gold-300)] font-bold block">
            {label}
          </label>
          {description && (
            <p className="text-[11px] text-slate-300 font-light mt-0.5 leading-relaxed">{description}</p>
          )}
        </div>

        {/* Reset to Default Button */}
        <button
          type="button"
          onClick={handleResetToDefault}
          disabled={isDefault}
          className={`self-start sm:self-auto px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
            isDefault
              ? 'opacity-40 cursor-not-allowed bg-white/5 text-white/50 border border-white/10'
              : 'bg-amber-950/60 text-[var(--gold-300)] border border-amber-500/50 hover:bg-amber-900/60 cursor-pointer shadow-sm'
          }`}
          title="Reset image to official MUAVER default"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[var(--gold-300)] shrink-0" />
          <span>Reset to default</span>
        </button>
      </div>

      {/* Preview Frame */}
      <div className="w-full flex justify-center py-1">
        <div
          className={`relative rounded-xl overflow-hidden bg-[#03091D] border border-white/20 flex items-center justify-center p-3 group w-full ${
            aspectRatio === 'square'
              ? 'h-36 sm:h-40 max-w-sm'
              : aspectRatio === 'landscape'
              ? 'h-28 sm:h-32'
              : aspectRatio === 'portrait'
              ? 'h-44 sm:h-48 max-w-xs'
              : 'h-32'
          }`}
        >
          {displayedPreview ? (
            <>
              <img
                src={displayedPreview}
                alt={label}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = defaultUrl;
                }}
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <a
                  href={displayedPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Open image in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Original</span>
                </a>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-white/40 text-xs">
              <ImageIcon className="w-6 h-6 mb-1 text-white/30" />
              <span>No image set</span>
            </div>
          )}
        </div>
      </div>

      {/* URL Input & Verification Actions */}
      <div className="w-full space-y-2.5">
        <div className="relative w-full">
          <LinkIcon className="w-3.5 h-3.5 text-white/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="url"
            value={inputUrl}
            onChange={(e) => {
              setInputUrl(e.target.value);
              setValidationStatus(null);
              setPreviewSrc(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleVerifyUrl();
              }
            }}
            placeholder="Paste direct image URL (e.g. https://i.ibb.co/...)"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#050F2E] border border-white/20 text-xs text-white placeholder-white/40 font-mono focus:border-[var(--gold-300)] focus:outline-none"
          />
        </div>

        {/* Buttons Row with dedicated grid guaranteeing no overlap and no text truncation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-1">
          <button
            type="button"
            onClick={handleVerifyUrl}
            disabled={isValidating || !inputUrl.trim()}
            className="w-full whitespace-nowrap py-2.5 px-3.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            title="Verify image link"
          >
            {isValidating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--gold-300)] shrink-0" />
            ) : (
              <Check className="w-3.5 h-3.5 text-[var(--gold-300)] shrink-0" />
            )}
            <span>{isValidating ? 'Testing...' : 'Verify URL'}</span>
          </button>

          <button
            type="button"
            onClick={handleApplyUrl}
            disabled={!inputUrl.trim()}
            className="w-full whitespace-nowrap py-2.5 px-4 rounded-lg btn-gold text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-sm"
            title="Apply URL to setting"
          >
            <span>Apply URL</span>
          </button>
        </div>

        {/* Validation Feedback */}
        {validationStatus && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              validationStatus.valid
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
            }`}
          >
            {validationStatus.valid ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span>{validationStatus.message}</span>
          </div>
        )}

        {feedback && (
          <div
            className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="text-[10px] text-white/50 flex flex-wrap items-center gap-2 pt-1">
          <span>Supported image hosts:</span>
          <span className="text-[var(--gold-300)] font-mono">imgbb.com / ibb.co</span>
          <span>•</span>
          <span className="text-[var(--gold-300)] font-mono">unsplash.com</span>
          <span>•</span>
          <span className="text-[var(--gold-300)] font-mono">postimages.org</span>
        </div>
      </div>
    </div>
  );
};
