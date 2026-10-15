import React, { useState, useEffect, useRef } from 'react';

/**
 * Shimmering luxury skeleton card for product grids
 */
export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="rounded-2xl bg-[#081438] border border-[var(--gold-500)]/20 p-4 space-y-4 animate-pulse">
      {/* Bottle image placeholder */}
      <div className="aspect-[4/5] rounded-xl bg-[#050F2E] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--gold-500)]/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      </div>
      {/* Title & price */}
      <div className="space-y-2">
        <div className="h-3 w-24 bg-white/10 rounded" />
        <div className="h-4 w-40 bg-[var(--gold-500)]/20 rounded" />
        <div className="h-3 w-32 bg-white/10 rounded" />
        <div className="h-5 w-28 bg-[var(--gold-500)]/30 rounded mt-3" />
      </div>
    </div>
  );
};

/**
 * Shimmering luxury Hero banner placeholder
 */
export const HeroSkeleton: React.FC = () => {
  return (
    <div className="relative min-h-[500px] sm:min-h-[580px] w-full bg-[#050F2E] border-b border-[var(--gold-500)]/20 flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--gold-500)]/5 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
      <div className="max-w-2xl text-center space-y-4 relative z-10 animate-pulse">
        <div className="w-16 h-16 rounded-full bg-[var(--gold-500)]/20 mx-auto border border-[var(--gold-500)]/30" />
        <div className="h-4 w-48 bg-[var(--gold-500)]/20 rounded mx-auto" />
        <div className="h-10 w-72 sm:w-96 bg-white/20 rounded mx-auto" />
        <div className="h-4 w-64 sm:w-80 bg-white/10 rounded mx-auto" />
        <div className="h-12 w-44 bg-[var(--gold-500)]/40 rounded-lg mx-auto mt-6" />
      </div>
    </div>
  );
};

/**
 * Shimmering Flacon Spotlight section placeholder
 */
export const SpotlightSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12">
      <div className="rounded-3xl bg-[#081438] border border-[var(--gold-500)]/20 p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-pulse">
        <div className="lg:col-span-6 aspect-[4/5] rounded-2xl bg-[#050F2E] relative overflow-hidden" />
        <div className="lg:col-span-6 space-y-4">
          <div className="h-4 w-32 bg-[var(--gold-500)]/30 rounded" />
          <div className="h-8 w-64 bg-white/20 rounded" />
          <div className="h-4 w-40 bg-[var(--gold-500)]/20 rounded" />
          <div className="space-y-2 pt-2">
            <div className="h-3 w-full bg-white/10 rounded" />
            <div className="h-3 w-5/6 bg-white/10 rounded" />
            <div className="h-3 w-4/6 bg-white/10 rounded" />
          </div>
          <div className="h-12 w-48 bg-[var(--gold-500)]/40 rounded-lg mt-6" />
        </div>
      </div>
    </div>
  );
};

/**
 * LazySection: Renders children ONLY when scrolled near the viewport (IntersectionObserver)
 * Drastically cuts initial JS execution and DOM nodes on slow 3G mobile devices.
 */
interface LazySectionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
}

export const LazySection: React.FC<LazySectionProps> = ({
  children,
  fallback = <SpotlightSkeleton />,
  rootMargin = '300px 0px',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If IntersectionObserver is not supported, render immediately
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [rootMargin]);

  return (
    <div ref={containerRef}>
      {isVisible ? children : fallback}
    </div>
  );
};
