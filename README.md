# Carbon FOODprint

Comptabilité carbone alimentaire personnelle. Application web autonome, sans dépendance
externe : le référentiel de facteurs d'émission — 237 aliments, 322 plats types — est embarqué dans `index.html`.

## Mise en ligne sur GitHub Pages

1. Créer un dépôt **public** (les Pages d'un dépôt privé exigent un compte payant).
2. Déposer à la racine : `index.html`, `manifest.json`, `sw.js`, les quatre `icon-*.png`.
3. Onglet **Settings → Pages**, source **Deploy from a branch**, branche `main`, dossier `/ (root)`.
4. Attendre une minute, puis ouvrir `https://<compte>.github.io/<dépôt>/` dans Safari sur iPhone.
5. **Partager → Ajouter à l'écran d'accueil.**

Tous les chemins sont relatifs : l'app fonctionne aussi bien à la racine d'un domaine que dans
un sous-dossier de dépôt.

## Mettre à jour l'app

Remplacer `index.html`, **puis incrémenter `VERSION` dans `sw.js`**. Sans cela, les appareils
déjà installés continueront de servir la version mise en cache.

## Notifications app fermée

Facultatif : l'app fonctionne sans. Voir `serveur/README-push.md` pour le rappel de 21 h, puis
`serveur/README-social.md` pour les j'aime, demandes d'amis, partages et invitations en temps réel.
Le second suppose le premier fait.

## Données

Historique, favoris et score vivent dans le `localStorage` de l'appareil. Rien ne part sur un
serveur. Tracker → *Sauvegarde* permet de copier l'ensemble en JSON et de le restaurer ailleurs.

## Sources

ADEME — AGRIBALYSE 3.2, diffusée via le jeu de données ouvert Impact CO₂ (impactco2.fr).
Cinq valeurs absentes de la base publique sont estimées par substitution, signalées dans
l'application par une étiquette « estimé » et documentées dans leur fiche.

## Journal des versions

**v65** — Détail du jour scindé en trois cartes (carbone, calories, protéines), chacune avec son
repère et son sens de lecture propres. Bandes de repas cliquables, ouvrant une fiche à trois
chiffres. Interrupteur des données nutritionnelles dans le Profil. Notifications sociales
instantanées côté serveur (`serveur/push_social.sql` + Edge Function `push-envoi`). Ajout de
HiPRO Danone et de trois shakers protéinés au rayon Boissons.

Réserve méthodologique sur ces quatre entrées : la poudre de protéines laitières est leur poste
dominant et la littérature va de 7 à 25 kg CO₂e/kg selon l'allocation retenue entre le lactosérum
et le fromage dont il est le co-produit. Valeur médiane de 15 retenue, documentée dans le champ
`xn` de chaque entrée. À corriger en priorité si une valeur ADEME ou Agribalyse paraît.

**v66** — Carte thaï ajoutée (36 plats, sans numéro ni nom d'enseigne).
Catalogues de marque déverrouillables par case à cocher dans le Profil : le champ `lk` d'un plat
nomme la marque qui l'ouvre, et tout passe par l'accesseur `DISHES()`. HelloFresh livré avec
97 recettes. Jow câblé mais vide — voir ci-dessous. Huile d'olive promue au catalogue : elle
était citée par six recettes sans être saisissable, et `kgOf` l'ignorait donc silencieusement
dans tout plat qui la contenait.

Grammages des plats : ce sont des estimations d'assiette, comme pour les cartes déjà présentes.
Les cartes de restaurant et les fiches HelloFresh donnent les ingrédients, jamais les poids.

**v67** — Les plats thaï perdent leur champ `src` : ils se cuisinent à la maison, donc plus de
mode Restaurant forcé (le sélecteur de préparation reste libre) et ils entrent dans le conseil
du soir, dont `src` les excluait.
