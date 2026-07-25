# Carbon FOODprint

Comptabilité carbone alimentaire personnelle. Application web autonome, sans dépendance
externe : le référentiel de 149 facteurs d'émission est embarqué dans `index.html`.

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

## Données

Historique, favoris et score vivent dans le `localStorage` de l'appareil. Rien ne part sur un
serveur. Tracker → *Sauvegarde* permet de copier l'ensemble en JSON et de le restaurer ailleurs.

## Sources

ADEME — AGRIBALYSE 3.2, diffusée via le jeu de données ouvert Impact CO₂ (impactco2.fr).
Cinq valeurs absentes de la base publique sont estimées par substitution, signalées dans
l'application par une étiquette « estimé » et documentées dans leur fiche.
