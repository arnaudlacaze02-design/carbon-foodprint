/* npm run lint — analyse statique du JavaScript de l'app.

   Ce qui fait échouer (erreur) : les bugs certains. En premier lieu deux
   déclarations du même nom dans la portée globale (no-redeclare), la famille du
   bug `reglette` : la seconde écrase la première pour tous les appelants et
   l'app continue de tourner avec de mauvais chiffres, sans rien afficher.
   Aussi : variable jamais déclarée (no-undef), clé en double dans un objet,
   code inatteignable, comparaison à NaN, typeof mal orthographié…

   Ce qui avertit seulement : les variables locales inutilisées et les
   échappements superflus. Les fonctions globales ne sont pas signalées comme
   inutilisées : beaucoup sont appelées depuis des onclick="…" écrits dans des
   chaînes HTML, invisibles pour l'analyse. */
import { ESLint } from 'eslint';
import js from '@eslint/js';
import globals from 'globals';
import { scriptsDeLaPage } from './scripts-de-la-page.mjs';

const regles = {
  ...js.configs.recommended.rules,
  'no-empty': ['error', { allowEmptyCatch: true }],
  'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none' }],
  'no-useless-escape': 'warn',
};
const commun = { ecmaVersion: 2024, sourceType: 'script' };

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    { files: ['index.html.js'], rules: regles,
      languageOptions: { ...commun, globals: { ...globals.browser, DB: 'readonly' } } },
    { files: ['sw.js'], rules: regles,
      languageOptions: { ...commun, globals: { ...globals.serviceworker } } },
    { files: ['data/*.js'], rules: { ...regles, 'no-unused-vars': 'off' },
      languageOptions: { ...commun } },
  ],
});

const resultats = [
  ...await eslint.lintText(scriptsDeLaPage('index.html'), { filePath: 'index.html.js' }),
  ...await eslint.lintFiles(['sw.js', 'data/*.js']),
];

let erreurs = 0, avertissements = 0;
for (const r of resultats) {
  const fichier = r.filePath.endsWith('index.html.js') ? 'index.html'
                : r.filePath.slice(process.cwd().length + 1);
  for (const m of r.messages) {
    const grave = m.severity === 2;
    grave ? erreurs++ : avertissements++;
    console.log(`${grave ? '✖' : '⚠'} ${fichier}:${m.line}:${m.column}  ${m.message}  (${m.ruleId ?? 'syntaxe'})`);
  }
}
console.log(`\n${erreurs} erreur(s), ${avertissements} avertissement(s)`);
process.exit(erreurs ? 1 : 0);
