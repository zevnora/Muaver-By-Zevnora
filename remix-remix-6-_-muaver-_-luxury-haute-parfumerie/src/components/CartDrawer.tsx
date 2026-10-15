import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ShieldCheck, ArrowRight, MessageCircle, Truck } from 'lucide-react';
import { CartItem, SiteSettings } from '../types/store';
import { calculateOrderCharges, DEFAULT_STATIC_IMAGES } from '../services/storeService';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, size: string, delta: number) => void;
  onRemoveItem: (productId: string, size: string) => void;
  onProceedToCheckout: () => void;
  settings: SiteSettings;
  onNavigateToShop: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  settings,
  onNavigateToShop,
}) => {
  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const charges = calculateOrderCharges(subtotal, settings.deliverySettings);
  const { deliveryCharges, handlingCharges, isFreeDelivery, totalAmount } = charges;

  // Prefilled WhatsApp message for entire cart
  const handleWhatsAppCartOrder = () => {
    const phone = settings.whatsappRawNumber || '923242404984';
    const lines = [
      `Assalam-o-Alaikum MUAVER Customer Support,`,
      `I would like to place an order for the following items in my bag:`,
      ...items.map(
        (item, index) =>
          `${index + 1}. ${item.productName} (${item.size}) - Qty: ${item.quantity} x Rs. ${item.price.toLocaleString()} = Rs. ${(item.price * item.quantity).toLocaleString()}`
      ),
      ``,
      `• Subtotal: Rs. ${subtotal.toLocaleString()}`,
      ...(handlingCharges > 0 ? [`• Handling Charges: Rs. ${handlingCharges.toLocaleString()}`] : []),
      `• Delivery Charges: ${isFreeDelivery ? 'Free' : `Rs. ${deliveryCharges.toLocaleString()}`}`,
      `• Total Amount: Rs. ${totalAmount.toLocaleString()}`,
      `• Payment Method: Cash on Delivery (COD)`,
      `• Delivery Time: ${settings.deliverySettings?.deliveryTimeText || '2 to 5 working days'}`,
      ``,
      `Please confirm dispatch to my doorstep.`
    ];
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-montserrat animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col text-slate-800">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-slate-800" />
              <h2 className="font-semibold text-base text-slate-900">
                Shopping Bag
              </h2>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                {totalItemsCount}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100 cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Delivery & COD Status Bar */}
          <div className="bg-slate-50 py-2 px-5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Cash on Delivery</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <Truck className="w-3.5 h-3.5 text-[#B89025]" />
              <span>{settings.deliverySettings?.deliveryTimeText || '2 to 5 working days'}</span>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm text-slate-800">
                    Your bag is empty
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs font-light">
                    Explore our perfume collection to get started.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToShop();
                  }}
                  className="btn-gold px-5 py-2 text-xs rounded-lg mt-2 cursor-pointer font-semibold"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={`${item.productId}-${item.size}`}
                  className="flex gap-3.5 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                >
                  <div className="w-16 aspect-[4/5] rounded-lg bg-slate-50 overflow-hidden shrink-0 border border-slate-200 relative">
                    <img
                      src={item.productImage || DEFAULT_STATIC_IMAGES.heroFallbackImage}
                      alt={item.productName}
                      width={64}
                      height={80}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_STATIC_IMAGES.heroFallbackImage;
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-semibold text-slate-900 line-clamp-1">
                          {item.productName}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.productId, item.size)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-400 uppercase block mt-0.5">
                        {item.size}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                      {/* Stepper */}
                      <div className="flex items-center border border-slate-200 rounded bg-white text-xs">
                        <button
                          onClick={() => onUpdateQuantity(item.productId, item.size, -1)}
                          className="px-2 py-0.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-medium text-xs text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.productId, item.size, 1)}
                          className="px-2 py-0.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-900">
                          Rs. {(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Subtotal & Actions */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">Rs. {subtotal.toLocaleString()}</span>
                </div>

                {handlingCharges > 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Handling & Packaging</span>
                    <span className="text-slate-700">Rs. {handlingCharges.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>Delivery</span>
                  <span className={isFreeDelivery ? 'text-emerald-700 font-medium' : 'font-medium text-slate-800'}>
                    {isFreeDelivery ? 'Free Delivery' : `Rs. ${deliveryCharges.toLocaleString()}`}
                  </span>
                </div>

                {/* Total */}
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Payable (COD)</span>
                  <span>Rs. {totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={onProceedToCheckout}
                  className="btn-gold w-full py-3 px-4 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={handleWhatsAppCartOrder}
                  className="w-full py-2 px-4 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>Order via WhatsApp</span>
                </button>
              </div>

              <div className="text-center text-[11px] text-slate-400 font-light">
                Doorstep Cash on Delivery across Pakistan
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
