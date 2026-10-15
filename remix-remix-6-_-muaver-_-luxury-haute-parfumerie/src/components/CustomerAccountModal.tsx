import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShoppingBag, 
  MessageSquare, 
  User, 
  LogOut, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Phone, 
  Mail,
  Loader2,
  Inbox
} from 'lucide-react';
import { CustomerProfile, Order, CustomerMessage } from '../types/store';
import { 
  subscribeCustomerOrders, 
  subscribeCustomerMessages, 
  sendCustomerMessage, 
  saveCustomerProfile, 
  logoutCustomer 
} from '../services/storeService';

interface CustomerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerProfile;
  onCustomerUpdated: (updated: CustomerProfile) => void;
  onLogout: () => void;
  onNavigateToShop?: () => void;
  initialTab?: 'orders' | 'messages' | 'profile';
}

export const CustomerAccountModal: React.FC<CustomerAccountModalProps> = ({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated,
  onLogout,
  onNavigateToShop,
  initialTab = 'orders',
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'messages' | 'profile'>(initialTab);
  
  // Real-time data
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // New message form state
  const [isComposing, setIsComposing] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [orderReference, setOrderReference] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSuccess, setMessageSuccess] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  // Profile editing state
  const [fullName, setFullName] = useState(customer.fullName || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [city, setCity] = useState(customer.city || '');
  const [address, setAddress] = useState(customer.address || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Sync profile form state when customer prop updates
  useEffect(() => {
    setFullName(customer.fullName || '');
    setPhone(customer.phone || '');
    setCity(customer.city || '');
    setAddress(customer.address || '');
  }, [customer]);

  // Set initial tab when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setMessageSuccess(null);
      setMessageError(null);
      setProfileSuccess(false);
      setProfileError(null);
    }
  }, [isOpen, initialTab]);

  // Subscribe to customer's orders in real time
  useEffect(() => {
    if (!isOpen || !customer.uid) return;
    setLoadingOrders(true);
    const unsub = subscribeCustomerOrders(
      customer.uid,
      (liveOrders) => {
        setOrders(liveOrders);
        setLoadingOrders(false);
      },
      (err) => {
        console.warn('Orders subscription notice:', err);
        setLoadingOrders(false);
      }
    );
    return () => unsub();
  }, [isOpen, customer.uid]);

  // Subscribe to customer's messages in real time
  useEffect(() => {
    if (!isOpen || !customer.uid) return;
    setLoadingMessages(true);
    const unsub = subscribeCustomerMessages(
      customer.uid,
      (liveMsgs) => {
        setMessages(liveMsgs);
        setLoadingMessages(false);
      },
      (err) => {
        console.warn('Messages subscription notice:', err);
        setLoadingMessages(false);
      }
    );
    return () => unsub();
  }, [isOpen, customer.uid]);

  if (!isOpen) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      setSendingMessage(true);
      setMessageError(null);
      setMessageSuccess(null);

      await sendCustomerMessage({
        customerId: customer.uid,
        customerName: customer.fullName || 'Valued Customer',
        customerEmail: customer.email,
        customerPhone: customer.phone,
        messageText: messageText.trim(),
        orderReference: orderReference.trim() || undefined,
      });

      setMessageSuccess('Your message has been sent to our customer care team.');
      setMessageText('');
      setOrderReference('');
      setIsComposing(false);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setMessageError(err.message || 'Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    if (!fullName.trim()) {
      setProfileError('Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setProfileError('Please enter your contact phone number.');
      return;
    }

    try {
      setSavingProfile(true);
      const updated: CustomerProfile = {
        ...customer,
        fullName: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        address: address.trim(),
        updatedAt: new Date(),
      };
      await saveCustomerProfile(updated);
      onCustomerUpdated(updated);
      setProfileSuccess(true);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setProfileError(err.message || 'Could not save profile details.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOutClick = async () => {
    try {
      await logoutCustomer();
      onLogout();
      onClose();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const repliedMessagesCount = messages.filter((m) => m.status === 'Replied' && m.adminReply).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-montserrat flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div 
        className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-10 my-6 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-white relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#0A1A4F] text-white flex items-center justify-center font-bold text-base shadow-sm">
              {(customer.fullName || customer.email || 'M').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {customer.fullName || 'Customer Account'}
              </h2>
              <p className="text-xs text-slate-500">{customer.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSignOutClick}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-rose-600 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-6 relative z-10">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'orders'
                ? 'border-[#0A1A4F] text-[#0A1A4F]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>My Orders</span>
            {orders.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200 text-slate-700">
                {orders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('messages')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'messages'
                ? 'border-[#0A1A4F] text-[#0A1A4F]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Messages & Replies</span>
            {repliedMessagesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#D4AF37] text-[#0A1A4F]">
                {repliedMessagesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#0A1A4F] text-[#0A1A4F]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile Details</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 max-h-[68vh] overflow-y-auto relative z-10 bg-white">
          
          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {loadingOrders ? (
                <div className="text-center py-12 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" />
                  <p className="text-xs text-slate-500">Loading your orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-xs">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-800">No Orders Yet</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto font-light">
                      When you order with Cash on Delivery, your orders and tracking details will appear here.
                    </p>
                  </div>
                  {onNavigateToShop && (
                    <button
                      onClick={() => {
                        onClose();
                        onNavigateToShop();
                      }}
                      className="btn-gold px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer mt-2"
                    >
                      Browse Fragrances
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <span>Showing {orders.length} order{orders.length === 1 ? '' : 's'}</span>
                    <span>Cash on Delivery</span>
                  </div>

                  {orders.map((order) => {
                    const statusColors: Record<string, string> = {
                      Pending: 'bg-amber-50 text-amber-800 border-amber-200',
                      Confirmed: 'bg-blue-50 text-blue-800 border-blue-200',
                      Shipped: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                      Delivered: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                      Cancelled: 'bg-rose-50 text-rose-800 border-rose-200',
                      Returned: 'bg-orange-50 text-orange-800 border-orange-200',
                    };

                    const dateFormatted = order.createdAt?.seconds
                      ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Recently placed';

                    return (
                      <div
                        key={order.id || order.orderNumber}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors space-y-3"
                      >
                        {/* Order Top Summary */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs sm:text-sm text-slate-900 font-mono">
                                #{order.orderNumber}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                                  statusColors[order.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Placed on {dateFormatted}
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-[11px] text-slate-500 block">Total (COD)</span>
                            <span className="font-semibold text-sm text-slate-900">
                              Rs. {Number(order.totalAmount).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Items in this Order */}
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-slate-200"
                              >
                                <img
                                  src={item.productImage || 'https://i.ibb.co/M5Dq0xS9/Icon.png'}
                                  alt={item.productName}
                                  width={40}
                                  height={40}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-10 h-10 object-cover rounded border border-slate-200 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-xs font-semibold text-slate-900 truncate">
                                    {item.productName}
                                  </h4>
                                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                                    <span>{item.size} × {item.quantity}</span>
                                    <span className="font-medium text-slate-800">
                                      Rs. {(item.price * item.quantity).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Shipping Address info & Inquire */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-500 border-t border-slate-200">
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {order.customer.city}, {order.customer.address}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('messages');
                              setIsComposing(true);
                              setOrderReference(order.orderNumber);
                            }}
                            className="text-[#B89025] hover:underline flex items-center gap-1 cursor-pointer shrink-0 font-medium"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Inquire about this order</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MESSAGES & REPLIES */}
          {activeTab === 'messages' && (
            <div className="space-y-4">
              {messageSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{messageSuccess}</span>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Customer Support Inquiries</h3>
                  <p className="text-xs text-slate-500">
                    Direct communications with store support.
                  </p>
                </div>
                {!isComposing && (
                  <button
                    onClick={() => {
                      setIsComposing(true);
                      setMessageError(null);
                    }}
                    className="btn-gold px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>New Message</span>
                  </button>
                )}
              </div>

              {/* Inline Compose Box */}
              {isComposing && (
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-semibold text-slate-900">
                      Send Message to Support
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsComposing(false)}
                      className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  {messageError && (
                    <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{messageError}</span>
                    </div>
                  )}

                  {/* Order Reference */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Related Order Number (Optional)
                    </label>
                    {orders.length > 0 ? (
                      <select
                        value={orderReference}
                        onChange={(e) => setOrderReference(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0A1A4F]"
                      >
                        <option value="">General Inquiry (No specific order)</option>
                        {orders.map((o) => (
                          <option key={o.orderNumber} value={o.orderNumber}>
                            Order #{o.orderNumber} ({o.status})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={orderReference}
                        onChange={(e) => setOrderReference(e.target.value)}
                        placeholder="e.g. MV-84920"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0A1A4F]"
                      />
                    )}
                  </div>

                  {/* Message Input */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Your Message *
                    </label>
                    <textarea
                      rows={3}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      required
                      placeholder="Type your question or inquiry here..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#0A1A4F]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsComposing(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-900 border border-slate-300 bg-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sendingMessage}
                      className="btn-gold px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {sendingMessage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Message</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Messages List */}
              {loadingMessages ? (
                <div className="text-center py-10 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-500" />
                  <p className="text-xs text-slate-500">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-2 bg-slate-50 rounded-xl border border-slate-200">
                  <Inbox className="w-8 h-8 mx-auto text-slate-300" />
                  <h4 className="text-xs font-semibold text-slate-800">No Messages Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-light">
                    Have questions regarding fragrances, orders, or delivery? Send us a message anytime.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const statusBadgeColors = {
                      New: 'bg-amber-50 text-amber-800 border-amber-200',
                      Read: 'bg-blue-50 text-blue-800 border-blue-200',
                      Replied: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                    };

                    const sentTime = msg.createdAt?.seconds
                      ? new Date(msg.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recently sent';

                    const replyTime = msg.repliedAt?.seconds
                      ? new Date(msg.repliedAt.seconds * 1000).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    return (
                      <div
                        key={msg.id}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                                statusBadgeColors[msg.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {msg.status === 'Replied' ? 'Replied by Store' : msg.status}
                            </span>
                            {msg.orderReference && (
                              <span className="px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200 text-[10px] font-mono">
                                Order #{msg.orderReference}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{sentTime}</span>
                          </span>
                        </div>

                        {/* Customer Question */}
                        <div className="text-xs text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-1">
                            Your Message:
                          </span>
                          <p className="whitespace-pre-wrap">{msg.messageText}</p>
                        </div>

                        {/* Admin Reply */}
                        {msg.adminReply ? (
                          <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-[#B89025]">
                                Store Reply
                              </span>
                              {replyTime && <span className="text-[10px] text-slate-400">{replyTime}</span>}
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-[#D4AF37]">
                              {msg.adminReply}
                            </p>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-700 flex items-center gap-1.5 pt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>In review by customer support. Reply will be displayed here.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACCOUNT & SHIPPING DETAILS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="max-w-md mx-auto space-y-3.5">
              <div className="text-center space-y-0.5 pb-2">
                <h3 className="text-sm font-semibold text-slate-900">Personal Details</h3>
                <p className="text-xs text-slate-500 font-light">
                  Save your details for faster Cash on Delivery checkout.
                </p>
              </div>

              {profileSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              {profileError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={customer.email}
                    disabled
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 text-xs cursor-not-allowed"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Linked to your login account.
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Phone / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="0324 2404984"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Default City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Karachi, Lahore..."
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House, Street, Area"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full btn-gold py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-50 shadow-sm"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A1A4F]" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
