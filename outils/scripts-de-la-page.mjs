/* Extrait le JavaScript en ligne d'index.html en UN seul texte, en conservant
   les numéros de ligne : tout ce qui n'est pas du script devient une ligne vide.
   Les <script> d'une même page partagent la même portée globale — deux
   `function reglette` dans deux blocs différents s'écrasent sans erreur. Les
   analyser comme un seul programme est ce qui permet de voir ces collisions. */
import { readFileSync } from 'node:fs';

export function scriptsDeLaPage(chemin = 'index.html') {
  const html = readFileSync(chemin, 'utf8');
  const lignes = html.split('\n');
  const sortie = lignes.map(() => '');
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const debut = html.slice(0, m.index + '<script>'.length).split('\n').length - 1;
    const bloc = m[1].split('\n');
    /* La première ligne du bloc partage sa ligne avec <script> : on garde la
       colonne en la préfixant d'espaces. */
    const col = lignes[debut].indexOf('<script>') + '<script>'.length;
    bloc[0] = ' '.repeat(col) + bloc[0];
    bloc.forEach((l, i) => { sortie[debut + i] = l; });
  }
  return sortie.join('\n');
}
