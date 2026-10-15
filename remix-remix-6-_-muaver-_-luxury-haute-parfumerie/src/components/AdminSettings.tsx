import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Check, 
  X, 
  Phone, 
  MessageCircle, 
  Mail, 
  Instagram, 
  Facebook, 
  DollarSign, 
  Sliders, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Truck,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { SiteSettings, SectionVisibility, PaymentSettings, PaymentAccount } from '../types/store';
import { updateSiteSettings, DEFAULT_SETTINGS, getPaymentSettings, updatePaymentSettings, DEFAULT_PAYMENT_SETTINGS } from '../services/storeService';

interface AdminSettingsProps {
  settings: SiteSettings;
  onRefresh: () => Promise<void>;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({ settings, onRefresh }) => {
  const [formData, setFormData] = useState<SiteSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Online Payment state
  const [paymentConfig, setPaymentConfig] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [loadingPayment, setLoadingPayment] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState<{ bankName: string; accountTitle: string; iban: string }>({
    bankName: '',
    accountTitle: '',
    iban: '',
  });

  // Load payment settings from Firestore on mount
  React.useEffect(() => {
    let isMounted = true;
    getPaymentSettings()
      .then((cfg) => {
        if (isMounted) {
          setPaymentConfig(cfg);
          setLoadingPayment(false);
        }
      })
      .catch((err) => {
        console.warn('Error loading payment settings:', err);
        if (isMounted) setLoadingPayment(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleOpenAddAccount = () => {
    setEditingAccountId(null);
    setAccountForm({ bankName: '', accountTitle: '', iban: '' });
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: PaymentAccount) => {
    setEditingAccountId(acc.id);
    setAccountForm({
      bankName: acc.bankName || '',
      accountTitle: acc.accountTitle || '',
      iban: acc.iban || '',
    });
    setIsAccountModalOpen(true);
  };

  const handleSaveAccountModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.bankName.trim() || !accountForm.accountTitle.trim() || !accountForm.iban.trim()) {
      showStatus('Please fill in Bank/Wallet Name, Account Title, and IBAN.', 'error');
      return;
    }

    if (editingAccountId) {
      // Editing existing account
      const updatedAccounts = (paymentConfig.accounts || []).map((acc) =>
        acc.id === editingAccountId
          ? {
              ...acc,
              bankName: accountForm.bankName.trim(),
              accountTitle: accountForm.accountTitle.trim(),
              iban: accountForm.iban.trim(),
            }
          : acc
      );
      setPaymentConfig({ ...paymentConfig, accounts: updatedAccounts });
    } else {
      // Adding new account
      const newAcc: PaymentAccount = {
        id: `acc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        bankName: accountForm.bankName.trim(),
        accountTitle: accountForm.accountTitle.trim(),
        iban: accountForm.iban.trim(),
        isEnabled: true,
        order: (paymentConfig.accounts || []).length + 1,
      };
      setPaymentConfig({
        ...paymentConfig,
        accounts: [...(paymentConfig.accounts || []), newAcc],
      });
    }

    setIsAccountModalOpen(false);
    showStatus('Account saved! Click "Save Payment Settings" below to persist changes.', 'success');
  };

  const handleDeleteAccount = (accId: string) => {
    if (!window.confirm('Are you sure you want to remove this payment account?')) return;
    const updated = (paymentConfig.accounts || []).filter((a) => a.id !== accId);
    setPaymentConfig({ ...paymentConfig, accounts: updated });
    showStatus('Account removed. Remember to save changes.', 'success');
  };

  const handleToggleAccountActive = (accId: string) => {
    const updated = (paymentConfig.accounts || []).map((a) =>
      a.id === accId ? { ...a, ...{ isEnabled: !a.isEnabled } } : a
    );
    setPaymentConfig({ ...paymentConfig, accounts: updated });
  };

  const handleMoveAccount = (index: number, direction: 'up' | 'down') => {
    const list = [...(paymentConfig.accounts || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setPaymentConfig({ ...paymentConfig, accounts: list });
  };

  const handleSavePaymentSettingsDirect = async () => {
    try {
      setSavingPayment(true);
      await updatePaymentSettings(paymentConfig);
      await onRefresh();
      showStatus('Payment accounts and settings successfully saved to Firestore!', 'success');
    } catch (err: any) {
      console.error('Error saving payment settings:', err);
      showStatus(err.message || 'Failed to save payment settings.', 'error');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleToggleVisibility = (key: keyof SectionVisibility) => {
    const currentVis: SectionVisibility = formData.visibility || {
      showAnnouncementBar: true,
      showHeroSlider: true,
      showFeaturedProduct: true,
      showBrandStory: true,
      showWhyFeatures: true,
      showTestimonials: true,
      showWhatsAppStrip: true,
    };

    setFormData({
      ...formData,
      visibility: {
        ...currentVis,
        [key]: !currentVis[key],
      },
    });
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      setSaving(true);
      // Clean raw WhatsApp digits
      const cleanedRaw = formData.whatsappRawNumber.replace(/\D/g, '');
      const toSave: SiteSettings = {
        ...formData,
        whatsappRawNumber: cleanedRaw || '923242404984',
      };

      await updateSiteSettings(toSave);
      await updatePaymentSettings(paymentConfig);
      setFormData(toSave);
      await onRefresh();
      showStatus('Settings & payment configuration successfully updated and synchronized with storefront!', 'success');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      showStatus(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const visibility = formData.visibility || {
    showAnnouncementBar: true,
    showHeroSlider: true,
    showFeaturedProduct: true,
    showBrandStory: true,
    showWhyFeatures: true,
    showTestimonials: true,
    showWhatsAppStrip: true,
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--gold-500)]/20">
        <div>
          <h2 className="font-heading text-xl sm:text-2xl text-white font-bold tracking-wide flex items-center gap-2.5">
            <span>Store Configuration & Channels</span>
          </h2>
          <p className="text-xs text-white/60">
            Control business numbers, concierge links, social integrations, currency, and storefront section visibility.
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
            <span>{saving ? 'Synchronizing...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
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

      {/* Settings Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: General & Contact (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Store Identity */}
          <div className="bg-[#081438] rounded-2xl border border-[var(--gold-500)]/25 p-6 space-y-4 shadow-xl">
            <div className="pb-3 border-b border-white/10 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--gold-300)]" />
              <h3 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                Store Identity & Nomenclature
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1">
                  Website & Browser Tab Title
                </label>
                <input
                  type="text"
                  value={formData.siteTitle}
                  onChange={(e) => setFormData({ ...formData, siteTitle: e.target.value })}
                  placeholder="MUAVER | Luxury Brand"
                  className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs font-bold focus:outline-none focus:border-[var(--gold-500)]"
                />
                <span className="text-[9px] text-white/40 block mt-1">
                  Displayed in the browser tab, bookmarks, and search results.
                </span>
              </div>

              <div>
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1">
                  Tagline (Shown in Header & Footer)
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs focus:outline-none focus:border-[var(--gold-500)]"
                />
                <span className="text-[9px] text-white/40 block mt-1">
                  Motto displayed across header crest and footer credentials.
                </span>
              </div>
            </div>

            {/* Favicon URL with Live Preview */}
            <div className="p-3.5 rounded-xl bg-[var(--navy-900)] border border-[var(--gold-500)]/20">
              <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-2 font-semibold">
                Browser Tab Favicon & Monogram Icon URL
              </label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#050F2E] border border-[var(--gold-500)]/40 flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-inner">
                  <img
                    src={formData.iconUrl || 'https://i.ibb.co/M5Dq0xS9/Icon.png'}
                    alt="Favicon Preview"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://i.ibb.co/M5Dq0xS9/Icon.png';
                    }}
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="url"
                    value={formData.iconUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        iconUrl: e.target.value,
                        faviconUrl: e.target.value,
                      })
                    }
                    placeholder="https://i.ibb.co/M5Dq0xS9/Icon.png"
                    className="w-full px-3 py-2 rounded bg-[#081438] border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[var(--gold-500)]"
                  />
                  <span className="text-[9px] text-white/40 block mt-1">
                    Direct image URL for the browser tab icon and mobile touch icons (e.g. https://i.ibb.co/M5Dq0xS9/Icon.png).
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1">
                  Currency Code
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="PKR"
                  className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                  placeholder="Rs."
                  className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs focus:outline-none font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1">
                Complimentary Shipping Notice
              </label>
              <input
                type="text"
                value={formData.freeShippingNotice}
                onChange={(e) => setFormData({ ...formData, freeShippingNotice: e.target.value })}
                className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Contact & WhatsApp Concierge */}
          <div className="bg-[#081438] rounded-2xl border border-[var(--gold-500)]/25 p-6 space-y-4 shadow-xl">
            <div className="pb-3 border-b border-white/10 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <h3 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                Concierge Contact & WhatsApp Ordering
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1">
                  Display WhatsApp Number
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.whatsappNumber}
                    onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    placeholder="+92 324 2404984"
                    className="w-full pl-9 pr-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1">
                  WhatsApp Raw Digits (For wa.me links)
                </label>
                <input
                  type="text"
                  value={formData.whatsappRawNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappRawNumber: e.target.value })}
                  placeholder="923242404984"
                  className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs font-mono focus:outline-none"
                />
                <span className="text-[9px] text-white/40 block mt-1">Country code + number without plus (e.g. 923242404984)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1">
                  Customer Telephone Hotline
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+92 324 2404984"
                    className="w-full pl-9 pr-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1">
                  Official Executive Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="hellomuaver@gmail.com"
                    className="w-full pl-9 pr-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Social Media Links */}
          <div className="bg-[#081438] rounded-2xl border border-[var(--gold-500)]/25 p-6 space-y-4 shadow-xl">
            <div className="pb-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Instagram className="w-4 h-4 text-[var(--gold-300)]" />
                <h3 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                  Social Media Channels
                </h3>
              </div>
              <span className="text-[10px] text-white/40 italic">Icons hide automatically if field is empty</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1">
                  Instagram Profile Link
                </label>
                <input
                  type="text"
                  value={formData.socialLinks?.instagram || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...(formData.socialLinks || {} as any), instagram: e.target.value },
                    })
                  }
                  placeholder="https://www.instagram.com/muaver.co"
                  className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1">
                  TikTok Channel Link
                </label>
                <input
                  type="text"
                  value={formData.socialLinks?.tiktok || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...(formData.socialLinks || {} as any), tiktok: e.target.value },
                    })
                  }
                  placeholder="https://www.tiktok.com/@muaver.co"
                  className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1">
                  Facebook Page Link
                </label>
                <input
                  type="text"
                  value={formData.socialLinks?.facebook || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      socialLinks: { ...(formData.socialLinks || {} as any), facebook: e.target.value },
                    })
                  }
                  placeholder="https://www.facebook.com/people/Muaver-Luxury-Brand/61592411954625/"
                  className="w-full px-3 py-2 rounded bg-[var(--navy-900)] border border-white/15 text-white text-xs font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. Payment Accounts & Online Payment */}
          <div className="bg-[#081438] rounded-2xl border border-[var(--gold-500)]/25 p-6 space-y-5 shadow-xl">
            <div className="pb-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-[var(--gold-300)]" />
                <div>
                  <h3 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                    Payment Accounts & Online Payment
                  </h3>
                  <span className="text-[10px] text-white/50 block">
                    Saved in Firestore collection <code className="text-[var(--gold-300)] font-mono">settings/payment</code>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenAddAccount}
                  className="btn-gold-primary px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[var(--navy-900)]" />
                  <span>Add Account</span>
                </button>
                <button
                  type="button"
                  disabled={savingPayment}
                  onClick={handleSavePaymentSettingsDirect}
                  className="px-3 py-1.5 rounded-lg border border-[var(--gold-500)]/40 text-[var(--gold-300)] hover:bg-[var(--gold-500)]/10 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingPayment ? 'Saving...' : 'Save Payments'}</span>
                </button>
              </div>
            </div>

            {/* Global Settings: Enable Toggle, WhatsApp Number, Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Enable Online Payment Toggle */}
              <div className="p-3.5 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Enable Online Payment</span>
                  <span className="text-[10px] text-white/50">
                    Show Online Payment card at checkout (requires active accounts)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPaymentConfig({
                      ...paymentConfig,
                      isEnabled: !paymentConfig.isEnabled,
                    })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    paymentConfig.isEnabled ? 'bg-[var(--gold-500)]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      paymentConfig.isEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* WhatsApp Number for Slips */}
              <div className="p-3.5 rounded-xl bg-[var(--navy-900)] border border-white/10 space-y-1">
                <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block font-semibold">
                  WhatsApp for Payment Slips
                </label>
                <div className="relative">
                  <MessageCircle className="w-3.5 h-3.5 text-[#25D366] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={paymentConfig.slipWhatsAppNumber || ''}
                    onChange={(e) =>
                      setPaymentConfig({
                        ...paymentConfig,
                        slipWhatsAppNumber: e.target.value,
                      })
                    }
                    placeholder="+92 324 2404984"
                    className="w-full pl-9 pr-3 py-1.5 rounded bg-[#081438] border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-[var(--gold-500)]"
                  />
                </div>
                <span className="text-[9px] text-white/40 block">Customer sends transfer receipt screenshot to this number.</span>
              </div>
            </div>

            {/* Instruction Text */}
            <div className="p-3.5 rounded-xl bg-[var(--navy-900)] border border-white/10 space-y-1.5">
              <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block font-semibold">
                Customer Instructions Text
              </label>
              <textarea
                rows={2}
                value={paymentConfig.instructionText || ''}
                onChange={(e) =>
                  setPaymentConfig({
                    ...paymentConfig,
                    instructionText: e.target.value,
                  })
                }
                placeholder="Transfer the exact amount and send your payment slip on WhatsApp. We confirm your order after verification."
                className="w-full px-3 py-2 rounded bg-[#081438] border border-white/15 text-white text-xs focus:outline-none focus:border-[var(--gold-500)] resize-none"
              />
              <span className="text-[9px] text-white/40 block">Displayed prominently above transfer accounts on the checkout page.</span>
            </div>

            {/* Payment Accounts List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-heading uppercase tracking-wider text-white font-bold flex items-center gap-2">
                  <span>Registered Accounts ({paymentConfig.accounts?.length || 0})</span>
                </h4>
                <span className="text-[10px] text-white/40 italic">
                  Drag/reorder using arrows, or toggle active status
                </span>
              </div>

              {(!paymentConfig.accounts || paymentConfig.accounts.length === 0) ? (
                <div className="p-8 rounded-xl bg-[var(--navy-900)]/60 border border-dashed border-white/15 text-center space-y-2">
                  <CreditCard className="w-8 h-8 text-[var(--gold-300)]/40 mx-auto" />
                  <p className="text-xs text-white/70 font-medium">No payment accounts configured yet</p>
                  <p className="text-[11px] text-white/40 max-w-sm mx-auto">
                    Online Payment at checkout is hidden until you add at least one active bank or wallet account.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenAddAccount}
                    className="btn-gold-primary px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 mt-2 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[var(--navy-900)]" />
                    <span>Add First Account</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {paymentConfig.accounts.map((acc, idx) => (
                    <div
                      key={acc.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        acc.isEnabled
                          ? 'bg-[var(--navy-900)] border-[var(--gold-500)]/30'
                          : 'bg-[var(--navy-900)]/40 border-white/10 opacity-60'
                      }`}
                    >
                      {/* Account Summary */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white uppercase tracking-wider">
                            {acc.bankName}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              acc.isEnabled
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                            }`}
                          >
                            {acc.isEnabled ? 'Active' : 'Disabled'}
                          </span>
                        </div>

                        <div className="text-[11px] text-white/80 space-y-0.5">
                          <p>
                            <span className="text-white/40">Title:</span> <strong className="text-white">{acc.accountTitle}</strong>
                          </p>
                          <p className="font-mono text-[10px] text-[var(--gold-300)] break-all">
                            <span className="text-white/40 font-sans">IBAN:</span> {acc.iban}
                          </p>
                        </div>
                      </div>

                      {/* Controls: Reorder, Active Toggle, Edit, Delete */}
                      <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                        {/* Reorder Arrows */}
                        <div className="flex items-center bg-[#081438] rounded-lg border border-white/10 p-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveAccount(idx, 'up')}
                            className="p-1 text-white/60 hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === paymentConfig.accounts.length - 1}
                            onClick={() => handleMoveAccount(idx, 'down')}
                            className="p-1 text-white/60 hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* On/Off Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleAccountActive(acc.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border cursor-pointer ${
                            acc.isEnabled
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {acc.isEnabled ? 'Turn Off' : 'Turn On'}
                        </button>

                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditAccount(acc)}
                          className="p-1.5 rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5 cursor-pointer"
                          title="Edit Account"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="p-1.5 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Add/Edit Payment Account Modal */}
        {isAccountModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-[#081438] border border-[var(--gold-500)]/30 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[var(--gold-300)]" />
                  <h3 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                    {editingAccountId ? 'Edit Payment Account' : 'Add Payment Account'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="p-1 text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAccountModal} className="space-y-4">
                {/* Field 1: Bank / Wallet Name */}
                <div>
                  <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1 font-semibold">
                    Bank / Wallet Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountForm.bankName}
                    onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                    placeholder="e.g. Meezan Bank, Easypaisa, JazzCash"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--navy-900)] border border-white/20 text-white text-xs focus:outline-none focus:border-[var(--gold-300)]"
                  />
                  <span className="text-[9px] text-white/40 block mt-1">
                    The bank institution or digital wallet brand name.
                  </span>
                </div>

                {/* Field 2: Account Title */}
                <div>
                  <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1 font-semibold">
                    Account Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountForm.accountTitle}
                    onChange={(e) => setAccountForm({ ...accountForm, accountTitle: e.target.value })}
                    placeholder="e.g. MUAVER Luxury / Ashar Ul Haq Siddiqui"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--navy-900)] border border-white/20 text-white text-xs focus:outline-none focus:border-[var(--gold-300)]"
                  />
                  <span className="text-[9px] text-white/40 block mt-1">
                    The verified account holder name.
                  </span>
                </div>

                {/* Field 3: IBAN (Only IBAN, NO account number field!) */}
                <div>
                  <label className="text-[10px] uppercase font-heading tracking-widest text-[var(--gold-300)] block mb-1 font-semibold">
                    IBAN <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountForm.iban}
                    onChange={(e) => setAccountForm({ ...accountForm, iban: e.target.value.toUpperCase() })}
                    placeholder="e.g. PK36MEZN0000000000000000"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--navy-900)] border border-white/20 text-white text-xs font-mono focus:outline-none focus:border-[var(--gold-300)]"
                  />
                  <span className="text-[9px] text-white/40 block mt-1">
                    International Bank Account Number (or wallet account ID).
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsAccountModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs text-white/70 hover:text-white hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-gold-primary px-5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-[var(--navy-900)]" />
                    <span>{editingAccountId ? 'Update Account' : 'Add Account'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Right Column: Section Visibility Toggles (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#081438] rounded-2xl border border-[var(--gold-500)]/25 p-6 space-y-5 shadow-xl sticky top-24">
            <div className="pb-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--gold-300)]" />
                <h3 className="font-heading text-sm font-bold text-white uppercase tracking-wider">
                  Section Visibility
                </h3>
              </div>
              <span className="text-[10px] text-white/40 font-mono">Live Toggle</span>
            </div>

            <p className="text-xs text-white/60">
              Instantly enable or disable sections on the public storefront without deleting content.
            </p>

            <div className="space-y-3.5 pt-1">
              {/* Announcement Bar */}
              <div className="p-3 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Announcement Bar</span>
                  <span className="text-[10px] text-white/40">Top royal gold ticker</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showAnnouncementBar')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    visibility.showAnnouncementBar ? 'bg-[var(--gold-500)]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      visibility.showAnnouncementBar ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Hero Banner Slider */}
              <div className="p-3 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Hero Banner Slider</span>
                  <span className="text-[10px] text-white/40">5s auto-rotating slider</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showHeroSlider')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    visibility.showHeroSlider ? 'bg-[var(--gold-500)]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      visibility.showHeroSlider ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Featured Product Spotlight */}
              <div className="p-3 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Featured Spotlight</span>
                  <span className="text-[10px] text-white/40">Hero product spotlight section</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showFeaturedProduct')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    visibility.showFeaturedProduct ? 'bg-[var(--gold-500)]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      visibility.showFeaturedProduct ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Brand Story */}
              <div className="p-3 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Brand Story</span>
                  <span className="text-[10px] text-white/40">Heritage & brand story</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showBrandStory')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    visibility.showBrandStory ? 'bg-[var(--gold-500)]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      visibility.showBrandStory ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Why MUAVER Features */}
              <div className="p-3 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">"Why MUAVER" 4 Pillars</span>
                  <span className="text-[10px] text-white/40">Authentic, Long-Lasting, COD, Luxury Box</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showWhyFeatures')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    visibility.showWhyFeatures ? 'bg-[var(--gold-500)]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      visibility.showWhyFeatures ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Testimonials */}
              <div className="p-3 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">Patron Acclaim</span>
                  <span className="text-[10px] text-white/40">Customer reviews strip</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showTestimonials')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    visibility.showTestimonials ? 'bg-[var(--gold-500)]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      visibility.showTestimonials ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* WhatsApp Strip */}
              <div className="p-3 rounded-xl bg-[var(--navy-900)] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white block">WhatsApp Order Callout</span>
                  <span className="text-[10px] text-white/40">Pre-footer concierge bar</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVisibility('showWhatsAppStrip')}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                    visibility.showWhatsAppStrip ? 'bg-[var(--gold-500)]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                      visibility.showWhatsAppStrip ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave()}
                className="btn-gold-primary w-full py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Save className="w-3.5 h-3.5 text-[var(--navy-900)]" />
                <span>Save Visibility State</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
