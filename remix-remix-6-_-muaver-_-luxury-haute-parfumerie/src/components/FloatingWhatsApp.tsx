import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { SiteSettings } from '../types/store';

interface FloatingWhatsAppProps {
  settings: SiteSettings;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({ settings }) => {
  const [showTooltip, setShowTooltip] = useState(true);

  const phone = settings.whatsappRawNumber || '923242404984';
  const prefilledMessage = encodeURIComponent(
    'Assalam-o-Alaikum MUAVER Customer Support,\nI would like to inquire about your perfumes and get assistance with placing an order.'
  );
  const waUrl = `https://wa.me/${phone}?text=${prefilledMessage}`;

  return (
    <div className="fixed bottom-6 right-6 z-30 flex items-end gap-3 font-montserrat">
      {/* Interactive Tooltip Callout */}
      {showTooltip && (
        <div className="hidden sm:flex items-center gap-2 bg-white text-slate-800 text-xs py-2 px-3.5 rounded-full border border-slate-200 shadow-lg animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse shrink-0" />
          <span className="text-[11px] font-medium tracking-wide">
            Need help? Chat with us on WhatsApp
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            className="text-slate-400 hover:text-slate-700 ml-1 p-0.5 cursor-pointer"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Button */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex items-center justify-center w-13 h-13 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 cursor-pointer"
        aria-label="Chat on WhatsApp with MUAVER Customer Support"
      >
        <MessageCircle className="w-6 h-6 text-white fill-current" />
        <span className="sr-only">WhatsApp Support</span>
      </a>
    </div>
  );
};
