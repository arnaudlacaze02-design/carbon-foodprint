/* Carbon FOODprint — service worker.
   À CHAQUE NOUVELLE VERSION DE L'APP : incrémenter VERSION ci-dessous, sinon les appareils
   déjà installés continueront de servir la version en cache. */
const VERSION = 'cfp-1.0.0';
const ASSETS = [
  './', './index.html', './manifest.json',
  './icon-180.png', './icon-192.png', './icon-512.png', './icon-512-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* cache d'abord : l'app doit démarrer sans réseau */
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
