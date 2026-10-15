import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, ShoppingBag, ArrowLeft } from 'lucide-react';
import { SiteSettings } from '../types/store';

interface NotFoundPageProps {
  settings?: SiteSettings;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = () => {
  useEffect(() => {
    document.title = '404 - Page Not Found | MUAVER Perfumes';
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16 sm:py-24 bg-white text-slate-800 font-montserrat">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 border border-slate-200 text-[#0A1A4F] shadow-sm mb-2">
          <Compass className="w-8 h-8 text-[#D4AF37]" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#D4AF37]">
            404 Error • Page Not Found
          </span>
          <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-[#0A1A4F] tracking-wide">
            Fragrance Unavailable
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            The page or fragrance you are looking for does not exist, has been archived, or the link may be mistyped.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/shop"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0A1A4F] text-[#F0D27A] hover:bg-[#060D20] rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explore Fragrance Collection</span>
          </Link>

          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Boutique</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
