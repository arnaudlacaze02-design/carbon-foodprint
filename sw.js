/* Carbon FOODprint — service worker.

   Deux stratégies distinctes :
   - la page elle-même est cherchée sur le réseau d'abord, avec repli sur le cache. Une nouvelle
     version déposée sur GitHub arrive donc automatiquement au prochain lancement connecté,
     sans rien avoir à incrémenter ici.
   - les icônes et le manifeste sont servis depuis le cache d'abord, ils ne changent jamais.

   VERSION ne sert qu'à purger l'ancien cache : à incrémenter si tu ajoutes ou renommes un
   fichier dans ASSETS. */
const VERSION = 'cfp-3.0.0';
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

const fresh = (req, key) => fetch(req).then(res => {
  const copy = res.clone();
  caches.open(VERSION).then(c => c.put(key || req, copy));
  return res;
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;

  /* Ne jamais toucher aux requêtes sortantes vers un autre domaine. Sans ce
     garde-fou, la lecture des repas — un GET — tombait dans la branche
     « cache d'abord » : la première synchro était mise en cache et toutes les
     suivantes relisaient cette réponse périmée au lieu d'interroger le
     serveur. En prime, les données du compte restaient stockées dans le cache
     après déconnexion. */
  if(new URL(e.request.url).origin !== self.location.origin) return;
  const isPage = e.request.mode === 'navigate' ||
                 (e.request.headers.get('accept') || '').includes('text/html');

  if(isPage){
    /* réseau d'abord : l'app se met à jour toute seule dès qu'elle a du signal */
    e.respondWith(
      fresh(e.request, './index.html')
        .catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }
  /* cache d'abord pour le reste */
  e.respondWith(caches.match(e.request).then(hit => hit || fresh(e.request)));
});
