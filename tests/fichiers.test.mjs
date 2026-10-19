/* Cohérence entre index.html, sw.js et les fichiers réellement présents.
   Rappel de l'incident qui a motivé ce test : six b-*.png listés dans sw.js
   n'avaient jamais été déposés, l'installation du service worker échouait en
   silence et l'app n'avait aucun mode hors ligne. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const lire = f => readFileSync(join(RACINE, f), 'utf8');
const html = lire('index.html');
const sw = lire('sw.js');
const existe = p => existsSync(join(RACINE, p.replace(/^\.\//, '')));
const listeSw = nom => {
  const m = sw.match(new RegExp(`const ${nom} = \\[([\\s\\S]*?)\\];`));
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
};
const fichiers = dir => readdirSync(join(RACINE, dir)).flatMap(f =>
  statSync(join(RACINE, dir, f)).isDirectory() ? fichiers(join(dir, f)) : [join(dir, f)]);

test('toutes les images citées par index.html existent', () => {
  const cites = [...new Set([...html.matchAll(/['"(]((?:\.\/)?img\/[^'")]+)['")]/g)].map(m => m[1]))];
  assert.ok(cites.length > 20, 'détection des chemins img/ cassée');
  assert.deepEqual(cites.filter(p => !existe(p)), []);
});

test('les scripts externes de index.html existent', () => {
  const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.ok(srcs.includes('./data/db.js'));
  assert.deepEqual(srcs.filter(p => !existe(p)), []);
});

test('tout fichier précaché par sw.js existe', () => {
  assert.deepEqual([...listeSw('CORE'), ...listeSw('EXTRA')].filter(p => p !== './' && !existe(p)), []);
});

test('toute image de img/ est précachée (sinon absente hors ligne)', () => {
  const extra = new Set(listeSw('EXTRA'));
  assert.deepEqual(fichiers('img').map(p => './' + p).filter(p => !extra.has(p)), []);
});
