import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, MessageCircle, User } from 'lucide-react';
import { SiteSettings, CustomerProfile } from '../types/store';

interface HeaderProps {
  settings: SiteSettings;
  activePage?: string;
  onNavigate?: (page: string, productId?: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  customer?: CustomerProfile | null;
  onOpenAuth?: (mode?: 'signin' | 'signup') => void;
  onOpenAccount?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  cartCount,
  onOpenCart,
  customer,
  onOpenAuth,
  onOpenAccount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/shop', label: 'Shop' },
    { path: '/about', label: 'About' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0A1A4F] text-white border-b border-white/10 transition-all duration-200 shadow-sm">
      {/* Top Clean Announcement Bar */}
      {settings.visibility?.showAnnouncementBar !== false && Boolean(settings.announcementText?.trim()) && (
        <div className="bg-[#060D20] text-slate-200 py-1.5 px-4 text-center border-b border-white/5">
          <div className="max-w-7xl mx-auto flex items-center justify-center text-[11px] sm:text-xs tracking-wide">
            <span className="font-normal text-slate-300">
              {settings.announcementText}
            </span>
          </div>
        </div>
      )}

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          
          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-200 hover:text-white transition-colors focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Brand Logo */}
          <div className="flex-1 md:flex-none flex justify-center md:justify-start items-center">
            <Link
              to="/"
              className="group flex items-center gap-2 focus:outline-none py-1 transition-opacity hover:opacity-90"
            >
              <img
                src={settings.landscapeLogoUrl || 'https://i.ibb.co/8n6t1tQH/Untitled-design.png'}
                alt="MUAVER"
                width={180}
                height={48}
                decoding="async"
                className="h-9 sm:h-10 md:h-12 w-auto object-contain"
                loading="eager"
              />
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-7 lg:space-x-9">
            {navLinks.map((link) => {
              const isActive = link.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-xs tracking-wider uppercase transition-colors relative py-1 focus:outline-none ${
                    isActive
                      ? 'text-[#F0D27A] font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-[#D4AF37] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Customer Log In / My Account */}
            {customer ? (
              <button
                onClick={onOpenAccount}
                className="flex items-center gap-1.5 text-xs text-slate-200 hover:text-[#F0D27A] px-2.5 py-1.5 rounded-md transition-colors hover:bg-white/5 cursor-pointer"
                title="My Account"
              >
                <User className="w-4 h-4 text-[#D4AF37]" />
                <span className="hidden sm:inline font-medium max-w-[120px] truncate">
                  {customer.fullName ? customer.fullName.split(' ')[0] : 'Account'}
                </span>
              </button>
            ) : (
              <button
                onClick={() => onOpenAuth?.('signin')}
                className="flex items-center gap-1.5 text-xs text-slate-200 hover:text-white px-2.5 py-1.5 rounded-md transition-colors hover:bg-white/5 cursor-pointer"
                title="Log In"
              >
                <User className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline font-medium">Log In</span>
              </button>
            )}

            {/* WhatsApp Quick Link */}
            <a
              href={`https://wa.me/${settings.whatsappRawNumber || '923242404984'}?text=${encodeURIComponent('Assalam-o-Alaikum MUAVER Customer Support, I would like to inquire about your fragrances.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-1 text-xs text-slate-200 hover:text-white border border-white/20 hover:border-white/40 px-2.5 py-1.5 rounded-md transition-colors"
              title="Chat on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
              <span className="font-medium">WhatsApp</span>
            </a>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative p-2 text-slate-200 hover:text-white hover:bg-white/5 rounded-md transition-colors focus:outline-none cursor-pointer"
              aria-label="Open Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[#D4AF37] text-[#0A1A4F] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0A1A4F] px-5 py-4 space-y-3 shadow-lg">
          {/* Mobile Account Row */}
          <div>
            {customer ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAccount?.();
                }}
                className="w-full py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-left flex items-center justify-between text-xs text-white"
              >
                <div className="flex items-center gap-2 truncate">
                  <User className="w-4 h-4 text-[#D4AF37]" />
                  <span className="truncate">My Account ({customer.fullName || customer.email})</span>
                </div>
                <span className="text-[10px] text-[#D4AF37] font-semibold">Orders & Chat</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth?.();
                }}
                className="w-full py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-left flex items-center justify-between text-xs text-white"
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-300" />
                  <span>Log In / Sign Up</span>
                </div>
                <span className="text-[10px] text-[#D4AF37]">Sign In</span>
              </button>
            )}
          </div>

          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = link.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-2 px-3 text-left text-xs uppercase tracking-wider rounded-md transition-colors ${
                    isActive
                      ? 'bg-white/10 text-[#F0D27A] font-semibold'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <a
                href={`https://wa.me/${settings.whatsappRawNumber || '923242404984'}?text=${encodeURIComponent('Assalam-o-Alaikum MUAVER Concierge, I would like to inquire about your perfumes.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#25D366] hover:underline flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp: {settings.contactPhone || '+92 324 2404984'}</span>
              </a>
            </div>
        </div>
      )}
    </header>
  );
};
