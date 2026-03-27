/**
 * service-worker.js — PWA Service Worker
 * Provides offline caching for the Gaming Deals Notifier app.
 */

const CACHE_NAME = 'gaming-deals-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/css/styles.css',
  '/js/utils.js',
  '/js/i18n.js',
  '/js/deals.js',
  '/js/giveaways.js',
  '/js/notifications.js',
  '/js/wishlist.js',
  '/js/charts.js',
  '/js/community.js',
  '/js/recommendations.js',
  '/js/news.js',
  '/js/gamification.js',
  '/js/currency.js',
  '/js/bundles.js',
  '/js/steam-import.js',
  '/js/pwa.js',
  '/js/share.js',
  '/js/price-advisor.js',
  '/js/game-detail.js',
  '/js/console-deals.js',
  '/js/calendar.js',
  '/js/quiz.js',
  '/js/collections.js',
  '/js/newsletter.js',
  '/js/discord.js',
  '/js/welcome.js',
  '/js/live-stats.js',
  '/js/fab.js',
  '/js/skeletons.js',
  '/js/sounds.js',
  '/js/keyboard.js',
  '/js/scroll-progress.js',
  '/js/intersection-animator.js',
  '/js/pull-to-refresh.js',
  '/js/bottom-nav.js',
  '/js/tooltips.js',
  '/js/mini-stats.js',
  '/js/confetti.js',
  '/js/app.js',
  '/manifest.json',
];

// API hostnames to use network-first strategy
const API_HOSTNAMES = [
  'www.cheapshark.com',
  'cheapshark.com',
  'www.gamerpower.com',
  'gamerpower.com',
  'api.rss2json.com',
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Cache install error:', err))
  );
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and cross-origin requests we don't cache
  if (event.request.method !== 'GET') return;

  // Network-first strategy for API calls — use array includes for maintainability
  const isAPI = API_HOSTNAMES.includes(url.hostname);

  if (isAPI) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => {
        // Offline fallback for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/offline.html') || caches.match('/index.html');
        }
      })
  );
});
