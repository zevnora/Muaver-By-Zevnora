import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  auth, 
  db 
} from '../services/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Images, 
  Package, 
  ShoppingBag, 
  FileText, 
  ShieldCheck, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  ChevronRight, 
  Crown, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  Menu,
  X,
  Sparkles,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  MessageSquare,
  Star,
  UserCheck
} from 'lucide-react';
import { SiteSettings, Product, Order, BannerSlide, AdminRole, CustomerMessage } from '../types/store';
import { AdminBanners } from '../components/AdminBanners';
import { AdminProducts } from '../components/AdminProducts';
import { AdminOrders } from '../components/AdminOrders';
import { AdminMessages } from '../components/AdminMessages';
import { AdminReviews } from '../components/AdminReviews';
import { AdminCustomers } from '../components/AdminCustomers';
import { AdminSiteContent } from '../components/AdminSiteContent';
import { AdminSettings } from '../components/AdminSettings';
import { AdminPoliciesDelivery } from '../components/AdminPoliciesDelivery';
import { AdminAdmins } from '../components/AdminAdmins';
import { AdminConsoleLoader } from '../components/BrandedLoader';
import { getOrders, subscribeOrders, subscribeAllMessages, verifyOrBootstrapAdmin } from '../services/storeService';
import firebaseConfigJson from '../../firebase-applet-config.json';

interface AdminPageProps {
  settings: SiteSettings;
  products: Product[];
  banners: BannerSlide[];
  onExitAdmin: () => void;
  onRefreshData?: () => Promise<void>;
}

export type AdminTab = 
  | 'dashboard' 
  | 'banners' 
  | 'products' 
  | 'orders' 
  | 'messages'
  | 'reviews'
  | 'customers'
  | 'site-content' 
  | 'policies-delivery' 
  | 'admins' 
  | 'settings';

export const AdminPage: React.FC<AdminPageProps> = ({
  settings,
  products,
  banners,
  onExitAdmin,
  onRefreshData,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<AdminRole>('admin');
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Login form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Firestore live orders count for overview
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Firestore live customer messages
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Listen to Firebase Auth state and verify authorization strictly against 'admins' collection
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        setAuthLoading(true);
        try {
          const authResult = await verifyOrBootstrapAdmin({
            email: user.email,
            displayName: user.displayName,
            uid: user.uid,
          });

          if (authResult.isAuthorized && authResult.admin) {
            setCurrentUser(user);
            setCurrentUserRole(authResult.admin.role);
            if (authResult.isFirstOwnerCreated) {
              setAuthNotice('Welcome! Fresh setup detected: Your account has been initialized as the primary Owner.');
            }
          } else {
            // Not in admins collection! Sign out immediately to enforce gatekeeping
            await signOut(auth);
            setCurrentUser(null);
            setCurrentUserRole('admin');
            setAuthError(
              authResult.errorReason ||
                `Access Denied: The email "${user.email}" is not listed in the authorized administrators registry.`
            );
          }
        } catch (err: any) {
          console.error('Admin gate check error:', err);
          await signOut(auth);
          setCurrentUser(null);
          setAuthError(err.message || 'Authorization check failed.');
        } finally {
          setAuthLoading(false);
        }
      } else {
        setCurrentUser(null);
        setCurrentUserRole('admin');
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Diagnostic log for comparing Firebase Project ID, Firestore Database ID, and document paths on admin panel
  useEffect(() => {
    console.log(
      `[MUAVER Admin Panel] Firebase projectId: "${firebaseConfigJson.projectId}" | Firestore databaseId: "${firebaseConfigJson.firestoreDatabaseId || '(default)'}" | Content doc paths read/written: "settings/general", "banners", "products"`
    );
  }, []);

  // Live Firestore subscription for orders
  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      return;
    }
    setLoadingOrders(true);
    const unsub = subscribeOrders(
      (liveOrders) => {
        setOrders(liveOrders);
        setLoadingOrders(false);
      },
      (err) => {
        console.warn('Orders live listener error in AdminPage:', err);
        setLoadingOrders(false);
      }
    );
    return () => unsub();
  }, [currentUser]);

  // Live Firestore subscription for customer messages
  useEffect(() => {
    if (!currentUser) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    const unsub = subscribeAllMessages(
      (liveMsgs) => {
        setMessages(liveMsgs);
        setLoadingMessages(false);
      },
      (err) => {
        console.warn('Messages live listener error in AdminPage:', err);
        setLoadingMessages(false);
      }
    );
    return () => unsub();
  }, [currentUser]);

  // Dashboard Metrics & Calculations
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = useMemo(() => orders.filter((o) => o.status === 'Pending').length, [orders]);
  const unreadMessagesCount = useMemo(() => messages.filter((m) => m.status === 'New').length, [messages]);
  const deliveredRevenue = useMemo(
    () => orders.filter((o) => o.status === 'Delivered').reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
    [orders]
  );

  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayOrdersCount = useMemo(() => {
    return orders.filter((o) => {
      const time = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : new Date(o.createdAt || 0).getTime();
      return time >= startOfToday;
    }).length;
  }, [orders, startOfToday]);

  // 30-day orders trend (trading-style candlestick analytics)
  const last30DaysChart = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rawDays: {
      currentDay: Date;
      matchedOrders: typeof orders;
      dayRevenue: number;
      itemsCount: number;
      count: number;
    }[] = [];

    for (let i = 29; i >= 0; i--) {
      const currentDay = new Date(today);
      currentDay.setDate(today.getDate() - i);
      const dayStart = currentDay.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const matchedOrders = orders.filter((o) => {
        const orderTime = o.createdAt?.seconds ? o.createdAt.seconds * 1000 : new Date(o.createdAt || 0).getTime();
        return orderTime >= dayStart && orderTime < dayEnd;
      });

      const dayRevenue = matchedOrders
        .filter((o) => o.status === 'Delivered')
        .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

      const itemsCount = matchedOrders.reduce((sum, o) => {
        const itCount = Array.isArray(o.items)
          ? o.items.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0)
          : 1;
        return sum + itCount;
      }, 0);

      rawDays.push({
        currentDay,
        matchedOrders,
        dayRevenue,
        itemsCount,
        count: matchedOrders.length,
      });
    }

    const totalOrders = rawDays.reduce((sum, d) => sum + d.count, 0);
    const avgOrders = totalOrders / 30;
    const maxOrders = Math.max(4, ...rawDays.map((d) => d.count), ...rawDays.map((d) => d.itemsCount));

    const days = rawDays.map((day, idx) => {
      const prevCount = idx > 0 ? rawDays[idx - 1].count : day.count;
      const isToday = idx === 29;
      const isAboveAvg = day.count >= avgOrders && day.count > 0;
      const isBullish = day.count >= prevCount && day.count > 0;

      return {
        idx,
        label: isToday ? 'Today' : `${day.currentDay.getDate()}`,
        dateStr: day.currentDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDateStr: day.currentDay.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        count: day.count,
        prevCount,
        revenue: day.dayRevenue,
        itemsCount: day.itemsCount,
        isBullish,
        isAboveAvg,
        isToday,
      };
    });

    return {
      days,
      totalOrders,
      avgOrders,
      maxOrders,
      totalRevenue: rawDays.reduce((sum, d) => sum + d.dayRevenue, 0),
    };
  }, [orders]);

  // Format date helper
  const formatOrderDate = (dateVal: any) => {
    if (!dateVal) return 'Recently';
    const date = dateVal?.seconds ? new Date(dateVal.seconds * 1000) : new Date(dateVal);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setAuthError(err.message || 'Google authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Email / Password Sign In or Sign Up
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email || !password) {
      setAuthError('Please fill in both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      console.error('Auth Error:', err);
      let msg = err.message || 'Authentication failed.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid credentials. If this is your first time, choose "Create Admin Account" below.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is not enabled in Firebase Console. Please use "Sign In with Google" above (or enable Email/Password provider in Firebase Console > Authentication > Sign-in method).';
      }
      setAuthError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Sidebar navigation items
  const sidebarItems: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'banners', label: 'Banners', icon: Images },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'customers', label: 'Customers', icon: UserCheck },
    { id: 'site-content', label: 'Site Content', icon: FileText },
    { id: 'policies-delivery', label: 'Policies and Delivery', icon: ShieldCheck },
    { id: 'admins', label: 'Admins', icon: Users },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  // Section transition state for fast, branded module loading
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionFading, setSectionFading] = useState(false);
  const [sectionLabel, setSectionLabel] = useState('Loading Module...');

  const tabLabels: Record<AdminTab, string> = {
    dashboard: 'Loading Dashboard...',
    banners: 'Loading Banners...',
    products: 'Loading Products Catalog...',
    reviews: 'Loading Customer Reviews...',
    orders: 'Loading Orders Dispatch...',
    messages: 'Loading Customer Messages...',
    customers: 'Loading Customer Directory...',
    'site-content': 'Loading Site Content...',
    'policies-delivery': 'Loading Policies & Delivery...',
    admins: 'Loading Administrators...',
    settings: 'Loading Store Settings...',
  };

  const handleSelectTab = (tabId: AdminTab) => {
    if (tabId === activeTab) {
      setSidebarOpen(false);
      return;
    }
    setSectionLabel(tabLabels[tabId] || 'Loading Module...');
    setSectionLoading(true);
    setSectionFading(false);
    setActiveTab(tabId);
    setSidebarOpen(false);

    // Fast, lightweight transition (fade out smoothly as soon as real content is ready)
    setTimeout(() => {
      setSectionFading(true);
      setTimeout(() => {
        setSectionLoading(false);
        setSectionFading(false);
      }, 300);
    }, 180);
  };

  // Refresh handler helper
  const handleRefresh = async () => {
    if (onRefreshData) {
      await onRefreshData();
    }
  };

  // 1. Loading state
  if (authLoading) {
    return <AdminConsoleLoader label="Initializing Console..." />;
  }

  // 2. Unauthenticated State: Executive Login Wall
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[var(--navy-900)] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[var(--gold-500)]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#10286E]/40 rounded-full blur-3xl pointer-events-none" />

        {/* Back to boutique link */}
        <button
          onClick={onExitAdmin}
          className="absolute top-6 left-6 text-xs text-[var(--gold-300)] hover:text-white flex items-center gap-2 font-montserrat tracking-wider uppercase transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Boutique</span>
        </button>

        {/* Login Card */}
        <div className="w-full max-w-md bg-[#0D1A3E] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl relative z-10 space-y-6">
          
          {/* Header & Crest */}
          <div className="text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-[var(--navy-800)] border border-white/10 p-2.5 flex items-center justify-center shadow-xs">
              <img
                src={settings.iconUrl || 'https://i.ibb.co/M5Dq0xS9/Icon.png'}
                alt="MUAVER"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-[10px] uppercase font-heading tracking-[0.2em] text-[var(--gold-300)] font-semibold block">
                Command Console
              </span>
              <h1 className="font-heading text-xl text-white font-bold tracking-wider">
                MUAVER ADMIN ACCESS
              </h1>
              <p className="text-xs text-slate-400 font-light mt-1">
                Authorized administrator credentials required.
              </p>
            </div>
          </div>

          {/* Clean Divider */}
          <div className="border-t border-white/10 my-2" />

          {/* Notices */}
          {authNotice && (
            <div className="p-3.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{authNotice}</span>
            </div>
          )}

          {/* Error Banner */}
          {authError && (
            <div className="p-3.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-lg bg-white/10 hover:bg-white/15 border border-[var(--gold-500)]/40 text-white text-xs sm:text-sm font-semibold tracking-wider flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
          >
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
            <span>Continue with Authorized Google Account</span>
          </button>

          {/* Or Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-white/40">or with email</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-[11px] font-heading uppercase tracking-widest text-[var(--gold-300)] mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@domain.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--navy-900)]/80 border border-[var(--gold-500)]/30 text-white placeholder-white/30 text-xs sm:text-sm focus:outline-none focus:border-[var(--gold-300)] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-heading uppercase tracking-widest text-[var(--gold-300)] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-[var(--navy-900)]/80 border border-[var(--gold-500)]/30 text-white placeholder-white/30 text-xs sm:text-sm focus:outline-none focus:border-[var(--gold-300)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-gold-primary w-full py-3.5 rounded-lg text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 mt-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-[var(--navy-900)]" />
              <span>{isSignUp ? 'Create Admin Account' : 'Sign In'}</span>
            </button>
          </form>

          {/* Toggle Sign In / Sign Up */}
          <div className="text-center pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
              }}
              className="text-xs text-[var(--gold-300)] hover:text-white transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign in here'
                : 'First-time setup? Create Admin Account'}
            </button>
          </div>

          <div className="text-[10px] text-center text-white/30 font-mono">
            Partitioned Endpoint • Route /adminAUHS
          </div>

          <div className="text-[11px] text-center text-white/40 pt-2 border-t border-white/5">
            Admin Panel built by{' '}
            <a
              href="https://zevnora.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--gold-300)]/80 hover:text-[var(--gold-300)] underline underline-offset-2 transition-colors font-medium"
            >
              Zevnora
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated State: Executive Dashboard Shell
  return (
    <div className="min-h-screen bg-[var(--navy-900)] text-[var(--ivory)] flex flex-col md:flex-row antialiased">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-[#0A1A4F] border-b border-[var(--gold-500)]/30 px-4 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <img
            src={settings.iconUrl || 'https://i.ibb.co/M5Dq0xS9/Icon.png'}
            alt="MUAVER"
            className="w-7 h-7 object-contain"
          />
          <div>
            <span className="font-heading text-xs font-bold text-white block">MUAVER ADMIN</span>
            <span className="text-[9px] text-[var(--gold-300)] tracking-widest uppercase">Admin Panel</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded text-[var(--gold-300)] hover:bg-white/5"
            aria-label="Toggle admin sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar (Desktop fixed, Mobile overlay drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#07133B] border-r border-[var(--gold-500)]/25 flex flex-col justify-between transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="p-6 border-b border-[var(--gold-500)]/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-full bg-[var(--navy-800)] border border-[var(--gold-500)]/40">
                <img
                  src={settings.iconUrl || 'https://i.ibb.co/M5Dq0xS9/Icon.png'}
                  alt="MUAVER Icon"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h2 className="font-heading text-sm font-bold text-white tracking-wider">
                  MUAVER
                </h2>
                <p className="text-[10px] tracking-[0.2em] text-[var(--gold-300)] uppercase font-semibold">
                  Admin Panel
                </p>
              </div>
            </div>
            {/* Close on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-white/60 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-1">
            <div className="px-3 py-2 text-[10px] font-heading uppercase tracking-[0.25em] text-white/40 font-semibold">
              Management Modules
            </div>

            {sidebarItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[var(--gold-500)] to-[var(--gold-300)] text-[var(--navy-900)] shadow-lg shadow-amber-950/30'
                      : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComp className={`w-4 h-4 ${isActive ? 'text-[var(--navy-900)]' : 'text-[var(--gold-300)]'}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.id === 'orders' && pendingOrdersCount > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono transition-all ${
                          isActive
                            ? 'bg-[var(--navy-900)] text-[var(--gold-300)] shadow-sm'
                            : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md font-extrabold'
                        }`}
                        title={`${pendingOrdersCount} New Pending Orders`}
                      >
                        {pendingOrdersCount}
                      </span>
                    )}
                    {item.id === 'messages' && unreadMessagesCount > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono transition-all ${
                          isActive
                            ? 'bg-[var(--navy-900)] text-[var(--gold-300)] shadow-sm'
                            : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md font-extrabold'
                        }`}
                        title={`${unreadMessagesCount} Unread Customer Messages`}
                      >
                        {unreadMessagesCount}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-[var(--navy-900)]" />}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Active User Footer Info */}
          <div className="p-4 border-t border-[var(--gold-500)]/20 space-y-3">
            <div className="px-3 py-2 rounded-lg bg-[var(--navy-900)] border border-[var(--gold-500)]/20 text-xs">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--gold-300)] block">
                Session Active
              </span>
              <p className="text-white truncate font-medium text-[11px] mt-0.5">
                {currentUser.email || 'Administrator'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSignOut}
                className="flex-1 py-2 px-3 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 text-xs flex items-center justify-center gap-2 transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>

              <button
                onClick={onExitAdmin}
                className="py-2 px-3 rounded-lg border border-white/20 text-white/70 hover:text-white hover:bg-white/5 text-xs flex items-center justify-center transition-colors"
                title="Back to Storefront"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 md:h-20 bg-[#0A1A4F] border-b border-[var(--gold-500)]/20 px-6 sm:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-lg sm:text-xl font-bold text-white tracking-wide">
              {sidebarItems.find((s) => s.id === activeTab)?.label}
            </h1>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-[var(--gold-500)]/15 border border-[var(--gold-500)]/30 text-[var(--gold-300)] font-semibold">
              Live Console
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-montserrat text-[var(--ivory)]/70">
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-400 font-mono">Firebase Online</span>
            </div>
            <button
              onClick={onExitAdmin}
              className="px-3.5 py-1.5 rounded-lg border border-[var(--gold-500)]/30 text-[var(--gold-300)] hover:bg-[var(--gold-500)]/10 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>View Boutique</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </header>

        {/* Tab Body */}
        <div className="p-6 sm:p-8 md:p-10 max-w-7xl w-full mx-auto space-y-8 relative min-h-[500px]">
          {/* Module Transition Loading Overlay */}
          {sectionLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--navy-900)]/95 backdrop-blur-xs rounded-xl">
              <AdminConsoleLoader
                label={sectionLabel}
                isFadingOut={sectionFading}
                minHeight="min-h-[460px]"
              />
            </div>
          )}

          {/* 1. DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              {/* Executive Welcome Banner */}
              <div className="relative rounded-2xl bg-gradient-to-r from-[#0A1A4F] via-[#0E2263] to-[#142C7D] border border-[var(--gold-500)]/30 p-6 sm:p-8 overflow-hidden shadow-xl">
                <div className="relative z-10 max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--navy-900)]/70 border border-[var(--gold-500)]/40 text-[10px] uppercase tracking-[0.2em] text-[var(--gold-300)] font-semibold">
                    <Crown className="w-3.5 h-3.5 text-[var(--gold-300)]" />
                    <span>Maison Command Console</span>
                  </div>
                  <h2 className="font-heading text-2xl sm:text-3xl text-white font-bold tracking-wide">
                    Welcome to the MUAVER Admin Panel
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--ivory)]/80 font-light leading-relaxed">
                    Manage fragrance inventory, hero banners, incoming Cash on Delivery orders, and website settings.
                  </p>
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden lg:block">
                  <img
                    src={settings.fullSquareLogoUrl || 'https://i.ibb.co/ynpdPdvP/Full-Logo.png'}
                    alt="Emblem"
                    className="w-64 h-64 object-contain"
                  />
                </div>
              </div>

              {/* 1. Required Dashboard Cards: Total Orders, Pending Orders, Revenue (Delivered), Today's Orders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Orders */}
                <div className="p-5 rounded-2xl bg-[#081438] border border-[var(--gold-500)]/20 space-y-3 shadow-lg relative overflow-hidden group hover:border-[var(--gold-500)]/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block font-heading font-semibold">
                      Total Orders
                    </span>
                    <div className="p-2 rounded-lg bg-[var(--navy-900)] border border-[var(--gold-500)]/30 text-[var(--gold-300)]">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-heading text-3xl font-bold text-[var(--gold-300)] tracking-tight">
                      {loadingOrders ? '...' : totalOrdersCount}
                    </span>
                    <span className="text-[10px] text-white/60 bg-white/5 px-2 py-0.5 rounded border border-white/10 font-mono">
                      All Time
                    </span>
                  </div>
                  <div className="text-[11px] text-white/50 flex items-center justify-between pt-1 border-t border-white/5">
                    <span>Inbound COD & WhatsApp</span>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-[var(--gold-300)] hover:underline flex items-center gap-0.5 text-[10px] font-semibold"
                    >
                      <span>View</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Pending Orders */}
                <div className="p-5 rounded-2xl bg-[#081438] border border-amber-500/30 space-y-3 shadow-lg relative overflow-hidden group hover:border-amber-500/60 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-amber-200/70 block font-heading font-semibold">
                      Pending Orders
                    </span>
                    <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-heading text-3xl font-bold text-amber-300 tracking-tight">
                      {loadingOrders ? '...' : pendingOrdersCount}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${
                      pendingOrdersCount > 0 
                        ? 'text-amber-300 bg-amber-950/60 border-amber-500/50 animate-pulse'
                        : 'text-white/40 bg-white/5 border-white/10'
                    }`}>
                      {pendingOrdersCount > 0 ? 'Action Required' : 'Cleared'}
                    </span>
                  </div>
                  <div className="text-[11px] text-white/50 flex items-center justify-between pt-1 border-t border-white/5">
                    <span>Awaiting confirmation & dispatch</span>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-amber-300 hover:underline flex items-center gap-0.5 text-[10px] font-semibold"
                    >
                      <span>Process</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Revenue (Delivered) */}
                <div className="p-5 rounded-2xl bg-[#081438] border border-emerald-500/30 space-y-3 shadow-lg relative overflow-hidden group hover:border-emerald-500/60 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/70 block font-heading font-semibold">
                      Delivered Revenue
                    </span>
                    <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-heading text-2xl sm:text-3xl font-bold text-emerald-300 tracking-tight">
                      {loadingOrders ? '...' : `Rs. ${deliveredRevenue.toLocaleString()}`}
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                      Realized
                    </span>
                  </div>
                  <div className="text-[11px] text-white/50 flex items-center justify-between pt-1 border-t border-white/5">
                    <span>From fulfilled deliveries</span>
                    <span className="text-[10px] text-emerald-400 font-medium">COD Settled</span>
                  </div>
                </div>

                {/* Today's Orders */}
                <div className="p-5 rounded-2xl bg-[#081438] border border-[var(--gold-500)]/20 space-y-3 shadow-lg relative overflow-hidden group hover:border-[var(--gold-500)]/50 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 block font-heading font-semibold">
                      Today's Orders
                    </span>
                    <div className="p-2 rounded-lg bg-[var(--navy-900)] border border-[var(--gold-500)]/30 text-[var(--gold-300)]">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-heading text-3xl font-bold text-white tracking-tight">
                      {loadingOrders ? '...' : todayOrdersCount}
                    </span>
                    <span className="text-[10px] text-[var(--gold-300)] bg-[var(--gold-500)]/15 border border-[var(--gold-500)]/30 px-2 py-0.5 rounded font-mono">
                      24h Velocity
                    </span>
                  </div>
                  <div className="text-[11px] text-white/50 flex items-center justify-between pt-1 border-t border-white/5">
                    <span>Recorded since midnight</span>
                    <span className="text-[10px] text-[var(--gold-300)] font-medium">Active</span>
                  </div>
                </div>
              </div>

              {/* 2. 30-Day Candlestick Orders Chart & Analytics */}
              <div className="p-6 rounded-2xl bg-[#081438] border border-[var(--gold-500)]/25 space-y-6 shadow-xl">
                {/* Header & Metrics Summary */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[var(--gold-500)]/20">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[var(--gold-500)]/15 border border-[var(--gold-500)]/30 flex items-center justify-center text-[var(--gold-300)]">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <h3 className="font-heading text-base font-bold text-white tracking-wide">
                        30-Day Orders Trend
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider bg-[var(--gold-500)]/15 border border-[var(--gold-500)]/30 text-[var(--gold-300)] font-semibold font-mono">
                        Candlestick View
                      </span>
                    </div>
                    <p className="text-xs text-white/50 mt-1">
                      Daily customer order intake across the last 30 calendar days
                    </p>
                  </div>

                  {/* Summary Badges & Legend */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="px-3 py-1.5 rounded-xl bg-[#0A1A4F] border border-white/10 flex items-center gap-3">
                      <span className="text-white/60 text-[11px]">30-Day Total:</span>
                      <strong className="text-[var(--gold-300)] font-mono font-bold">
                        {last30DaysChart.totalOrders} orders
                      </strong>
                      <span className="text-white/20">|</span>
                      <span className="text-white/60 text-[11px]">Daily Avg:</span>
                      <strong className="text-white font-mono">
                        {last30DaysChart.avgOrders.toFixed(1)}/day
                      </strong>
                    </div>

                    {/* Candlestick Legend */}
                    <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#0A1A4F]/60 border border-white/5 text-[10px] text-white/60">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-3 rounded-xs bg-gradient-to-t from-[#B89025] to-[#F0D27A] border border-[#FFE898]" />
                        <span>Above Avg (Bullish)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-3 rounded-xs bg-[#0A1A4F] border border-[#D4AF37]/60" />
                        <span>Below Avg</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-0.5 bg-white/30" />
                        <span>Zero Orders</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Candlestick Chart Viewport */}
                <div className="pt-2">
                  {/* Outer container with horizontal scroll for mobile responsiveness */}
                  <div className="overflow-x-auto pb-3 custom-scrollbar">
                    <div className="min-w-[760px] md:min-w-0">
                      
                      {/* Chart Area with Gridlines */}
                      <div className="relative h-56 px-2 flex items-end">
                        {/* Horizontal Gridlines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pr-4">
                          {[1, 0.75, 0.5, 0.25, 0].map((ratio, gIdx) => {
                            const val = Math.round(last30DaysChart.maxOrders * ratio);
                            return (
                              <div key={gIdx} className="w-full flex items-center gap-2">
                                <span className="font-mono text-[9px] text-white/30 w-5 text-right shrink-0">
                                  {val}
                                </span>
                                <div className="w-full border-b border-white/[0.06] border-dashed" />
                              </div>
                            );
                          })}
                        </div>

                        {/* 30 Candlestick Columns */}
                        <div
                          className="relative z-10 w-full gap-1 sm:gap-1.5 items-end h-full pb-8 pl-7"
                          style={{ display: 'grid', gridTemplateColumns: 'repeat(30, minmax(0, 1fr))' }}
                        >
                          {last30DaysChart.days.map((day) => {
                            // Compute relative heights
                            const maxVal = last30DaysChart.maxOrders;
                            const bodyHeightPercent = day.count === 0 ? 0 : Math.max(10, Math.round((day.count / maxVal) * 100));
                            
                            // Wick reaches up to peak item volume or +1
                            const highVal = Math.max(day.count, day.itemsCount);
                            const wickTopPercent = day.count === 0 ? 0 : Math.min(100, Math.max(bodyHeightPercent + 6, Math.round((highVal / maxVal) * 100)));

                            return (
                              <div
                                key={day.idx}
                                className="flex flex-col items-center justify-end h-full group relative cursor-pointer"
                              >
                                {/* Interactive Candlestick Hover Tooltip */}
                                <div className="absolute -top-24 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 transform -translate-y-1 group-hover:translate-y-0 shadow-2xl">
                                  <div className="bg-[#0A1A4F] text-white text-[11px] p-2.5 rounded-xl border border-[var(--gold-500)]/50 shadow-xl whitespace-nowrap space-y-1 backdrop-blur-md">
                                    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-1 text-[10px] text-white/60 font-mono">
                                      <span>{day.fullDateStr}</span>
                                      {day.isToday && (
                                        <span className="px-1.5 py-0.2 rounded bg-[var(--gold-500)] text-[#0A1A4F] font-bold text-[9px]">
                                          TODAY
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between gap-4 font-mono">
                                      <span className="text-white/80">Orders:</span>
                                      <strong className="text-[var(--gold-300)] font-bold text-xs">
                                        {day.count} {day.count === 1 ? 'order' : 'orders'}
                                      </strong>
                                    </div>
                                    {day.itemsCount > 0 && (
                                      <div className="flex items-center justify-between gap-4 font-mono text-[10px] text-white/70">
                                        <span>Bottles:</span>
                                        <span>{day.itemsCount} units</span>
                                      </div>
                                    )}
                                    {day.revenue > 0 && (
                                      <div className="flex items-center justify-between gap-4 font-mono text-[10px] text-emerald-400">
                                        <span>Delivered:</span>
                                        <span>Rs. {day.revenue.toLocaleString()}</span>
                                      </div>
                                    )}
                                    <div className="pt-0.5 text-[9px] font-mono">
                                      {day.count === 0 ? (
                                        <span className="text-white/40">No orders placed</span>
                                      ) : day.isAboveAvg ? (
                                        <span className="text-[var(--gold-300)] font-semibold">▲ Above 30-Day Average</span>
                                      ) : (
                                        <span className="text-slate-400">▼ Below 30-Day Average</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Candlestick Assembly (Wick + Body) */}
                                <div className="w-full flex flex-col items-center justify-end h-40 relative">
                                  {/* Thin Center Wick Line */}
                                  {day.count > 0 && (
                                    <div
                                      style={{ height: `${wickTopPercent}%` }}
                                      className={`w-[1.5px] absolute bottom-0 transition-all duration-300 ${
                                        day.isAboveAvg
                                          ? 'bg-[var(--gold-400)] shadow-[0_0_4px_rgba(212,175,55,0.4)]'
                                          : 'bg-white/30'
                                      }`}
                                    />
                                  )}

                                  {/* Candlestick Body or Flat Doji */}
                                  {day.count > 0 ? (
                                    <div
                                      style={{ height: `${bodyHeightPercent}%` }}
                                      className={`w-full max-w-[14px] sm:max-w-[18px] rounded-xs relative z-10 transition-all duration-500 group-hover:scale-110 ${
                                        day.isAboveAvg
                                          ? 'bg-gradient-to-t from-[#B89025] via-[var(--gold-500)] to-[#F0D27A] border border-[#FFE898] shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                                          : 'bg-[#0A1A4F] border border-[#D4AF37]/60 shadow-xs'
                                      }`}
                                    />
                                  ) : (
                                    /* Flat Doji Bar for zero activity */
                                    <div className="w-full max-w-[10px] h-[2px] bg-white/20 rounded-full my-0.5 group-hover:bg-[var(--gold-500)]/50 transition-colors" />
                                  )}
                                </div>

                                {/* Bottom X-Axis Date Label */}
                                <div className="text-center mt-2 space-y-0.5 select-none">
                                  <span
                                    className={`text-[9px] block font-mono transition-colors ${
                                      day.isToday
                                        ? 'text-[var(--gold-300)] font-bold'
                                        : day.idx % 5 === 0 || day.idx === 29
                                        ? 'text-white/70'
                                        : 'text-white/30'
                                    }`}
                                  >
                                    {day.isToday ? 'Now' : day.label}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Timeline Sub-Bar */}
                      <div className="flex items-center justify-between text-[10px] text-white/40 pl-7 pr-2 font-mono pt-2 border-t border-white/5">
                        <span>30 Days Ago ({last30DaysChart.days[0]?.dateStr})</span>
                        <span className="text-[var(--gold-300)] font-semibold">Today ({last30DaysChart.days[29]?.dateStr})</span>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Recent Orders List */}
              <div className="p-6 rounded-2xl bg-[#081438] border border-[var(--gold-500)]/25 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--gold-500)]/20">
                  <div>
                    <h3 className="font-heading text-base font-bold text-white tracking-wide">
                      Recent Inbound Orders
                    </h3>
                    <p className="text-xs text-white/50">
                      Latest orders placed nationwide via COD or WhatsApp concierge
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-semibold text-[var(--gold-300)] hover:underline flex items-center gap-1"
                  >
                    <span>View All Orders ({orders.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-[var(--navy-900)] border border-white/5 space-y-2">
                    <ShoppingBag className="w-8 h-8 text-[var(--gold-300)] mx-auto opacity-40" />
                    <p className="text-xs text-white/60">No orders received yet.</p>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="text-xs text-[var(--gold-300)] font-semibold hover:underline"
                    >
                      View Orders Module
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#03091D] text-[var(--gold-300)] uppercase tracking-wider text-[10px] font-heading border-b border-white/10">
                        <tr>
                          <th className="p-3.5">Order #</th>
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5">Customer</th>
                          <th className="p-3.5">Total</th>
                          <th className="p-3.5">Method</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {orders.slice(0, 5).map((ord) => (
                          <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3.5 font-mono font-bold text-[var(--gold-300)]">
                              {ord.orderNumber}
                            </td>
                            <td className="p-3.5 text-white/60 whitespace-nowrap">
                              {formatOrderDate(ord.createdAt)}
                            </td>
                            <td className="p-3.5">
                              <span className="font-semibold text-white block">
                                {ord.customer?.fullName}
                              </span>
                              <span className="text-[10px] text-white/40">
                                {ord.customer?.city}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-white whitespace-nowrap">
                              Rs. {ord.totalAmount?.toLocaleString()}
                            </td>
                            <td className="p-3.5 text-white/70">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10">
                                {ord.paymentMethod === 'WhatsApp Order' ? 'WhatsApp' : 'COD'}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  ord.status === 'Confirmed'
                                    ? 'bg-blue-950/70 text-blue-300 border-blue-500/40'
                                    : ord.status === 'Shipped'
                                    ? 'bg-purple-950/70 text-purple-300 border-purple-500/40'
                                    : ord.status === 'Delivered'
                                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
                                    : ord.status === 'Cancelled'
                                    ? 'bg-rose-950/70 text-rose-300 border-rose-500/40'
                                    : ord.status === 'Returned'
                                    ? 'bg-zinc-800 text-zinc-300 border-zinc-600'
                                    : 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                {ord.status || 'Pending'}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => setActiveTab('orders')}
                                className="px-2.5 py-1 rounded bg-[var(--navy-900)] border border-[var(--gold-500)]/30 text-[var(--gold-300)] hover:bg-[var(--gold-500)]/20 text-[11px] font-semibold transition-colors"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Quick Actions Shortcuts */}
              <div className="p-6 rounded-2xl bg-[#081438] border border-[var(--gold-500)]/25 space-y-4">
                <h3 className="font-heading text-base font-bold text-white tracking-wide">
                  Admin Quick Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleSelectTab('banners')}
                    className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 hover:border-[var(--gold-500)]/50 text-left transition-all group"
                  >
                    <Images className="w-5 h-5 text-[var(--gold-300)] mb-2" />
                    <h4 className="font-heading text-sm font-bold text-white group-hover:text-[var(--gold-300)] transition-colors">
                      Manage Hero Slider
                    </h4>
                    <p className="text-xs text-white/50 mt-1">
                      Add, reorder, and toggle home slider banners.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectTab('products')}
                    className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 hover:border-[var(--gold-500)]/50 text-left transition-all group"
                  >
                    <Package className="w-5 h-5 text-[var(--gold-300)] mb-2" />
                    <h4 className="font-heading text-sm font-bold text-white group-hover:text-[var(--gold-300)] transition-colors">
                      Products & Variants
                    </h4>
                    <p className="text-xs text-white/50 mt-1">
                      Create products, notes, size pricing, and inventory.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectTab('orders')}
                    className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 hover:border-[var(--gold-500)]/50 text-left transition-all group"
                  >
                    <ShoppingBag className="w-5 h-5 text-[var(--gold-300)] mb-2" />
                    <h4 className="font-heading text-sm font-bold text-white group-hover:text-[var(--gold-300)] transition-colors">
                      Orders Management
                    </h4>
                    <p className="text-xs text-white/50 mt-1">
                      Update order statuses, export CSV, and print slips.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectTab('messages')}
                    className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 hover:border-[var(--gold-500)]/50 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <MessageSquare className="w-5 h-5 text-[var(--gold-300)]" />
                      {unreadMessagesCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 font-mono">
                          {unreadMessagesCount} New
                        </span>
                      )}
                    </div>
                    <h4 className="font-heading text-sm font-bold text-white group-hover:text-[var(--gold-300)] transition-colors">
                      Customer Messages
                    </h4>
                    <p className="text-xs text-white/50 mt-1">
                      Reply to customer inquiries & consultations.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectTab('reviews')}
                    className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 hover:border-[var(--gold-500)]/50 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Star className="w-5 h-5 text-[var(--gold-300)] fill-current" />
                    </div>
                    <h4 className="font-heading text-sm font-bold text-white group-hover:text-[var(--gold-300)] transition-colors">
                      Customer Reviews
                    </h4>
                    <p className="text-xs text-white/50 mt-1">
                      Moderate perfume ratings & customer feedback.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSelectTab('customers')}
                    className="p-4 rounded-xl bg-[var(--navy-900)] border border-white/10 hover:border-[var(--gold-500)]/50 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <UserCheck className="w-5 h-5 text-[var(--gold-300)]" />
                    </div>
                    <h4 className="font-heading text-sm font-bold text-white group-hover:text-[var(--gold-300)] transition-colors">
                      Customer Accounts
                    </h4>
                    <p className="text-xs text-white/50 mt-1">
                      View registered patrons and order histories.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. BANNERS MODULE */}
          {activeTab === 'banners' && (
            <AdminBanners banners={banners} onRefresh={handleRefresh} />
          )}

          {/* 3. PRODUCTS MODULE (Shopify Style) */}
          {activeTab === 'products' && (
            <AdminProducts products={products} onRefresh={handleRefresh} />
          )}

          {/* 3.5. CUSTOMER REVIEWS MODULE */}
          {activeTab === 'reviews' && (
            <AdminReviews products={products} onRefresh={handleRefresh} />
          )}

          {/* 4. ORDERS MODULE */}
          {activeTab === 'orders' && (
            loadingOrders ? (
              <AdminConsoleLoader label="Loading Orders..." minHeight="min-h-[460px]" />
            ) : (
              <AdminOrders orders={orders} settings={settings} onRefresh={handleRefresh} />
            )
          )}

          {/* 4.5. CUSTOMER MESSAGES MODULE */}
          {activeTab === 'messages' && (
            loadingMessages ? (
              <AdminConsoleLoader label="Loading Customer Messages..." minHeight="min-h-[460px]" />
            ) : (
              <AdminMessages
                messages={messages}
                adminEmail={currentUser.email || 'hellomuaver@gmail.com'}
                onRefresh={handleRefresh}
              />
            )
          )}

          {/* 4.6. CUSTOMERS DIRECTORY MODULE */}
          {activeTab === 'customers' && (
            <AdminCustomers orders={orders} onRefresh={handleRefresh} />
          )}

          {/* 5. SITE CONTENT MODULE */}
          {activeTab === 'site-content' && (
            <AdminSiteContent settings={settings} products={products} onRefresh={handleRefresh} />
          )}

          {/* 6. POLICIES AND DELIVERY MODULE */}
          {activeTab === 'policies-delivery' && (
            <AdminPoliciesDelivery settings={settings} onRefresh={handleRefresh} />
          )}

          {/* 7. ADMINS MODULE */}
          {activeTab === 'admins' && (
            <AdminAdmins
              currentUserEmail={currentUser.email || ''}
              currentUserRole={currentUserRole}
            />
          )}

          {/* 8. SETTINGS MODULE */}
          {activeTab === 'settings' && (
            <AdminSettings settings={settings} onRefresh={handleRefresh} />
          )}
        </div>
      </main>
    </div>
  );
};
