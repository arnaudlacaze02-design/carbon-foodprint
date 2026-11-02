/* Style « Disco » : accueil en damier, écran des trois options derrière
   « Nouveau repas », choix du style dans le profil. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chargerApp } from './aide-app.mjs';

let A;
before(async () => { A = await chargerApp(); A.app(`try{ gateHide(); }catch(e){}`); });
after(() => A.fermer());

const q = sel => A.app(`!!document.querySelector(${JSON.stringify(sel)})`);

test("l'app démarre sans erreur JavaScript", () => assert.deepEqual(A.erreurs, []));

test('par défaut : style classique, accueil inchangé', () => {
  assert.equal(A.app('daMode'), 'classique');
  A.app(`S.step = 'home'; S.editId = null; go('saisie')`);
  assert.ok(q('#hNew') && q('#hEdit') && q('#hIA'), 'les trois options classiques');
  assert.equal(q('.dz-grid'), false);
  assert.equal(A.app(`document.body.classList.contains('dz-home')`), false);
});

test('Disco : accueil en damier, sans Modifier ni Décrire, barre du bas masquée', () => {
  A.app(`applyDA('disco'); S.step = 'home'; go('saisie')`);
  assert.equal(A.app(`document.documentElement.getAttribute('data-da')`), 'disco');
  assert.ok(q('.dz-grid #dzNew') && q('#dzCarbone') && q('#dzSais') && q('#dzCal'));
  assert.ok(q('#dzFeed') && q('#dzTracker') && q('#dzTroph') && q('#dzCuisine'));
  assert.equal(q('#hEdit') || q('#hIA'), false, 'Modifier et Décrire ne sont plus sur l’accueil');
  assert.equal(A.app(`document.body.classList.contains('dz-home')`), true);
});

test('Disco : Nouveau repas ouvre les trois options, retour à l’accueil', () => {
  A.app(`document.querySelector('#dzNew').click()`);
  assert.equal(A.app('S.step'), 'trio');
  assert.ok(q('#hNew') && q('#hEdit') && q('#hIA'), 'les trois options');
  A.app(`document.querySelector('#dzBack').click()`);
  assert.ok(q('#dzCarbone'), 'retour au damier');
});

test('Disco : le choix du repas revient aux trois options', () => {
  A.app(`document.querySelector('#dzNew').click(); document.querySelector('#hNew').click()`);
  assert.equal(A.app('S.step'), 'meal');
  A.app(`document.querySelector('#sBack').click()`);
  assert.equal(A.app('S.step'), 'trio');
});

test('changer d’onglet rend la barre du bas', () => {
  A.app(`go('feed')`);
  assert.equal(A.app(`document.body.classList.contains('dz-home')`), false);
});

test('le profil propose Classique / Disco', () => {
  A.app(`go('profil')`);
  assert.ok(q('#daseg [data-da-opt="classique"]') && q('#daseg [data-da-opt="disco"]'));
  A.app(`document.querySelector('#daseg [data-da-opt="classique"]').click()`);
  assert.equal(A.app('daMode'), 'classique');
  A.app(`S.step = 'home'; go('saisie')`);
  assert.equal(q('.dz-grid'), false);
});
