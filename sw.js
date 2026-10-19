/* Carbon FOODprint — service worker.

   Deux stratégies distinctes :
   - la page et la base d'aliments (data/db.js) sont cherchées sur le réseau d'abord, avec
     repli sur le cache. Une nouvelle version déposée sur GitHub arrive donc automatiquement
     au prochain lancement connecté, sans rien avoir à incrémenter ici.
   - les images (img/), icônes et le manifeste sont servis depuis le cache d'abord : ils ne
     changent pas. Pour modifier une image, change son nom plutôt que son contenu.

   VERSION ne sert qu'à purger l'ancien cache : à incrémenter si tu ajoutes ou renommes un
   fichier dans CORE ou EXTRA. */
const VERSION = 'cfp-3.45.0';
/* Le cœur de l'app : sans ces fichiers elle ne démarre pas hors ligne, donc
   l'installation échoue (et réessaiera) si l'un d'eux manque. */
const CORE = ['./', './index.html', './data/db.js', './manifest.json'];
/* Tout le reste : précaché fichier par fichier, sans que l'absence de l'un
   bloque les autres. C'est la leçon des b-*.png jamais déposés : avec un seul
   `cache.addAll()` sur toute la liste, un 404 suffisait à vider tout le cache.
   À compléter quand une image est ajoutée dans img/. */
const EXTRA = [
  './icon-180.png', './icon-192.png', './icon-512.png', './icon-512-maskable.png',
  './logo-mark.png', './logo-wide.png',
  './img/badges/b-aou.png',
  './img/badges/b-avr.png',
  './img/badges/b-bebe.webp',
  './img/badges/b-brocoli.webp',
  './img/badges/b-carotte.webp',
  './img/badges/b-dec.png',
  './img/badges/b-fev.png',
  './img/badges/b-france.webp',
  './img/badges/b-jan.png',
  './img/badges/b-jerrycan.webp',
  './img/badges/b-jul.png',
  './img/badges/b-jun.png',
  './img/badges/b-mai.png',
  './img/badges/b-mar.png',
  './img/badges/b-nov.png',
  './img/badges/b-ny.webp',
  './img/badges/b-oct.png',
  './img/badges/b-rome.webp',
  './img/badges/b-semaine.svg',
  './img/badges/b-sep.png',
  './img/badges/b-tomate.webp',
  './img/badges/b-vache.webp',
  './img/badges/m-argent.webp',
  './img/badges/m-bronze.webp',
  './img/badges/m-or.webp',
  './img/balance-remplie.png',
  './img/balance-trait.png',
  './img/marque-large.png',
  './img/marque.png',
  './img/planche-aliments.webp',
  './img/tuto/etape-1.jpg',
  './img/tuto/etape-2.jpg',
  './img/tuto/etape-3.jpg',
  './img/tuto/etape-4.jpg',
  './img/tuto/etape-5.jpg',
  './img/tuto/etape-6.jpg'
];
/* Fichiers qui changent avec les versions de l'app : cherchés sur le réseau
   d'abord, comme la page, pour ne jamais servir une base d'aliments périmée. */
const enDirect = url => url.pathname.endsWith('.html') || url.pathname.includes('/data/');

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(CORE).then(() =>
        Promise.allSettled(EXTRA.map(u => c.add(u)))))
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
    /* réseau d'abord : l'app se met à jour toute seule dès qu'elle a du signal.

       `{cache:'no-store'}` est la ligne qui manquait. Un `fetch()` nu passe
       par le cache HTTP du navigateur AVANT même d'arriver ici : si
       l'hébergeur sert index.html avec un Cache-Control ou un ETag (ce que
       fait GitHub par défaut), le navigateur peut renvoyer sa propre copie
       locale sans toucher au réseau — le worker croit faire du « réseau
       d'abord », il ne fait que relire un cache différent du sien, invisible
       depuis ce fichier. C'est ce qui donnait l'impression qu'un correctif
       posé côté page n'arrivait jamais, malgré un rechargement complet :
       aucun bug dans index.html, juste une couche de cache que cette
       stratégie ne voyait pas. */
    e.respondWith(
      fetch(e.request, {cache: 'no-store'})
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }
  /* la base d'aliments : réseau d'abord, même raison que la page */
  if(enDirect(new URL(e.request.url))){
    e.respondWith(
      fetch(e.request, {cache: 'no-store'})
        .then(res => {
          if(res.ok){ const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  /* cache d'abord pour le reste (images, icônes, manifeste) */
  e.respondWith(caches.match(e.request).then(hit => hit || fresh(e.request)));
});

/* Réception d'un push. C'est le seul code de toute l'app capable de faire
   apparaître quelque chose alors qu'elle est fermée — et il manquait. Le worker
   se réveillait à chaque envoi, ne trouvait personne pour écouter, et se
   rendormait : le serveur pouvait émettre parfaitement, rien ne s'affichait
   jamais.

   Deux exigences gouvernent ce gestionnaire.

   D'abord, il doit afficher quelque chose à tous les coups. L'abonnement est
   pris avec `userVisibleOnly: true`, qui est une promesse faite au navigateur :
   aucun push ne sera silencieux. Un push reçu sans notification affichée rompt
   cette promesse, et Safari comme Chrome finissent par révoquer l'abonnement —
   la panne se répare donc d'elle-même en pire. D'où le repli jusqu'au bout :
   charge illisible, charge vide, texte brut, on affiche tout de même.

   Ensuite, il ne présume pas de la forme de la charge. `titre`/`corps` du côté
   français, `title`/`body` du côté des conventions Web Push : les deux sont
   acceptés, parce qu'une notification perdue pour un nom de champ serait une
   panne invisible de plus. */
self.addEventListener('push', e => {
  let d = {};
  try{ d = e.data ? e.data.json() : {}; }
  catch(_){
    /* Charge non-JSON : on garde le texte, il valait sans doute un titre. */
    try{ d = {corps: e.data.text()}; }catch(__){ d = {}; }
  }
  if(!d || typeof d !== 'object') d = {};

  const titre = d.titre || d.title || 'Carbon FOODprint';
  const corps = d.corps || d.body || d.message || '';
  const tag   = d.tag || 'cfp';

  e.waitUntil(self.registration.showNotification(titre, {
    body: corps,
    tag,                       /* remplace la précédente du même sujet */
    icon:  './icon-192.png',
    badge: './icon-192.png',
    /* `tab` et `vue` voyagent jusqu'au clic, où notificationclick les relaie à
       la page — mêmes noms des deux côtés, c'est déjà le contrat plus bas. */
    data: {tab: d.tab || 'saisie', vue: d.vue},
  }));
});

/* Abonnement renouvelé par le navigateur, sans que personne l'ait demandé. Cela
   arrive : iOS et Chrome font tourner leurs points de terminaison. L'ancien
   devient caduc, le serveur continue d'écrire à une adresse morte, et l'app
   passe pour muette alors qu'elle est simplement injoignable.

   Le worker ne peut pas prévenir le serveur lui-même : il n'a pas de jeton de
   session. Il se réabonne donc et dépose le nouveau point de terminaison dans le
   cache ; la page le relèvera au prochain lancement pour le déclarer. Un
   réabonnement muet vaut mieux qu'un abonnement mort, car il rétablit au moins
   la réception dès que l'app est ouverte une fois. */
const VAPID_PUB = 'BKph812ngi7R8n41FcnHxmm5zmMFUAc3j2Qd5IckPoP7rXQ2rAnhXy1lyjfs64Zl2Xw_8x_bLGlLWoPdFAiW7QQ';

const vapidOctets = b64 => {
  const p = '='.repeat((4 - b64.length % 4) % 4);
  const brut = atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...brut].map(c => c.charCodeAt(0)));
};

self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil((async () => {
    const ancien = e.oldSubscription && e.oldSubscription.endpoint;
    let neuf = null;
    try{
      const s = await self.registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: vapidOctets(VAPID_PUB)});
      neuf = s.toJSON();
    }catch(err){ /* rien à faire ici : la page réessaiera */ }
    try{
      const c = await caches.open(VERSION);
      await c.put('./__push_renouvelle', new Response(
        JSON.stringify({ancien, neuf, quand: Date.now()}),
        {headers:{'Content-Type':'application/json'}}));
    }catch(err){}
    /* Prévenir une fenêtre ouverte, si par chance il y en a une : la page écoute
       déjà `reabonner` et rappelle pushArm(). Le message existait des deux côtés
       sauf ici — comme `vue` plus bas, le contrat était à moitié posé. */
    const list = await self.clients.matchAll({type:'window', includeUncontrolled:true});
    for(const cl of list) cl.postMessage({cfp:'reabonner'});
  })());
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
