import React, { useState } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { CustomerProfile } from '../types/store';
import { 
  loginCustomer, 
  registerCustomer, 
  loginCustomerWithGoogle,
  saveCustomerProfile 
} from '../services/storeService';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (customer: CustomerProfile) => void;
  initialMode?: 'signin' | 'signup';
  promptMessage?: string;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signin',
  promptMessage,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  // Google Sign-In missing phone prompt state
  const [googlePendingCustomer, setGooglePendingCustomer] = useState<CustomerProfile | null>(null);
  const [googlePhone, setGooglePhone] = useState('');
  const [googleCity, setGoogleCity] = useState('');
  const [googleAddress, setGoogleAddress] = useState('');
  const [savingGooglePhone, setSavingGooglePhone] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setError(null);
      setErrorCode(null);
      setSuccess(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const getFriendlyErrorMessage = (err: any, currentMode: 'signin' | 'signup'): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return currentMode === 'signin'
          ? 'Invalid email or password. Please double-check your credentials, or choose "Sign Up" above if you are new to MUAVER.'
          : 'Could not create account with these credentials. Please check your information.';
      case 'auth/email-already-in-use':
        return 'This email address is already registered. Please choose "Log In" above to access your account, or sign in with Google.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address (e.g. name@domain.com).';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact MUAVER boutique concierge.';
      case 'auth/too-many-requests':
        return 'Too many failed login attempts. Access is temporarily locked. Please wait a few minutes and try again.';
      case 'auth/network-request-failed':
        return 'Network connection issue. Please check your internet connection and try again.';
      case 'auth/popup-closed-by-user':
        return 'Google Sign-In popup was closed before completing.';
      case 'auth/popup-blocked':
        return 'Popup blocked by browser. Please allow popups to continue with Google.';
      case 'auth/operation-not-allowed':
        return 'Email & Password authentication is not yet enabled in the Firebase Console. Please click "Continue with Google" for instant 1-click access (or enable Email/Password provider in Firebase Console > Authentication > Sign-in method).';
      default:
        return err?.message ? err.message.replace(/^Firebase:\s*/i, '') : 'An unexpected error occurred. Please try again.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorCode(null);
    setSuccess(null);

    if (mode === 'signin') {
      if (!email.trim() || !password) {
        setError('Please enter both your email address and password.');
        return;
      }

      try {
        setLoading(true);
        const customer = await loginCustomer(email.trim(), password);
        
        // Show clear success feedback
        const greetingName = customer.fullName || 'Patron';
        setSuccess(`Welcome back, ${greetingName}! You are now logged in.`);
        
        // Automatically synchronize session
        if (onSuccess) onSuccess(customer);

        // Smooth close after brief acknowledgment
        setTimeout(() => {
          onClose();
        }, 900);
      } catch (err: any) {
        console.error('Customer login error:', err);
        setErrorCode(err?.code || null);
        setError(getFriendlyErrorMessage(err, 'signin'));
      } finally {
        setLoading(false);
      }
    } else {
      // Signup validations
      if (!fullName.trim()) {
        setError('Please provide your full name.');
        return;
      }
      if (!email.trim()) {
        setError('Please provide a valid email address.');
        return;
      }
      if (!phone.trim() || phone.trim().length < 10) {
        setError('Please provide a valid contact phone number (e.g. 0324 2404984).');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }

      try {
        setLoading(true);
        const customer = await registerCustomer({
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          address: address.trim(),
        });

        // Show clear success message and auto-login customer
        setSuccess(`Account created successfully! Welcome to MUAVER, ${customer.fullName}. You are now logged in.`);
        
        // Auto-login customer right after sign up
        if (onSuccess) onSuccess(customer);

        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: any) {
        console.error('Customer registration error:', err);
        setErrorCode(err?.code || null);
        setError(getFriendlyErrorMessage(err, 'signup'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccess(null);
    try {
      setGoogleLoading(true);
      const { profile, isMissingPhone } = await loginCustomerWithGoogle();

      if (isMissingPhone) {
        // Prompt for phone number since Google OAuth doesn't include it
        setGooglePendingCustomer(profile);
        setGooglePhone(profile.phone || '');
        setGoogleCity(profile.city || '');
        setGoogleAddress(profile.address || '');
      } else {
        setSuccess(`Welcome to MUAVER, ${profile.fullName || 'Valued Patron'}! You are now logged in.`);
        if (onSuccess) onSuccess(profile);
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(getFriendlyErrorMessage(err, mode));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSaveGooglePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googlePendingCustomer) return;

    if (!googlePhone.trim() || googlePhone.trim().length < 10) {
      setError('Please provide a valid phone/WhatsApp number (e.g. 0324 2404984).');
      return;
    }

    try {
      setSavingGooglePhone(true);
      setError(null);

      const updatedProfile: CustomerProfile = {
        ...googlePendingCustomer,
        phone: googlePhone.trim(),
        city: googleCity.trim() || googlePendingCustomer.city || '',
        address: googleAddress.trim() || googlePendingCustomer.address || '',
      };

      await saveCustomerProfile({
        uid: googlePendingCustomer.uid,
        phone: updatedProfile.phone,
        city: updatedProfile.city,
        address: updatedProfile.address,
      });

      setSuccess(`Profile completed! Welcome to MUAVER, ${updatedProfile.fullName}.`);
      if (onSuccess) onSuccess(updatedProfile);

      setTimeout(() => {
        setGooglePendingCustomer(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Error saving customer phone:', err);
      setError(err?.message || 'Failed to save contact details. Please try again.');
    } finally {
      setSavingGooglePhone(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-montserrat">
      <div 
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-2xl text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* GOOGLE MISSING PHONE STEP */}
        {googlePendingCustomer ? (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-11 h-11 rounded-full bg-[var(--gold-500)]/15 border border-[var(--gold-500)]/40 flex items-center justify-center text-[#B89025] mx-auto mb-2">
                <Phone className="w-5 h-5" />
              </div>
              <h2 className="font-cinzel text-xl font-bold tracking-tight text-slate-900">
                Complete Your Contact Info
              </h2>
              <p className="text-xs text-slate-600">
                Signed in as <span className="font-semibold text-slate-900">{googlePendingCustomer.fullName}</span> ({googlePendingCustomer.email})
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto pt-1">
                Please provide your Phone / WhatsApp number so our central Karachi distribution can send order confirmations and dispatch tracking.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Alert */}
            {success && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSaveGooglePhone} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Phone / WhatsApp <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={googlePhone}
                    onChange={(e) => setGooglePhone(e.target.value)}
                    placeholder="0324 2404984"
                    required
                    autoFocus
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-mono focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    City (Optional)
                  </label>
                  <input
                    type="text"
                    value={googleCity}
                    onChange={(e) => setGoogleCity(e.target.value)}
                    placeholder="Karachi, Lahore..."
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:border-[#0A1A4F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={googleAddress}
                    onChange={(e) => setGoogleAddress(e.target.value)}
                    placeholder="Street / Area"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:border-[#0A1A4F] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingGooglePhone}
                className="w-full btn-gold py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {savingGooglePhone ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A1A4F]" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Save & Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* STANDARD SIGN IN / SIGN UP MODAL */
          <>
            {/* Header */}
            <div className="text-center space-y-1 mb-4">
              <h2 className="font-cinzel text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {mode === 'signin' ? 'Customer Log In' : 'Create Account'}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === 'signin'
                  ? 'Access your orders, track deliveries, and message our concierge.'
                  : 'Join the MUAVER clientele for order tracking and priority concierge.'}
              </p>
              {promptMessage && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 mt-2 text-left">
                  {promptMessage}
                </div>
              )}
            </div>

            {/* Toggle Mode Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setErrorCode(null);
                  setSuccess(null);
                }}
                className={`py-2 rounded-md transition-colors cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setErrorCode(null);
                  setSuccess(null);
                }}
                className={`py-2 rounded-md transition-colors cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Success Alert */}
            {success && (
              <div className="mb-3.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="font-medium">{success}</span>
              </div>
            )}

            {/* Error Alert */}
            {error && errorCode === 'auth/operation-not-allowed' ? (
              <div className="mb-3.5 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2.5 animate-fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-950">Email / Password Provider Not Enabled Yet</p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Email/Password sign-up is currently disabled in your Firebase Console. Please click below to sign in instantly with Google!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="w-full py-2 px-3 rounded-lg bg-white border border-amber-400 hover:bg-amber-100/60 text-xs font-semibold text-slate-800 flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Continue with Google Instead (Instant)</span>
                </button>
              </div>
            ) : error ? (
              <div className="mb-3.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : null}

            {/* Google Quick Sign-In */}
            <button
              type="button"
              disabled={googleLoading || loading || Boolean(success)}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2.5 transition-colors mb-3.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center my-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="px-2 text-[10px] text-slate-400 uppercase tracking-wider">
                or with email
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Sultan Ahmad"
                        required
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Phone / WhatsApp <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0324 2404984"
                        required
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm font-mono focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F] focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs sm:text-sm focus:border-[#0A1A4F] focus:ring-1 focus:ring-[#0A1A4F] focus:outline-none"
                  />
                </div>
              </div>

              {mode === 'signup' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      City (Optional)
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Karachi, Lahore..."
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:border-[#0A1A4F] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-500 block mb-1">
                      Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street / Area"
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:border-[#0A1A4F] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || Boolean(success)}
                className="w-full btn-gold py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A1A4F]" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <p className="text-[11px] text-center text-slate-400 mt-3 font-light">
              Your personal details remain confidential & secure.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
