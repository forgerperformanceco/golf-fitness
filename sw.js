/* FairwayFuel service worker — offline-first for the single-page app.
   Bump CACHE when you ship a new version so clients pull fresh files. */
var CACHE = 'fairwayfuel-v73';
var ASSETS = [
  './',
  './index.html',
  './privacy.html',
  './cloud-sync.js',
  './coach.js',
  './manifest.webmanifest',
  './logo-dark-mark.png',
  './og-image.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Network-first for the HTML (so updates land), cache-first for everything else. */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  // Only handle our own origin — let the Supabase SDK/API and any CDN go straight to network.
  if (new URL(e.request.url).origin !== self.location.origin) return;
  var isDoc = e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').indexOf('text/html') !== -1;
  if (isDoc) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
        return res;
      }).catch(function () { return caches.match('./index.html'); })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(function (hit) {
        return hit || fetch(e.request).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
          return res;
        }).catch(function () { return hit; });
      })
    );
  }
});
