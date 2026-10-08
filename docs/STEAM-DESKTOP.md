# Bureau et Steam : étapes restant hors de cette livraison

Le jeu livré est une application web et un HTML portable autonome. Il n'est ni empaqueté ni publié sur Steam. Les succès locaux fonctionnent sans compte et restent attachés à chaque ferme.

## Contrat de plateforme

`src/platform.ts` expose `unlockAchievement`, `readCloudSave` et `writeCloudSave`. L'implémentation web est volontairement sans effet, sans connexion réseau. Les identifiants stables des douze succès sont définis dans `src/state/profile.ts` : `water`, `pond`, `fish`, `feeding`, `contract`, `harvest`, `dispatch`, `paid`, `diversify`, `volume`, `profitable`, `cold`.

Une version de bureau pourra injecter un adaptateur Steamworks au démarrage, après initialisation du SDK avec son propre App ID. Les appels de succès devront être idempotents, mis en attente hors ligne et réconciliés après reconnexion. Aucun secret, App ID réel ni SDK propriétaire n'est inclus dans le navigateur. La validation locale ne constitue pas une protection contre la triche : un fichier JSON appartient au joueur.

## Empaquetage recommandé

Évaluer d'abord un prototype Electron avec le même build Vite : rendu Chromium et Web Audio proches de la version vérifiée, distribution Windows/Linux et interface native Steamworks via un processus principal isolé. Garder `contextIsolation`, désactiver `nodeIntegration` dans le renderer et n'exposer qu'un petit pont IPC validé. Une alternative Tauri est possible après validation spécifique de WebGL2, Web Audio et Gamepad API sur les WebViews ciblées. Aucun de ces prototypes n'a été réalisé ici.

Enregistrer les sauvegardes atomiquement dans le répertoire utilisateur de l'application, avec copie précédente récupérable. Associer Steam Cloud aux fichiers de sauvegarde, jamais directement à `localStorage`. Préserver l'export/import JSON et les migrations V1–V6. En cas de conflit local/cloud, présenter les deux fermes (date de simulation, durée, trésorerie et vignette) et demander laquelle conserver ; ne pas écraser silencieusement la version la plus ancienne en temps réel, qui peut contenir une autre progression.

## Recette de publication

Tester les systèmes de bureau retenus sur GPU réel, les quatre qualités, les contrôleurs physiques standard, le branchement/débranchement, Steam Input et le clavier. Vérifier plein écran, veille/reprise, changement de résolution, périphériques audio, mode hors ligne, langues et accessibilité. Les mesures SwiftShader du cloud ne prédisent pas les performances d'une machine de joueur.

La publication exige encore les démarches Steamworks, les dépôts et branches de test, les exécutables signés selon le système, les visuels de boutique originaux, les mentions de licence, la politique de confidentialité pertinente, la configuration des succès et la validation de Valve. Aucune publication ni certification Steam Deck n'est revendiquée.
