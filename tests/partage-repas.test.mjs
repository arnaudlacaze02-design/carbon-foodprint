/* Partage d'un repas avec des amis : bouton sous le total, envoi à
   l'enregistrement, carte dans Actu et reprise par l'ami. Le réseau est coupé :
   postNew est remplacé par un enregistreur pour voir exactement ce qui part. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chargerApp } from './aide-app.mjs';

let A;
before(async () => {
  A = await chargerApp();
  A.app(`
    SESS = {uid:'moi', username:'Arnaud'};
    S.fr = {in:[], out:[], refuses:[], state:'ok', friends:[
      {requester:'moi', addressee:'u-lea', status:'accepted', dst:{username:'Léa', username_slug:'lea'}},
      {requester:'u-tom', addressee:'moi', status:'accepted', dem:{username:'Tom', username_slug:'tom'}}]};
    window.__envois = [];
    postNew = async (kind, corps, dst) => { __envois.push({kind, corps, dst}); return {ok:true, id:'p1', amis:dst.length, choisi:true}; };
  `);
});
after(() => A.fermer());

test("l'app démarre sans erreur JavaScript", () => assert.deepEqual(A.erreurs, []));

test('pas de bouton sans compte, sans aliment ou en modification', () => {
  A.app(`S.draft = []`);
  assert.equal(A.app('mealShareRow()'), '');
  A.app(`S.draft = [['riz', 80, 'plat', 'frais']]; S.editId = 'e1'`);
  assert.equal(A.app('mealShareRow()'), '');
  A.app(`S.editId = null`);
  assert.match(A.app('mealShareRow()'), /Partager ce repas avec un ami/);
});

test('les destinataires restent attachés au brouillon pour lequel ils ont été choisis', () => {
  A.app(`S.draft = [['riz', 80, 'plat', 'frais']]; MEAL_DST = ['u-lea']; MEAL_DST_REF = S.draft`);
  assert.deepEqual(JSON.parse(A.app('JSON.stringify(mealDst())')), ['u-lea']);
  assert.match(A.app('mealShareRow()'), /Partagé avec Léa/);
  A.app(`S.draft.push(['poulet', 150, 'plat', 'frais'])`);          // on complète : le choix tient
  assert.equal(A.app('mealDst().length'), 1);
  A.app(`S.draft = [['oeuf', 60, 'plat', 'frais']]`);               // nouveau repas : choix perdu
  assert.equal(A.app('mealDst().length'), 0);
});

test("l'envoi part avec le repas enregistré, noms en clair", async () => {
  A.app(`S.step = 'saisie'; S.meal = 'dej'; S.entryDate = today(); S.editId = null;
         S.draft = [['riz', 80, 'plat', 'frais'], ['poulet', 150, 'plat', 'frais']];
         MEAL_DST = ['u-tom']; MEAL_DST_REF = S.draft;
         fxJoue = () => false; commitMeal();`);
  await new Promise(r => setTimeout(r, 1100));
  const e = JSON.parse(A.app('JSON.stringify(__envois)'));
  assert.equal(e.length, 1);
  assert.equal(e[0].kind, 'meal');
  assert.deepEqual(e[0].dst, ['u-tom']);
  assert.equal(e[0].corps.m, 'dej');
  assert.deepEqual(e[0].corps.l.map(l => [l[0], l[1], l[2]]), [['riz', 80, 'Riz'], ['poulet', 150, 'Poulet']]);
  assert.equal(A.app('mealDst().length'), 0, 'choix remis à zéro après envoi');
});

test("sans destinataire, rien n'est envoyé", async () => {
  A.app(`__envois = []; S.step = 'saisie'; S.draft = [['riz', 80, 'plat', 'frais']]; commitMeal();`);
  await new Promise(r => setTimeout(r, 1100));
  assert.equal(A.app('__envois.length'), 0);
});

test("l'ami voit la carte et reprend le repas dans sa saisie, quantités modifiables", () => {
  A.app(`S.posts = [{id:'p9', author:'u-lea', kind:'meal', created_at:new Date().toISOString(),
    aut:{username:'Léa'}, body:{label:'Déjeuner composé', m:'din', kg:0.5, mode:'frais',
    l:[['lentilles', 80, 'Lentilles', 'plat'], ['inconnu-xyz', 50, 'Truc maison', 'plat']]}}];
    S.draft = [];`);
  const carte = A.app(`postCard(S.posts[0])`);
  assert.match(carte, /Repas partagé avec vous/);
  assert.match(carte, /Truc maison/);
  assert.match(carte, /data-pmeal="p9"/);
  A.app(`mealImport('p9')`);
  assert.deepEqual(JSON.parse(A.app('JSON.stringify(S.draft)')), [['lentilles', 80, 'plat', 'frais']]);
  assert.equal(A.app('S.meal'), 'din');
  assert.equal(A.app('S.entryDate'), A.app('today()'));
  assert.equal(A.app('S.editId'), null);
});

test("l'auteur ne voit pas « Ajouter à mon journal » sur son propre repas", () => {
  const carte = A.app(`postCard({id:'p8', author:'moi', kind:'meal', created_at:new Date().toISOString(),
    body:{label:'Mon dîner', m:'din', l:[['riz', 80, 'Riz', 'plat']]}})`);
  assert.doesNotMatch(carte, /data-pmeal/);
  assert.match(carte, /Repas partagé ·/);
});
