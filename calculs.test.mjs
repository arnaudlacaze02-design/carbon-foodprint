/* Les calculs que l'utilisateur voit en chiffres. Si l'un de ces tests casse,
   un nombre affiché par l'app a changé : soit c'est voulu (et on met le test à
   jour en connaissance de cause), soit c'est une régression. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chargerApp } from './aide-app.mjs';

let A;
before(async () => { A = await chargerApp(); });
after(() => A.fermer());

const proche = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg} : ${a} ≠ ${b}`);

test("l'app démarre sans erreur JavaScript", () => {
  assert.deepEqual(A.erreurs, []);
});

test('kgOf : facteur AGRIBALYSE × grammes', () => {
  const t = A.app('F.get("steakhache5").t');
  proche(A.app('kgOf([["steakhache5", 100]])'), t * 0.1, '100 g de steak');
  proche(A.app('kgOf([["steakhache5", 100], ["riz", 80]])'),
         t * 0.1 + A.app('F.get("riz").t') * 0.08, 'deux lignes additionnées');
  assert.equal(A.app('kgOf([])'), 0);
});

test('kgOf : mode de préparation (restaurant +10 %, surgelé +15 %)', () => {
  const base = A.app('kgOf([["poulet", 200]])');
  proche(A.app('kgOf([["poulet", 200, 1, "resto"]])'), base * 1.10, 'restaurant');
  proche(A.app('kgOf([["poulet", 200, 1, "surgele"]])'), base * 1.15, 'surgelé');
  proche(A.app('kgOf([["poulet", 200, 1, "frais"]])'), base, 'frais');
  assert.equal(A.app('modeK("inconnu")'), 1);
});

test('kgOf : un aliment inconnu compte zéro au lieu de produire NaN', () => {
  proche(A.app('kgOf([["nexistepas", 500], ["riz", 100]])'), A.app('F.get("riz").t') * 0.1, 'inconnu ignoré');
});

test('budget journalier = 700 kg / 365', () => {
  proche(A.app('BUDGET_J'), 700 / 365, 'BUDGET_J');
});

test('saisPart : part de saison en grammes de fruits et légumes', () => {
  // juillet (mois 6) : courgette de saison, mangue jamais de saison
  proche(A.app('saisPart([["courgette", 100], ["mangue", 100]], 6)'), 50, '50 %');
  assert.equal(A.app('saisPart([["fraise", 100]], 0)'), 0, 'fraise en janvier');
  assert.equal(A.app('saisPart([["riz", 100]], 6)'), null, 'pas de fruit ni légume → null');
});

test('besoinCal : valeur déclarée prioritaire, sinon estimation ANSES', () => {
  A.app('S.prof = {calKnow: "oui", calVal: 2300}');
  assert.equal(A.app('besoinCal()'), 2300);
  A.app('S.prof = {sexe: "h", age: "a18", act: "actif"}');
  assert.equal(A.app('besoinCal()'), 2600);
  A.app('S.prof = {sexe: "f", age: "a40", act: "sportif"}');
  assert.equal(A.app('besoinCal()'), Math.round(2100 * 0.97 * 1.85 / 1.63 / 10) * 10);
  A.app('S.prof = {sexe: "f"}');
  assert.equal(A.app('besoinCal()'), null, 'âge manquant');
});

test('tous les plats et standards ont une empreinte calculable', () => {
  const pb = A.app(`[...Object.entries(DB.dishes).map(([k, d]) => [k, kgOf(d.l)]),
                    ...DB.standards.map(s => [s.n, kgOf(s.l)])]
                   .filter(([, kg]) => !(Number.isFinite(kg) && kg > 0)).map(([k]) => k)`);
  assert.deepEqual([...pb], []);
});

test('recherche : accents, casse et ligatures ignorés', () => {
  assert.equal(A.app('nrmQ("  CAFÉ ")'), 'cafe');
  assert.equal(A.app('nrmQ("Œuf")'), 'oeuf');
});

test("esc : le texte saisi par l'utilisateur ne peut pas injecter de HTML", () => {
  assert.equal(A.app(`esc('<img src=x onerror="a()">&')`),
               '&lt;img src=x onerror=&quot;a()&quot;&gt;&amp;');
});

test('iso : date locale, pas UTC', () => {
  assert.equal(A.app('iso(new Date(2026, 0, 5, 23, 30))'), '2026-01-05');
});
