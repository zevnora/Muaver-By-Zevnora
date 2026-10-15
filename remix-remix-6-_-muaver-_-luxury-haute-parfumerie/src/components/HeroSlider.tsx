import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BannerSlide, Product, SiteSettings } from '../types/store';
import { ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import { buildWhatsAppOrderUrl, buildGeneralWhatsAppUrl, DEFAULT_STATIC_IMAGES } from '../services/storeService';
import { SITE_URL } from '../config/constants';
import { getOptimizedImageUrl } from './OptimizedImage';

interface HeroSliderProps {
  banners: BannerSlide[];
  onNavigate?: (page: string, productId?: string) => void;
  featuredProduct?: Product;
  settings: SiteSettings;
}

/**
 * Slide background media with:
 * - Robust mobile image fallback: falls back to desktop image if mobile image is empty or fails
 * - Deep navy background with subtle MUAVER watermark on failure or loading (no broken image icon)
 * - Absolute positioning with object-fit: cover and object-position: center
 * - Dark navy gradient overlay above image for optimal text readability
 * - Zero collapsed height or permanent blur
 */
const HeroSlideImage: React.FC<{
  slide: BannerSlide;
  isActive: boolean;
  priority: boolean;
  fallbackImage: string;
}> = ({ slide, isActive, priority, fallbackImage }) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 640;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    onChange(mq);
    const handler = (e: MediaQueryListEvent) => onChange(e);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Determine desktop and mobile sources
  const desktopSrc = (slide.desktopImage && slide.desktopImage.trim()) || fallbackImage;
  const preferredMobileSrc =
    slide.mobileImage && slide.mobileImage.trim() ? slide.mobileImage.trim() : desktopSrc;

  // Error tracking states
  const [mobileFailed, setMobileFailed] = useState(false);
  const [desktopFailed, setDesktopFailed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Reset error states when slide URLs change
  useEffect(() => {
    setMobileFailed(false);
    setDesktopFailed(false);
    setIsLoaded(false);
  }, [slide.desktopImage, slide.mobileImage]);

  // Active image selection:
  // a) Mobile image fallback: if mobile image is empty or fails to load, automatically fall back to desktop image.
  let currentSrc = isMobile && !mobileFailed ? preferredMobileSrc : desktopSrc;
  if (desktopFailed && fallbackImage && currentSrc !== fallbackImage) {
    currentSrc = fallbackImage;
  }
  const isCompletelyFailed =
    (mobileFailed || !isMobile) &&
    desktopFailed &&
    (!fallbackImage || currentSrc === fallbackImage);

  const handleError = () => {
    if (isMobile && !mobileFailed && preferredMobileSrc !== desktopSrc) {
      // Mobile image failed -> fall back to desktop image
      setMobileFailed(true);
      setIsLoaded(false);
    } else if (!desktopFailed && currentSrc !== fallbackImage && fallbackImage) {
      // Desktop image failed -> fall back to site fallback
      setDesktopFailed(true);
      setIsLoaded(false);
    } else {
      // All options failed -> hide broken image completely and show watermark on navy background
      setDesktopFailed(true);
      setMobileFailed(true);
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [currentSrc]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#0A1A4F]">
      {/* Background with subtle MUAVER Icon watermark (always exists below image) */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
        aria-hidden="true"
      >
        <div className="relative flex flex-col items-center justify-center">
          <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-[#D4AF37]/5 blur-3xl absolute" />
          <img
            src="https://i.ibb.co/M5Dq0xS9/Icon.png"
            alt=""
            width={120}
            height={120}
            className="w-24 h-24 sm:w-32 sm:h-32 object-contain opacity-15 filter brightness-125"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      </div>

      {/* Main Hero Banner Image: absolute, fills container, no collapsed height, z-[1], no broken icon */}
      {!isCompletelyFailed && currentSrc && (
        <img
          ref={imgRef}
          src={getOptimizedImageUrl(currentSrc, { quality: 85, width: isMobile ? 800 : 1600 })}
          alt={slide.heading || 'MUAVER Luxury Perfumes'}
          width={1600}
          height={680}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          className={`absolute inset-0 w-full h-full min-w-full min-h-full object-cover object-center z-[1] transform transition-transform duration-[6000ms] ease-out ${
            isActive ? 'scale-105' : 'scale-100'
          } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          style={{
            minHeight: '100%',
            minWidth: '100%',
            height: '100%',
            width: '100%',
          }}
        />
      )}

      {/* Dark Navy Gradient Overlay: positioned at z-[2] above image so text stays easily readable */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none bg-gradient-to-t from-[#0A1A4F] via-[#0A1A4F]/65 to-[#0A1A4F]/40 sm:bg-gradient-to-r sm:from-[#0A1A4F]/90 sm:via-[#0A1A4F]/60 sm:to-[#0A1A4F]/30"
      />
    </div>
  );
};

export const HeroSlider: React.FC<HeroSliderProps> = ({
  banners,
  onNavigate,
  featuredProduct,
  settings,
}) => {
  // Filter active banners and sort
  const activeBanners = banners
    .filter((b) => b.isActive !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const total = activeBanners.length;

  // Auto-adjust index if active banner was deleted
  useEffect(() => {
    if (currentIndex >= total && total > 0) {
      setCurrentIndex(0);
    }
  }, [total, currentIndex]);

  const nextSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Auto-play interval: every 5 seconds (paused when user hovers or touches)
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const interval = setInterval(() => {
      nextSlide();
    }, 5000);

    return () => clearInterval(interval);
  }, [total, isPaused, nextSlide]);

  // Touch swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (touchStartXRef.current !== null && touchEndXRef.current !== null) {
      const diffX = touchStartXRef.current - touchEndXRef.current;
      const minSwipeDistance = 45;
      if (diffX > minSwipeDistance) {
        // Swiped left -> next slide
        nextSlide();
      } else if (diffX < -minSwipeDistance) {
        // Swiped right -> prev slide
        prevSlide();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Button action handler
  const navigate = useNavigate();

  const handleButtonClick = (slide: BannerSlide) => {
    const link = slide.buttonLink?.toLowerCase().trim() || 'shop';
    if (link === 'whatsapp') {
      if (featuredProduct) {
        const firstVariant = featuredProduct.variants?.[0];
        const vPrice = firstVariant ? (Number(firstVariant.price) || Number(featuredProduct.price) || 0) : (Number(featuredProduct.price) || 0);
        const prodUrl = `${SITE_URL}/product/${featuredProduct.slug || featuredProduct.id}`;
        window.open(
          buildWhatsAppOrderUrl(
            featuredProduct.name,
            firstVariant?.label || firstVariant?.size || '50ml',
            1,
            vPrice,
            prodUrl,
            settings.whatsappRawNumber
          ),
          '_blank',
          'noopener,noreferrer'
        );
      } else {
        window.open(buildGeneralWhatsAppUrl(settings.whatsappRawNumber), '_blank', 'noopener,noreferrer');
      }
    } else if (link === 'product' && featuredProduct) {
      navigate(`/product/${featuredProduct.slug || featuredProduct.id}`);
    } else if (link === 'shop') {
      navigate('/shop');
    } else if (link.startsWith('http://') || link.startsWith('https://')) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else if (link.startsWith('/')) {
      navigate(link);
    } else {
      navigate(`/${link}`);
    }
  };

  if (!activeBanners || activeBanners.length === 0) {
    return null;
  }

  const defaultHeroFallback = settings.heroFallbackImage || DEFAULT_STATIC_IMAGES.heroFallbackImage;

  return (
    <section
      className="relative w-full overflow-hidden select-none bg-[#0A1A4F] border-b border-slate-200"
      aria-label="Hero Showcase"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slider Viewport: Fixed height on mobile (70vh with min 420px), responsive for tablet and desktop */}
      <div className="relative w-full h-[70vh] min-h-[420px] max-h-[640px] sm:h-[500px] sm:min-h-0 sm:max-h-none md:h-[540px] lg:h-[580px]">
        {activeBanners.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={slide.id || index}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Responsive & Robust Background Media */}
              <HeroSlideImage
                slide={slide}
                isActive={isActive}
                priority={index === 0}
                fallbackImage={defaultHeroFallback}
              />

              {/* Content Overlay */}
              <div className="absolute inset-0 z-10 flex items-center">
                <div className="max-w-7xl mx-auto px-5 sm:px-8 md:px-12 w-full">
                  <div className="max-w-xl sm:max-w-2xl space-y-3 sm:space-y-4 text-white">
                    {/* Minimal Kicker Tag */}
                    {slide.badgeText && (
                      <div
                        className={`inline-block text-[11px] sm:text-xs font-semibold tracking-widest text-[#F0D27A] uppercase transition-all duration-500 delay-100 ${
                          isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                        }`}
                      >
                        {slide.badgeText}
                      </div>
                    )}

                    {/* Main Heading */}
                    <h1
                      className={`font-cinzel text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight transition-all duration-500 delay-150 ${
                        isActive ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
                      }`}
                    >
                      {slide.heading}
                    </h1>

                    {/* Subtitle / Description */}
                    <p
                      className={`text-xs sm:text-sm md:text-base text-slate-200 max-w-lg font-light leading-relaxed transition-all duration-500 delay-200 ${
                        isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                      }`}
                    >
                      {slide.subheading}
                    </p>

                    {/* Action Buttons */}
                    <div
                      className={`pt-2 sm:pt-3 flex flex-wrap items-center gap-3 transition-all duration-500 delay-250 ${
                        isActive ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                      }`}
                    >
                      <button
                        onClick={() => handleButtonClick(slide)}
                        className="btn-gold px-6 py-2.5 sm:px-8 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold tracking-wider uppercase inline-flex items-center gap-2 cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-transform"
                      >
                        {slide.buttonLink === 'whatsapp' ? (
                          <MessageCircle className="w-4 h-4 text-[#0A1A4F]" />
                        ) : null}
                        <span>{slide.buttonText || 'Shop Collection'}</span>
                      </button>

                      {slide.buttonLink !== 'whatsapp' && (
                        <button
                          onClick={() => {
                            if (featuredProduct) {
                              const firstVariant = featuredProduct.variants?.[0];
                              const vPrice = firstVariant ? (Number(firstVariant.price) || Number(featuredProduct.price) || 0) : (Number(featuredProduct.price) || 0);
                              window.open(
                                buildWhatsAppOrderUrl(
                                  featuredProduct.name,
                                  firstVariant?.label || firstVariant?.size || '50ml',
                                  1,
                                  vPrice,
                                  window.location.href,
                                  settings.whatsappRawNumber
                                ),
                                '_blank',
                                'noopener,noreferrer'
                              );
                            } else {
                              window.open(buildGeneralWhatsAppUrl(settings.whatsappRawNumber), '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className="bg-black/40 hover:bg-black/60 text-white border border-white/30 px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg text-xs sm:text-sm font-medium tracking-wider uppercase inline-flex items-center gap-2 cursor-pointer transition-colors backdrop-blur-sm"
                        >
                          <MessageCircle className="w-4 h-4 text-[#25D366]" />
                          <span>WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows (Prev / Next) */}
      {total > 1 && (
        <>
          <button
            onClick={prevSlide}
            aria-label="Previous slide"
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/70 hover:bg-white text-slate-800 flex items-center justify-center transition-all shadow-sm cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Next slide"
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/70 hover:bg-white text-slate-800 flex items-center justify-center transition-all shadow-sm cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </>
      )}

      {/* Dots / Indicators */}
      {total > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-2">
          {activeBanners.map((_, dotIdx) => {
            const isCurrent = dotIdx === currentIndex;
            return (
              <button
                key={dotIdx}
                onClick={() => goToSlide(dotIdx)}
                aria-label={`Go to slide ${dotIdx + 1}`}
                className={`transition-all duration-300 rounded-full h-1.5 focus:outline-none cursor-pointer ${
                  isCurrent
                    ? 'w-6 bg-[#D4AF37]'
                    : 'w-1.5 bg-white/60 hover:bg-white'
                }`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
};
