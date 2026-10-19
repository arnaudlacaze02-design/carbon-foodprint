/* Intégrité de la base d'aliments (data/db.js). C'est le fichier qu'on modifie
   le plus souvent — ajout d'un aliment, d'un plat — et une faute de frappe dans
   un identifiant ne casse rien visiblement : le plat compte simplement zéro
   pour l'ingrédient manquant. Ces tests le voient à la place de l'utilisateur. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = {};
vm.runInNewContext(readFileSync(new URL('../data/db.js', import.meta.url), 'utf8') + ';this.DB = DB;', ctx);
// copie dans le contexte des tests : les tableaux nés dans vm ont un autre prototype
const DB = JSON.parse(JSON.stringify(ctx.DB));
const slugs = new Set(DB.foods.map(f => f.s));
const connus = new Set([...slugs, ...Object.keys(DB.aux || {})]);
const nombre = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const sauf = (liste, test) => liste.filter(x => !test(x));

test('identifiants des aliments uniques et non vides', () => {
  assert.equal(slugs.size, DB.foods.length, 'deux aliments partagent le même identifiant `s`');
  assert.deepEqual(sauf(DB.foods, f => typeof f.s === 'string' && /^[a-z0-9_-]+$/.test(f.s)).map(f => f.s), []);
});

test("chaque aliment a un nom, un rayon et un facteur carbone valide", () => {
  assert.deepEqual(sauf(DB.foods, f => f.n && f.g && nombre(f.t)).map(f => f.s), []);
});

test('valeurs nutritionnelles : 5 macros et 3 micros, positives', () => {
  assert.deepEqual(sauf(DB.foods, f => Array.isArray(f.nu) && f.nu.length === 5 && f.nu.every(nombre)).map(f => f.s), [], 'nu');
  assert.deepEqual(sauf(DB.foods, f => Array.isArray(f.nu2) && f.nu2.length === 3 && f.nu2.every(nombre)).map(f => f.s), [], 'nu2');
});

test('saisonnalité : mois entre 0 et 11, verdict 0/1/2', () => {
  assert.deepEqual(sauf(DB.foods, f => f.m === undefined ||
    (Array.isArray(f.m) && f.m.every(x => Number.isInteger(x) && x >= 0 && x <= 11))).map(f => f.s), [], 'm');
  assert.deepEqual(sauf(DB.foods, f => f.sais === undefined || [0, 1, 2].includes(f.sais)).map(f => f.s), [], 'sais');
});

test('chaque ingrédient de plat existe dans la base', () => {
  const manquants = [];
  for (const [k, d] of Object.entries(DB.dishes))
    for (const [s, g] of d.l) if (!connus.has(s) || !(g > 0)) manquants.push(`${d.n || k} → ${s} (${g} g)`);
  for (const st of DB.standards)
    for (const [s, g] of st.l) if (!connus.has(s) || !(g > 0)) manquants.push(`${st.n} → ${s} (${g} g)`);
  assert.deepEqual(manquants, []);
});

test("les aliments auxiliaires ne doublonnent pas la base principale", () => {
  assert.deepEqual(Object.keys(DB.aux || {}).filter(s => slugs.has(s)), []);
});
