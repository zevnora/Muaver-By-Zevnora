const CACHE_NAME = 'muaver-cache-v3';

// Only static files (JS, CSS, fonts, icons, images) - NEVER HTML or data responses
const PRECACHE_ASSETS = [
  'https://i.ibb.co/M5Dq0xS9/Icon.png',
  'https://i.ibb.co/8n6t1tQH/Untitled-design.png',
  'https://i.ibb.co/ynpdPdvP/Full-Logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache asset warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // Delete every previous cache version immediately to ensure all visitors get a fresh state
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 0. NEVER intercept HTML navigations, Vite dev server, source files, or on-demand TypeScript
  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/@id/') ||
    url.pathname.includes('node_modules') ||
    url.pathname.endsWith('.tsx') ||
    url.pathname.endsWith('.ts') ||
    url.search.includes('import') ||
    url.search.includes('t=')
  ) {
    return;
  }

  // Bypass Firestore, Firebase auth, APIs and external data endpoints completely
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // 1. Static Assets ONLY: JS, CSS, Fonts, Images
  const isStaticAsset =
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('i.ibb.co') ||
    url.pathname.match(/\.(js|css|webp|jpg|jpeg|png|gif|svg|avif|woff2|woff|ttf|ico)$/i);

  if (!isStaticAsset) {
    // Non-static asset: pass straight to network, never cache
    return;
  }

  // Cache static assets (Stale-While-Revalidate)
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      });
    })
  );
});
