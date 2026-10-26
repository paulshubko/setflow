/* SetFlow service worker: offline app shell + cached fonts.
   Bump VERSION on every release so phones pick up the new files. */
const VERSION = 'setflow-v9';
/* Exercise photos and clips from the home server (paths /shed/img/ and /shed/anim/). Separate cache that survives releases,
   so the photos are not downloaded again after every app update. */
const IMG_CACHE = 'setflow-pics-v1';
const SHELL = [
  './',
  './index.html',
  './catalog.js',
  './onboarding.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== IMG_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App page: network first so updates arrive, cache when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Exercise pictures from the home server: cache first, only successful (CORS) responses are stored
  if (url.pathname.includes('/shed/img/') || url.pathname.includes('/shed/anim/')) {
    event.respondWith(
      caches.open(IMG_CACHE).then(c =>
        c.match(req).then(hit => hit || fetch(req).then(res => {
          if (res.ok) c.put(req, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  // Own files and Google Fonts: cache first, fill cache on first use
  if (url.origin === self.location.origin ||
      url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
});
