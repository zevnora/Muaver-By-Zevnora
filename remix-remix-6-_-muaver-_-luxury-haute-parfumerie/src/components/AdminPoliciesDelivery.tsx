import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  FileText, 
  Banknote, 
  Lock, 
  Check, 
  Save, 
  Clock, 
  DollarSign, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  SiteSettings, 
  DeliverySettings, 
  PoliciesConfig, 
  PolicySection, 
  ShippingType 
} from '../types/store';
import { updateSiteSettings, DEFAULT_DELIVERY_SETTINGS, DEFAULT_POLICIES } from '../services/storeService';

interface AdminPoliciesDeliveryProps {
  settings: SiteSettings;
  onRefresh: () => Promise<void>;
}

type PolicyKey = keyof PoliciesConfig;

interface PolicyTabMeta {
  key: PolicyKey;
  label: string;
  slug: string;
  icon: React.ElementType;
  description: string;
}

const POLICY_TABS: PolicyTabMeta[] = [
  {
    key: 'delivery-info',
    label: 'Delivery Information',
    slug: '/delivery-info',
    icon: Truck,
    description: 'Dispatch times, courier partners (TCS, Leopards), and shipping rates.',
  },
  {
    key: 'returns',
    label: 'Return and Exchange',
    slug: '/returns',
    icon: RotateCcw,
    description: 'Guidelines for product exchanges, return windows, and safety seals.',
  },
  {
    key: 'refund-policy',
    label: 'Refund Policy',
    slug: '/refund-policy',
    icon: DollarSign,
    description: 'Damaged item guarantees, bank transfer (IBFT), and Raast refund processing.',
  },
  {
    key: 'privacy-policy',
    label: 'Privacy Policy',
    slug: '/privacy-policy',
    icon: Lock,
    description: 'Customer contact discretion, data confidentiality, and SMS/WhatsApp usage.',
  },
  {
    key: 'terms',
    label: 'Terms of Service',
    slug: '/terms',
    icon: FileText,
    description: 'Artisanal Extrait de Parfum conditions, order confirmations, and pricing terms.',
  },
  {
    key: 'cod-policy',
    label: 'Cash on Delivery Policy',
    slug: '/cod-policy',
    icon: Banknote,
    description: 'Doorstep cash payment terms, parcel inspection, and nationwide delivery stipulations.',
  },
];

export const AdminPoliciesDelivery: React.FC<AdminPoliciesDeliveryProps> = ({
  settings,
  onRefresh,
}) => {
  const [activePolicyTab, setActivePolicyTab] = useState<PolicyKey>('delivery-info');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Delivery settings local state
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(() => ({
    ...DEFAULT_DELIVERY_SETTINGS,
    ...(settings.deliverySettings || {}),
  }));

  // Policies local state
  const [policies, setPolicies] = useState<PoliciesConfig>(() => ({
    'delivery-info': { ...DEFAULT_POLICIES['delivery-info'], ...(settings.policies?.['delivery-info'] || {}) },
    'returns': { ...DEFAULT_POLICIES['returns'], ...(settings.policies?.['returns'] || {}) },
    'refund-policy': { ...DEFAULT_POLICIES['refund-policy'], ...(settings.policies?.['refund-policy'] || {}) },
    'privacy-policy': { ...DEFAULT_POLICIES['privacy-policy'], ...(settings.policies?.['privacy-policy'] || {}) },
    'terms': { ...DEFAULT_POLICIES['terms'], ...(settings.policies?.['terms'] || {}) },
    'cod-policy': { ...DEFAULT_POLICIES['cod-policy'], ...(settings.policies?.['cod-policy'] || {}) },
  }));

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeliveryChange = <K extends keyof DeliverySettings>(key: K, value: DeliverySettings[K]) => {
    setDeliverySettings((prev) => ({ ...prev, [key]: value }));
  };

  const handlePolicyChange = <K extends keyof PolicySection>(
    policyKey: PolicyKey,
    field: K,
    value: PolicySection[K]
  ) => {
    setPolicies((prev) => ({
      ...prev,
      [policyKey]: {
        ...prev[policyKey],
        [field]: value,
      },
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await updateSiteSettings({
        deliverySettings: {
          ...deliverySettings,
          deliveryCharges: Number(deliverySettings.deliveryCharges ?? deliverySettings.flatRateAmount ?? 250),
          flatRateAmount: Number(deliverySettings.deliveryCharges ?? deliverySettings.flatRateAmount ?? 250),
          freeDeliveryAbove: deliverySettings.freeDeliveryAbove ? Number(deliverySettings.freeDeliveryAbove) : null,
          freeAboveAmount: deliverySettings.freeDeliveryAbove ? Number(deliverySettings.freeDeliveryAbove) : (deliverySettings.freeAboveAmount || 0),
          handlingCharges: Number(deliverySettings.handlingCharges || 0),
        },
        policies,
      });
      await onRefresh();
      showToast('Delivery specifications and store policies saved to Firestore!');
    } catch (err: any) {
      console.error('Save failed:', err);
      showToast(err.message || 'Failed to save policies to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const currentPolicy = policies[activePolicyTab];

  return (
    <div className="space-y-8 animate-fade-in font-montserrat">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[var(--gold-500)]/20 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[var(--gold-300)]" />
            <h3 className="font-heading text-xl text-white font-bold tracking-wide">
              Policies, Delivery & Handling
            </h3>
          </div>
          <p className="text-xs text-white/60 mt-1 max-w-xl">
            Configure nationwide delivery timeframes, automated shipping rate formulas (flat rate, free above PKR threshold, or free for all), product handling fees, and publishable store policy pages.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="btn-gold px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-[var(--navy-900)] border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 animate-fade-in shadow-lg">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SHIPPING CHARGE, HANDLING CHARGE & DELIVERY TIME CONFIGURATION */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-[#081438] border border-[var(--gold-500)]/25 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--gold-500)]/15 border border-[var(--gold-500)]/30 text-[var(--gold-300)]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading text-base font-bold text-white">
                Delivery Settings & Shipping Rates
              </h4>
              <p className="text-xs text-white/50">
                Applied automatically in the Cart Drawer, Checkout, and displayed on Product detail pages.
              </p>
            </div>
          </div>

          {/* Master Enable Toggle */}
          <label className="flex items-center gap-3 cursor-pointer self-start sm:self-auto">
            <span className="text-xs font-semibold text-white/80">
              {deliverySettings.isEnabled ? 'Module Active' : 'Module Suspended'}
            </span>
            <input
              type="checkbox"
              checked={deliverySettings.isEnabled}
              onChange={(e) => handleDeliveryChange('isEnabled', e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors relative ${
                deliverySettings.isEnabled ? 'bg-[var(--gold-500)]' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  deliverySettings.isEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </div>
          </label>
        </div>

        {/* The 4 Core Settings Requested */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Delivery Time (text, e.g. "2 to 5 working days") */}
          <div className="space-y-2 p-4 rounded-xl bg-[#050F2E] border border-[var(--gold-500)]/20">
            <label className="text-xs font-semibold text-[var(--gold-300)] uppercase tracking-wider block flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Delivery Time</span>
            </label>
            <input
              type="text"
              value={deliverySettings.deliveryTimeText || ''}
              onChange={(e) => handleDeliveryChange('deliveryTimeText', e.target.value)}
              placeholder="e.g. 2 to 5 working days"
              className="w-full bg-[#081438] border border-[var(--gold-500)]/30 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--gold-500)] font-medium"
            />
            <p className="text-[11px] text-white/40">
              Displayed on product pages, cart drawer, and checkout.
            </p>
          </div>

          {/* 2. Delivery Charges (number, in PKR) */}
          <div className="space-y-2 p-4 rounded-xl bg-[#050F2E] border border-[var(--gold-500)]/20">
            <label className="text-xs font-semibold text-[var(--gold-300)] uppercase tracking-wider block flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Delivery Charges (PKR)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-white/40 font-mono">Rs.</span>
              <input
                type="number"
                min="0"
                step="50"
                value={deliverySettings.deliveryCharges ?? deliverySettings.flatRateAmount ?? 250}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDeliverySettings((prev) => ({
                    ...prev,
                    deliveryCharges: val,
                    flatRateAmount: val,
                  }));
                }}
                placeholder="250"
                className="w-full bg-[#081438] border border-[var(--gold-500)]/30 rounded-lg pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--gold-500)] font-mono"
              />
            </div>
            <p className="text-[11px] text-white/40">
              Standard nationwide courier fee applied to orders.
            </p>
          </div>

          {/* 3. Free Delivery Above Amount (number, optional in PKR) */}
          <div className="space-y-2 p-4 rounded-xl bg-[#050F2E] border border-[var(--gold-500)]/20">
            <label className="text-xs font-semibold text-[var(--gold-300)] uppercase tracking-wider block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#25D366]" />
              <span>Free Delivery Above (PKR)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-white/40 font-mono">Rs.</span>
              <input
                type="number"
                min="0"
                step="500"
                value={deliverySettings.freeDeliveryAbove ?? deliverySettings.freeAboveAmount ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setDeliverySettings((prev) => ({
                    ...prev,
                    freeDeliveryAbove: val,
                    freeAboveAmount: val || 0,
                    shippingType: val && val > 0 ? 'free_above' : 'flat',
                  }));
                }}
                placeholder="Optional, e.g. 5000"
                className="w-full bg-[#081438] border border-[var(--gold-500)]/30 rounded-lg pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--gold-500)] font-mono"
              />
            </div>
            <p className="text-[11px] text-white/40">
              If subtotal exceeds this amount, delivery becomes Rs. 0 (Free).
            </p>
          </div>

          {/* 4. Product Handling Charges (number, in PKR) */}
          <div className="space-y-2 p-4 rounded-xl bg-[#050F2E] border border-[var(--gold-500)]/20">
            <label className="text-xs font-semibold text-[var(--gold-300)] uppercase tracking-wider block flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Handling Charges (PKR)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-white/40 font-mono">Rs.</span>
              <input
                type="number"
                min="0"
                step="25"
                value={deliverySettings.handlingCharges ?? 0}
                onChange={(e) => handleDeliveryChange('handlingCharges', Number(e.target.value))}
                placeholder="0"
                className="w-full bg-[#081438] border border-[var(--gold-500)]/30 rounded-lg pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-[var(--gold-500)] font-mono"
              />
            </div>
            <p className="text-[11px] text-white/40">
              Applied per order for protective packaging and safety seals.
            </p>
          </div>
        </div>

        {/* Live Preview Summary Badge */}
        <div className="p-4 rounded-xl bg-[#050F2E] border border-[var(--gold-500)]/25 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80 font-medium">Customer Checkout Breakdown:</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded bg-[#081438] border border-white/10 font-mono text-[var(--gold-300)]">
                Delivery: Rs. {Number(deliverySettings.deliveryCharges ?? deliverySettings.flatRateAmount ?? 250).toLocaleString()}
                {(deliverySettings.freeDeliveryAbove || deliverySettings.freeAboveAmount) ? ` (Free > Rs. ${(deliverySettings.freeDeliveryAbove || deliverySettings.freeAboveAmount)?.toLocaleString()})` : ''}
              </span>
              {Number(deliverySettings.handlingCharges || 0) > 0 && (
                <span className="px-2.5 py-1 rounded bg-[#081438] border border-white/10 font-mono text-amber-200">
                  Handling: Rs. {Number(deliverySettings.handlingCharges).toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <div className="text-[11px] text-white/60">
            Estimated Delivery: <strong className="text-white font-semibold">{deliverySettings.deliveryTimeText}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STORE POLICIES EDITORS & TOGGLES */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-[#081438] border border-[var(--gold-500)]/25 space-y-6 shadow-xl">
        <div className="border-b border-white/10 pb-4">
          <h4 className="font-heading text-base font-bold text-white">
            Public Policy Pages & Texts
          </h4>
          <p className="text-xs text-white/50 mt-0.5">
            Select a policy to edit its public title, body copy, and toggle publication status. Each page is accessible via dedicated public URL and linked in the footer.
          </p>
        </div>

        {/* Policy Tab Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {POLICY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activePolicyTab === tab.key;
            const isEnabled = policies[tab.key]?.isEnabled !== false;

            return (
              <button
                key={tab.key}
                onClick={() => setActivePolicyTab(tab.key)}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-b from-[var(--gold-500)]/20 to-[var(--navy-900)] border-[var(--gold-500)] ring-1 ring-[var(--gold-500)]/50'
                    : 'bg-[#050F2E] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[var(--gold-300)]' : 'text-white/60'}`} />
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isEnabled ? 'bg-emerald-400' : 'bg-zinc-600'
                    }`}
                    title={isEnabled ? 'Published & Active' : 'Hidden / Draft'}
                  />
                </div>
                <div>
                  <span className={`text-xs font-semibold block line-clamp-1 ${isSelected ? 'text-white' : 'text-white/70'}`}>
                    {tab.label}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono block mt-0.5">
                    {tab.slug}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Policy Editor */}
        {currentPolicy && (
          <div className="p-5 rounded-xl bg-[#050F2E] border border-[var(--gold-500)]/20 space-y-5 animate-fade-in">
            {/* Policy Title & Visibility Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-semibold text-[var(--gold-300)] uppercase tracking-wider block">
                  Public Page Title
                </label>
                <input
                  type="text"
                  value={currentPolicy.title}
                  onChange={(e) => handlePolicyChange(activePolicyTab, 'title', e.target.value)}
                  placeholder="e.g. Delivery & White-Glove Dispatch"
                  className="w-full bg-[#081438] border border-[var(--gold-500)]/30 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[var(--gold-500)]"
                />
              </div>

              {/* Toggle publish status */}
              <div className="flex items-center gap-3 sm:pl-4 sm:border-l sm:border-white/10">
                <div className="text-right">
                  <span className="text-xs font-semibold text-white block">
                    {currentPolicy.isEnabled ? 'Published' : 'Hidden'}
                  </span>
                  <span className="text-[10px] text-white/40 block">
                    {currentPolicy.isEnabled ? 'Visible to public' : 'Page offline'}
                  </span>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentPolicy.isEnabled}
                    onChange={(e) => handlePolicyChange(activePolicyTab, 'isEnabled', e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      currentPolicy.isEnabled ? 'bg-[var(--gold-500)]' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        currentPolicy.isEnabled ? 'left-6' : 'left-1'
                      }`}
                    />
                  </div>
                </label>
              </div>
            </div>

            {/* Policy Content Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--gold-300)] uppercase tracking-wider block">
                  Policy Content Body (Markdown & Paragraphs)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    // Reset this specific policy to its default copy
                    const def = DEFAULT_POLICIES[activePolicyTab];
                    if (def) {
                      handlePolicyChange(activePolicyTab, 'title', def.title);
                      handlePolicyChange(activePolicyTab, 'content', def.content);
                      showToast(`Reset ${def.title} to default luxury template`);
                    }
                  }}
                  className="text-[11px] text-white/50 hover:text-[var(--gold-300)] transition-colors underline"
                >
                  Reset to Default Template
                </button>
              </div>

              <textarea
                rows={10}
                value={currentPolicy.content}
                onChange={(e) => handlePolicyChange(activePolicyTab, 'content', e.target.value)}
                placeholder="Enter policy terms, bullet points, and guidelines..."
                className="w-full bg-[#081438] border border-[var(--gold-500)]/30 rounded-lg p-4 text-xs text-white leading-relaxed font-sans placeholder-white/30 focus:outline-none focus:border-[var(--gold-500)]"
              />
              <p className="text-[11px] text-white/40">
                Tips: Use standard bullet symbols (• or -) and double linebreaks to separate paragraphs cleanly on the public page.
              </p>
            </div>

            {/* Public Link Bar */}
            <div className="pt-2 flex items-center justify-between text-xs text-white/60">
              <div className="flex items-center gap-2">
                <span>Public Route:</span>
                <code className="text-[var(--gold-300)] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  {POLICY_TABS.find((t) => t.key === activePolicyTab)?.slug}
                </code>
              </div>
              <a
                href={POLICY_TABS.find((t) => t.key === activePolicyTab)?.slug}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--gold-300)] hover:underline"
              >
                <span>View Public Page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Footer save reminder button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="btn-gold px-6 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save All Policies & Delivery Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
