/* Carbon FOODprint — service worker.

   Deux stratégies distinctes :
   - la page elle-même est cherchée sur le réseau d'abord, avec repli sur le cache. Une nouvelle
     version déposée sur GitHub arrive donc automatiquement au prochain lancement connecté,
     sans rien avoir à incrémenter ici.
   - les icônes et le manifeste sont servis depuis le cache d'abord, ils ne changent jamais.

   VERSION ne sert qu'à purger l'ancien cache : à incrémenter si tu ajoutes ou renommes un
   fichier dans ASSETS. */
const VERSION = 'cfp-3.19.0';
const ASSETS = [
  './', './index.html', './manifest.json',
  './icon-180.png', './icon-192.png', './icon-512.png', './icon-512-maskable.png',
  './logo-mark.png', './logo-wide.png',
  /* illustrations de badges : mises en cache pour rester visibles hors ligne */
  './b-carotte.png', './b-tomate.png', './b-brocoli.png',
  './b-france.png', './b-rome.png', './b-ny.png'
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

/* ==================== Web Push ====================
   Le seul chemin par lequel quelque chose peut arriver téléphone verrouillé et
   app fermée. Deux règles à ne pas enfreindre :

   1. showNotification() DOIT être appelé à chaque push reçu, sans condition.
      iOS considère un push qui n'affiche rien comme un push silencieux et
      révoque l'abonnement au bout de quelques-uns — on perd alors les
      notifications pour de bon, sans message d'erreur. C'est la panne la plus
      fréquente de cette mécanique, d'où le libellé de repli plutôt qu'un
      `return` quand la charge est illisible.

   2. La pastille de l'icône se pose ici, dans le worker : c'est ce qui la rend
      possible app fermée, là où l'appel depuis la page ne peut rien. Son échec
      ne doit jamais faire échouer l'ensemble, sinon on retombe sur le cas 1. */
self.addEventListener('push', e => {
  let d = {};
  try{ d = e.data ? e.data.json() : {}; }
  catch(err){ d = {body: e.data ? e.data.text() : ''}; }

  const titre = d.title || 'N’oubliez pas de rentrer vos repas';
  const opts = {
    body:  d.body || '',
    tag:   d.tag  || 'soir',
    icon:  './icon-192.png',
    badge: './icon-192.png',
    data:  {tab: d.tab || 'saisie', vue: d.vue || 'actu'},
  };

  const taches = [self.registration.showNotification(titre, opts)];
  const n = typeof d.badge === 'number' ? d.badge : null;
  if(n !== null && self.navigator && self.navigator.setAppBadge){
    taches.push((n > 0 ? self.navigator.setAppBadge(n)
                       : self.navigator.clearAppBadge()).catch(() => {}));
  }
  e.waitUntil(Promise.all(taches));
});

/* Le service de push a renouvelé l'abonnement de son côté. Safari ne déclenche
   pas toujours cet évènement : le vrai filet de sécurité est le réabonnement
   que la page effectue à chaque lancement. Celui-ci ne fait que prévenir les
   fenêtres ouvertes pour qu'elles renvoient l'abonnement sans attendre. */
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    list.forEach(c => c.postMessage({cfp:'reabonner'}));
  })());
});

/* Clic sur une notification : ramener la fenêtre existante au premier plan
   plutôt qu'en ouvrir une seconde, et lui dire sur quel onglet se poser. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  /* La page recalculera le vrai compte à l'ouverture. Effacer ici évite qu'un
     chiffre périmé subsiste si l'ouverture échoue. */
  if(self.navigator && self.navigator.clearAppBadge) self.navigator.clearAppBadge().catch(() => {});
  const d = e.notification.data || {};
  const tab = d.tab || 'feed';
  const vue = d.vue || 'actu';
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    for(const c of list){
      if(c.url.includes(self.registration.scope)){
        c.postMessage({cfp:'ouvrir', tab, vue});
        return c.focus();
      }
    }
    return self.clients.openWindow('./index.html');
  })());
});
