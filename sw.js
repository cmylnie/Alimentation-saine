// Service worker : l'appli s'ouvre même sans réseau.
// « Réseau d'abord » : dès qu'il y a du réseau, on récupère la dernière version, sinon la copie en cache.
const CACHE = 'mon-assiette-v4';
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/app.js', 'js/model.js', 'js/actions.js', 'js/store.js', 'js/dates.js',
  'js/photos.js', 'js/data/ingredients.js', 'js/data/recipes.js', 'js/data/dishes.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    // no-cache : sinon le cache HTTP de GitHub Pages garde l'ancienne version 10 minutes.
    fetch(req, new URL(req.url).origin === self.location.origin ? { cache: 'no-cache' } : {})
      .then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
