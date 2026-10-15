import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  DollarSign, 
  Lock, 
  FileText, 
  Banknote, 
  MessageCircle, 
  Clock, 
  AlertCircle
} from 'lucide-react';
import { SiteSettings } from '../types/store';

export type PolicySlug = 
  | 'delivery-info' 
  | 'returns' 
  | 'refund-policy' 
  | 'privacy-policy' 
  | 'terms' 
  | 'cod-policy';

interface PolicyPageProps {
  slug: PolicySlug;
  settings: SiteSettings;
  onNavigate?: (page: string) => void;
}

interface PolicyMeta {
  slug: PolicySlug;
  label: string;
  icon: React.ElementType;
}

const ALL_POLICIES: PolicyMeta[] = [
  { slug: 'delivery-info', label: 'Delivery Information', icon: Truck },
  { slug: 'returns', label: 'Return and Exchange', icon: RotateCcw },
  { slug: 'refund-policy', label: 'Refund Policy', icon: DollarSign },
  { slug: 'privacy-policy', label: 'Privacy Policy', icon: Lock },
  { slug: 'terms', label: 'Terms of Service', icon: FileText },
  { slug: 'cod-policy', label: 'Cash on Delivery Policy', icon: Banknote },
];

export const PolicyPage: React.FC<PolicyPageProps> = ({
  slug,
  settings,
}) => {
  const currentPolicyConfig = settings.policies?.[slug];
  const isEnabled = currentPolicyConfig?.isEnabled !== false;

  const currentMeta = ALL_POLICIES.find((p) => p.slug === slug) || ALL_POLICIES[0];
  const IconComp = currentMeta.icon;

  useEffect(() => {
    const title = currentPolicyConfig?.title || currentMeta.label;
    document.title = `${title} | MUAVER`;
  }, [currentPolicyConfig?.title, currentMeta.label]);

  // Render paragraphs and bullets cleanly
  const renderFormattedContent = (text: string) => {
    if (!text) return null;

    const blocks = text.split('\n\n');

    return (
      <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed font-light">
        {blocks.map((block, idx) => {
          const lines = block.split('\n');

          // If block consists of bullet points
          const isBulletList = lines.some((l) => l.trim().startsWith('•') || l.trim().startsWith('-'));

          if (isBulletList) {
            return (
              <ul key={idx} className="space-y-2.5 my-3 pl-1">
                {lines.map((line, lineIdx) => {
                  const cleanText = line.replace(/^[•\-]\s*/, '').trim();
                  if (!cleanText) return null;

                  // Format bold keywords before colon e.g. "Standard Delivery Time:"
                  const colonSplit = cleanText.split(':');
                  if (colonSplit.length > 1) {
                    return (
                      <li key={lineIdx} className="flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#B89025] mt-2 shrink-0" />
                        <span>
                          <strong className="text-slate-900 font-semibold">{colonSplit[0]}:</strong>
                          {colonSplit.slice(1).join(':')}
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={lineIdx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B89025] mt-2 shrink-0" />
                      <span>{cleanText}</span>
                    </li>
                  );
                })}
              </ul>
            );
          }

          return (
            <p key={idx} className="leading-relaxed">
              {block}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14 space-y-10 font-montserrat text-slate-800">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-xs text-slate-400">
        <Link
          to="/"
          className="hover:text-slate-800 transition-colors"
        >
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-500">Policies</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-800 font-medium truncate">
          {currentPolicyConfig?.title || currentMeta.label}
        </span>
      </nav>

      {/* Hero Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <span className="text-xs uppercase tracking-widest text-[#B89025] font-semibold block">
          Customer Care
        </span>

        <h1 className="font-cinzel text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          {currentPolicyConfig?.title || currentMeta.label}
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500 pt-1">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Updated: {currentPolicyConfig?.lastUpdated || 'September 2026'}</span>
          </span>
          <span>•</span>
          <span className="text-emerald-700 font-medium">
            Cash on Delivery Available Nationwide
          </span>
        </div>
      </div>

      {/* Main Grid: Policy Nav Switcher (Left) + Document Content (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Quick Policy Switcher */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold pb-2 border-b border-slate-200">
              Policy Index
            </h3>
            <div className="space-y-1">
              {ALL_POLICIES.map((p) => {
                const ItemIcon = p.icon;
                const isSelected = p.slug === slug;
                const policyObj = settings.policies?.[p.slug];
                const active = policyObj?.isEnabled !== false;

                return (
                  <Link
                    key={p.slug}
                    to={`/${p.slug}`}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#0A1A4F] text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ItemIcon className={`w-4 h-4 ${isSelected ? 'text-[#F0D27A]' : 'text-slate-400'}`} />
                      <span>{policyObj?.title || p.label}</span>
                    </div>
                    {!active && (
                      <span className="text-[10px] text-slate-400">Draft</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* WhatsApp Support Card */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-900 font-semibold">
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>Have Questions?</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed font-light">
              Need assistance regarding shipping, exchanges, or order tracking? Contact our customer support team directly on WhatsApp.
            </p>
            <a
              href={`https://wa.me/${settings.whatsappRawNumber || '923242404984'}?text=${encodeURIComponent(`Assalam-o-Alaikum MUAVER Support, I have a question about ${currentPolicyConfig?.title || 'policies'}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold-outline w-full py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Right Column: Policy Document Body */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 sm:p-8 rounded-xl bg-white border border-slate-200 shadow-xs relative">
            {/* Document Header */}
            <div className="pb-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
                  <IconComp className="w-5 h-5 text-[#B89025]" />
                </div>
                <div>
                  <h2 className="font-cinzel text-xl sm:text-2xl font-bold text-slate-900">
                    {currentPolicyConfig?.title || currentMeta.label}
                  </h2>
                  <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block">
                    Official Store Policy
                  </span>
                </div>
              </div>
            </div>

            {/* Document Body */}
            <div className="py-6">
              {!isEnabled ? (
                <div className="p-5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-amber-900">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Policy Under Revision</span>
                  </div>
                  <p className="leading-relaxed text-amber-800 font-light">
                    This policy section is temporarily undergoing review. For immediate assistance or questions, please connect directly with our WhatsApp support.
                  </p>
                </div>
              ) : (
                renderFormattedContent(currentPolicyConfig?.content || '')
              )}
            </div>

            {/* Delivery & COD Assurance Strip */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cash on Delivery across Pakistan</span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <Truck className="w-4 h-4 text-[#B89025] shrink-0" />
                <span>
                  Delivery: <strong>{settings.deliverySettings?.deliveryTimeText || '2 to 5 working days'}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
