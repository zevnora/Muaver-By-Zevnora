import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, MessageCircle } from 'lucide-react';
import { Product, SiteSettings } from '../types/store';
import { buildWhatsAppOrderUrl } from '../services/storeService';
import { SITE_URL } from '../config/constants';
import { OptimizedImage, FALLBACK_PRODUCT_IMAGE } from './OptimizedImage';

interface ProductCardProps {
  product: Product;
  settings: SiteSettings;
  onNavigate?: (page: string, productId?: string) => void;
  onAddToCart: (product: Product, size: string, quantity: number) => void;
  priorityImage?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  settings,
  onAddToCart,
  priorityImage = false,
}) => {
  const mainImage = (product.images && product.images.length > 0 && product.images[0])
    ? product.images[0]
    : FALLBACK_PRODUCT_IMAGE;
  const variants = product.variants || [];
  const variantPrices = variants.map((v) => Number(v.price) || Number(product.price) || 0);
  const lowestPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : (Number(product.price) || 0);
  const lowestVariant = variants.find((v) => Number(v.price) === lowestPrice) || variants[0];
  const hasMultipleSizes = variants.length > 1;

  const currentPrice = lowestPrice;
  const originalPrice = lowestVariant?.oldPrice || (lowestVariant?.salePrice ? lowestVariant.price : product.compareAtPrice);
  const isOutOfStock = !product.inStock || (product.stockQuantity !== undefined && product.stockQuantity <= 0);

  const productSlug = product.slug || product.id;
  const fullProductUrl = `${SITE_URL}/product/${productSlug}`;

  const handleWhatsAppBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = buildWhatsAppOrderUrl(
      product.name,
      lowestVariant?.label || lowestVariant?.size || 'Standard Bottle',
      1,
      currentPrice,
      fullProductUrl,
      settings.whatsappRawNumber
    );
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock) {
      onAddToCart(product, lowestVariant?.size || '50ml', 1);
    }
  };

  return (
    <Link 
      to={`/product/${productSlug}`}
      className="group bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer block"
    >
      {/* Product Image */}
      <div className="relative w-full aspect-[4/5] bg-slate-50 overflow-hidden">
        <OptimizedImage
          src={mainImage}
          alt={product.name}
          aspectRatio="portrait"
          priority={priorityImage}
          width={400}
          height={500}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          containerClassName="w-full h-full"
        />

        {/* Minimal Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10 pointer-events-none">
          {isOutOfStock ? (
            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm">
              Out of stock
            </span>
          ) : originalPrice && originalPrice > currentPrice ? (
            <span className="bg-[#FAF5E8] text-[#B89025] border border-[#D4AF37]/40 text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm">
              Sale
            </span>
          ) : null}
        </div>
      </div>

      {/* Product Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mb-1 truncate">
            {product.category || 'Eau de Parfum'} {lowestVariant?.size ? `· ${lowestVariant.size}` : ''}
          </div>
          <h3 className="font-semibold text-sm sm:text-base text-slate-900 group-hover:text-[#B89025] transition-colors line-clamp-1">
            {product.name}
          </h3>
          {product.subtitle && (
            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 font-light">
              {product.subtitle}
            </p>
          )}
        </div>

        {/* Price & Actions */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-slate-900 text-sm sm:text-base">
              {hasMultipleSizes ? `From Rs. ${currentPrice.toLocaleString()}` : `Rs. ${currentPrice.toLocaleString()}`}
            </span>
            {originalPrice && originalPrice > currentPrice && (
              <span className="text-xs text-slate-400 line-through">
                Rs. {originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={isOutOfStock}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isOutOfStock
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'btn-gold'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{isOutOfStock ? 'Sold Out' : 'Add to Bag'}</span>
            </button>

            <button
              type="button"
              onClick={handleWhatsAppBuy}
              title="Order on WhatsApp"
              className="p-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg text-[#25D366] transition-colors cursor-pointer shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};
