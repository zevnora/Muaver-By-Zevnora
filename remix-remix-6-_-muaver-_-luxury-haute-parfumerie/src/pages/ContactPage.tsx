import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  Send, 
  CheckCircle, 
  ExternalLink, 
  Clock, 
  Lock, 
  User, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { SiteSettings, CustomerProfile, CustomerMessage } from '../types/store';
import { sendCustomerMessage, subscribeCustomerMessages } from '../services/storeService';

interface ContactPageProps {
  settings: SiteSettings;
  customer?: CustomerProfile | null;
  onRequestLogin?: () => void;
  onOpenAccount?: (tab?: 'orders' | 'messages' | 'profile') => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ 
  settings,
  customer,
  onRequestLogin,
  onOpenAccount,
}) => {
  useEffect(() => {
    document.title = 'Contact & Support | MUAVER';
  }, []);

  const [form, setForm] = useState({
    fullName: customer?.fullName || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    orderReference: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Real-time messages for logged in customer
  const [customerMessages, setCustomerMessages] = useState<CustomerMessage[]>([]);

  useEffect(() => {
    if (customer) {
      setForm((prev) => ({
        ...prev,
        fullName: customer.fullName || prev.fullName,
        email: customer.email || prev.email,
        phone: customer.phone || prev.phone,
      }));

      const unsub = subscribeCustomerMessages(
        customer.uid,
        (liveMsgs) => {
          setCustomerMessages(liveMsgs);
        },
        (err) => {
          console.warn('Customer messages listener notice in ContactPage:', err);
        }
      );
      return () => unsub();
    } else {
      setCustomerMessages([]);
    }
  }, [customer]);

  const hasInstagram = Boolean(settings.socialLinks?.instagram && settings.socialLinks.instagram.trim() !== '');
  const hasTikTok = Boolean(settings.socialLinks?.tiktok && settings.socialLinks.tiktok.trim() !== '');
  const hasFacebook = Boolean(settings.socialLinks?.facebook && settings.socialLinks.facebook.trim() !== '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customer) {
      setErrorMsg('Please log in or create an account to send a message to the store.');
      if (onRequestLogin) onRequestLogin();
      return;
    }

    if (!form.message.trim()) {
      setErrorMsg('Please enter your message text.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');

      await sendCustomerMessage({
        customerId: customer.uid,
        customerName: form.fullName.trim() || customer.fullName || 'Valued Customer',
        customerEmail: customer.email,
        customerPhone: form.phone.trim() || customer.phone || '',
        messageText: form.message.trim(),
        orderReference: form.orderReference.trim() || undefined,
      });

      setSubmitted(true);
      setForm((prev) => ({
        ...prev,
        orderReference: '',
        message: '',
      }));
    } catch (err: any) {
      console.error('Error submitting customer message:', err);
      setErrorMsg(err.message || 'Could not send message. Please contact via WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16 space-y-12 text-slate-800 font-montserrat">
      
      {/* Page Title */}
      {(Boolean(settings.contactBadge?.trim()) || Boolean(settings.contactTitle?.trim()) || Boolean(settings.contactSubtitle?.trim())) && (
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          {Boolean(settings.contactBadge?.trim()) && (
            <span className="text-xs uppercase tracking-widest text-[#B89025] font-semibold">
              {settings.contactBadge}
            </span>
          )}
          {Boolean(settings.contactTitle?.trim()) && (
            <h1 className="font-cinzel text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              {settings.contactTitle}
            </h1>
          )}
          {Boolean(settings.contactSubtitle?.trim()) && (
            <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed">
              {settings.contactSubtitle}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Contact / Messaging Area */}
        <div className="lg:col-span-7 bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="font-cinzel text-lg text-slate-900 font-bold">
                Send a Message
              </h2>
              <p className="text-xs text-slate-500 font-light">
                Direct inquiry to our customer care team.
              </p>
            </div>
            {customer && onOpenAccount && (
              <button
                type="button"
                onClick={() => onOpenAccount('messages')}
                className="text-xs text-[#B89025] hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                <span>My Messages ({customerMessages.length})</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* If NOT logged in: Gate message sending */}
          {!customer ? (
            <div className="p-8 rounded-xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-600">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-base text-slate-900">
                  Account Required to Message
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto font-light">
                  Please log in or sign up to send inquiries and receive direct replies in your account.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onRequestLogin}
                  className="btn-gold px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <User className="w-4 h-4" />
                  <span>Log In / Sign Up to Message</span>
                </button>
              </div>
            </div>
          ) : submitted ? (
            /* Message Sent Confirmation */
            <div className="text-center py-8 space-y-3 bg-white p-6 rounded-xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-base text-slate-900">
                Message Sent Successfully
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto font-light leading-relaxed">
                Thank you, <strong className="text-slate-900 font-medium">{customer.fullName}</strong>. Your message is received and our team will respond in your account.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-2.5 pt-1">
                {onOpenAccount && (
                  <button
                    onClick={() => onOpenAccount('messages')}
                    className="btn-gold px-5 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer shadow-sm"
                  >
                    View in Account
                  </button>
                )}
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Send Another Message
                </button>
              </div>
            </div>
          ) : (
            /* Logged-in Customer Message Form */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Logged in Badge */}
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Sending as <strong className="text-slate-900">{customer.fullName}</strong> ({customer.email})
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">Logged In</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="0324 2404984"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-none focus:border-[#0A1A4F]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 block">Order Number (Optional)</label>
                  <input
                    type="text"
                    name="orderReference"
                    value={form.orderReference}
                    onChange={handleChange}
                    placeholder="e.g. MV-29401"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0A1A4F]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 block">
                  Your Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  name="message"
                  rows={4}
                  value={form.message}
                  onChange={handleChange}
                  required
                  placeholder="How can we assist you with our fragrances or your order?"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0A1A4F]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-gold w-full py-2.5 px-5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0A1A4F]" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-[#0A1A4F]" />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Recent Replies Snippet */}
          {customer && customerMessages.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Recent Replies</span>
                </span>
                {onOpenAccount && (
                  <button
                    onClick={() => onOpenAccount('messages')}
                    className="text-[11px] text-[#B89025] hover:underline cursor-pointer"
                  >
                    View All ({customerMessages.length})
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {customerMessages.slice(0, 2).map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{msg.orderReference ? `Order #${msg.orderReference}` : 'General Inquiry'}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                        msg.status === 'Replied'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}>
                        {msg.status}
                      </span>
                    </div>
                    <p className="text-slate-700 line-clamp-1">{msg.messageText}</p>
                    {msg.adminReply && (
                      <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800 mt-1 text-[11px]">
                        <strong className="text-slate-900 block text-[10px] uppercase font-semibold">Store Reply:</strong>
                        <p className="line-clamp-2 text-slate-600">{msg.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Direct Customer Support Channels */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-slate-50 p-6 sm:p-7 rounded-2xl border border-slate-200 space-y-5">
            <h3 className="font-cinzel text-base text-slate-900 font-bold">
              Direct Contact Channels
            </h3>

            <div className="space-y-3 text-xs">
              
              {/* WhatsApp & Phone */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200">
                <div className="p-2 rounded-lg bg-emerald-50 text-[#25D366]">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">
                    WhatsApp & Phone
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`https://wa.me/${settings.whatsappRawNumber || '923242404984'}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-slate-900 hover:text-[#B89025] text-xs sm:text-sm font-mono"
                      title="Chat on WhatsApp"
                    >
                      {settings.contactPhone || '+92 324 2404984'}
                    </a>
                    <a
                      href={`tel:${(settings.contactPhone || '+923242404984').replace(/[^\d+]/g, '')}`}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium transition-colors"
                      title="Tap to Call"
                    >
                      Call Now
                    </a>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    Available for instant orders & consultations
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">
                    Official Email
                  </span>
                  <a
                    href={`mailto:${settings.contactEmail || 'hellomuaver@gmail.com'}`}
                    className="font-semibold text-slate-900 hover:text-[#B89025] transition-colors block text-xs sm:text-sm"
                  >
                    {settings.contactEmail || 'hellomuaver@gmail.com'}
                  </a>
                  <span className="text-[11px] text-slate-500 block">
                    Customer support inquiries
                  </span>
                </div>
              </div>

              {/* Hours */}
              {Boolean(settings.contactHours?.trim()) && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">
                      Support Hours
                    </span>
                    <span className="font-semibold text-slate-900 block text-xs">
                      {settings.contactHours}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Quick response on WhatsApp
                    </span>
                  </div>
                </div>
              )}

              {/* Dispatch Notice */}
              {Boolean(settings.contactDispatchNotice?.trim()) && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 font-light leading-relaxed">
                  <span className="font-semibold text-slate-900 block text-[10px] uppercase tracking-wider mb-0.5 text-[#B89025]">
                    Nationwide Dispatch
                  </span>
                  {settings.contactDispatchNotice}
                </div>
              )}

            </div>

            {/* Social Links */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <span className="text-xs font-semibold text-slate-800 block">
                Social Accounts
              </span>
              <div className="flex flex-col gap-1.5">
                <a
                  href={settings.socialLinks?.instagram || 'https://www.instagram.com/muaver.co'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-700 hover:text-slate-900 transition-colors"
                >
                  <span>Instagram @muaver.co</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <a
                  href={settings.socialLinks?.tiktok || 'https://www.tiktok.com/@muaver.co'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-700 hover:text-slate-900 transition-colors"
                >
                  <span>TikTok @muaver.co</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>

                <a
                  href={settings.socialLinks?.facebook || 'https://www.facebook.com/people/Muaver-Luxury-Brand/61592411954625/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs text-slate-700 hover:text-slate-900 transition-colors"
                >
                  <span>Facebook: Muaver Luxury</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
