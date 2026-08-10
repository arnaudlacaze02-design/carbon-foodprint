/* Carbon FOODprint — service worker.

   Deux stratégies distinctes :
   - la page elle-même est cherchée sur le réseau d'abord, avec repli sur le cache. Une nouvelle
     version déposée sur GitHub arrive donc automatiquement au prochain lancement connecté,
     sans rien avoir à incrémenter ici.
   - les icônes et le manifeste sont servis depuis le cache d'abord, ils ne changent jamais.

   VERSION ne sert qu'à purger l'ancien cache : à incrémenter si tu ajoutes ou renommes un
   fichier dans ASSETS. */
const VERSION = 'cfp-3.41.0';
const ASSETS = [
  './', './index.html', './manifest.json',
  './icon-180.png', './icon-192.png', './icon-512.png', './icon-512-maskable.png',
  './logo-mark.png', './logo-wide.png'
];
/* Les illustrations de badges ne figurent plus ici : elles sont désormais
   intégrées à index.html en base64, donc mises en cache avec la page et
   disponibles hors ligne sans fichier voisin.

   Ce n'était pas qu'un nettoyage. `cache.addAll()` échoue en bloc dès qu'une
   seule de ses URL répond 404 : les six fichiers b-*.png listés ici n'ayant
   jamais été déposés, l'installation du worker échouait à chaque fois et le
   cache restait vide. L'app fonctionnait quand même — la page est cherchée sur
   le réseau d'abord — mais elle n'a jamais eu de repli hors ligne. */

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

/* Clic sur une notification : ramener la fenêtre existante au premier plan
   plutôt qu'en ouvrir une seconde, et lui dire sur quel onglet se poser. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  /* `vue` voyage avec `tab` : la page attend les deux et fait
     `S.fv = e.data.vue || 'actu'`. Tant que le worker ne relayait que `tab`, le
     repli s'appliquait à chaque fois et une notification de défi ou de demande
     d'ami déposait l'utilisateur sur l'Actu. Le champ existait des deux côtés,
     il manquait au milieu. Une notification sans `vue` garde l'ancien
     comportement : la page retombe sur 'actu' d'elle-même. */
  const data = e.notification.data || {};
  const tab  = data.tab || 'saisie';
  const vue  = data.vue;
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    for(const c of list){
      if(c.url.includes(self.registration.scope)){
        c.postMessage({cfp:'ouvrir', tab, vue});
        return c.focus();
      }
    }
    /* Démarrage à froid : aucune fenêtre à qui parler, donc `tab` et `vue` se
       perdent et l'app s'ouvre là où localStorage l'avait laissée. Le corriger
       demanderait de lire un fragment côté page — or index.html ne lit
       aujourd'hui que `#import`, en égalité stricte. À faire des deux côtés à
       la fois, pas ici tout seul. */
    return self.clients.openWindow('./index.html');
  })());
});
