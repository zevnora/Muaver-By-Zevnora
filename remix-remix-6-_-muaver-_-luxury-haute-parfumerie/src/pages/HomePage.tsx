import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  MessageCircle, 
  ShieldCheck, 
  Droplets, 
  Clock, 
  Star,
  PackageCheck,
  ShoppingBag,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Product, SiteSettings, BannerSlide } from '../types/store';
import { buildWhatsAppOrderUrl, buildGeneralWhatsAppUrl, DEFAULT_WHY_FEATURES, DEFAULT_TESTIMONIALS } from '../services/storeService';
import { SITE_URL } from '../config/constants';
import { HeroSlider } from '../components/HeroSlider';
import { OptimizedImage, FALLBACK_PRODUCT_IMAGE } from '../components/OptimizedImage';
import { ScrollReveal } from '../components/ScrollReveal';

interface HomePageProps {
  settings: SiteSettings;
  featuredProduct: Product | null;
  banners: BannerSlide[];
  onNavigate?: (page: string, productId?: string) => void;
  onAddToCart: (product: Product, size: string, quantity: number) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  settings,
  featuredProduct,
  banners,
  onNavigate,
  onAddToCart,
}) => {
  useEffect(() => {
    document.title = settings.siteTitle || 'MUAVER | Luxury Brand • Crafted for Distinction';
  }, [settings.siteTitle]);
  const [selectedSize, setSelectedSize] = useState<string>(
    featuredProduct?.variants?.[0]?.size || '50ml'
  );

  useEffect(() => {
    if (featuredProduct?.variants && featuredProduct.variants.length > 0) {
      setSelectedSize(featuredProduct.variants[0].size);
    }
  }, [featuredProduct?.id]);

  const selectedVariant = 
    featuredProduct?.variants?.find((v) => v.size === selectedSize) || 
    featuredProduct?.variants?.[0];
  
  const activePrice = selectedVariant ? (Number(selectedVariant.price) || Number(featuredProduct?.price) || 0) : (Number(featuredProduct?.price) || 0);
  const originalPrice = selectedVariant?.oldPrice || featuredProduct?.compareAtPrice || 0;
  const hasDiscount = originalPrice > 0 && originalPrice > activePrice;

  const featuredProductUrl = featuredProduct 
    ? `${SITE_URL}/product/${featuredProduct.slug || featuredProduct.id}`
    : `${SITE_URL}/shop`;

  const handleWhatsAppDirect = () => {
    if (!featuredProduct) {
      window.open(buildGeneralWhatsAppUrl(settings.whatsappRawNumber), '_blank', 'noopener,noreferrer');
      return;
    }
    const url = buildWhatsAppOrderUrl(
      featuredProduct.name,
      selectedVariant?.label || selectedSize,
      1,
      activePrice,
      featuredProductUrl,
      settings.whatsappRawNumber
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-20 text-slate-800 font-montserrat">
      
      {/* 1. HERO BANNER SLIDER */}
      {settings.visibility?.showHeroSlider !== false && (
        <HeroSlider
          banners={banners}
          onNavigate={onNavigate}
          featuredProduct={featuredProduct || undefined}
          settings={settings}
        />
      )}

      {/* 2. FEATURED FLACON SPOTLIGHT */}
      {settings.visibility?.showFeaturedProduct !== false && (
        featuredProduct ? (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-2 mb-8 sm:mb-12">
              {Boolean(settings.featuredSectionBadge?.trim()) && (
                <span className="text-xs uppercase tracking-widest text-[#B89025] font-semibold">
                  {settings.featuredSectionBadge}
                </span>
              )}
              {Boolean(settings.featuredSectionTitle?.trim()) && (
                <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide text-slate-900">
                  {settings.featuredSectionTitle}
                </h2>
              )}
            </div>

            <ScrollReveal className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 sm:p-10 lg:p-12 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                
                {/* Product Imagery */}
                <div className="lg:col-span-6 space-y-3">
                  <Link 
                    to={`/product/${featuredProduct.slug || featuredProduct.id}`}
                    className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-50 border border-slate-200 group cursor-pointer shadow-sm block"
                  >
                    <OptimizedImage
                      src={featuredProduct.images?.[0] || FALLBACK_PRODUCT_IMAGE}
                      alt={featuredProduct.name}
                      aspectRatio="portrait"
                      priority={true}
                      width={600}
                      height={750}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
                      className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                      containerClassName="w-full h-full"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 border border-slate-200 px-3 py-1 rounded text-[10px] uppercase tracking-wider text-slate-700 font-semibold shadow-sm z-10">
                      {featuredProduct.edition || 'Signature Batch'}
                    </div>
                  </Link>

                  {/* Thumbnails */}
                  {featuredProduct.images.length > 1 && (
                    <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin sm:grid sm:grid-cols-4 sm:overflow-x-visible">
                      {featuredProduct.images.slice(0, 4).map((img, idx) => (
                        <Link
                          key={idx}
                          to={`/product/${featuredProduct.slug || featuredProduct.id}`}
                          className="w-18 h-18 sm:w-auto sm:h-auto aspect-square rounded-lg border border-slate-200 overflow-hidden hover:border-slate-400 transition-all bg-white shrink-0 cursor-pointer block"
                        >
                          <OptimizedImage
                            src={img}
                            alt={`View ${idx + 1}`}
                            aspectRatio="square"
                            width={120}
                            height={120}
                            sizes="120px"
                            className="w-full h-full object-cover object-center"
                            containerClassName="w-full h-full"
                          />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Specifications & CTAs */}
                <div className="lg:col-span-6 space-y-5 sm:space-y-6">
                  <div>
                    <span className="text-xs text-[#B89025] uppercase tracking-wider font-semibold block mb-1">
                      {featuredProduct.category || 'Eau de Parfum'}
                    </span>
                    <h3 className="font-cinzel text-2xl sm:text-3xl md:text-4xl text-slate-900 font-bold tracking-tight">
                      {featuredProduct.name}
                    </h3>
                    {featuredProduct.subtitle && (
                      <p className="text-xs sm:text-sm text-slate-500 mt-1 font-light">
                        {featuredProduct.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Price Display */}
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                      Rs. {activePrice.toLocaleString()}
                    </span>
                    {hasDiscount && (
                      <span className="text-sm sm:text-base text-slate-400 line-through">
                        Rs. {originalPrice.toLocaleString()}
                      </span>
                    )}
                    <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium">
                      Cash on Delivery
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-light">
                    {featuredProduct.description}
                  </p>

                  {/* Size Selection */}
                  {featuredProduct.variants && featuredProduct.variants.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-700 block">
                        Size:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {featuredProduct.variants.map((variant) => {
                          const isSelected = selectedSize === variant.size;
                          return (
                            <button
                              key={variant.size}
                              onClick={() => setSelectedSize(variant.size)}
                              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                                isSelected
                                  ? 'bg-[#0A1A4F] text-white border-[#0A1A4F]'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <span>{variant.size}</span>
                              <span className="text-[10px] ml-1.5 opacity-75 font-semibold">
                                Rs. {Number(variant.price).toLocaleString()}
                              </span>
                              {variant.oldPrice && variant.oldPrice > variant.price && (
                                <span className="text-[9px] ml-1 opacity-50 line-through">
                                  Rs. {Number(variant.oldPrice).toLocaleString()}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fragrance Notes Preview */}
                  <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        Fragrance Profile
                      </span>
                      <span className="text-[11px] text-slate-400 font-light">
                        High Concentration Oil
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Top</span>
                        <span className="text-slate-800 font-medium">{featuredProduct.notes.top.slice(0, 2).join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Heart</span>
                        <span className="text-slate-800 font-medium">{featuredProduct.notes.heart.slice(0, 2).join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Base</span>
                        <span className="text-slate-800 font-medium">{featuredProduct.notes.base.slice(0, 2).join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary CTAs */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button
                      onClick={() => onAddToCart(featuredProduct, selectedSize, 1)}
                      className="btn-gold flex-1 py-3 px-6 rounded-lg text-xs sm:text-sm font-semibold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                    >
                      <ShoppingBag className="w-4 h-4 text-[#0A1A4F]" />
                      <span>Add to Bag</span>
                    </button>

                    <button
                      onClick={handleWhatsAppDirect}
                      className="btn-gold-outline flex-1 py-3 px-6 rounded-lg text-xs sm:text-sm font-medium tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      <span>WhatsApp Order</span>
                    </button>
                  </div>

                  {/* Product Details Link */}
                  <div className="pt-1 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200">
                    <Link
                      to={`/product/${featuredProduct.slug || featuredProduct.id}`}
                      className="text-[#B89025] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <span>View full fragrance details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <span className="text-emerald-700 font-medium text-[11px]">
                      {featuredProduct.stockStatusText || 'In Stock'}
                    </span>
                  </div>

                </div>

              </div>

            </ScrollReveal>
          </section>
        ) : (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[460px]" aria-busy="true">
            <div className="text-center space-y-2 mb-8 sm:mb-12">
              <span className="text-xs uppercase tracking-widest text-[#B89025] font-semibold">
                {settings.featuredSectionBadge || 'Signature Fragrance'}
              </span>
              <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide text-slate-900">
                {settings.featuredSectionTitle || 'FEATURED PERFUME'}
              </h2>
            </div>
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 sm:p-10 lg:p-12 shadow-sm animate-pulse">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="lg:col-span-6 aspect-[4/5] bg-slate-200/80 rounded-xl" />
                <div className="lg:col-span-6 space-y-5">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-8 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-20 bg-slate-200 rounded w-full" />
                  <div className="h-10 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          </section>
        )
      )}

      {/* 3. BRAND STORY (CRAFTED FOR DISTINCTION BY ASHAR UL HAQ SIDDIQUI) */}
      {settings.visibility?.showBrandStory !== false && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 sm:p-12 lg:p-16">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
              
              {/* Crest Logo Frame */}
              <div className="md:col-span-5 flex justify-center w-full">
                <div className="w-full max-w-xs sm:max-w-sm p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48 sm:w-60 sm:h-60 flex items-center justify-center p-3 sm:p-4 bg-slate-50/60 rounded-xl overflow-hidden border border-slate-100">
                    <OptimizedImage
                      src={settings.brandStoryImage || 'https://i.ibb.co/bqSSkYh/Whats-App-Image-2026-09-27-at-22-43-46.jpg'}
                      fallbackSrc="https://i.ibb.co/M5Dq0xS9/Icon.png"
                      alt="MUAVER Brand Crest"
                      aspectRatio="square"
                      objectFit="contain"
                      width={320}
                      height={320}
                      sizes="(max-width: 640px) 240px, 320px"
                      className="w-full h-full object-contain object-center block p-1"
                      containerClassName="w-full h-full bg-transparent flex items-center justify-center"
                    />
                  </div>
                  <div className="pt-4 mt-2 w-full border-t border-slate-100 text-[11px] sm:text-xs uppercase tracking-widest text-slate-500 font-semibold font-cinzel">
                    MUAVER HERITAGE
                  </div>
                </div>
              </div>

              {/* Story Text */}
              <div className="md:col-span-7 space-y-4">
                {Boolean(settings.brandStoryBadge?.trim()) && (
                  <span className="text-xs uppercase tracking-widest text-[#B89025] font-semibold block">
                    {settings.brandStoryBadge}
                  </span>
                )}

                {Boolean(settings.brandStoryTitle?.trim()) && (
                  <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl text-slate-900 font-bold tracking-tight">
                    {settings.brandStoryTitle}
                  </h2>
                )}

                {Boolean(settings.brandStorySnippet?.trim()) && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-light">
                    {settings.brandStorySnippet}
                  </p>
                )}

                {Boolean(settings.brandStoryText2?.trim()) && (
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-light">
                    {settings.brandStoryText2}
                  </p>
                )}

                {Boolean(settings.brandStoryButtonText?.trim()) && (
                  <div className="pt-2">
                    <Link
                      to="/about"
                      className="btn-gold-outline px-6 py-2.5 rounded-lg text-xs tracking-wider uppercase font-semibold cursor-pointer inline-block"
                    >
                      {settings.brandStoryButtonText}
                    </Link>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>
      )}

      {/* 4. "WHY MUAVER" - ICON FEATURES */}
      {settings.visibility?.showWhyFeatures !== false && settings.whyFeatures && settings.whyFeatures.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-10 sm:mb-12">
            <span className="text-xs uppercase tracking-widest text-[#B89025] font-semibold">
              Quality Standards
            </span>
            <h2 className="font-cinzel text-2xl sm:text-3xl font-bold tracking-wide text-slate-900">
              WHY MUAVER
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto font-light">
              Crafted with high oil concentration, long-lasting performance, and Cash on Delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {settings.whyFeatures.map((feature, idx) => {
              const iconType = feature.icon?.toLowerCase() || '';
              return (
                <ScrollReveal
                  key={feature.id || idx}
                  delayIndex={(idx % 4) + 1}
                  className="p-6 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all duration-200 space-y-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#0A1A4F] flex items-center justify-center">
                    {iconType.includes('clock') ? (
                      <Clock className="w-5 h-5 text-[#B89025]" />
                    ) : iconType.includes('shield') ? (
                      <ShieldCheck className="w-5 h-5 text-[#B89025]" />
                    ) : iconType.includes('package') ? (
                      <PackageCheck className="w-5 h-5 text-[#B89025]" />
                    ) : (
                      <Droplets className="w-5 h-5 text-[#B89025]" />
                    )}
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-light">
                    {feature.description}
                  </p>
                </ScrollReveal>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. CUSTOMER REVIEWS */}
      {settings.visibility?.showTestimonials !== false && settings.testimonials && settings.testimonials.filter((t) => t.isActive !== false).length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 mb-10 sm:mb-12">
            <span className="text-xs uppercase tracking-widest text-[#B89025] font-semibold">
              Customer Feedback
            </span>
            <h2 className="font-cinzel text-2xl sm:text-3xl font-bold tracking-wide text-slate-900">
              CUSTOMER REVIEWS
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {settings.testimonials
              .filter((t) => t.isActive !== false)
              .map((review, idx) => (
                <ScrollReveal
                  key={review.id}
                  delayIndex={(idx % 3) + 1}
                  className="p-6 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="space-y-2.5">
                    <div className="flex text-[#D4AF37] gap-0.5">
                      {[...Array(review.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-light">
                      "{review.comment}"
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-900 block">
                      {review.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {review.city} {review.role ? `· ${review.role}` : '· Verified Customer'}
                    </span>
                  </div>
                </ScrollReveal>
              ))}
          </div>
        </section>
      )}

      {/* 6. WHATSAPP ORDER CALL-TO-ACTION STRIP */}
      {settings.visibility?.showWhatsAppStrip !== false && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-[#0A1A4F] text-white p-8 sm:p-12 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left">
              <div className="space-y-2 max-w-2xl">
                <span className="text-[11px] uppercase tracking-wider text-[#F0D27A] font-semibold block">
                  Quick Assistance
                </span>
                <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl text-white font-bold tracking-wide">
                  Order Easily via WhatsApp
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
                  Have questions about notes or want to order with Cash on Delivery? Chat with our team directly at <strong className="text-white font-medium">{settings.contactPhone || '+92 324 2404984'}</strong>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                <button
                  onClick={handleWhatsAppDirect}
                  className="btn-gold px-6 py-3 rounded-lg text-xs font-semibold tracking-wider uppercase inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <MessageCircle className="w-4 h-4 text-[#0A1A4F]" />
                  <span>Order on WhatsApp</span>
                </button>

                <Link
                  to="/shop"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-3 rounded-lg text-xs font-medium tracking-wider uppercase inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <span>Explore Collection</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 7. SOCIAL CHANNELS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-4">
          <h2 className="font-cinzel text-xl sm:text-2xl text-slate-900 font-bold tracking-wide">
            Follow @muaver.co
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-light">
            Stay updated with new releases, fragrance care tips, and exclusive offers on our official pages.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={settings.socialLinks?.instagram || 'https://www.instagram.com/muaver.co'}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold px-5 py-2.5 rounded-lg text-xs inline-flex items-center gap-2 font-semibold uppercase tracking-wider cursor-pointer"
            >
              <span>Instagram</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href={settings.socialLinks?.tiktok || 'https://www.tiktok.com/@muaver.co'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-5 py-2.5 rounded-lg text-xs inline-flex items-center gap-2 font-medium uppercase tracking-wider cursor-pointer"
            >
              <span>TikTok</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href={settings.socialLinks?.facebook || 'https://www.facebook.com/people/Muaver-Luxury-Brand/61592411954625/'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-5 py-2.5 rounded-lg text-xs inline-flex items-center gap-2 font-medium uppercase tracking-wider cursor-pointer"
            >
              <span>Facebook</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};
