import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, 
  ShoppingBag, 
  MessageCircle, 
  ShieldCheck, 
  Truck, 
  Clock, 
  Droplets, 
  Check, 
  Plus, 
  Minus,
  Sparkles,
  Star,
  StarHalf,
  Edit3,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Calendar,
  Lock,
  Share2,
  Copy
} from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Product, SiteSettings, CustomerProfile, ProductReview } from '../types/store';
import { 
  buildWhatsAppOrderUrl, 
  subscribeProductReviews, 
  submitProductReview,
  subscribeProductBySlugOrId 
} from '../services/storeService';
import { SITE_URL } from '../config/constants';
import { OptimizedImage } from '../components/OptimizedImage';
import { WebsiteLoader } from '../components/BrandedLoader';
import { NotFoundPage } from './NotFoundPage';

interface ProductDetailContentProps {
  product: Product;
  settings: SiteSettings;
  customer?: CustomerProfile | null;
  onAddToCart: (product: Product, size: string, quantity: number) => void;
  onRequestLogin?: (prompt?: string, onAfterSuccess?: () => void) => void;
}

export const ProductDetailContent: React.FC<ProductDetailContentProps> = ({
  product,
  settings,
  customer,
  onAddToCart,
  onRequestLogin,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Sanitize and ensure product has a non-empty list of valid image URLs
  const productImages = useMemo(() => {
    const list = Array.isArray(product.images)
      ? product.images.filter((img) => typeof img === 'string' && img.trim().length > 0)
      : [];
    return list.length > 0 ? list : ['/src/assets/images/royal_gold_front_1791271735003.jpg'];
  }, [product.images]);

  // Reset selected image when product changes
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product.id]);

  const currentImageIndex = Math.min(Math.max(0, selectedImageIndex), productImages.length - 1);
  const activeImageUrl = productImages[currentImageIndex] || productImages[0];

  const [selectedSize, setSelectedSize] = useState<string>(
    product.variants?.[0]?.size || '50ml'
  );
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [isWritingReview, setIsWritingReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  // Live Firestore listener for reviews of this product
  useEffect(() => {
    setLoadingReviews(true);
    const unsub = subscribeProductReviews(
      product.id,
      (liveReviews) => {
        setReviews(liveReviews);
        setLoadingReviews(false);
      },
      (err) => {
        console.warn('Reviews subscription error:', err);
        setLoadingReviews(false);
      }
    );
    return () => unsub();
  }, [product.id]);

  // Check if current logged-in customer already has a review
  const existingUserReview = useMemo(() => {
    if (!customer) return null;
    return reviews.find(
      (r) => r.customerId === customer.uid || r.customerId === customer.id
    ) || null;
  }, [reviews, customer]);

  // Compute rating metrics
  const totalReviewsCount = reviews.length;
  const avgRatingNumber = totalReviewsCount > 0
    ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / totalReviewsCount
    : 0;
  const avgRatingFormatted = avgRatingNumber.toFixed(1);

  // Rating breakdown distribution
  const ratingDistribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5))) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  const handleOpenReviewForm = () => {
    if (!customer) {
      if (onRequestLogin) {
        onRequestLogin(
          'Please sign in or create an account to leave a review for this fragrance.',
          () => {
            setIsWritingReview(true);
            setTimeout(() => {
              document.getElementById('write-review-form')?.scrollIntoView({ behavior: 'smooth' });
            }, 150);
          }
        );
      }
      return;
    }

    if (existingUserReview) {
      setReviewRating(existingUserReview.rating || 5);
      setReviewText(existingUserReview.reviewText || '');
    } else {
      setReviewRating(5);
      setReviewText('');
    }
    setReviewError(null);
    setIsWritingReview(true);
    setTimeout(() => {
      document.getElementById('write-review-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) {
      if (onRequestLogin) {
        onRequestLogin('Please sign in or create an account to submit your review.');
      }
      return;
    }

    if (!reviewText.trim()) {
      setReviewError('Please write your review thoughts before submitting.');
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);

    try {
      await submitProductReview({
        id: existingUserReview?.id,
        productId: product.id,
        productName: product.name,
        customerId: customer.uid || customer.id,
        customerName: customer.fullName || 'Verified Patron',
        customerEmail: customer.email || '',
        rating: reviewRating,
        reviewText: reviewText.trim(),
      });

      setReviewSuccess(
        existingUserReview
          ? 'Your review has been updated!'
          : 'Thank you for your feedback! Your review is now published.'
      );
      setIsWritingReview(false);
      setTimeout(() => setReviewSuccess(null), 5000);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setReviewError(err.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (val: any) => {
    if (!val) return 'Recently';
    const date = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const currentVariant = product.variants?.find((v) => v.size === selectedSize) || product.variants?.[0];
  const unitPrice = currentVariant ? (Number(currentVariant.price) || Number(product.price) || 0) : (Number(product.price) || 0);
  const regularPrice = currentVariant?.oldPrice || product.compareAtPrice;
  const hasDiscount = Boolean(regularPrice && regularPrice > unitPrice);

  const isVariantOutOfStock = currentVariant && (currentVariant.inStock === false || (currentVariant.stock !== undefined && currentVariant.stock <= 0));
  const isProductOutOfStock = !product.inStock || (product.stockQuantity !== undefined && product.stockQuantity <= 0) || isVariantOutOfStock;

  const handleAddToCart = () => {
    if (isProductOutOfStock) return;
    onAddToCart(product, selectedSize, quantity);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 3000);
  };

  const [copiedToast, setCopiedToast] = useState(false);
  const fullProductUrl = `${SITE_URL}/product/${product.slug || product.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullProductUrl);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    } catch (e) {
      console.warn('Failed to copy link:', e);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} | MUAVER Perfume`,
          text: product.shortDescription || product.subtitle || `Discover ${product.name} crafted by MUAVER.`,
          url: fullProductUrl,
        });
        return;
      } catch (e) {
        // User dismissed
      }
    }
    handleCopyLink();
  };

  const handleOrderOnWhatsApp = () => {
    const url = buildWhatsAppOrderUrl(
      product.name,
      currentVariant?.label || selectedSize,
      quantity,
      unitPrice,
      fullProductUrl,
      settings.whatsappRawNumber
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12 space-y-12 text-slate-800 font-montserrat">
      
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-xs text-slate-400">
        <Link
          to="/"
          className="hover:text-slate-900 transition-colors"
        >
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <Link
          to="/shop"
          className="hover:text-slate-900 transition-colors"
        >
          Collection
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-slate-800 font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Product Showcase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
        
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-6 space-y-3">
          {/* Main Large Image: 4:5 aspect ratio, full width on mobile */}
          <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-50 border border-slate-200 shadow-sm">
            <OptimizedImage
              src={activeImageUrl}
              alt={product.name}
              aspectRatio="portrait"
              priority={true}
              width={600}
              height={750}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 600px"
              className="w-full h-full object-cover object-center"
              containerClassName="w-full h-full"
            />

            {/* Status Tags */}
            <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
              {isProductOutOfStock ? (
                <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold px-2.5 py-0.5 rounded shadow-sm">
                  Out of Stock
                </span>
              ) : hasDiscount ? (
                <span className="bg-[#FAF5E8] text-[#B89025] border border-[#D4AF37]/40 text-[10px] font-semibold px-2.5 py-0.5 rounded shadow-sm">
                  Special Offer
                </span>
              ) : null}
            </div>

            {product.edition && (
              <div className="absolute bottom-3 left-3 bg-white/90 border border-slate-200 px-2.5 py-0.5 rounded text-[10px] text-slate-600 font-medium shadow-sm z-10">
                {product.edition}
              </div>
            )}
          </div>

          {/* Thumbnails strip: horizontally scrollable on mobile, grid on larger screens */}
          {productImages.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin sm:grid sm:grid-cols-4 sm:overflow-x-visible">
              {productImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-20 h-20 sm:w-auto sm:h-auto aspect-square rounded-lg overflow-hidden border transition-all cursor-pointer bg-slate-50 relative shrink-0 ${
                    currentImageIndex === idx
                      ? 'border-[#0A1A4F] ring-2 ring-[#0A1A4F]'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                  aria-label={`View image ${idx + 1}`}
                >
                  <OptimizedImage
                    src={img}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    aspectRatio="square"
                    priority={false}
                    width={120}
                    height={120}
                    sizes="120px"
                    className="w-full h-full object-cover object-center"
                    containerClassName="w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Details, Form, and Actions */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Title & Category & Rating */}
          <div className="space-y-1.5 border-b border-slate-100 pb-4">
            <span className="text-xs uppercase tracking-wider text-[#B89025] font-semibold block">
              {product.category || 'Eau de Parfum'} {product.concentration ? `· ${product.concentration}` : ''}
            </span>

            <h1 className="font-cinzel text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {product.name}
            </h1>

            {/* Star Rating & Review Count (Visible to everyone) */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              {totalReviewsCount > 0 ? (
                <>
                  <div className="flex items-center text-[#D4AF37]">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i <= Math.round(avgRatingNumber)
                            ? 'fill-[#D4AF37] text-[#D4AF37]'
                            : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-slate-900 font-mono text-[13px]">
                    {avgRatingFormatted}
                  </span>
                  <span className="text-slate-400">·</span>
                  <button
                    onClick={() => {
                      document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-600 hover:text-[#B89025] underline decoration-slate-300 hover:decoration-[#B89025] transition-colors cursor-pointer"
                  >
                    {totalReviewsCount} {totalReviewsCount === 1 ? 'review' : 'reviews'}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                  <div className="flex items-center text-slate-200">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-3.5 h-3.5" />
                    ))}
                  </div>
                  <span>No reviews yet</span>
                  <span>·</span>
                  <button
                    onClick={handleOpenReviewForm}
                    className="text-[#B89025] hover:underline font-medium cursor-pointer"
                  >
                    Be the first to review
                  </button>
                </div>
              )}
            </div>

            {product.subtitle && (
              <p className="text-xs text-slate-500 font-light pt-0.5">
                {product.subtitle}
              </p>
            )}
          </div>

          {/* Pricing & Badges */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                Rs. {unitPrice.toLocaleString()}
              </span>
              {hasDiscount && regularPrice && (
                <span className="text-base text-slate-400 line-through">
                  Rs. {regularPrice.toLocaleString()}
                </span>
              )}
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Cash on Delivery</span>
              </span>
            </div>

            {/* Delivery Time Info */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Truck className="w-3.5 h-3.5 text-[#B89025]" />
                  <span>Delivery Time:</span>
                </span>
                <span className="font-semibold text-slate-900">
                  {settings.deliverySettings?.deliveryTimeText || '2 to 5 working days'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                <span className="text-slate-500">Shipping:</span>
                <span className="font-medium text-emerald-700">
                  {!settings.deliverySettings || settings.deliverySettings.isEnabled === false || settings.deliverySettings.shippingType === 'free' || (settings.deliverySettings.shippingType === 'free_above' && (unitPrice * quantity) >= (settings.deliverySettings.freeAboveAmount || 5000))
                    ? 'Free Nationwide Delivery'
                    : `Rs. ${(settings.deliverySettings.flatRateAmount || 250).toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-light">
            {product.description}
          </p>

          {/* Variant Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-800 block">
                Select Size:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {product.variants.map((v) => {
                  const isSelected = selectedSize === v.size;
                  const isSoldOut = v.inStock === false || (v.stock !== undefined && v.stock <= 0);

                  return (
                    <button
                      key={v.size}
                      onClick={() => setSelectedSize(v.size)}
                      className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-[#0A1A4F] bg-[#0A1A4F] text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold">{v.size}</span>
                        {isSoldOut ? (
                          <span className="text-[10px] text-rose-400">Sold Out</span>
                        ) : isSelected ? (
                          <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[11px] block font-semibold ${isSelected ? 'text-[#F0D27A]' : 'text-slate-800'}`}>
                          Rs. {Number(v.price).toLocaleString()}
                        </span>
                        {v.oldPrice && v.oldPrice > v.price && (
                          <span className={`text-[10px] line-through ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                            Rs. {Number(v.oldPrice).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & CTA Buttons */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3">
              {/* Stepper */}
              <div className="flex items-center border border-slate-200 rounded-lg bg-white h-11">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={isProductOutOfStock}
                  className="px-3 h-full text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-30 cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 font-semibold text-xs text-slate-900">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={isProductOutOfStock}
                  className="px-3 h-full text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-30 cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Bag */}
              <button
                onClick={handleAddToCart}
                disabled={isProductOutOfStock}
                className={`flex-1 h-11 rounded-lg text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm ${
                  isProductOutOfStock
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'btn-gold'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-[#0A1A4F]" />
                <span>
                  {isProductOutOfStock
                    ? 'Sold Out'
                    : `Add to Bag · Rs. ${(unitPrice * quantity).toLocaleString()}`}
                </span>
              </button>
            </div>

            {/* Order on WhatsApp Button */}
            <button
              onClick={handleOrderOnWhatsApp}
              className="btn-gold-outline w-full h-11 rounded-lg text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>Order via WhatsApp</span>
            </button>

            {/* Share & Copy Link Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 h-9 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Share this fragrance"
              >
                <Share2 className="w-3.5 h-3.5 text-[#B89025]" />
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 h-9 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Copy shareable link"
              >
                {copiedToast ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Toast feedback */}
            {addedToast && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 text-center animate-fade-in flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Fragrance added to your bag.</span>
              </div>
            )}
          </div>

          {/* Quality & Trust Highlights */}
          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#B89025]" />
              <span>COD Across Pakistan</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B89025]" />
              <span>100% Genuine Perfume</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#B89025]" />
              <span>16+ Hours Sillage</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-[#B89025]" />
              <span>35% Oil Concentration</span>
            </div>
          </div>

        </div>

      </div>

      {/* Fragrance Notes */}
      <div className="space-y-6 pt-6 border-t border-slate-200">
        <div className="text-center space-y-1 max-w-xl mx-auto">
          <span className="text-xs uppercase tracking-widest text-[#B89025] font-semibold">
            Olfactory Architecture
          </span>
          <h2 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wide text-slate-900">
            FRAGRANCE NOTES
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top Notes */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 uppercase tracking-wider">
                Top Notes
              </span>
              <span className="text-[10px] text-slate-400">Opening 30 Mins</span>
            </div>
            <ul className="space-y-1.5">
              {product.notes.top.map((note, index) => (
                <li key={index} className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B89025]" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Heart Notes */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 uppercase tracking-wider">
                Heart Notes
              </span>
              <span className="text-[10px] text-slate-400">2 to 6 Hours</span>
            </div>
            <ul className="space-y-1.5">
              {product.notes.heart.map((note, index) => (
                <li key={index} className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B89025]" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Base Notes */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900 uppercase tracking-wider">
                Base Notes
              </span>
              <span className="text-[10px] text-slate-400">Dry Down (16+ Hrs)</span>
            </div>
            <ul className="space-y-1.5">
              {product.notes.base.map((note, index) => (
                <li key={index} className="text-xs text-slate-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B89025]" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* CUSTOMER REVIEWS SECTION (Visible to everyone) */}
      {/* ========================================================= */}
      <section id="reviews-section" className="space-y-8 pt-10 border-t border-slate-200 scroll-mt-20">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#B89025] font-semibold block">
              Verified Patron Feedback
            </span>
            <h2 className="font-cinzel text-xl sm:text-2xl font-bold tracking-wide text-slate-900">
              CUSTOMER REVIEWS
            </h2>
          </div>

          {/* Write a Review Button: Visible to everyone */}
          <button
            onClick={handleOpenReviewForm}
            className="btn-gold-primary px-5 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{existingUserReview ? 'Edit Your Review' : 'Write a Review'}</span>
          </button>
        </div>

        {/* Global Toast / Notices */}
        {reviewSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{reviewSuccess}</span>
          </div>
        )}

        {/* Reviews Overview Scorecard */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
          {/* Average Score Column */}
          <div className="md:col-span-4 flex flex-col justify-center items-center text-center md:border-r border-slate-200 md:pr-6 space-y-2">
            <span className="font-cinzel text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
              {totalReviewsCount > 0 ? avgRatingFormatted : '0.0'}
            </span>
            <div className="flex items-center text-[#D4AF37] gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i <= Math.round(avgRatingNumber)
                      ? 'fill-[#D4AF37] text-[#D4AF37]'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 font-light">
              Based on {totalReviewsCount} {totalReviewsCount === 1 ? 'verified review' : 'verified reviews'}
            </p>
          </div>

          {/* Star Breakdown Column */}
          <div className="md:col-span-8 flex flex-col justify-center space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingDistribution[stars as 1 | 2 | 3 | 4 | 5] || 0;
              const percent = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="w-12 font-medium flex items-center gap-1 shrink-0 text-slate-700">
                    <span>{stars}</span>
                    <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />
                  </span>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#D4AF37] to-[#B89025] rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-[11px] text-slate-400">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* WRITE / EDIT REVIEW FORM */}
        {isWritingReview && (
          <div
            id="write-review-form"
            className="p-6 sm:p-7 rounded-2xl bg-white border-2 border-[#D4AF37]/40 shadow-xl space-y-5 animate-fade-in"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#B89025] font-semibold">
                  {existingUserReview ? 'Modify Existing Rating' : 'New Review Submission'}
                </span>
                <h3 className="font-cinzel text-lg sm:text-xl font-bold text-slate-900">
                  {existingUserReview ? 'Edit Your Experience' : `Review ${product.name}`}
                </h3>
              </div>

              {customer && (
                <div className="text-right text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Reviewing as</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1 justify-end">
                    <User className="w-3.5 h-3.5 text-[#B89025]" />
                    <span>{customer.fullName}</span>
                  </span>
                </div>
              )}
            </div>

            {reviewError && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="space-y-5">
              {/* Star Rating Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  Overall Rating <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const isFilled = starVal <= (hoverRating || reviewRating);
                      return (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setReviewRating(starVal)}
                          onMouseEnter={() => setHoverRating(starVal)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                          aria-label={`Rate ${starVal} out of 5 stars`}
                        >
                          <Star
                            className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                              isFilled
                                ? 'fill-[#D4AF37] text-[#D4AF37] drop-shadow-sm'
                                : 'text-slate-300 hover:text-slate-400'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 ml-2 font-mono">
                    {reviewRating === 5 && 'Exceptional · 5/5'}
                    {reviewRating === 4 && 'Very Good · 4/5'}
                    {reviewRating === 3 && 'Good · 3/5'}
                    {reviewRating === 2 && 'Fair · 2/5'}
                    {reviewRating === 1 && 'Disappointing · 1/5'}
                  </span>
                </div>
              </div>

              {/* Review Text Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  Your Review <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share details of the sillage, longevity, dry-down notes, and overall compliments received..."
                  rows={4}
                  required
                  maxLength={1000}
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F] transition-all resize-y"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Minimum 5 characters</span>
                  <span>{reviewText.length} / 1000 characters</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWritingReview(false)}
                  disabled={submittingReview}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn-gold-primary px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                >
                  {submittingReview ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0A1A4F]" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#0A1A4F]" />
                      <span>{existingUserReview ? 'Update Review' : 'Submit Review'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LIST OF REVIEWS (Visible to everyone) */}
        <div className="space-y-4">
          {loadingReviews ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#B89025]" />
              <p className="text-xs">Loading patron reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF5E8] border border-[#D4AF37]/30 text-[#B89025] flex items-center justify-center mx-auto">
                <Star className="w-6 h-6 fill-current" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  No reviews yet — be the first to review this product
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-light">
                  Own this fragrance? Share your thoughts on longevity and olfactory projection.
                </p>
              </div>
              <button
                onClick={handleOpenReviewForm}
                className="btn-gold-outline px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                Write the First Review
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {reviews.map((rev) => {
                const isAuthor =
                  customer &&
                  (rev.customerId === customer.uid || rev.customerId === customer.id);

                return (
                  <div
                    key={rev.id}
                    className={`p-5 rounded-xl border transition-all ${
                      isAuthor
                        ? 'bg-amber-50/40 border-amber-300/80 shadow-sm'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      {/* Reviewer info */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0A1A4F] text-[var(--gold-300)] flex items-center justify-center font-bold text-xs font-cinzel shrink-0 border border-[#D4AF37]/40 shadow-sm">
                          {rev.customerName?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-slate-900">
                              {rev.customerName}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>Verified Patron</span>
                            </span>
                            {isAuthor && (
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#B89025] bg-[#FAF5E8] px-2 py-0.5 rounded border border-[#D4AF37]/40">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            <span>{formatDate(rev.createdAt)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Stars & Author edit action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="flex items-center text-[#D4AF37]">
                          {[1, 2, 3, 4, 5].map((starIdx) => (
                            <Star
                              key={starIdx}
                              className={`w-3.5 h-3.5 ${
                                starIdx <= rev.rating
                                  ? 'fill-[#D4AF37] text-[#D4AF37]'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>

                        {isAuthor && (
                          <button
                            onClick={handleOpenReviewForm}
                            className="text-xs text-[#B89025] hover:text-[#0A1A4F] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Review text */}
                    <div className="pt-3">
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-light whitespace-pre-wrap">
                        {rev.reviewText}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </section>

    </div>
  );
};

export interface ProductPageProps {
  product?: Product | null;
  settings: SiteSettings;
  customer?: CustomerProfile | null;
  onAddToCart: (product: Product, size: string, quantity: number) => void;
  onNavigate?: (page: string, productId?: string) => void;
  onRequestLogin?: (prompt?: string, onAfterSuccess?: () => void) => void;
}

export const ProductPage: React.FC<ProductPageProps> = ({
  product: initialProduct,
  settings,
  customer,
  onAddToCart,
  onRequestLogin,
}) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [liveProduct, setLiveProduct] = useState<Product | null>(initialProduct || null);
  const [loading, setLoading] = useState<boolean>(!initialProduct && Boolean(slug));

  useEffect(() => {
    if (!slug) {
      if (initialProduct) setLiveProduct(initialProduct);
      return;
    }

    setLoading(true);
    const unsub = subscribeProductBySlugOrId(
      slug,
      (fetched) => {
        setLiveProduct(fetched);
        setLoading(false);

        // If accessed via raw product ID and product has a clean slug, redirect to /product/{slug}
        if (fetched && fetched.slug && fetched.slug !== slug && fetched.id === slug) {
          navigate(`/product/${fetched.slug}`, { replace: true });
        }
      },
      (err) => {
        console.warn('Error subscribing to product by slug/id:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [slug, initialProduct, navigate]);

  const activeProduct = liveProduct || initialProduct;

  // Set document title
  useEffect(() => {
    if (activeProduct?.name) {
      document.title = `${activeProduct.name} | MUAVER Perfume`;
    }
  }, [activeProduct?.name]);

  if (loading && !activeProduct) {
    return (
      <div className="py-24">
        <WebsiteLoader label="Loading fragrance details..." minHeight="min-h-[500px]" />
      </div>
    );
  }

  if (!activeProduct) {
    return <NotFoundPage settings={settings} />;
  }

  return (
    <ProductDetailContent
      product={activeProduct}
      settings={settings}
      customer={customer}
      onAddToCart={onAddToCart}
      onRequestLogin={onRequestLogin}
    />
  );
};
