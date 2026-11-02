/* Création d'un aliment à la main : les parts d'ingrédients ne doivent plus
   être ramenées à 100 % quand l'étiquette en liste davantage. Cas réel : semoule
   au poulet Picard, 3 ingrédients saisis sur 46,5 % du produit, poulet compté
   37 % au lieu de 17,5 %. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chargerApp } from './aide-app.mjs';

let A;
before(async () => { A = await chargerApp(); });
after(() => A.fermer());

const parts = p => JSON.parse(A.app(`JSON.stringify(persoParts(${JSON.stringify(p)}))`));
const proche = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg} : ${a} ≠ ${b}`);

test('parts toutes saisies : prises telles quelles, sans gonfler', () => {
  const w = parts([20, 17.5, 9]);
  proche(w[0], 0.2, 'semoule'); proche(w[1], 0.175, 'poulet'); proche(w[2], 0.09, 'tomate');
});

test('au-delà de 100 % : ramené à 100', () => {
  const w = parts([80, 40]);
  proche(w[0] + w[1], 1, 'somme');
});

test('aucune part : estimation par l’ordre, comme avant pour 1 à 3', () => {
  assert.deepEqual(parts([null, null, null]), [0.6, 0.25, 0.15]);
  const w = parts([null, null, null, null, null]);
  proche(w.reduce((a, b) => a + b, 0), 1, 'somme 5');
  assert.ok(w[0] > w[4], 'décroissant');
});

test('parts manquantes : le reste jusqu’à 100 % leur revient', () => {
  const w = parts([50, null, null]);
  proche(w[0], 0.5, 'saisie gardée');
  proche(w[1] + w[2], 0.5, 'reste partagé');
  assert.ok(w[1] > w[2], 'décroissant');
});

test('formulaire : 8 lignes, la semoule au poulet complète donne ≈ 1,38 kg', () => {
  A.app(`persoSheet('Semoule au poulet')`);
  assert.equal(A.app(`document.querySelectorAll('.pfrow').length`), 8);
  const lignes = [['Semoule', 20], ['Poulet', 17.5], ['Tomate', 17.2], ['Carotte', 8],
                  ['Courgette', 6], ['Poivron', 5], ['Matière grasse végétale', 4.5], ['Oignon', 4.5]];
  A.app(`(${JSON.stringify(lignes)}).forEach(([n, p], i) => {
    document.querySelector('#pfI' + i).value = n; document.querySelector('#pfW' + i).value = String(p); });
    ['pfK','pfP','pfL','pfG','pfF'].forEach((id, k) => document.querySelector('#' + id).value = [147, 8.5, 5.3, 16, 1.3][k]);
    document.querySelector('#pfI0').oninput();`);
  const out = A.app(`document.querySelector('#pfOut').textContent`);
  assert.match(out, /1,38 kg CO₂e\/kg/);
  assert.doesNotMatch(out, /ne couvrent que/);
});

test('formulaire : couverture faible signalée', () => {
  A.app(`persoSheet('Test');
    document.querySelector('#pfI0').value = 'Poulet'; document.querySelector('#pfW0').value = '20';
    document.querySelector('#pfI0').oninput();`);
  assert.match(A.app(`document.querySelector('#pfOut').textContent`), /ne couvrent que 20 %/);
});
