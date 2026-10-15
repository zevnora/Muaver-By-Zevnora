/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { WebsiteLoader, AdminConsoleLoader } from './components/BrandedLoader';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { ScrollToTop } from './components/ScrollToTop';
import { NotFoundPage } from './pages/NotFoundPage';

// Helper to auto-retry dynamic route import once on transient network or module-fetch blips
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(() =>
    factory().catch((err) => {
      console.warn('Dynamic route chunk fetch notice, attempting retry...', err);
      return new Promise<{ default: T }>((resolve, reject) => {
        setTimeout(() => {
          factory().then(resolve).catch(reject);
        }, 500);
      });
    })
  );
}

// Code-split routes: admin panel & secondary pages
const AdminPage = lazyWithRetry(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const ShopPage = lazyWithRetry(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const ProductPage = lazyWithRetry(() => import('./pages/ProductPage').then((m) => ({ default: m.ProductPage })));
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const PolicyPage = lazyWithRetry(() => import('./pages/PolicyPage').then((m) => ({ default: m.PolicyPage })));

import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './services/firebase';
import firebaseConfigJson from '../firebase-applet-config.json';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CustomerAccountModal } from './components/CustomerAccountModal';

import { 
  getSiteSettings, 
  getProducts, 
  getBanners,
  subscribeSiteSettings,
  subscribeProducts,
  subscribeBanners,
  subscribePaymentSettings,
  initializeStoreDefaultsIfNeeded,
  getCustomerProfile,
  DEFAULT_SETTINGS, 
  DEFAULT_PRODUCT,
  DEFAULT_BANNERS
} from './services/storeService';
import { SiteSettings, Product, CartItem, BannerSlide, PolicySlug, CustomerProfile } from './types/store';

function CheckoutRouteHandler({
  cartItems,
  onProceedToCheckout,
}: {
  cartItems: CartItem[];
  onProceedToCheckout: () => void;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    if (cartItems.length > 0) {
      onProceedToCheckout();
    } else {
      navigate('/shop', { replace: true });
    }
  }, [cartItems.length, onProceedToCheckout, navigate]);
  return null;
}

function LoginRouteHandler({ onOpenAuth }: { onOpenAuth: () => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    onOpenAuth();
    navigate('/', { replace: true });
  }, [onOpenAuth, navigate]);
  return null;
}

function AccountRouteHandler({
  customer,
  onOpenAccount,
  onOpenAuth,
}: {
  customer: CustomerProfile | null;
  onOpenAccount: () => void;
  onOpenAuth: () => void;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    if (customer) {
      onOpenAccount();
    } else {
      onOpenAuth();
    }
    navigate('/', { replace: true });
  }, [customer, onOpenAccount, onOpenAuth, navigate]);
  return null;
}

export default function App() {
  // Settings, products and banners come directly from live Firestore onSnapshot listeners (zero localStorage caching)
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<BannerSlide[]>(DEFAULT_BANNERS);

  // Clear any legacy localStorage or sessionStorage cached content to ensure 100% fresh live reads
  useEffect(() => {
    try {
      localStorage.removeItem('muaver_cached_settings');
      sessionStorage.removeItem('muaver_cached_settings');
      localStorage.removeItem('muaver_cached_banners');
      sessionStorage.removeItem('muaver_cached_banners');
      localStorage.removeItem('muaver_cached_products');
      sessionStorage.removeItem('muaver_cached_products');
    } catch {}

    // Diagnostic log for comparing database configuration on public site
    console.log(
      `[MUAVER Public Site] Firebase projectId: "${firebaseConfigJson.projectId}" | Firestore databaseId: "${firebaseConfigJson.firestoreDatabaseId || '(default)'}" | Content doc paths read: "settings/general", "banners", "products"`
    );
  }, []);
  const [isLoaderFading, setIsLoaderFading] = useState(false);
  const [showInitialLoader, setShowInitialLoader] = useState(true);

  // Fast smooth transition to interactive storefront on mount (no 1.2s artificial block)
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsLoaderFading(true);
    }, 60);
    const removeTimer = setTimeout(() => {
      setShowInitialLoader(false);
    }, 360);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const [activeProductId, setActiveProductId] = useState<string>(DEFAULT_PRODUCT.id);

  // Cart & Checkout state with localStorage persistence
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem('muaver_cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Customer Account & Authentication state (Separate from Admin)
  const [customer, setCustomer] = useState<CustomerProfile | null>(() => {
    try {
      const stored = localStorage.getItem('muaver_customer_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [authModalPrompt, setAuthModalPrompt] = useState<string | undefined>(undefined);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [pendingActionAfterAuth, setPendingActionAfterAuth] = useState<(() => void) | null>(null);

  // Listen to customer session change events
  useEffect(() => {
    const handleAuthChange = (e: Event) => {
      const customEvent = e as CustomEvent<CustomerProfile | null>;
      setCustomer(customEvent.detail);
    };
    window.addEventListener('muaver-customer-auth-changed', handleAuthChange);
    return () => window.removeEventListener('muaver-customer-auth-changed', handleAuthChange);
  }, []);

  // Persist and synchronize customer auth session across visits
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getCustomerProfile(user.uid);
          if (profile) {
            setCustomer(profile);
            try {
              localStorage.setItem('muaver_customer_session', JSON.stringify(profile));
            } catch {}
          } else {
            // If document is momentarily writing during sign up, retain existing customer state if present
            setCustomer((prev) => {
              if (prev && prev.uid === user.uid && prev.phone) {
                return prev;
              }
              const fallback: CustomerProfile = {
                id: user.uid,
                uid: user.uid,
                email: user.email || '',
                fullName: user.displayName || user.email?.split('@')[0] || 'Valued Patron',
                phone: user.phoneNumber || '',
                createdAt: new Date(),
              };
              try {
                localStorage.setItem('muaver_customer_session', JSON.stringify(fallback));
              } catch {}
              return fallback;
            });
          }
        } catch (err) {
          console.warn('Customer session sync notice:', err);
        }
      } else {
        // If Firebase Auth user signed out, check if a direct customer session exists in localStorage
        const stored = localStorage.getItem('muaver_customer_session');
        if (stored) {
          try {
            setCustomer(JSON.parse(stored));
          } catch {
            setCustomer(null);
          }
        } else {
          setCustomer(null);
        }
      }
    });

    return () => unsub();
  }, []);



  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('muaver_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.warn('Could not save cart to storage:', e);
    }
  }, [cartItems]);

  // Recalculate cart items from live product data so cart items never keep an old price
  useEffect(() => {
    if (products.length === 0 || cartItems.length === 0) return;

    let hasPriceChange = false;
    const reconciledCart = cartItems.map((item) => {
      const liveProduct = products.find((p) => p.id === item.productId);
      if (!liveProduct) return item;
      const liveVariant = liveProduct.variants?.find((v) => v.size === item.size);
      const livePrice = liveVariant ? (Number(liveVariant.price) || Number(liveProduct.price) || 0) : (Number(liveProduct.price) || 0);
      if (livePrice > 0 && livePrice !== item.price) {
        hasPriceChange = true;
        return {
          ...item,
          productName: liveProduct.name || item.productName,
          price: livePrice,
        };
      }
      return item;
    });

    if (hasPriceChange) {
      setCartItems(reconciledCart);
    }
  }, [products]);



  // Dynamically synchronize browser tab title and favicon with Firestore site settings
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (location.pathname === '/') {
      document.title = settings.siteTitle || 'MUAVER | Luxury Brand • Crafted for Distinction';
    }

    // 2. Favicon Link Tags Synchronization
    const faviconUrl = settings.faviconUrl || settings.iconUrl || 'https://i.ibb.co/M5Dq0xS9/Icon.png';
    const updateFavicon = (selector: string, rel: string, sizes?: string) => {
      let link = document.querySelector<HTMLLinkElement>(selector);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        if (sizes) link.setAttribute('sizes', sizes);
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    };

    updateFavicon("link[rel='icon'][sizes='32x32']", 'icon', '32x32');
    updateFavicon("link[rel='icon'][sizes='16x16']", 'icon', '16x16');
    updateFavicon("link[rel='icon']:not([sizes])", 'icon');
    updateFavicon("link[rel='shortcut icon']", 'shortcut icon');
    updateFavicon("link[rel='apple-touch-icon'][sizes='180x180']", 'apple-touch-icon', '180x180');
    updateFavicon("link[rel='apple-touch-icon']:not([sizes])", 'apple-touch-icon');
  }, [settings.siteTitle, settings.iconUrl, settings.faviconUrl, location.pathname]);

  const refreshStoreData = async () => {
    try {
      const [loadedSettings, loadedProducts, loadedBanners] = await Promise.all([
        getSiteSettings(),
        getProducts(),
        getBanners(),
      ]);
      setSettings(loadedSettings);
      setProducts(loadedProducts);
      setBanners(loadedBanners);
    } catch (err) {
      console.error('Error refreshing store data:', err);
    }
  };

  // Real-time live Firestore listeners for settings, products & banners
  useEffect(() => {
    let isMounted = true;

    // Check store initial bootstrap on startup
    initializeStoreDefaultsIfNeeded();

    // 1. Live subscription to site settings
    const unsubSettings = subscribeSiteSettings(
      (liveSettings) => {
        if (isMounted) {
          setSettings(liveSettings);
        }
      },
      (err) => {
        console.warn('Settings live listener note:', err);
      }
    );

    // 2. Live subscription to products catalog (Firestore onSnapshot ONLY)
    const unsubProducts = subscribeProducts(
      (liveProducts) => {
        if (isMounted) {
          setProducts(liveProducts);
          // If active product was deleted, switch to next available flacon or clear
          setActiveProductId((currentId) => {
            if (liveProducts.some((p) => p.id === currentId)) {
              return currentId;
            }
            return liveProducts.length > 0 ? liveProducts[0].id : '';
          });
        }
      },
      (err) => {
        console.warn('Products live listener note:', err);
      }
    );

    // 3. Live subscription to hero banners
    const unsubBanners = subscribeBanners(
      (liveBanners) => {
        if (isMounted) {
          setBanners(liveBanners);
        }
      },
      (err) => {
        console.warn('Banners live listener note:', err);
      }
    );

    // 4. Live subscription to payment settings
    const unsubPayments = subscribePaymentSettings(
      (livePayments) => {
        if (isMounted) {
          setSettings((prev) => ({
            ...prev,
            paymentSettings: livePayments,
          }));
        }
      },
      (err) => {
        console.warn('Payment settings live listener note:', err);
      }
    );

    return () => {
      isMounted = false;
      unsubSettings();
      unsubProducts();
      unsubBanners();
      unsubPayments();
    };
  }, []);

  // Navigation handler using React Router
  const handleNavigate = (page: string, productId?: string) => {
    if (page === 'home' || page === '/') {
      navigate('/');
    } else if (page === 'adminAUHS' || page === '/adminAUHS') {
      navigate('/adminAUHS');
    } else if (page === 'product' && productId) {
      const prod = products.find((p) => p.id === productId);
      navigate(`/product/${prod?.slug || productId}`);
    } else if (page.startsWith('/')) {
      navigate(page);
    } else {
      navigate(`/${page}`);
    }
  };

  // Exit Admin back to public storefront
  const handleExitAdmin = () => {
    navigate('/');
  };

  // Add to cart
  const handleAddToCart = (product: Product, size: string, quantity: number = 1) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.productId === product.id && item.size === size
      );

      const variant = product.variants?.find((v) => v.size === size);
      const price = variant ? (Number(variant.price) || Number(product.price) || 0) : (Number(product.price) || 0);

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            productName: product.name,
            productImage: product.images[0] || '/src/assets/images/royal_gold_front_1791271735003.jpg',
            size: size,
            price: price,
            quantity: quantity,
          },
        ];
      }
    });

    setIsCartOpen(true);
  };

  // Update item quantity in cart
  const handleUpdateQuantity = (productId: string, size: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId && item.size === size) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Remove item from cart
  const handleRemoveItem = (productId: string, size: string) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.productId === productId && item.size === size))
    );
  };

  // Customer Authentication triggers
  const handleOpenAuth = (
    prompt?: string, 
    onAfterSuccess?: () => void, 
    mode: 'signin' | 'signup' = 'signin'
  ) => {
    setAuthModalPrompt(prompt);
    setAuthModalMode(mode);
    if (onAfterSuccess) {
      setPendingActionAfterAuth(() => onAfterSuccess);
    } else {
      setPendingActionAfterAuth(null);
    }
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (loggedCustomer: CustomerProfile) => {
    setCustomer(loggedCustomer);
    setIsAuthModalOpen(false);
    if (pendingActionAfterAuth) {
      const action = pendingActionAfterAuth;
      setPendingActionAfterAuth(null);
      setTimeout(() => action(), 100);
    }
  };

  // Open checkout from cart drawer (prompts customer login if not authenticated)
  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    if (!customer) {
      handleOpenAuth(
        'Please log in or create an account to finalize your order with Cash on Delivery.',
        () => setIsCheckoutOpen(true)
      );
    } else {
      setIsCheckoutOpen(true);
    }
  };

  // Handle successful order completion
  const handleOrderSuccess = (_orderNumber: string) => {
    setCartItems([]);
    try {
      localStorage.removeItem('muaver_cart');
    } catch {}
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Dynamically synchronize browser favicon with settings.iconUrl
  useEffect(() => {
    if (settings.iconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = settings.iconUrl;
    }
  }, [settings.iconUrl]);

  // Resolve featured product dynamically from live Firestore products
  const featuredProduct: Product | null = 
    (settings.featuredProductId && products.find((p) => p.id === settings.featuredProductId)) ||
    products.find((p) => p.isFeatured) ||
    (products.length > 0 ? products[0] : null);

  // Resolve current active product for product detail page
  const currentProduct: Product | null =
    (activeProductId && products.find((p) => p.id === activeProductId)) ||
    featuredProduct ||
    (products.length > 0 ? products[0] : null);

  // Diagnostic log comparing Firebase Project ID, Firestore Database ID, and Product ID on public site
  useEffect(() => {
    const activeDocId = currentProduct?.id || products[0]?.id || 'none';
    const contextName = location.pathname.toLowerCase() === '/adminauhs' ? 'MUAVER Admin Panel' : 'MUAVER Public Storefront';
    console.log(
      `[${contextName}] Firebase projectId: "${firebaseConfigJson.projectId}" | Firestore databaseId: "${firebaseConfigJson.firestoreDatabaseId}" | Product ID: "${activeDocId}"`
    );
  }, [location.pathname, currentProduct?.id, products]);

  // Admin Route (/adminAUHS) - strictly code-split & isolated; customers NEVER download this chunk
  if (location.pathname.toLowerCase() === '/adminauhs') {
    return (
      <div className="min-h-screen bg-[#0A1A4F] text-[var(--ivory)] selection:bg-[#D4AF37]/25 selection:text-white">
        <Suspense fallback={<AdminConsoleLoader label="Initializing Console..." />}>
          <AdminPage
            settings={settings}
            products={products}
            banners={banners}
            onExitAdmin={handleExitAdmin}
            onRefreshData={refreshStoreData}
          />
        </Suspense>
        {showInitialLoader && (
          <AdminConsoleLoader
            label="Initializing Console..."
            isFadingOut={isLoaderFading}
            fullScreen
          />
        )}
      </div>
    );
  }

  // Public Storefront
  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-montserrat selection:bg-[#D4AF37]/25 selection:text-[#0A1A4F] relative">
      <ScrollToTop />
      
      {/* Branded Website Loading State with smooth 300ms fadeout */}
      {showInitialLoader && (
        <WebsiteLoader
          label="Loading the collection..."
          isFadingOut={isLoaderFading}
          fullScreen
        />
      )}

      {/* Header */}
      <Header
        settings={settings}
        activePage={location.pathname}
        onNavigate={handleNavigate}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
        customer={customer}
        onOpenAuth={(mode) => handleOpenAuth(undefined, undefined, mode || 'signin')}
        onOpenAccount={() => setIsAccountModalOpen(true)}
      />

      {/* Main Page Routing with Suspense Boundaries */}
      <main className="flex-1">
        <Suspense fallback={<WebsiteLoader minHeight="min-h-[500px]" label="Loading the collection..." />}>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  settings={settings}
                  featuredProduct={featuredProduct}
                  banners={banners}
                  onAddToCart={handleAddToCart}
                />
              }
            />
            <Route
              path="/shop"
              element={
                <ShopPage
                  products={products}
                  settings={settings}
                  onAddToCart={handleAddToCart}
                />
              }
            />
            <Route
              path="/product/:slug"
              element={
                <ProductPage
                  settings={settings}
                  customer={customer}
                  onAddToCart={handleAddToCart}
                  onRequestLogin={(prompt, onAfterSuccess) => handleOpenAuth(prompt, onAfterSuccess)}
                />
              }
            />
            <Route
              path="/about"
              element={
                <AboutPage
                  settings={settings}
                />
              }
            />
            <Route
              path="/contact"
              element={
                <ContactPage
                  settings={settings}
                  customer={customer}
                  onRequestLogin={() => handleOpenAuth('Please log in or create an account to message our boutique concierge.')}
                  onOpenAccount={() => setIsAccountModalOpen(true)}
                />
              }
            />
            <Route
              path="/delivery-info"
              element={
                <PolicyPage
                  slug="delivery-info"
                  settings={settings}
                />
              }
            />
            <Route
              path="/returns"
              element={
                <PolicyPage
                  slug="returns"
                  settings={settings}
                />
              }
            />
            <Route
              path="/refund-policy"
              element={
                <PolicyPage
                  slug="refund-policy"
                  settings={settings}
                />
              }
            />
            <Route
              path="/privacy-policy"
              element={
                <PolicyPage
                  slug="privacy-policy"
                  settings={settings}
                />
              }
            />
            <Route
              path="/terms"
              element={
                <PolicyPage
                  slug="terms"
                  settings={settings}
                />
              }
            />
            <Route
              path="/cod-policy"
              element={
                <PolicyPage
                  slug="cod-policy"
                  settings={settings}
                />
              }
            />
            <Route
              path="/checkout"
              element={
                <CheckoutRouteHandler
                  cartItems={cartItems}
                  onProceedToCheckout={handleProceedToCheckout}
                />
              }
            />
            <Route
              path="/login"
              element={
                <LoginRouteHandler
                  onOpenAuth={() => handleOpenAuth()}
                />
              }
            />
            <Route
              path="/account"
              element={
                <AccountRouteHandler
                  customer={customer}
                  onOpenAccount={() => setIsAccountModalOpen(true)}
                  onOpenAuth={() => handleOpenAuth()}
                />
              }
            />
            <Route
              path="*"
              element={<NotFoundPage settings={settings} />}
            />
          </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      <Footer
        settings={settings}
        onNavigate={handleNavigate}
      />

      {/* Interactive Overlays */}
      {isCartOpen && (
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onProceedToCheckout={handleProceedToCheckout}
          settings={settings}
          onNavigateToShop={() => handleNavigate('shop')}
        />
      )}

      {isCheckoutOpen && (
        <CheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          items={cartItems}
          onOrderSuccess={handleOrderSuccess}
          settings={settings}
          customer={customer}
          onRequestLogin={() => handleOpenAuth('Please log in or create an account to place your order.')}
        />
      )}

      {/* Customer Authentication Modal (Separate from Admin) */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingActionAfterAuth(null);
        }}
        onSuccess={handleAuthSuccess}
        promptMessage={authModalPrompt}
      />

      {/* Customer Account & Orders/Messages Area */}
      {customer && (
        <CustomerAccountModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          customer={customer}
          onCustomerUpdated={(updated) => setCustomer(updated)}
          onLogout={() => setCustomer(null)}
          onNavigateToShop={() => handleNavigate('shop')}
        />
      )}

      {/* Floating WhatsApp Concierge Button */}
      <FloatingWhatsApp settings={settings} />

    </div>
  );
}
