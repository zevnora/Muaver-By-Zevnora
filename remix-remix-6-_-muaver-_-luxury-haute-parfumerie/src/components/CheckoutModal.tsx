import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle, 
  ShieldCheck, 
  Truck, 
  MessageCircle, 
  AlertCircle, 
  User, 
  Lock, 
  Crown, 
  Loader2,
  Copy,
  Check,
  CreditCard,
  Wallet
} from 'lucide-react';
import { CartItem, SiteSettings, CustomerProfile, PaymentSettings, PaymentAccount, ProductVariant } from '../types/store';
import { 
  createOrder, 
  calculateOrderCharges, 
  DEFAULT_STATIC_IMAGES,
  subscribePaymentSettings,
  DEFAULT_PAYMENT_SETTINGS,
  getProductById
} from '../services/storeService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderSuccess: (orderNumber: string) => void;
  settings: SiteSettings;
  customer?: CustomerProfile | null;
  onRequestLogin?: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onOrderSuccess,
  settings,
  customer,
  onRequestLogin,
}) => {
  const [formData, setFormData] = useState({
    fullName: customer?.fullName || '',
    phone: customer?.phone || '',
    city: customer?.city || '',
    address: customer?.address || '',
    notes: '',
  });

  // Pre-generate unique order reference code (format MV-12345) for the session
  const [orderCode] = useState(() => `MV-${Math.floor(10000 + Math.random() * 90000)}`);

  // Payment settings state from Firestore
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Subscribe to live payment settings
  useEffect(() => {
    const unsub = subscribePaymentSettings((cfg) => {
      setPaymentSettings(cfg);
    });
    return () => unsub();
  }, []);

  // Check if Online Payment is enabled and has active accounts
  const activeAccounts = (paymentSettings?.accounts || []).filter((a) => a.isEnabled);
  const isOnlinePaymentAvailable = Boolean(paymentSettings?.isEnabled && activeAccounts.length > 0);

  // Fallback to COD if Online Payment becomes disabled
  useEffect(() => {
    if (!isOnlinePaymentAvailable && selectedPaymentMethod === 'online') {
      setSelectedPaymentMethod('cod');
    }
  }, [isOnlinePaymentAvailable, selectedPaymentMethod]);

  // Pre-fill form data when customer logs in
  useEffect(() => {
    if (customer) {
      setFormData((prev) => ({
        fullName: prev.fullName || customer.fullName || '',
        phone: prev.phone || customer.phone || '',
        city: prev.city || customer.city || '',
        address: prev.address || customer.address || '',
        notes: prev.notes || '',
      }));
    }
  }, [customer]);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [completedOrder, setCompletedOrder] = useState<{
    orderNumber: string;
    orderId: string;
    paymentMethod: 'cod' | 'online';
  } | null>(null);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const charges = calculateOrderCharges(subtotal, settings.deliverySettings);
  const { deliveryCharges, handlingCharges, isFreeDelivery, totalAmount } = charges;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrorMessage('');
  };

  const handleCopy = (text: string, key: string) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2500);
  };

  const getSlipWhatsAppUrl = (codeToUse: string) => {
    const slipNumber = paymentSettings?.slipWhatsAppNumber || settings.whatsappNumber || '+92 324 2404984';
    const cleanNumber = slipNumber.replace(/\D/g, '') || '923242404984';
    const customerName = formData.fullName.trim() || customer?.fullName || 'Customer';
    const message = `Hello MUAVER, I have paid for order ${codeToUse}. Name: ${customerName}. Amount: Rs. ${totalAmount.toLocaleString()}. Sending my payment slip now.`;
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Customer login requirement
    if (!customer) {
      setErrorMessage('Please sign in or create a customer account before placing your order.');
      if (onRequestLogin) onRequestLogin();
      return;
    }

    // Validations
    if (!formData.fullName.trim()) {
      setErrorMessage('Please provide your full recipient name.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.trim().length < 10) {
      setErrorMessage('Please enter a valid Pakistani contact phone number (e.g., 0324 2404984).');
      return;
    }
    if (!formData.city.trim()) {
      setErrorMessage('Please select or specify your delivery city.');
      return;
    }
    if (!formData.address.trim() || formData.address.trim().length < 10) {
      setErrorMessage('Please enter your complete doorstep street address.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      // Re-verify and recalculate prices from live Firestore product data at checkout
      const verifiedItems: CartItem[] = await Promise.all(
        items.map(async (item) => {
          try {
            const liveProd = await getProductById(item.productId);
            if (liveProd) {
              const liveVariant = liveProd.variants?.find((v: ProductVariant) => v.size === item.size);
              const livePrice = liveVariant ? (Number(liveVariant.price) || Number(liveProd.price) || item.price) : (Number(liveProd.price) || item.price);
              return {
                ...item,
                productName: liveProd.name || item.productName,
                price: livePrice > 0 ? livePrice : item.price,
              };
            }
          } catch (e) {
            console.warn('Could not re-fetch live product at checkout:', e);
          }
          return item;
        })
      );

      const verifiedSubtotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const verifiedCharges = calculateOrderCharges(verifiedSubtotal, settings.deliverySettings);

      const isOnline = selectedPaymentMethod === 'online' && isOnlinePaymentAvailable;

      const orderResult = await createOrder({
        orderNumber: orderCode,
        customerId: customer.uid,
        customer: {
          fullName: formData.fullName.trim(),
          phone: formData.phone.trim(),
          city: formData.city.trim(),
          address: formData.address.trim(),
          email: customer.email,
          notes: formData.notes.trim() || undefined,
        },
        items: verifiedItems,
        subtotal: verifiedSubtotal,
        shippingFee: verifiedCharges.deliveryCharges,
        handlingFee: verifiedCharges.handlingCharges,
        totalAmount: verifiedCharges.totalAmount,
        paymentMethod: isOnline ? 'online' : 'cod',
        paymentStatus: isOnline ? 'Awaiting Payment' : 'COD',
      });

      setCompletedOrder({
        orderNumber: orderResult.orderNumber,
        orderId: orderResult.orderId,
        paymentMethod: isOnline ? 'online' : 'cod',
      });
      onOrderSuccess(orderResult.orderNumber);
    } catch (err: any) {
      console.error('Error placing order:', err);
      setErrorMessage('An unexpected error occurred while placing your order. Please try again or order directly via WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppConfirm = () => {
    if (!completedOrder) return;
    const phone = settings.whatsappRawNumber || '923242404984';
    const lines = [
      `Assalam-o-Alaikum MUAVER Customer Care,`,
      `I have just placed an order on the website:`,
      `• Order Number: ${completedOrder.orderNumber}`,
      `• Name: ${formData.fullName}`,
      `• Phone: ${formData.phone}`,
      `• City: ${formData.city}`,
      `• Address: ${formData.address}`,
      ``,
      `Items:`,
      ...items.map(
        (item) => `  - ${item.productName} (${item.size}) x ${item.quantity} = Rs. ${(item.price * item.quantity).toLocaleString()}`
      ),
      ``,
      `• Subtotal: Rs. ${subtotal.toLocaleString()}`,
      ...(handlingCharges > 0 ? [`• Handling Charges: Rs. ${handlingCharges.toLocaleString()}`] : []),
      `• Delivery Charges: ${isFreeDelivery ? 'Free (Rs. 0)' : `Rs. ${deliveryCharges.toLocaleString()}`}`,
      `• Total Amount: Rs. ${totalAmount.toLocaleString()} (Cash on Delivery)`,
      ``,
      `Please confirm my order dispatch. Thank you!`
    ];
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-montserrat flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!loading) onClose();
        }}
      />

      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-10 my-8 text-slate-800">
        
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-white">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-[#B89025] font-semibold block">
              MUAVER Checkout
            </span>
            <h2 className="font-cinzel text-lg sm:text-xl text-slate-900 font-bold">
              {completedOrder
                ? completedOrder.paymentMethod === 'online'
                  ? 'Online Order Confirmed'
                  : 'Order Confirmed'
                : selectedPaymentMethod === 'online'
                ? 'Online Payment Checkout'
                : 'Cash on Delivery Checkout'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 max-h-[80vh] overflow-y-auto space-y-6">
          {completedOrder ? (
            /* Order Success View */
            completedOrder.paymentMethod === 'online' ? (
              /* Online Payment Confirmation Screen */
              <div className="text-center space-y-5 py-3 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                  <CheckCircle className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                    Thank You, {formData.fullName}
                  </span>
                  <h3 className="font-cinzel text-2xl text-slate-900 font-bold">
                    Order Placed & Awaiting Verification
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Your order status is recorded as <strong className="text-amber-700">Awaiting Payment</strong>. Transfer the exact amount below using your unique order code in the transfer note, then tap the gold button to send your slip on WhatsApp.
                  </p>
                </div>

                {/* Order Code & Highlighted Amount */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Order Reference Code
                      </span>
                      <span className="text-xl sm:text-2xl text-slate-900 font-bold font-mono">
                        {completedOrder.orderNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(completedOrder.orderNumber, 'success-order-code')}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedKey === 'success-order-code' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'success-order-code' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">Amount to transfer:</span>
                    <span className="font-mono text-base font-bold text-[#0A1A4F]">
                      Rs. {totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Accounts Blocks */}
                <div className="max-w-md mx-auto text-left space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-heading uppercase tracking-wider font-bold text-slate-900 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#B89025]" />
                      <span>Transfer Accounts</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Copy into your bank app</span>
                  </div>

                  {activeAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 uppercase font-bold tracking-wide">
                          {acc.bankName}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(acc.bankName, `success-bank-${acc.id}`)}
                          className="px-2 py-0.5 rounded text-[10px] border border-slate-300 hover:bg-white text-slate-600 cursor-pointer flex items-center gap-1"
                        >
                          {copiedKey === `success-bank-${acc.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedKey === `success-bank-${acc.id}` ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Account Title</span>
                          <span className="font-medium text-slate-800">{acc.accountTitle}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(acc.accountTitle, `success-title-${acc.id}`)}
                          className="px-2 py-0.5 rounded text-[10px] border border-slate-300 hover:bg-white text-slate-600 cursor-pointer flex items-center gap-1"
                        >
                          {copiedKey === `success-title-${acc.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedKey === `success-title-${acc.id}` ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] text-slate-500 block">IBAN</span>
                          <span className="font-mono text-[11px] font-bold text-slate-900 break-all">
                            {acc.iban}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(acc.iban, `success-iban-${acc.id}`)}
                          className="px-2 py-0.5 rounded text-[10px] border border-slate-300 hover:bg-white text-slate-600 cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          {copiedKey === `success-iban-${acc.id}` ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedKey === `success-iban-${acc.id}` ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Send Payment Slip on WhatsApp Button */}
                <div className="pt-2 max-w-md mx-auto space-y-2">
                  <a
                    href={getSlipWhatsAppUrl(completedOrder.orderNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-gold w-full py-3.5 px-6 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <MessageCircle className="w-4 h-4 text-[#0A1A4F]" />
                    <span>Send Payment Slip on WhatsApp</span>
                  </a>

                  <button
                    onClick={onClose}
                    className="w-full py-2.5 px-5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            ) : (
              /* Cash on Delivery Success View */
              <div className="text-center space-y-5 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                  <CheckCircle className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">
                    Thank You, {formData.fullName}
                  </span>
                  <h3 className="font-cinzel text-2xl text-slate-900 font-bold">
                    Order Successfully Placed
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Your order is received with status <strong className="text-slate-900">Pending</strong>. Our customer care team will prepare and dispatch your parcel.
                  </p>
                </div>

                {/* Order Reference Badge */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto space-y-1">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider">
                    Order Reference Number
                  </div>
                  <div className="text-xl sm:text-2xl text-slate-900 font-bold font-mono">
                    {completedOrder.orderNumber}
                  </div>
                  <div className="text-xs text-slate-600 pt-1">
                    Pay Rs. {totalAmount.toLocaleString()} via Cash on Delivery
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 max-w-md mx-auto">
                  <button
                    onClick={handleWhatsAppConfirm}
                    className="btn-gold flex-1 py-3 px-4 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-[#0A1A4F]" />
                    <span>Confirm on WhatsApp</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full sm:w-auto py-3 px-5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    Continue Shopping
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  A verification call or message may be sent to {formData.phone} prior to dispatch.
                </p>
              </div>
            )
          ) : (
            /* Checkout Form View */
            <form onSubmit={handleSubmitOrder} className="space-y-5">
              
              {/* Order Items Preview */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-800 font-semibold uppercase tracking-wider">
                      Items ({items.reduce((acc, i) => acc + i.quantity, 0)})
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100/70 text-emerald-800 text-[10px] font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      <span>COD Available</span>
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-900">
                    Subtotal: Rs. {subtotal.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.size}`} className="flex items-center justify-between text-xs text-slate-700">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 aspect-[4/5] rounded overflow-hidden border border-slate-200 bg-white shrink-0">
                          <img
                            src={item.productImage || DEFAULT_STATIC_IMAGES.heroFallbackImage}
                            alt={item.productName}
                            width={32}
                            height={40}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = DEFAULT_STATIC_IMAGES.heroFallbackImage;
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <span className="font-medium text-slate-900">{item.productName}</span>
                          <span className="text-[11px] text-slate-500 block">{item.size} × {item.quantity}</span>
                        </div>
                      </div>
                      <span className="font-semibold text-slate-900">
                        Rs. {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Customer Account Status Banner */}
              {!customer ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-semibold text-slate-900">
                      <Lock className="w-3.5 h-3.5 text-[#B89025]" />
                      <span>Customer Account Required</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Please log in or sign up to finalize your order and track shipment.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onRequestLogin}
                    className="btn-gold px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider shrink-0 cursor-pointer shadow-sm"
                  >
                    Log In / Sign Up
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-800 truncate">
                    <Crown className="w-3.5 h-3.5 text-[#B89025] shrink-0" />
                    <span className="truncate">
                      Ordering as <strong className="text-slate-900">{customer.fullName}</strong> ({customer.email})
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-medium shrink-0 ml-2">
                    Verified
                  </span>
                </div>
              )}

              {/* Customer Delivery Fields */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#B89025]" />
                  <span>Recipient Delivery Details</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 block">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="e.g. Sultan Ahmad"
                      required
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F]"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 block">
                      Phone Number (WhatsApp) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g. 0324 2404984"
                      required
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    Destination City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g. Karachi, Lahore, Islamabad"
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F]"
                  />
                </div>

                {/* Street Address */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">
                    Full Doorstep Address <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    rows={2}
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="House #, Street, Block, Area..."
                    required
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F]"
                  />
                </div>

                {/* Order Notes */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 block">
                    Special Delivery Instructions (Optional)
                  </label>
                  <input
                    type="text"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="e.g. Call before delivery"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F]"
                  />
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="space-y-3 pt-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-800 block">
                  Payment Method
                </label>

                {isOnlinePaymentAvailable ? (
                  /* Two Selectable Cards */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Card 1: Cash on Delivery */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('cod')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                        selectedPaymentMethod === 'cod'
                          ? 'border-[#0A1A4F] bg-slate-50 ring-2 ring-[#0A1A4F]/10 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-bold text-xs text-slate-900">Cash on Delivery</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedPaymentMethod === 'cod'
                              ? 'border-[#0A1A4F] bg-[#0A1A4F]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {selectedPaymentMethod === 'cod' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Pay cash upon doorstep parcel delivery with inspection.
                      </p>
                    </button>

                    {/* Card 2: Online Payment */}
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('online')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                        selectedPaymentMethod === 'online'
                          ? 'border-[#B89025] bg-amber-50/40 ring-2 ring-[#B89025]/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900">Online Payment</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                            Verified
                          </span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            selectedPaymentMethod === 'online'
                              ? 'border-[#B89025] bg-[#B89025]'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {selectedPaymentMethod === 'online' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Direct bank or wallet transfer with WhatsApp slip verification.
                      </p>
                    </button>
                  </div>
                ) : (
                  /* Single Card when Online Payment is off or no active accounts */
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Cash on Delivery (COD)</span>
                      <span className="text-[11px] text-slate-500">
                        Pay cash to the courier at your doorstep upon parcel arrival.
                      </span>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  </div>
                )}

                {/* When Online Payment is selected: Clean Card with accounts, amount, code, slip button */}
                {selectedPaymentMethod === 'online' && isOnlinePaymentAvailable && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-[#B89025]/30 space-y-3.5 animate-fade-in">
                    {/* Instructions */}
                    {paymentSettings?.instructionText && (
                      <p className="text-[11px] text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed italic">
                        {paymentSettings.instructionText}
                      </p>
                    )}

                    {/* Highlighted Line: Amount to transfer */}
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">Amount to transfer:</span>
                      <span className="font-mono text-base font-extrabold text-[#0A1A4F]">
                        Rs. {totalAmount.toLocaleString()}
                      </span>
                    </div>

                    {/* Unique Order Reference Code */}
                    <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-medium">
                          Order Reference Code
                        </span>
                        <span className="font-mono text-base font-bold text-slate-900">
                          {orderCode}
                        </span>
                        <span className="text-[10px] text-amber-800 block mt-0.5 font-medium">
                          Write this code in the transfer note
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(orderCode, 'checkout-order-code')}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                      >
                        {copiedKey === 'checkout-order-code' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === 'checkout-order-code' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* One Block Per Active Account */}
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-heading uppercase tracking-wider text-slate-700 font-bold block">
                        Select a Bank / Wallet Account
                      </span>

                      {activeAccounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <strong className="text-slate-900 uppercase font-bold tracking-wide">
                              {acc.bankName}
                            </strong>
                            <button
                              type="button"
                              onClick={() => handleCopy(acc.bankName, `acc-bank-${acc.id}`)}
                              className="px-2 py-0.5 rounded text-[10px] border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer flex items-center gap-1"
                            >
                              {copiedKey === `acc-bank-${acc.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedKey === `acc-bank-${acc.id}` ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Account Title</span>
                              <span className="font-medium text-slate-800">{acc.accountTitle}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(acc.accountTitle, `acc-title-${acc.id}`)}
                              className="px-2 py-0.5 rounded text-[10px] border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer flex items-center gap-1"
                            >
                              {copiedKey === `acc-title-${acc.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedKey === `acc-title-${acc.id}` ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <div className="min-w-0 pr-2">
                              <span className="text-[10px] text-slate-400 block">IBAN</span>
                              <span className="font-mono text-[11px] font-bold text-slate-900 break-all">
                                {acc.iban}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopy(acc.iban, `acc-iban-${acc.id}`)}
                              className="px-2 py-0.5 rounded text-[10px] border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              {copiedKey === `acc-iban-${acc.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedKey === `acc-iban-${acc.id}` ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Gold Button: Send Payment Slip on WhatsApp */}
                    <div className="pt-1">
                      <a
                        href={getSlipWhatsAppUrl(orderCode)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-gold w-full py-3 px-4 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm text-center"
                      >
                        <MessageCircle className="w-4 h-4 text-[#0A1A4F]" />
                        <span>Send Payment Slip on WhatsApp</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Charges Breakdown */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-[#B89025]" />
                    <span>Estimated Delivery Time:</span>
                  </div>
                  <span className="font-semibold text-slate-900">
                    {settings.deliverySettings?.deliveryTimeText || '2 to 5 working days'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-800">Rs. {subtotal.toLocaleString()}</span>
                </div>

                {handlingCharges > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Handling Charges:</span>
                    <span>Rs. {handlingCharges.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span>Delivery Charges:</span>
                  <span className={isFreeDelivery ? 'text-emerald-700 font-medium' : 'font-medium text-slate-800'}>
                    {isFreeDelivery ? 'Free Delivery' : `Rs. ${deliveryCharges.toLocaleString()}`}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                  <span>
                    Total Amount ({selectedPaymentMethod === 'online' ? 'Online Transfer' : 'COD'}):
                  </span>
                  <span className="text-base text-slate-900">
                    Rs. {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold w-full py-3.5 px-6 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#0A1A4F]" />
                      <span>Confirming Order...</span>
                    </div>
                  ) : selectedPaymentMethod === 'online' ? (
                    <span>Place Online Order · Rs. {totalAmount.toLocaleString()}</span>
                  ) : (
                    <span>Confirm Order · Rs. {totalAmount.toLocaleString()} (COD)</span>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
};
