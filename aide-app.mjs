/* Charge la vraie app (index.html + data/db.js) dans un navigateur simulé
   (jsdom), sans réseau : les fichiers locaux sont lus sur le disque, tout le
   reste (Supabase, polices Google) échoue comme sur un téléphone hors ligne.
   Les tests appellent ensuite directement les fonctions de l'app, telles
   qu'elles sont livrées — pas une copie qui pourrait diverger. */
import jsdom from 'jsdom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const { JSDOM, VirtualConsole, requestInterceptor } = jsdom;

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const ORIGINE = 'http://localhost/';
const TYPES = { js: 'text/javascript', html: 'text/html', png: 'image/png',
                webp: 'image/webp', jpg: 'image/jpeg', svg: 'image/svg+xml', json: 'application/json' };

/* Fichiers de l'app lus sur le disque ; tout le reste répond 503, comme un
   téléphone sans réseau. */
const disqueLocal = requestInterceptor(request => {
  if (!request.url.startsWith(ORIGINE)) return new Response('', { status: 503 });
  const chemin = decodeURIComponent(new URL(request.url).pathname.slice(1));
  try {
    return new Response(readFileSync(RACINE + chemin),
      { headers: { 'Content-Type': TYPES[chemin.split('.').pop()] || 'application/octet-stream' } });
  } catch { return new Response('', { status: 404 }); }
});

export async function chargerApp() {
  const erreurs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    if (e.type !== 'resource-loading' && e.type !== 'not-implemented') erreurs.push(e.message);
  });
  const dom = new JSDOM(readFileSync(RACINE + 'index.html', 'utf8'), {
    url: ORIGINE + 'index.html', runScripts: 'dangerously', resources: { interceptors: [disqueLocal] },
    pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.fetch = () => Promise.reject(new TypeError('hors ligne (test)'));
      w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {},
                              addListener() {}, removeListener() {} });
      w.scrollTo = () => {};
      w.HTMLCanvasElement.prototype.getContext = () => null;
    },
  });
  await new Promise(r => dom.window.addEventListener('load', r));
  await new Promise(r => setTimeout(r, 300)); // laisse passer les init différées
  const w = dom.window;
  /* `const` et `function` de premier niveau vivent dans la portée globale de la
     page : eval les y retrouve. */
  return { app: code => w.eval(code), erreurs, fermer: () => w.close() };
}
