import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  AlertCircle,
  Link as LinkIcon
} from 'lucide-react';
import { BannerSlide } from '../types/store';
import { saveBannerSlide, deleteBannerSlide, updateBannersOrder } from '../services/storeService';
import { validateImageUrl } from '../services/imageService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminBannersProps {
  banners: BannerSlide[];
  onRefresh: () => Promise<void>;
}

export const AdminBanners: React.FC<AdminBannersProps> = ({ banners, onRefresh }) => {
  const [localBanners, setLocalBanners] = useState<BannerSlide[]>(banners);
  const [editingBanner, setEditingBanner] = useState<BannerSlide | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // Direct Image URL validation state (Desktop)
  const [desktopPastedUrl, setDesktopPastedUrl] = useState('');
  const [desktopUrlValidating, setDesktopUrlValidating] = useState(false);
  const [desktopUrlStatus, setDesktopUrlStatus] = useState<{ valid: boolean; message: string } | null>(null);

  // Direct Image URL validation state (Mobile)
  const [mobilePastedUrl, setMobilePastedUrl] = useState('');
  const [mobileUrlValidating, setMobileUrlValidating] = useState(false);
  const [mobileUrlStatus, setMobileUrlStatus] = useState<{ valid: boolean; message: string } | null>(null);

  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // In-app Deletion Modal States
  const [bannerToDelete, setBannerToDelete] = useState<BannerSlide | null>(null);
  const [isDeletingBanner, setIsDeletingBanner] = useState(false);
  const [deleteBannerError, setDeleteBannerError] = useState<string | null>(null);

  // Keep localBanners in sync with prop updates
  React.useEffect(() => {
    setLocalBanners(banners);
  }, [banners]);

  // Form state
  const [formData, setFormData] = useState<BannerSlide>({
    id: '',
    desktopImage: '',
    mobileImage: '',
    badgeText: 'ROYAL ATELIER COLLECTION',
    heading: '',
    subheading: '',
    buttonText: 'Discover Collection',
    buttonLink: 'shop',
    isActive: true,
    order: banners.length + 1,
  });

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleStartCreate = () => {
    setEditingBanner(null);
    setIsCreatingNew(true);
    const defaultDesktop = '/src/assets/images/hero_perfume_banner_1791271723971.jpg';
    setFormData({
      id: `banner-${Date.now()}`,
      desktopImage: defaultDesktop,
      mobileImage: '',
      badgeText: 'EXCLUSIVE COLLECTION',
      heading: 'Crafted for Distinction',
      subheading: 'Rare botanical essences, rich oud, and long-lasting fragrances crafted for those who value distinction.',
      buttonText: 'Discover Collection',
      buttonLink: 'shop',
      isActive: true,
      order: banners.length + 1,
    });
    setDesktopPastedUrl(defaultDesktop);
    setMobilePastedUrl('');
    setDesktopUrlStatus(null);
    setMobileUrlStatus(null);
  };

  const handleStartEdit = (b: BannerSlide) => {
    setIsCreatingNew(false);
    setEditingBanner(b);
    setFormData({ ...b });
    setDesktopPastedUrl(b.desktopImage || '');
    setMobilePastedUrl(b.mobileImage || '');
    setDesktopUrlStatus(null);
    setMobileUrlStatus(null);
  };

  const handleCancelForm = () => {
    setEditingBanner(null);
    setIsCreatingNew(false);
    setDesktopUrlStatus(null);
    setMobileUrlStatus(null);
  };

  // Toggle active on/off
  const handleToggleActive = async (banner: BannerSlide) => {
    try {
      setLoading(true);
      await saveBannerSlide({ ...banner, isActive: !banner.isActive });
      await onRefresh();
      showStatus(`Banner "${banner.heading}" ${!banner.isActive ? 'activated' : 'deactivated'}`, 'success');
    } catch (err: any) {
      showStatus(err.message || 'Error updating status', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Move banner order up/down
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return;

    const reordered = [...banners];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      setLoading(true);
      await updateBannersOrder(reordered);
      await onRefresh();
      showStatus('Banner order updated successfully', 'success');
    } catch (err: any) {
      showStatus(err.message || 'Error reordering banners', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete banner trigger (opens confirmation modal)
  const handleDelete = (banner: BannerSlide) => {
    setBannerToDelete(banner);
    setDeleteBannerError(null);
  };

  // Execute delete banner with immediate optimistic UI update
  const confirmDeleteBanner = async () => {
    if (!bannerToDelete) return;

    try {
      setIsDeletingBanner(true);
      setDeleteBannerError(null);
      const targetId = bannerToDelete.id;
      const targetHeading = bannerToDelete.heading;

      // 1. Delete from Firestore
      await deleteBannerSlide(targetId);

      // 2. Immediately remove from local list
      setLocalBanners((prev) => prev.filter((b) => b.id !== targetId));

      // 3. Close modal & sync
      setBannerToDelete(null);
      if (onRefresh) await onRefresh();
      showStatus(`Banner "${targetHeading}" permanently deleted.`, 'success');
    } catch (err: any) {
      console.error('Delete banner failed:', err);
      const errMsg = err?.message || String(err);
      setDeleteBannerError(`Delete failed: ${errMsg}`);
      showStatus(`Delete failed: ${errMsg}`, 'error');
    } finally {
      setIsDeletingBanner(false);
    }
  };

  // Validate and verify Desktop URL
  const handleVerifyDesktopUrl = async () => {
    const trimmed = desktopPastedUrl.trim();
    if (!trimmed) {
      setDesktopUrlStatus({ valid: false, message: 'Please enter a direct image URL.' });
      return;
    }
    setDesktopUrlValidating(true);
    setDesktopUrlStatus(null);
    const result = await validateImageUrl(trimmed, 7000);
    setDesktopUrlValidating(false);
    if (result.valid) {
      setDesktopUrlStatus({ valid: true, message: 'Image verified! Ready to save.' });
      setFormData((prev) => ({ ...prev, desktopImage: trimmed }));
    } else {
      setDesktopUrlStatus({ valid: false, message: result.error || 'Failed to load image. Ensure it is a direct public link (e.g. from ibb.co).' });
    }
  };

  const handleApplyDesktopUrl = () => {
    const trimmed = desktopPastedUrl.trim();
    if (trimmed) {
      setFormData((prev) => ({ ...prev, desktopImage: trimmed }));
      showStatus('Desktop image URL applied', 'success');
    }
  };

  // Validate and verify Mobile URL
  const handleVerifyMobileUrl = async () => {
    const trimmed = mobilePastedUrl.trim();
    if (!trimmed) {
      setMobileUrlStatus({ valid: false, message: 'Please enter a direct image URL.' });
      return;
    }
    setMobileUrlValidating(true);
    setMobileUrlStatus(null);
    const result = await validateImageUrl(trimmed, 7000);
    setMobileUrlValidating(false);
    if (result.valid) {
      setMobileUrlStatus({ valid: true, message: 'Mobile image verified! Ready to save.' });
      setFormData((prev) => ({ ...prev, mobileImage: trimmed }));
    } else {
      setMobileUrlStatus({ valid: false, message: result.error || 'Failed to load image. Ensure it is a direct public link.' });
    }
  };

  const handleApplyMobileUrl = () => {
    const trimmed = mobilePastedUrl.trim();
    if (trimmed) {
      setFormData((prev) => ({ ...prev, mobileImage: trimmed }));
      showStatus('Mobile image URL applied', 'success');
    }
  };

  // Submit banner form
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.heading.trim()) {
      showStatus('Please provide a heading', 'error');
      return;
    }

    const effectiveDesktop = (formData.desktopImage || desktopPastedUrl).trim();
    const effectiveMobile = (formData.mobileImage || mobilePastedUrl).trim();

    if (!effectiveDesktop) {
      showStatus('Please provide a direct desktop banner image URL', 'error');
      return;
    }

    const bannerToSave: BannerSlide = {
      ...formData,
      desktopImage: effectiveDesktop,
      mobileImage: effectiveMobile,
    };

    try {
      setLoading(true);
      await saveBannerSlide(bannerToSave);
      if (onRefresh) await onRefresh();
      handleCancelForm();
      showStatus('Banner saved successfully. Live slider updated.', 'success');
    } catch (err: any) {
      console.error('Save banner failed:', err);
      const errMsg = err?.message || String(err);
      showStatus(`Failed to save banner: ${errMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--gold-500)]/20">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl text-white font-bold tracking-wide">
            Hero Banner Slider
          </h2>
          <p className="text-xs text-white/60">
            Manage the auto-changing 5s home slider. Add direct image links (e.g. from ibb.co or Unsplash), reorder, edit, and toggle active slides.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          disabled={loading || isCreatingNew || !!editingBanner}
          className="btn-gold-primary px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Slide</span>
        </button>
      </div>

      {/* Status Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4 opacity-70 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Modal / Inline Editor */}
      {(isCreatingNew || editingBanner) && (
        <form
          onSubmit={handleSaveBanner}
          className="rounded-2xl bg-[#03091D] border-2 border-[var(--gold-500)]/40 p-6 sm:p-8 space-y-6 shadow-2xl relative"
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[var(--gold-300)]" />
              <h3 className="font-heading text-lg font-bold text-white">
                {isCreatingNew ? 'Create New Hero Slide' : `Edit Slide: ${editingBanner?.heading}`}
              </h3>
            </div>
            <button
              type="button"
              onClick={handleCancelForm}
              className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Content */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-heading uppercase tracking-widest text-[var(--gold-300)] mb-1.5">
                  Badge Text (Top Label)
                </label>
                <input
                  type="text"
                  value={formData.badgeText}
                  onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                  placeholder="ROYAL ATELIER COLLECTION"
                  className="w-full px-4 py-2.5 rounded-lg bg-[var(--navy-900)] border border-[var(--gold-500)]/30 text-white text-xs sm:text-sm focus:border-[var(--gold-300)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading uppercase tracking-widest text-[var(--gold-300)] mb-1.5">
                  Heading (Primary Title) *
                </label>
                <input
                  type="text"
                  value={formData.heading}
                  onChange={(e) => setFormData({ ...formData, heading: e.target.value })}
                  placeholder="Crafted for Distinction"
                  required
                  className="w-full px-4 py-2.5 rounded-lg bg-[var(--navy-900)] border border-[var(--gold-500)]/30 text-white text-xs sm:text-sm focus:border-[var(--gold-300)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-heading uppercase tracking-widest text-[var(--gold-300)] mb-1.5">
                  Subheading
                </label>
                <textarea
                  rows={3}
                  value={formData.subheading}
                  onChange={(e) => setFormData({ ...formData, subheading: e.target.value })}
                  placeholder="Rare botanical essences, rich oud, and long-lasting fragrances..."
                  className="w-full px-4 py-2.5 rounded-lg bg-[var(--navy-900)] border border-[var(--gold-500)]/30 text-white text-xs sm:text-sm focus:border-[var(--gold-300)] focus:outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-heading uppercase tracking-widest text-[var(--gold-300)] mb-1.5">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.buttonText}
                    onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                    placeholder="Discover Collection"
                    className="w-full px-4 py-2.5 rounded-lg bg-[var(--navy-900)] border border-[var(--gold-500)]/30 text-white text-xs focus:border-[var(--gold-300)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-heading uppercase tracking-widest text-[var(--gold-300)] mb-1.5">
                    Button Target Link
                  </label>
                  <input
                    type="text"
                    value={formData.buttonLink}
                    onChange={(e) => setFormData({ ...formData, buttonLink: e.target.value })}
                    placeholder="shop or product-id or whatsapp"
                    className="w-full px-4 py-2.5 rounded-lg bg-[var(--navy-900)] border border-[var(--gold-500)]/30 text-white text-xs focus:border-[var(--gold-300)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Status and Order */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[11px] font-heading uppercase tracking-widest text-[var(--gold-300)] mb-1.5">
                    Slide Status
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`w-full py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      formData.isActive
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    {formData.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span>{formData.isActive ? 'Active in Slider' : 'Draft / Off'}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-heading uppercase tracking-widest text-[var(--gold-300)] mb-1.5">
                    Order Sequence
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-4 py-2.5 rounded-lg bg-[var(--navy-900)] border border-[var(--gold-500)]/30 text-white text-xs focus:border-[var(--gold-300)] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Images (Pure Direct Image URLs with Validation & Live Preview) */}
            <div className="space-y-6">
              {/* 1. Desktop Image URL */}
              <div className="space-y-3 p-4 rounded-xl bg-[#081438] border border-[var(--gold-500)]/20">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-heading uppercase tracking-widest text-[var(--gold-300)] font-bold flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Desktop Banner Image (16:9) *</span>
                  </label>
                  <span className="text-[10px] text-white/50">Direct URL</span>
                </div>

                {formData.desktopImage ? (
                  <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-black border border-[var(--gold-500)]/30 group">
                    <img
                      src={formData.desktopImage}
                      alt="Desktop banner preview"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setDesktopUrlStatus({ valid: false, message: 'Image failed to render. Please verify direct image link.' });
                      }}
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <a
                        href={formData.desktopImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-black/70 text-white/80 hover:text-white"
                        title="Open image in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[16/9] rounded-xl border-2 border-dashed border-[var(--gold-500)]/30 flex flex-col items-center justify-center bg-[var(--navy-900)] text-white/40 text-xs gap-1">
                    <ImageIcon className="w-6 h-6 text-white/20" />
                    <span>No desktop banner image set</span>
                  </div>
                )}

                {/* Paste Desktop URL Input & Verification */}
                <div className="space-y-2">
                  <div className="relative w-full">
                    <input
                      type="url"
                      value={desktopPastedUrl}
                      onChange={(e) => {
                        setDesktopPastedUrl(e.target.value);
                        setDesktopUrlStatus(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifyDesktopUrl();
                        }
                      }}
                      placeholder="Paste direct URL (e.g. https://i.ibb.co/...)"
                      className="w-full px-3 py-2.5 rounded-lg bg-[var(--navy-900)] border border-white/15 text-white text-xs font-mono focus:border-[var(--gold-300)] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={desktopUrlValidating || !desktopPastedUrl.trim()}
                      onClick={handleVerifyDesktopUrl}
                      className="w-full whitespace-nowrap px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {desktopUrlValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--gold-300)]" /> : <Check className="w-3.5 h-3.5 text-[var(--gold-300)]" />}
                      <span>{desktopUrlValidating ? 'Testing...' : 'Verify URL'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={!desktopPastedUrl.trim()}
                      onClick={handleApplyDesktopUrl}
                      className="btn-gold w-full whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <span>Apply URL</span>
                    </button>
                  </div>

                  {desktopUrlStatus && (
                    <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${desktopUrlStatus.valid ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950/50 border border-rose-500/40 text-rose-300'}`}>
                      {desktopUrlStatus.valid ? <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />}
                      <span>{desktopUrlStatus.message}</span>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-300 flex items-center gap-1.5 pt-0.5">
                    <span>Host images on:</span>
                    <span className="text-white font-mono">imgbb.com / ibb.co</span>
                    <span>•</span>
                    <span className="text-white font-mono">unsplash.com</span>
                  </div>
                </div>
              </div>

              {/* 2. Mobile Image URL (Optional) */}
              <div className="space-y-3 p-4 rounded-xl bg-[#081438] border border-white/10">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-heading uppercase tracking-widest text-[var(--gold-300)] font-bold flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Optional Mobile Banner Image (Portrait)</span>
                  </label>
                  <span className="text-[10px] text-white/40">Uses desktop if empty</span>
                </div>

                {formData.mobileImage ? (
                  <div className="relative aspect-[16/9] sm:aspect-[21/9] rounded-xl overflow-hidden bg-black border border-white/20 group">
                    <img
                      src={formData.mobileImage}
                      alt="Mobile banner preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, mobileImage: '' });
                          setMobilePastedUrl('');
                          setMobileUrlStatus(null);
                        }}
                        className="px-3 py-1.5 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Mobile Banner</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 px-4 rounded-lg border border-dashed border-white/10 bg-[var(--navy-900)] text-white/40 text-xs text-center">
                    No custom mobile image set (falls back to desktop banner)
                  </div>
                )}

                {/* Paste Mobile URL Input & Verification */}
                <div className="space-y-2">
                  <div className="relative w-full">
                    <input
                      type="url"
                      value={mobilePastedUrl}
                      onChange={(e) => {
                        setMobilePastedUrl(e.target.value);
                        setMobileUrlStatus(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVerifyMobileUrl();
                        }
                      }}
                      placeholder="Paste mobile direct URL (optional)"
                      className="w-full px-3 py-2.5 rounded-lg bg-[var(--navy-900)] border border-white/15 text-white text-xs font-mono focus:border-[var(--gold-300)] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={mobileUrlValidating || !mobilePastedUrl.trim()}
                      onClick={handleVerifyMobileUrl}
                      className="w-full whitespace-nowrap px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {mobileUrlValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--gold-300)]" /> : <Check className="w-3.5 h-3.5 text-[var(--gold-300)]" />}
                      <span>{mobileUrlValidating ? 'Testing...' : 'Verify URL'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={!mobilePastedUrl.trim()}
                      onClick={handleApplyMobileUrl}
                      className="btn-gold w-full whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <span>Apply URL</span>
                    </button>
                  </div>

                  {mobileUrlStatus && (
                    <div className={`p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${mobileUrlStatus.valid ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300' : 'bg-rose-950/50 border border-rose-500/40 text-rose-300'}`}>
                      {mobileUrlStatus.valid ? <Check className="w-3.5 h-3.5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />}
                      <span>{mobileUrlStatus.message}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleCancelForm}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg border border-white/20 text-white/70 hover:text-white text-xs uppercase tracking-wider font-semibold cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold-primary px-7 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Slide & Publish</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Banners List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-white/50 px-2">
          <span>{localBanners.length} Total Banners in Database</span>
          <span>Use arrows to reorder slide sequence</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {localBanners.map((banner, index) => (
            <div
              key={banner.id}
              className="rounded-2xl bg-[#081438] border border-[var(--gold-500)]/25 p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-start md:items-center justify-between transition-all hover:border-[var(--gold-500)]/60 shadow-lg"
            >
              {/* Left: Thumbnail & Info */}
              <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                {/* Drag / Sequence handles */}
                <div className="flex flex-col gap-1 items-center justify-center shrink-0">
                  <button
                    onClick={() => handleMoveOrder(index, 'up')}
                    disabled={index === 0 || loading}
                    className="p-1 rounded text-white/40 hover:text-[var(--gold-300)] hover:bg-white/5 disabled:opacity-20 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono font-bold text-[var(--gold-300)]">
                    #{index + 1}
                  </span>
                  <button
                    onClick={() => handleMoveOrder(index, 'down')}
                    disabled={index === banners.length - 1 || loading}
                    className="p-1 rounded text-white/40 hover:text-[var(--gold-300)] hover:bg-white/5 disabled:opacity-20 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                {/* Banner Image Preview */}
                <div className="w-24 sm:w-36 aspect-[16/9] rounded-lg overflow-hidden bg-black shrink-0 border border-white/10 relative">
                  <img
                    src={banner.desktopImage}
                    alt={banner.heading}
                    className="w-full h-full object-cover"
                  />
                  {banner.mobileImage && (
                    <span className="absolute bottom-1 right-1 bg-black/80 text-[8px] text-white/80 px-1 py-0.5 rounded font-mono">
                      +Mobile
                    </span>
                  )}
                </div>

                {/* Banner Text Details */}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-heading uppercase tracking-widest text-[var(--gold-300)] font-semibold">
                      {banner.badgeText || 'BANNER'}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        banner.isActive !== false
                          ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {banner.isActive !== false ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <h4 className="font-heading text-sm sm:text-base font-bold text-white truncate">
                    {banner.heading}
                  </h4>

                  <p className="text-xs text-white/60 line-clamp-1">
                    {banner.subheading}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-white/40 pt-1">
                    <span>CTA: <strong className="text-white/80">{banner.buttonText}</strong></span>
                    <span>•</span>
                    <span>Target: <strong className="text-[var(--gold-300)]">{banner.buttonLink}</strong></span>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-white/10 w-full md:w-auto justify-end">
                {/* On/Off Toggle */}
                <button
                  onClick={() => handleToggleActive(banner)}
                  disabled={loading}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    banner.isActive !== false
                      ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/50'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-700 hover:text-white'
                  }`}
                  title={banner.isActive !== false ? 'Click to disable' : 'Click to enable'}
                >
                  {banner.isActive !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{banner.isActive !== false ? 'Live' : 'Hidden'}</span>
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => handleStartEdit(banner)}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-lg bg-[var(--navy-900)] border border-[var(--gold-500)]/30 text-[var(--gold-300)] hover:border-[var(--gold-300)] text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleDelete(banner)}
                  disabled={loading}
                  className="p-2 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-900/50 transition-colors cursor-pointer"
                  title="Delete slide"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal for Banner Deletion */}
      <ConfirmDeleteModal
        isOpen={Boolean(bannerToDelete)}
        title="Delete Hero Banner Slide"
        itemName={bannerToDelete?.heading || 'Banner'}
        message="This banner slide will be permanently deleted from the homepage slider."
        isDeleting={isDeletingBanner}
        errorMessage={deleteBannerError}
        onConfirm={confirmDeleteBanner}
        onCancel={() => {
          if (!isDeletingBanner) {
            setBannerToDelete(null);
            setDeleteBannerError(null);
          }
        }}
      />
    </div>
  );
};
