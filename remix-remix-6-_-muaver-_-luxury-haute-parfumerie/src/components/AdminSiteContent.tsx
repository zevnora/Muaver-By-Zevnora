import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, 
  Crown, 
  Image as ImageIcon, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Star, 
  Eye, 
  EyeOff, 
  Sliders, 
  FileText, 
  Compass, 
  PhoneCall, 
  Layout, 
  Info,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Package,
  Droplets,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { SiteSettings, Product, WhyFeature, TestimonialItem } from '../types/store';
import { 
  updateSiteSettings, 
  DEFAULT_STATIC_IMAGES, 
  DEFAULT_SETTINGS, 
  DEFAULT_WHY_FEATURES, 
  DEFAULT_TESTIMONIALS 
} from '../services/storeService';
import { AdminImageUpload } from './AdminImageUpload';

interface AdminSiteContentProps {
  settings: SiteSettings;
  products: Product[];
  onRefresh: () => Promise<void>;
}

export type ContentSubTab = 
  | 'logos'
  | 'announcement'
  | 'hero'
  | 'featured-product'
  | 'brand-story'
  | 'why-features'
  | 'testimonials'
  | 'about-page'
  | 'contact-page'
  | 'footer-text'
  | 'static-images';

interface ClearableFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: 'text' | 'textarea';
  rows?: number;
  description?: string;
}

const ClearableField: React.FC<ClearableFieldProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  rows = 2,
  description,
}) => {
  const isValueEmpty = value === '';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] font-semibold block">
          {label}
        </label>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] text-white/50 hover:text-rose-400 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5 cursor-pointer"
            title={`Clear ${label}`}
          >
            <X className="w-3 h-3" />
            <span>Clear</span>
          </button>
        ) : (
          <span className="text-[10px] text-amber-400/80 italic font-medium">
            (Empty — hidden on live storefront)
          </span>
        )}
      </div>
      {description && <p className="text-[11px] text-white/50">{description}</p>}
      <div className="relative">
        {type === 'textarea' ? (
          <textarea
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3 rounded-lg bg-[var(--navy-900)] border border-white/15 text-white text-xs focus:border-[var(--gold-300)] focus:outline-none transition-colors"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 pr-8 rounded-lg bg-[var(--navy-900)] border border-white/15 text-white text-xs focus:border-[var(--gold-300)] focus:outline-none transition-colors"
          />
        )}
        {value && type === 'text' && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 rounded cursor-pointer"
            title="Clear text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export const AdminSiteContent: React.FC<AdminSiteContentProps> = ({
  settings,
  products,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ContentSubTab>('logos');
  const [formData, setFormData] = useState<SiteSettings>(() => ({ ...settings }));
  const [lastSavedData, setLastSavedData] = useState<SiteSettings>(() => ({ ...settings }));
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Initialize form state once when data first loads, and never reset on background render
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current && settings) {
      setFormData({ ...settings });
      setLastSavedData({ ...settings });
      hasInitializedRef.current = true;
    }
  }, [settings]);

  // Track unsaved changes
  const isDirty = useMemo(() => {
    try {
      return JSON.stringify(formData) !== JSON.stringify(lastSavedData);
    } catch {
      return false;
    }
  }, [formData, lastSavedData]);

  // Window beforeunload prompt if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Testimonial modal state
  const [editingTestimonial, setEditingTestimonial] = useState<TestimonialItem | null>(null);
  const [isNewTestimonial, setIsNewTestimonial] = useState(false);

  const showStatus = (text: string, type: 'success' | 'error' | 'warning') => {
    setStatusMessage({ text, type });
    if (type !== 'error') {
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleSave = async (updatedData?: Partial<SiteSettings>) => {
    try {
      setSaving(true);
      const toSave = updatedData ? { ...formData, ...updatedData } : formData;

      // 1. Write merge-safe payload to Firestore
      await updateSiteSettings(toSave);

      // 2. Re-read directly from Firestore to verify exact stored state
      const docRef = doc(db, 'settings', 'general');
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        showStatus('Warning: Stored document could not be re-read from Firestore.', 'warning');
        return;
      }

      const storedInDb = snap.data();
      const mismatchedFields: string[] = [];

      // Check text fields that were saved
      const fieldsToCheck = [
        'siteTitle', 'tagline', 'announcementText', 'heroDefaultBadge', 'heroDefaultHeading',
        'heroDefaultSubheading', 'featuredSectionBadge', 'featuredSectionTitle',
        'brandStoryBadge', 'brandStoryTitle', 'brandStorySnippet', 'brandStoryText2',
        'brandStoryButtonText', 'aboutBadge', 'aboutTitle', 'aboutSubtitle', 'aboutStoryTitle',
        'aboutStoryP1', 'aboutStoryP2', 'aboutCreedTitle', 'aboutLaw1Title', 'aboutLaw1Desc',
        'aboutLaw2Title', 'aboutLaw2Desc', 'aboutLaw3Title', 'aboutLaw3Desc',
        'contactBadge', 'contactTitle', 'contactSubtitle', 'contactHours', 'contactDispatchNotice',
        'footerTagline', 'footerBlurb', 'footerCopyright', 'contactPhone', 'whatsappNumber'
      ];

      for (const field of fieldsToCheck) {
        const expected = (toSave as any)[field];
        if (expected !== undefined) {
          const actual = storedInDb[field];
          // Empty string saved in Firestore should be either empty string or match
          if (expected === '' && actual !== '' && actual !== undefined) {
            mismatchedFields.push(field);
          } else if (expected !== '' && actual !== expected) {
            mismatchedFields.push(field);
          }
        }
      }

      setFormData(toSave);
      setLastSavedData(toSave);
      await onRefresh();

      if (mismatchedFields.length > 0) {
        showStatus(
          `Warning: Stored value in Firestore did not match typed value for: ${mismatchedFields.join(', ')}. Please check database permissions.`,
          'warning'
        );
      } else {
        showStatus('Saved! Changes are permanently stored in Firestore and live on the storefront.', 'success');
      }
    } catch (err: any) {
      console.error('Error saving site content:', err);
      showStatus(err.message || 'Failed to save changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Why Features Helpers
  const handleUpdateWhyFeature = (index: number, updated: Partial<WhyFeature>) => {
    const list = [...(formData.whyFeatures ?? DEFAULT_WHY_FEATURES)];
    list[index] = { ...list[index], ...updated };
    setFormData({ ...formData, whyFeatures: list });
  };

  const handleAddWhyFeature = () => {
    const list = [...(formData.whyFeatures ?? DEFAULT_WHY_FEATURES)];
    const newFeature: WhyFeature = {
      id: `wf-${Date.now()}`,
      icon: 'sparkles',
      title: 'New Hallmark',
      description: 'Detail the luxury standard and formulation promise for your patrons.',
    };
    setFormData({ ...formData, whyFeatures: [...list, newFeature] });
  };

  const handleRemoveWhyFeature = (index: number) => {
    const list = [...(formData.whyFeatures ?? DEFAULT_WHY_FEATURES)];
    const removedTitle = list[index]?.title || `Pillar #${index + 1}`;
    if (!window.confirm(`Remove "${removedTitle}" from Why MUAVER section?`)) return;
    list.splice(index, 1);
    setFormData({ ...formData, whyFeatures: list });
    showStatus(`Pillar removed. Click "Save Why MUAVER" to commit changes permanently.`, 'warning');
  };

  // Testimonial Helpers
  const handleToggleTestimonial = (id: string) => {
    const list = (formData.testimonials ?? DEFAULT_TESTIMONIALS).map((t) =>
      t.id === id ? { ...t, isActive: !t.isActive } : t
    );
    setFormData({ ...formData, testimonials: list });
  };

  const handleDeleteTestimonial = (id: string, name: string) => {
    if (!window.confirm(`Delete review from "${name}"?`)) return;
    const list = (formData.testimonials ?? DEFAULT_TESTIMONIALS).filter((t) => t.id !== id);
    setFormData({ ...formData, testimonials: list });
    showStatus('Review removed from staging. Click "Save Patron Reviews" to commit.', 'warning');
  };

  const handleSaveTestimonialModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTestimonial) return;

    let list = [...(formData.testimonials ?? DEFAULT_TESTIMONIALS)];
    if (isNewTestimonial) {
      list = [editingTestimonial, ...list];
    } else {
      list = list.map((t) => (t.id === editingTestimonial.id ? editingTestimonial : t));
    }
    setFormData({ ...formData, testimonials: list });
    setEditingTestimonial(null);
    setIsNewTestimonial(false);
    showStatus('Review staged. Remember to click "Save Patron Reviews"!', 'warning');
  };

  const subTabs: { id: ContentSubTab; label: string; icon: React.ElementType }[] = [
    { id: 'logos', label: 'Logos & Identity', icon: Crown },
    { id: 'announcement', label: 'Announcement Bar', icon: Sliders },
    { id: 'hero', label: 'Hero Content', icon: Layout },
    { id: 'featured-product', label: 'Featured Product', icon: Sparkles },
    { id: 'brand-story', label: 'Brand Story', icon: FileText },
    { id: 'why-features', label: '"Why MUAVER"', icon: ShieldCheck },
    { id: 'testimonials', label: 'Patron Reviews', icon: Star },
    { id: 'about-page', label: 'About Page', icon: Compass },
    { id: 'contact-page', label: 'Contact Page', icon: PhoneCall },
    { id: 'footer-text', label: 'Footer Text', icon: Info },
    { id: 'static-images', label: 'Static Images Directory', icon: ImageIcon },
  ];

  // Helper button for saving individual tabs
  const renderTabSaveButton = (tabName: string) => (
    <div className="pt-6 mt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="text-xs text-white/50 flex items-center gap-2">
        {isDirty ? (
          <span className="text-amber-400 flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Unsaved changes in this editor
          </span>
        ) : (
          <span className="text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            All changes currently saved
          </span>
        )}
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => handleSave()}
        className="btn-gold-primary px-6 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer disabled:opacity-50 w-full sm:w-auto justify-center"
      >
        <Save className="w-3.5 h-3.5 text-[var(--navy-900)]" />
        <span>{saving ? 'Saving...' : `Save ${tabName}`}</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Save CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--gold-500)]/20">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-xl sm:text-2xl text-white font-bold tracking-wide">
              Site Content & Copywriting
            </h2>
            {isDirty && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-xs text-white/60 mt-0.5">
            Control brand narratives, logos, section copy, testimonials, and static images across the boutique.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave()}
            className="btn-gold-primary px-5 py-2.5 rounded-lg text-xs font-semibold tracking-wider uppercase flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-[var(--navy-900)]" />
            <span>{saving ? 'Publishing...' : 'Save All Content'}</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : statusMessage.type === 'warning'
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {statusMessage.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4 opacity-70 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Sub Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
        {subTabs.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[var(--gold-500)] to-[var(--gold-300)] text-[var(--navy-900)] shadow-md shadow-amber-950/30'
                  : 'text-white/70 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--navy-900)]' : 'text-[var(--gold-300)]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Form Container */}
      <div className="bg-[#081438] rounded-2xl border border-[var(--gold-500)]/25 p-6 sm:p-8 space-y-6 shadow-xl">
        
        {/* 1. LOGOS & BRANDING IMAGERY */}
        {activeSubTab === 'logos' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-3 border-b border-white/10">
              <h3 className="font-heading text-base font-bold text-white tracking-wide">
                Logos & Official Heraldry
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Official high-resolution branding assets. Paste direct image URLs or reset to official defaults at any time.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ClearableField
                label="Site / Boutique Title"
                value={formData.siteTitle ?? DEFAULT_SETTINGS.siteTitle}
                onChange={(val) => setFormData({ ...formData, siteTitle: val })}
                placeholder="e.g. MUAVER | Luxury Brand"
                description="Browser tab title and search engine presentation."
              />

              <ClearableField
                label="Official Tagline"
                value={formData.tagline ?? DEFAULT_SETTINGS.tagline}
                onChange={(val) => setFormData({ ...formData, tagline: val })}
                placeholder="e.g. CRAFTED FOR DISTINCTION By Ashar Ul Haq Siddiqui"
                description="Core brand mantra featured across heraldic headers."
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pt-2">
              <AdminImageUpload
                label="Header & Footer Landscape Logo"
                description="Displayed in navigation bar (44-70px) and footer."
                currentUrl={formData.landscapeLogoUrl}
                defaultUrl={DEFAULT_STATIC_IMAGES.landscapeLogoUrl}
                onChange={(url) => setFormData({ ...formData, landscapeLogoUrl: url })}
                aspectRatio="landscape"
                folder="branding"
              />

              <AdminImageUpload
                label="Full Square Crest Logo"
                description="Displayed in brand story, about heraldry, and luxury seals."
                currentUrl={formData.fullSquareLogoUrl}
                defaultUrl={DEFAULT_STATIC_IMAGES.fullSquareLogoUrl}
                onChange={(url) => setFormData({ ...formData, fullSquareLogoUrl: url })}
                aspectRatio="square"
                folder="branding"
              />

              <AdminImageUpload
                label="Icon / Monogram & Favicon"
                description="Displayed in loading screen, browser tab favicon, and admin logo."
                currentUrl={formData.iconUrl}
                defaultUrl={DEFAULT_STATIC_IMAGES.iconUrl}
                onChange={(url) => setFormData({ ...formData, iconUrl: url, faviconUrl: url })}
                aspectRatio="square"
                folder="branding"
              />
            </div>

            {renderTabSaveButton('Logos & Identity')}
          </div>
        )}

        {/* 2. ANNOUNCEMENT BAR */}
        {activeSubTab === 'announcement' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-3 border-b border-white/10">
              <h3 className="font-heading text-base font-bold text-white tracking-wide">
                Top Announcement Bar
              </h3>
              <p className="text-xs text-white/50">
                High-priority banner pinned to the very top of every storefront page.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-heading text-sm text-white font-bold block">
                  Announcement Bar Visibility
                </span>
                <span className="text-xs text-white/50">
                  Toggle whether the top gold ticker is displayed.
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.visibility?.showAnnouncementBar !== false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: {
                        ...(formData.visibility || {
                          showAnnouncementBar: true,
                          showHeroSlider: true,
                          showFeaturedProduct: true,
                          showBrandStory: true,
                          showWhyFeatures: true,
                          showTestimonials: true,
                          showWhatsAppStrip: true,
                        }),
                        showAnnouncementBar: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--gold-500)]"></div>
              </label>
            </div>

            <ClearableField
              label="Announcement Message Text"
              value={formData.announcementText ?? DEFAULT_SETTINGS.announcementText}
              onChange={(val) => setFormData({ ...formData, announcementText: val })}
              placeholder="e.g. Complimentary White-Glove Cash on Delivery Across Pakistan..."
              type="textarea"
              rows={2}
              description="Leave empty or clear to hide the announcement ticker on storefront."
            />

            {renderTabSaveButton('Announcement Bar')}
          </div>
        )}

        {/* 3. HERO CONTENT */}
        {activeSubTab === 'hero' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-3 border-b border-white/10">
              <h3 className="font-heading text-base font-bold text-white tracking-wide">
                Hero Section Configuration
              </h3>
              <p className="text-xs text-white/50">
                Fallback titles and imagery when slides are loading or single-banner mode is active.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ClearableField
                label="Default Badge Text"
                value={formData.heroDefaultBadge ?? DEFAULT_SETTINGS.heroDefaultBadge ?? ''}
                onChange={(val) => setFormData({ ...formData, heroDefaultBadge: val })}
                placeholder="e.g. SIGNATURE COLLECTION"
                description="Small gold kicker above the hero title."
              />

              <ClearableField
                label="Default Headline"
                value={formData.heroDefaultHeading ?? DEFAULT_SETTINGS.heroDefaultHeading ?? ''}
                onChange={(val) => setFormData({ ...formData, heroDefaultHeading: val })}
                placeholder="e.g. Crafted for Distinction"
                description="Main prominent showcase headline."
              />
            </div>

            <ClearableField
              label="Default Subheading Description"
              value={formData.heroDefaultSubheading ?? DEFAULT_SETTINGS.heroDefaultSubheading ?? ''}
              onChange={(val) => setFormData({ ...formData, heroDefaultSubheading: val })}
              placeholder="e.g. High-concentration luxury perfumes, rare ingredients..."
              type="textarea"
              rows={2}
              description="Descriptive blurb below hero heading."
            />

            <AdminImageUpload
              label="Hero Fallback Imagery"
              description="Used as background placeholder if slider is transitioning or single banner is chosen."
              currentUrl={formData.heroFallbackImage || DEFAULT_STATIC_IMAGES.heroFallbackImage}
              defaultUrl={DEFAULT_STATIC_IMAGES.heroFallbackImage}
              onChange={(url) => setFormData({ ...formData, heroFallbackImage: url })}
              aspectRatio="landscape"
              folder="banners"
            />

            {renderTabSaveButton('Hero Content')}
          </div>
        )}

        {/* 4. FEATURED PRODUCT SELECTION */}
        {activeSubTab === 'featured-product' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-3 border-b border-white/10">
              <h3 className="font-heading text-base font-bold text-white tracking-wide">
                Homepage Featured Product Spotlight
              </h3>
              <p className="text-xs text-white/50">
                Select which product is highlighted in the spotlight section on the homepage.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-heading text-sm text-white font-bold block">
                  Featured Product Section Visibility
                </span>
                <span className="text-xs text-white/50">
                  Toggle whether the spotlight section is displayed on the homepage.
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.visibility?.showFeaturedProduct !== false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: {
                        ...(formData.visibility || {
                          showAnnouncementBar: true,
                          showHeroSlider: true,
                          showFeaturedProduct: true,
                          showBrandStory: true,
                          showWhyFeatures: true,
                          showTestimonials: true,
                          showWhatsAppStrip: true,
                        }),
                        showFeaturedProduct: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--gold-500)]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] font-semibold block mb-1">
                  Selected Featured Product
                </label>
                <select
                  value={formData.featuredProductId || products[0]?.id || 'mv-001'}
                  onChange={(e) => setFormData({ ...formData, featuredProductId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--navy-900)] border border-[var(--gold-500)]/40 text-[var(--gold-300)] font-bold text-xs focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#050F2E] text-white">
                      {p.name} ({p.subtitle || p.category}) - Rs. {p.price.toLocaleString()}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-white/40 block mt-1">
                  Updates the spotlight product with its imagery, size variants, notes, and pricing.
                </span>
              </div>

              <ClearableField
                label="Section Badge Label"
                value={formData.featuredSectionBadge ?? DEFAULT_SETTINGS.featuredSectionBadge ?? ''}
                onChange={(val) => setFormData({ ...formData, featuredSectionBadge: val })}
                placeholder="e.g. Featured Fragrance"
                description="Small gold badge over the spotlight title."
              />
            </div>

            <ClearableField
              label="Section Title"
              value={formData.featuredSectionTitle ?? DEFAULT_SETTINGS.featuredSectionTitle ?? ''}
              onChange={(val) => setFormData({ ...formData, featuredSectionTitle: val })}
              placeholder="e.g. THE SIGNATURE CREATION"
              description="Main headline for the homepage spotlight product."
            />

            {renderTabSaveButton('Featured Product')}
          </div>
        )}

        {/* 5. BRAND STORY */}
        {activeSubTab === 'brand-story' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-3 border-b border-white/10">
              <h3 className="font-heading text-base font-bold text-white tracking-wide">
                Brand Story & Philosophy
              </h3>
              <p className="text-xs text-white/50">
                The inspiration, standards, and craftsmanship behind the brand.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-heading text-sm text-white font-bold block">
                  Brand Story Section Visibility
                </span>
                <span className="text-xs text-white/50">
                  Toggle whether the Brand Story section appears on the homepage.
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.visibility?.showBrandStory !== false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: {
                        ...(formData.visibility || {
                          showAnnouncementBar: true,
                          showHeroSlider: true,
                          showFeaturedProduct: true,
                          showBrandStory: true,
                          showWhyFeatures: true,
                          showTestimonials: true,
                          showWhatsAppStrip: true,
                        }),
                        showBrandStory: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--gold-500)]"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ClearableField
                label="Badge Label"
                value={formData.brandStoryBadge ?? DEFAULT_SETTINGS.brandStoryBadge ?? ''}
                onChange={(val) => setFormData({ ...formData, brandStoryBadge: val })}
                placeholder="e.g. Crafted by Ashar Ul Haq Siddiqui"
              />

              <ClearableField
                label="Heading Title"
                value={formData.brandStoryTitle ?? DEFAULT_SETTINGS.brandStoryTitle ?? ''}
                onChange={(val) => setFormData({ ...formData, brandStoryTitle: val })}
                placeholder="e.g. CRAFTED FOR DISTINCTION By Ashar Ul Haq Siddiqui"
              />
            </div>

            <ClearableField
              label="Story Paragraph 1 (Emblem & Crown Philosophy)"
              value={formData.brandStorySnippet ?? DEFAULT_SETTINGS.brandStorySnippet}
              onChange={(val) => setFormData({ ...formData, brandStorySnippet: val })}
              placeholder="In an era filled with mass-market, diluted scents, MUAVER was created with a clear royal conviction..."
              type="textarea"
              rows={3}
            />

            <ClearableField
              label="Story Paragraph 2 (Fragrance Concentration & Longevity)"
              value={formData.brandStoryText2 ?? DEFAULT_SETTINGS.brandStoryText2 ?? ''}
              onChange={(val) => setFormData({ ...formData, brandStoryText2: val })}
              placeholder="Every fragrance is crafted by Ashar Ul Haq Siddiqui with a generous 35% concentration..."
              type="textarea"
              rows={3}
            />

            <ClearableField
              label="Story Button Text"
              value={formData.brandStoryButtonText ?? DEFAULT_SETTINGS.brandStoryButtonText ?? 'Read Our Story'}
              onChange={(val) => setFormData({ ...formData, brandStoryButtonText: val })}
              placeholder="e.g. Read Our Story"
            />

            <AdminImageUpload
              label="Brand Story Crest / Artwork"
              description="Featured alongside the story on the homepage."
              currentUrl={formData.brandStoryImage || DEFAULT_STATIC_IMAGES.brandStoryImage}
              defaultUrl={DEFAULT_STATIC_IMAGES.brandStoryImage}
              onChange={(url) => setFormData({ ...formData, brandStoryImage: url })}
              aspectRatio="square"
              folder="branding"
            />

            {renderTabSaveButton('Brand Story')}
          </div>
        )}

        {/* 6. "WHY MUAVER" - ICON FEATURES */}
        {activeSubTab === 'why-features' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="font-heading text-base font-bold text-white tracking-wide">
                  "Why MUAVER" Quality Pillars
                </h3>
                <p className="text-xs text-white/50">
                  Hallmark standards displayed with royal gold icons on the homepage. Delete or add pillars as desired.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddWhyFeature}
                className="btn-gold-outline px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--gold-300)]" />
                <span>Add Feature Pillar</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-heading text-sm text-white font-bold block">
                  Why MUAVER Section Visibility
                </span>
                <span className="text-xs text-white/50">
                  Toggle whether the Why MUAVER pillars are displayed on the homepage.
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.visibility?.showWhyFeatures !== false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: {
                        ...(formData.visibility || {
                          showAnnouncementBar: true,
                          showHeroSlider: true,
                          showFeaturedProduct: true,
                          showBrandStory: true,
                          showWhyFeatures: true,
                          showTestimonials: true,
                          showWhatsAppStrip: true,
                        }),
                        showWhyFeatures: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--gold-500)]"></div>
              </label>
            </div>

            {(!formData.whyFeatures || formData.whyFeatures.length === 0) ? (
              <div className="p-8 text-center rounded-xl bg-[var(--navy-900)] border border-dashed border-white/20 text-white/50 space-y-2">
                <ShieldCheck className="w-8 h-8 text-[var(--gold-300)] mx-auto opacity-50" />
                <p className="text-xs">No pillars currently in this section. The section will be hidden on storefront.</p>
                <button
                  type="button"
                  onClick={handleAddWhyFeature}
                  className="btn-gold-primary px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Pillar</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(formData.whyFeatures ?? DEFAULT_WHY_FEATURES).map((feat, idx) => (
                  <div
                    key={feat.id || idx}
                    className="p-5 rounded-xl bg-[var(--navy-900)] border border-[var(--gold-500)]/25 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-[10px] uppercase font-heading text-[var(--gold-300)] font-bold">
                        Pillar #{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={feat.icon}
                          onChange={(e) => handleUpdateWhyFeature(idx, { icon: e.target.value as any })}
                          className="px-2.5 py-1 rounded bg-[#03091D] border border-white/15 text-white text-xs focus:outline-none cursor-pointer"
                        >
                          <option value="crown">Crown (Authenticity)</option>
                          <option value="clock">Clock (Long Lasting)</option>
                          <option value="shield">Shield (COD Nationwide)</option>
                          <option value="package">Package (Premium Packaging)</option>
                          <option value="sparkles">Sparkles (Luxury Distinction)</option>
                          <option value="droplet">Droplets (Pure Essence)</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemoveWhyFeature(idx)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 cursor-pointer"
                          title="Remove this pillar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <ClearableField
                      label="Pillar Title"
                      value={feat.title ?? ''}
                      onChange={(val) => handleUpdateWhyFeature(idx, { title: val })}
                      placeholder="e.g. 100% Authentic"
                    />

                    <ClearableField
                      label="Pillar Description"
                      value={feat.description ?? ''}
                      onChange={(val) => handleUpdateWhyFeature(idx, { description: val })}
                      placeholder="Detail the standard..."
                      type="textarea"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            )}

            {renderTabSaveButton('"Why MUAVER"')}
          </div>
        )}

        {/* 7. PATRON REVIEWS / TESTIMONIALS */}
        {activeSubTab === 'testimonials' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h3 className="font-heading text-base font-bold text-white tracking-wide">
                  Patron Acclaim & Testimonials
                </h3>
                <p className="text-xs text-white/50">
                  Manage reviews displayed under "Customer Reviews" on the homepage.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingTestimonial({
                    id: `t-${Date.now()}`,
                    name: '',
                    city: 'Karachi, Pakistan',
                    role: 'Verified Patron',
                    rating: 5,
                    comment: '',
                    isActive: true,
                  });
                  setIsNewTestimonial(true);
                }}
                className="btn-gold-outline px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--gold-300)]" />
                <span>Add Review</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
              <div>
                <span className="font-heading text-sm text-white font-bold block">
                  Reviews Section Visibility
                </span>
                <span className="text-xs text-white/50">
                  Toggle whether customer reviews appear on the homepage.
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.visibility?.showTestimonials !== false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      visibility: {
                        ...(formData.visibility || {
                          showAnnouncementBar: true,
                          showHeroSlider: true,
                          showFeaturedProduct: true,
                          showBrandStory: true,
                          showWhyFeatures: true,
                          showTestimonials: true,
                          showWhatsAppStrip: true,
                        }),
                        showTestimonials: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--gold-500)]"></div>
              </label>
            </div>

            {(!formData.testimonials || formData.testimonials.length === 0) ? (
              <div className="p-8 text-center rounded-xl bg-[var(--navy-900)] border border-dashed border-white/20 text-white/50 space-y-2">
                <Star className="w-8 h-8 text-[var(--gold-300)] mx-auto opacity-50" />
                <p className="text-xs">No reviews staged. The reviews section will be hidden on storefront.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTestimonial({
                      id: `t-${Date.now()}`,
                      name: '',
                      city: 'Karachi, Pakistan',
                      role: 'Verified Patron',
                      rating: 5,
                      comment: '',
                      isActive: true,
                    });
                    setIsNewTestimonial(true);
                  }}
                  className="btn-gold-primary px-4 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Review</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(formData.testimonials ?? DEFAULT_TESTIMONIALS).map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl bg-[var(--navy-900)] border transition-all space-y-3 ${
                      item.isActive ? 'border-[var(--gold-500)]/30' : 'border-white/10 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-heading text-xs font-bold text-white">{item.name}</span>
                          <div className="flex text-[var(--gold-300)]">
                            {[...Array(item.rating || 5)].map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-current" />
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] text-white/50">{item.city} • {item.role || 'Patron'}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleTestimonial(item.id)}
                          className={`p-1.5 rounded text-xs cursor-pointer ${
                            item.isActive ? 'text-emerald-400 hover:bg-emerald-950/40' : 'text-white/40 hover:bg-white/5'
                          }`}
                          title={item.isActive ? 'Active (Click to hide)' : 'Hidden (Click to show)'}
                        >
                          {item.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingTestimonial(item);
                            setIsNewTestimonial(false);
                          }}
                          className="p-1.5 rounded text-[var(--gold-300)] hover:bg-[var(--gold-500)]/15 cursor-pointer"
                          title="Edit review"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTestimonial(item.id, item.name)}
                          className="p-1.5 rounded text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                          title="Delete review"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-white/80 italic font-light leading-relaxed">
                      "{item.comment}"
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Testimonial Edit/Add Modal */}
            {editingTestimonial && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                <div className="bg-[#050F2E] border-2 border-[var(--gold-500)]/40 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h4 className="font-heading text-base font-bold text-white">
                      {isNewTestimonial ? 'Add Patron Review' : 'Edit Patron Review'}
                    </h4>
                    <button onClick={() => setEditingTestimonial(null)} className="cursor-pointer">
                      <X className="w-5 h-5 text-white/50 hover:text-white" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveTestimonialModal} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-heading text-[var(--gold-300)] block mb-1">
                          Patron Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={editingTestimonial.name}
                          onChange={(e) =>
                            setEditingTestimonial({ ...editingTestimonial, name: e.target.value })
                          }
                          placeholder="e.g. Hamza K."
                          className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-heading text-[var(--gold-300)] block mb-1">
                          City / Territory
                        </label>
                        <input
                          type="text"
                          value={editingTestimonial.city}
                          onChange={(e) =>
                            setEditingTestimonial({ ...editingTestimonial, city: e.target.value })
                          }
                          placeholder="Lahore, Pakistan"
                          className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-heading text-[var(--gold-300)] block mb-1">
                          Role / Title
                        </label>
                        <input
                          type="text"
                          value={editingTestimonial.role || ''}
                          onChange={(e) =>
                            setEditingTestimonial({ ...editingTestimonial, role: e.target.value })
                          }
                          placeholder="Verified Customer"
                          className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-heading text-[var(--gold-300)] block mb-1">
                          Rating (Stars)
                        </label>
                        <select
                          value={editingTestimonial.rating || 5}
                          onChange={(e) =>
                            setEditingTestimonial({
                              ...editingTestimonial,
                              rating: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs focus:outline-none cursor-pointer"
                        >
                          <option value={5}>★★★★★ (5 Stars)</option>
                          <option value={4}>★★★★☆ (4 Stars)</option>
                          <option value={3}>★★★☆☆ (3 Stars)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-heading text-[var(--gold-300)] block mb-1">
                        Review / Testimonial Text *
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={editingTestimonial.comment}
                        onChange={(e) =>
                          setEditingTestimonial({ ...editingTestimonial, comment: e.target.value })
                        }
                        placeholder="Share the patron's impressions of the fragrance..."
                        className="w-full p-3 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingTestimonial(null)}
                        className="px-4 py-1.5 rounded border border-white/20 text-white/70 hover:text-white text-xs cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-gold-primary px-5 py-1.5 rounded text-xs font-semibold cursor-pointer"
                      >
                        Stage Review
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {renderTabSaveButton('Patron Reviews')}
          </div>
        )}

        {/* 8. ABOUT PAGE CONTENT & IMAGES */}
        {activeSubTab === 'about-page' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-3 border-b border-white/10">
              <h3 className="font-heading text-base font-bold text-white tracking-wide">
                Maison Chronicle (About Page)
              </h3>
              <p className="text-xs text-white/50">
                Brand history, heraldry crest presentation, and the Three Commitments to Quality.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ClearableField
                label="About Badge Label"
                value={formData.aboutBadge ?? DEFAULT_SETTINGS.aboutBadge ?? ''}
                onChange={(val) => setFormData({ ...formData, aboutBadge: val })}
                placeholder="e.g. CRAFTED FOR DISTINCTION"
              />

              <ClearableField
                label="About Hero Title"
                value={formData.aboutTitle ?? DEFAULT_SETTINGS.aboutTitle ?? ''}
                onChange={(val) => setFormData({ ...formData, aboutTitle: val })}
                placeholder="e.g. THE MUAVER STORY"
              />

              <ClearableField
                label="About Subtitle"
                value={formData.aboutSubtitle ?? DEFAULT_SETTINGS.aboutSubtitle ?? ''}
                onChange={(val) => setFormData({ ...formData, aboutSubtitle: val })}
                placeholder="e.g. Born out of an unwavering passion..."
              />
            </div>

            <div className="pt-2 border-t border-white/10 space-y-4">
              <h4 className="text-xs font-heading uppercase tracking-wider text-[var(--gold-300)] font-semibold">
                Heraldry & Crest Narrative
              </h4>

              <ClearableField
                label="Heraldry Subtitle"
                value={formData.aboutStoryTitle ?? DEFAULT_SETTINGS.aboutStoryTitle ?? ''}
                onChange={(val) => setFormData({ ...formData, aboutStoryTitle: val })}
                placeholder="e.g. The Heritage Behind The Insignia"
              />

              <ClearableField
                label="Narrative Paragraph 1"
                value={formData.aboutStoryP1 ?? DEFAULT_SETTINGS.aboutStoryP1 ?? ''}
                onChange={(val) => setFormData({ ...formData, aboutStoryP1: val })}
                placeholder="The insignia of MUAVER tells the story..."
                type="textarea"
                rows={3}
              />

              <ClearableField
                label="Narrative Paragraph 2"
                value={formData.aboutStoryP2 ?? DEFAULT_SETTINGS.aboutStoryP2 ?? ''}
                onChange={(val) => setFormData({ ...formData, aboutStoryP2: val })}
                placeholder="Behind the brand stands Founder & CEO Ashar Ul Haq Siddiqui..."
                type="textarea"
                rows={3}
              />

              <AdminImageUpload
                label="Heraldic Signature Emblem Artwork"
                description="Centerpiece emblem framed on the About page."
                currentUrl={formData.aboutStoryImage || DEFAULT_STATIC_IMAGES.aboutStoryImage}
                defaultUrl={DEFAULT_STATIC_IMAGES.aboutStoryImage}
                onChange={(url) => setFormData({ ...formData, aboutStoryImage: url })}
                aspectRatio="square"
                folder="branding"
              />
            </div>

            {/* Three Commitments to Quality */}
            <div className="pt-4 border-t border-white/10 space-y-4">
              <h4 className="text-xs font-heading uppercase tracking-wider text-[var(--gold-300)] font-semibold">
                Three Commitments to Quality
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Standard 1 */}
                <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-[var(--gold-300)] block">
                    Commitment #1
                  </span>
                  <ClearableField
                    label="Title"
                    value={formData.aboutLaw1Title ?? DEFAULT_SETTINGS.aboutLaw1Title ?? ''}
                    onChange={(val) => setFormData({ ...formData, aboutLaw1Title: val })}
                    placeholder="e.g. 35% Oil Concentration"
                  />
                  <ClearableField
                    label="Description"
                    value={formData.aboutLaw1Desc ?? DEFAULT_SETTINGS.aboutLaw1Desc ?? ''}
                    onChange={(val) => setFormData({ ...formData, aboutLaw1Desc: val })}
                    placeholder="Detail the standard..."
                    type="textarea"
                    rows={2}
                  />
                </div>

                {/* Standard 2 */}
                <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-[var(--gold-300)] block">
                    Commitment #2
                  </span>
                  <ClearableField
                    label="Title"
                    value={formData.aboutLaw2Title ?? DEFAULT_SETTINGS.aboutLaw2Title ?? ''}
                    onChange={(val) => setFormData({ ...formData, aboutLaw2Title: val })}
                    placeholder="e.g. 16+ Hours Longevity"
                  />
                  <ClearableField
                    label="Description"
                    value={formData.aboutLaw2Desc ?? DEFAULT_SETTINGS.aboutLaw2Desc ?? ''}
                    onChange={(val) => setFormData({ ...formData, aboutLaw2Desc: val })}
                    placeholder="Detail the standard..."
                    type="textarea"
                    rows={2}
                  />
                </div>

                {/* Standard 3 */}
                <div className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-[var(--gold-300)] block">
                    Commitment #3
                  </span>
                  <ClearableField
                    label="Title"
                    value={formData.aboutLaw3Title ?? DEFAULT_SETTINGS.aboutLaw3Title ?? ''}
                    onChange={(val) => setFormData({ ...formData, aboutLaw3Title: val })}
                    placeholder="e.g. Doorstep Cash on Delivery"
                  />
                  <ClearableField
                    label="Description"
                    value={formData.aboutLaw3Desc ?? DEFAULT_SETTINGS.aboutLaw3Desc ?? ''}
                    onChange={(val) => setFormData({ ...formData, aboutLaw3Desc: val })}
                    placeholder="Detail the standard..."
                    type="textarea"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {renderTabSaveButton('About Page')}
          </div>
        )}

        {/* 9. CONTACT PAGE TEXT */}
        {activeSubTab === 'contact-page' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-3 border-b border-white/10">
              <h3 className="font-heading text-base font-bold text-white tracking-wide">
                Concierge & Contact Page
              </h3>
              <p className="text-xs text-white/50">
                Personal assistance titles, operating hours, dispatch notices, and direct contact details.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ClearableField
                label="Contact Badge"
                value={formData.contactBadge ?? DEFAULT_SETTINGS.contactBadge ?? ''}
                onChange={(val) => setFormData({ ...formData, contactBadge: val })}
                placeholder="e.g. Customer Support"
              />

              <ClearableField
                label="Page Headline"
                value={formData.contactTitle ?? DEFAULT_SETTINGS.contactTitle ?? ''}
                onChange={(val) => setFormData({ ...formData, contactTitle: val })}
                placeholder="e.g. CUSTOMER CARE & CONTACT"
              />

              <ClearableField
                label="Operating Hours"
                value={formData.contactHours ?? DEFAULT_SETTINGS.contactHours ?? ''}
                onChange={(val) => setFormData({ ...formData, contactHours: val })}
                placeholder="e.g. Mon - Sat: 10:00 AM - 10:00 PM PKT"
              />
            </div>

            <ClearableField
              label="Subheading Description"
              value={formData.contactSubtitle ?? DEFAULT_SETTINGS.contactSubtitle ?? ''}
              onChange={(val) => setFormData({ ...formData, contactSubtitle: val })}
              placeholder="Our fragrance advisors are at your service for consultations..."
              type="textarea"
              rows={2}
            />

            <ClearableField
              label="Dispatch Depot Notice"
              value={formData.contactDispatchNotice ?? DEFAULT_SETTINGS.contactDispatchNotice ?? ''}
              onChange={(val) => setFormData({ ...formData, contactDispatchNotice: val })}
              placeholder="e.g. Dispatches courier parcels nationwide directly from Karachi central reserve with inspection seals."
            />

            <div className="pt-2 border-t border-white/10 space-y-4">
              <h4 className="text-xs font-heading uppercase tracking-wider text-[var(--gold-300)] font-semibold">
                Direct Contact & Social Accounts
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ClearableField
                  label="Contact Phone / WhatsApp Display"
                  value={formData.contactPhone ?? DEFAULT_SETTINGS.contactPhone}
                  onChange={(val) => setFormData({ ...formData, contactPhone: val })}
                  placeholder="+92 324 2404984"
                />

                <ClearableField
                  label="WhatsApp Raw Digits (for links)"
                  value={formData.whatsappRawNumber ?? DEFAULT_SETTINGS.whatsappRawNumber}
                  onChange={(val) => setFormData({ ...formData, whatsappRawNumber: val })}
                  placeholder="923242404984"
                />

                <ClearableField
                  label="Official Support Email"
                  value={formData.contactEmail ?? DEFAULT_SETTINGS.contactEmail}
                  onChange={(val) => setFormData({ ...formData, contactEmail: val })}
                  placeholder="hellomuaver@gmail.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ClearableField
                  label="Instagram URL"
                  value={formData.socialLinks?.instagram ?? ''}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...(formData.socialLinks || DEFAULT_SETTINGS.socialLinks), instagram: val },
                    })
                  }
                  placeholder="https://www.instagram.com/muaver.co"
                />

                <ClearableField
                  label="TikTok URL"
                  value={formData.socialLinks?.tiktok ?? ''}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...(formData.socialLinks || DEFAULT_SETTINGS.socialLinks), tiktok: val },
                    })
                  }
                  placeholder="https://www.tiktok.com/@muaver.co"
                />

                <ClearableField
                  label="Facebook URL"
                  value={formData.socialLinks?.facebook ?? ''}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...(formData.socialLinks || DEFAULT_SETTINGS.socialLinks), facebook: val },
                    })
                  }
                  placeholder="https://www.facebook.com/people/Muaver-Luxury-Brand/..."
                />
              </div>
            </div>

            {renderTabSaveButton('Contact Page')}
          </div>
        )}

        {/* 10. FOOTER TEXT */}
        {activeSubTab === 'footer-text' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-3 border-b border-white/10">
              <h3 className="font-heading text-base font-bold text-white tracking-wide">
                Footer Copy & Legal
              </h3>
              <p className="text-xs text-white/50">
                Bottom website brand blurb, official tagline, and copyright statement.
              </p>
            </div>

            <ClearableField
              label="Footer Tagline"
              value={formData.footerTagline ?? DEFAULT_SETTINGS.footerTagline ?? ''}
              onChange={(val) => setFormData({ ...formData, footerTagline: val })}
              placeholder="e.g. CRAFTED FOR DISTINCTION By Ashar Ul Haq Siddiqui"
            />

            <ClearableField
              label="Footer Brand Summary Blurb"
              value={formData.footerBlurb ?? DEFAULT_SETTINGS.footerBlurb ?? ''}
              onChange={(val) => setFormData({ ...formData, footerBlurb: val })}
              placeholder="Crafted with premium fragrance oils, long-lasting performance..."
              type="textarea"
              rows={2}
            />

            <ClearableField
              label="Copyright Notice"
              value={formData.footerCopyright ?? DEFAULT_SETTINGS.footerCopyright ?? ''}
              onChange={(val) => setFormData({ ...formData, footerCopyright: val })}
              placeholder="© 2026 MUAVER. All rights reserved. Crafted for Distinction by Ashar Ul Haq Siddiqui."
            />

            {renderTabSaveButton('Footer Text')}
          </div>
        )}

        {/* 11. STATIC IMAGES DIRECTORY */}
        {activeSubTab === 'static-images' && (
          <div className="space-y-6 animate-fade-in">
            <div className="pb-3 border-b border-white/10">
              <h3 className="font-heading text-base font-bold text-white tracking-wide">
                Central Static Images Directory
              </h3>
              <p className="text-xs text-white/50">
                Every static image on the website in one place. Paste direct image URLs, or click "Reset to default" to restore the original brand asset.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AdminImageUpload
                label="Landscape Header & Footer Logo"
                description="High-resolution gold crown monogram on transparent ground."
                currentUrl={formData.landscapeLogoUrl}
                defaultUrl={DEFAULT_STATIC_IMAGES.landscapeLogoUrl}
                onChange={(url) => setFormData({ ...formData, landscapeLogoUrl: url })}
                aspectRatio="landscape"
                folder="branding"
              />

              <AdminImageUpload
                label="Full Square Emblem Crest"
                description="Golden heraldic seal with royal laurels and crown."
                currentUrl={formData.fullSquareLogoUrl}
                defaultUrl={DEFAULT_STATIC_IMAGES.fullSquareLogoUrl}
                onChange={(url) => setFormData({ ...formData, fullSquareLogoUrl: url })}
                aspectRatio="square"
                folder="branding"
              />

              <AdminImageUpload
                label="Icon / Favicon Asset"
                description="Square icon loaded into browser tab and loading screens."
                currentUrl={formData.iconUrl}
                defaultUrl={DEFAULT_STATIC_IMAGES.iconUrl}
                onChange={(url) => setFormData({ ...formData, iconUrl: url, faviconUrl: url })}
                aspectRatio="square"
                folder="branding"
              />

              <AdminImageUpload
                label="Brand Story Image"
                description="Featured presentation artwork beside the brand narrative."
                currentUrl={formData.brandStoryImage || DEFAULT_STATIC_IMAGES.brandStoryImage}
                defaultUrl={DEFAULT_STATIC_IMAGES.brandStoryImage}
                onChange={(url) => setFormData({ ...formData, brandStoryImage: url })}
                aspectRatio="square"
                folder="branding"
              />

              <AdminImageUpload
                label="About Page Emblem"
                description="Heraldic artwork framed on the About / Chronicle page."
                currentUrl={formData.aboutStoryImage || DEFAULT_STATIC_IMAGES.aboutStoryImage}
                defaultUrl={DEFAULT_STATIC_IMAGES.aboutStoryImage}
                onChange={(url) => setFormData({ ...formData, aboutStoryImage: url })}
                aspectRatio="square"
                folder="branding"
              />

              <AdminImageUpload
                label="Hero Fallback Product Image"
                description="High-resolution product visual with zero third-party logos."
                currentUrl={formData.heroFallbackImage || DEFAULT_STATIC_IMAGES.heroFallbackImage}
                defaultUrl={DEFAULT_STATIC_IMAGES.heroFallbackImage}
                onChange={(url) => setFormData({ ...formData, heroFallbackImage: url })}
                aspectRatio="landscape"
                folder="banners"
              />
            </div>

            {renderTabSaveButton('Static Images')}
          </div>
        )}

      </div>
    </div>
  );
};
