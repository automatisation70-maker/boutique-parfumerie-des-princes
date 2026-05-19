// Service Worker — Parfumerie des Princes
const CACHE_NAME = 'pdp-v1';
const ASSETS = [
  'https://parfumerie-des-princes.vercel.app/',
  'https://parfumerie-des-princes.vercel.app/index.html',
  'https://parfumerie-des-princes.vercel.app/app.js',
  'https://parfumerie-des-princes.vercel.app/style.css',
  'https://parfumerie-des-princes.vercel.app/products.js',
  'https://parfumerie-des-princes.vercel.app/config.js',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400&display=swap'
];

// Installation — mettre en cache les assets de base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activation — nettoyer les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — stratégie : réseau d'abord, cache en fallback
self.addEventListener('fetch', event => {
  // Ne pas intercepter les appels API (n8n, Google Sheets, Groq)
  const url = event.request.url;
  if (
    url.includes('n8n-allassane') ||
    url.includes('googleapis.com/spreadsheets') ||
    url.includes('api.groq.com') ||
    url.includes('api.cloudinary.com') ||
    url.includes('lh3.googleusercontent.com')
  ) {
    return; // Laisser passer sans cache
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache la nouvelle version
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Réseau indisponible → utiliser le cache
        return caches.match(event.request);
      })
  );
});
