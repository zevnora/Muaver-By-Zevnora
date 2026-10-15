import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MessageCircle } from 'lucide-react';
import { SiteSettings } from '../types/store';

interface FooterProps {
  settings: SiteSettings;
  onNavigate?: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
  const hasInstagram = Boolean(settings.socialLinks?.instagram && settings.socialLinks.instagram.trim() !== '');
  const hasTikTok = Boolean(settings.socialLinks?.tiktok && settings.socialLinks.tiktok.trim() !== '');
  const hasFacebook = Boolean(settings.socialLinks?.facebook && settings.socialLinks.facebook.trim() !== '');

  return (
    <footer className="bg-[#0A1A4F] text-slate-300 border-t border-white/10 pt-14 pb-10 font-montserrat">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          
          {/* Brand Column */}
          <div className="space-y-4 lg:col-span-1">
            <Link to="/" className="inline-block transition-opacity hover:opacity-90">
              <img
                src={settings.landscapeLogoUrl || 'https://i.ibb.co/8n6t1tQH/Untitled-design.png'}
                alt="MUAVER"
                width={180}
                height={48}
                decoding="async"
                className="h-10 md:h-12 w-auto object-contain"
                loading="lazy"
              />
            </Link>
            {Boolean(settings.footerTagline?.trim()) && (
              <p className="text-xs uppercase tracking-wider text-[#F0D27A] font-medium">
                {settings.footerTagline}
              </p>
            )}
            <p className="text-xs text-slate-300 font-normal">
              Founder & CEO: Ashar Ul Haq Siddiqui
            </p>
            {Boolean(settings.footerBlurb?.trim()) && (
              <p className="text-xs leading-relaxed text-slate-400 font-light">
                {settings.footerBlurb}
              </p>
            )}

            {/* Social Icons */}
            <div className="pt-1 flex items-center space-x-3">
              <a
                href={settings.socialLinks?.instagram || 'https://www.instagram.com/muaver.co'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-white/15 flex items-center justify-center text-slate-300 hover:text-white hover:border-white/40 transition-colors"
                aria-label="Follow MUAVER on Instagram"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>

              <a
                href={settings.socialLinks?.tiktok || 'https://www.tiktok.com/@muaver.co'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-white/15 flex items-center justify-center text-slate-300 hover:text-white hover:border-white/40 transition-colors"
                aria-label="Follow MUAVER on TikTok"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.81 4.48 6.3 6.3 0 0 0 1.9-4.47V8.62a8.27 8.27 0 0 0 4.88 1.58V6.75a4.85 4.85 0 0 1-1-.06z"/>
                </svg>
              </a>

              <a
                href={settings.socialLinks?.facebook || 'https://www.facebook.com/people/Muaver-Luxury-Brand/61592411954625/'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-white/15 flex items-center justify-center text-slate-300 hover:text-white hover:border-white/40 transition-colors"
                aria-label="Follow MUAVER on Facebook"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.6 5H18V0h-3.808C10.597 0 9 1.583 9 4.615V8z"/>
                </svg>
              </a>

              <a
                href={`https://wa.me/${settings.whatsappRawNumber || '923242404984'}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-white/15 flex items-center justify-center text-[#25D366] hover:border-white/40 transition-colors"
                aria-label="Direct WhatsApp Support"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-white font-semibold">
              Explore
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <Link
                  to="/"
                  className="hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/shop"
                  className="hover:text-white transition-colors"
                >
                  All Fragrances
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="hover:text-white transition-colors"
                >
                  About Us & Story
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-white transition-colors"
                >
                  Contact & Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies Column */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-white font-semibold">
              Customer Policies
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <Link
                  to="/delivery-info"
                  className="hover:text-white transition-colors"
                >
                  Delivery Information
                </Link>
              </li>
              <li>
                <Link
                  to="/returns"
                  className="hover:text-white transition-colors"
                >
                  Return and Exchange
                </Link>
              </li>
              <li>
                <Link
                  to="/refund-policy"
                  className="hover:text-white transition-colors"
                >
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/cod-policy"
                  className="hover:text-white transition-colors"
                >
                  Cash on Delivery Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy-policy"
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Support Column */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-white font-semibold">
              Customer Support
            </h4>
            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <Phone className="w-3.5 h-3.5 text-[#F0D27A] shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Phone / WhatsApp</span>
                  <a
                    href={`https://wa.me/${settings.whatsappRawNumber || '923242404984'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors font-medium text-slate-200"
                  >
                    {settings.contactPhone || '+92 324 2404984'}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="w-3.5 h-3.5 text-[#F0D27A] shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Email</span>
                  <a
                    href={`mailto:${settings.contactEmail || 'hellomuaver@gmail.com'}`}
                    className="hover:text-white transition-colors font-medium text-slate-200"
                  >
                    {settings.contactEmail || 'hellomuaver@gmail.com'}
                  </a>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={`https://wa.me/${settings.whatsappRawNumber || '923242404984'}?text=${encodeURIComponent('Assalam-o-Alaikum MUAVER Customer Support, I would like assistance.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-gold inline-flex items-center gap-2 px-3.5 py-1.5 text-xs rounded-lg font-medium cursor-pointer shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-[#0A1A4F]" />
                  <span>Order on WhatsApp</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Clean subtle divider */}
        <div className="border-t border-white/10 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
            <div>
              {Boolean(settings.footerCopyright?.trim()) && settings.footerCopyright}
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>High Oil Concentration</span>
              <span>•</span>
              <span>Cash on Delivery</span>
              <span>•</span>
              <span>Nationwide Delivery</span>
            </div>
          </div>

          <div className="mt-3 text-center text-[10px] text-slate-500">
            <span>
              Website by{' '}
              <a
                href="https://zevnora.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white underline decoration-slate-600 transition-colors"
              >
                Zevnora
              </a>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
