# Ressources et attributions

Vérification effectuée le **7 octobre 2026**. Les fichiers ci-dessous sont locaux : aucune police, image ou texture n’est chargée depuis un service externe pendant une partie.

| Ressource | Auteur / provenance | Licence / statut vérifié | Source |
| --- | --- | --- | --- |
| Inter, Latin, normal 400/500/600/700 (`@fontsource/inter`) | The Inter Project Authors, Rasmus Andersson | SIL Open Font License 1.1 ; texte fourni dans le paquet npm, copié dans [Inter-OFL.txt](licenses/Inter-OFL.txt). Fichiers de police non modifiés. | https://github.com/rsms/inter ; https://fontsource.org/fonts/inter |
| Fraunces, Latin, normal 400/600 (`@fontsource/fraunces`) | The Fraunces Project Authors, Undercase Type | SIL Open Font License 1.1 vérifiée le 7 octobre 2026 dans le paquet npm ; [Fraunces-OFL.txt](licenses/Fraunces-OFL.txt). Polices non modifiées, licence intégrée au portable. | https://github.com/undercasetype/Fraunces ; https://fontsource.org/fonts/fraunces |
| Icônes Lucide | Lucide Contributors | ISC ; [texte fourni](licenses/Lucide-ISC.txt) | https://lucide.dev/ |
| Three.js et modules d’environnement/caméra | Three.js Authors | MIT ; [texte fourni](licenses/Three-MIT.txt) | https://threejs.org/ |
| Modèles des trois poissons, bâtiments, végétation, matériaux et textures Canvas | Créations originales du projet, code de `fish3d.ts` et `farm3d.ts` | Créations du dépôt, aucun modèle ou texture tiers importé | Fichiers sources du dépôt |
| Carte du domaine, favicon | Créations originales du projet en SVG | Créations du dépôt | `src/FarmMap.tsx`, `public/favicon.svg` |
| Planche des espèces et vue paysagère | Images originales générées pour les versions précédentes du projet | Images générées, pas de photographie documentaire ni de ressource de banque d’images. Le lot 4 prévoit leur remplacement par des rendus cohérents avec les modèles du jeu. | `public/assets/species-atlas.png`, `public/assets/farm-landscape.png` ; provenance décrite dans le README et le prompt V2 |

Les masques d’affichage de la planche préservent les proportions ; ils n’ajoutent aucune ressource tierce. React et React DOM sont sous licence MIT ; les notices des dépendances restent dans leurs paquets verrouillés par `package-lock.json`.

Aucun son ni musique n’est intégré au lot 0. Leur provenance et licence seront ajoutées lors du lot 3. Aucune attribution de licence CC0 n’est présumée pour une ressource trouvée sur Internet.

Lot 1b : aucune nouvelle ressource externe. Les icônes supplémentaires proviennent du paquet Lucide déjà crédité. L’illustration paysagère historique n’est plus utilisée dans l’interface ni intégrée au portable ; la planche des espèces reste accessible depuis l’observation.

Lot 1c : composants, styles et pictogrammes de jauge originaux, créés dans le dépôt. Aucune nouvelle ressource externe ; Inter/Fraunces (OFL) et Lucide (ISC) restent les seuls paquets visuels utilisés.

Lot 2a : schéma de l’analyse d’eau original, dessiné en SVG dans `src/panels/ConstructionPanel.tsx`. Courbes des relevés calculées à partir des états observés du moteur, sans donnée externe. Aucune nouvelle ressource téléchargée.

Lot 2b : diagramme de chaîne logistique et graphique de trésorerie originaux (HTML/SVG), icônes Lucide déjà créditées. Aucune nouvelle ressource externe.
