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
| Portraits des trois espèces (WebP) | Projet Les Étangs, rendus locaux des modèles originaux | Créations originales, aucun modèle, photo ni texture tiers | `src/assets/portraits/`, `scripts/render-portraits.mjs`, 07/10/2026 |

React et React DOM sont sous licence MIT ; les notices des dépendances restent dans leurs paquets verrouillés par `package-lock.json`.

Aucun son ni musique n’est intégré au lot 0. Leur provenance et licence seront ajoutées lors du lot 3. Aucune attribution de licence CC0 n’est présumée pour une ressource trouvée sur Internet.

Lot 1b : aucune nouvelle ressource externe. Les icônes supplémentaires proviennent du paquet Lucide déjà crédité. L’illustration paysagère historique n’est plus utilisée dans l’interface ni intégrée au portable ; la planche des espèces reste accessible depuis l’observation.

Lot 1c : composants, styles et pictogrammes de jauge originaux, créés dans le dépôt. Aucune nouvelle ressource externe ; Inter/Fraunces (OFL) et Lucide (ISC) restent les seuls paquets visuels utilisés.

Lot 2a : schéma de l’analyse d’eau original, dessiné en SVG dans `src/panels/ConstructionPanel.tsx`. Courbes des relevés calculées à partir des états observés du moteur, sans donnée externe. Aucune nouvelle ressource téléchargée.

Lot 2b : diagramme de chaîne logistique et graphique de trésorerie originaux (HTML/SVG), icônes Lucide déjà créditées. Aucune nouvelle ressource externe.

Lot 2c : illustration de l’encyclopédie originale en SVG (`src/RealismGuide.tsx`), courbes du journal issues des relevés du jeu. Pas de nouvelle ressource tierce ; icônes Lucide sous ISC.

| Ressource ajoutée au lot 3a | Auteur / provenance | Licence / statut | Source / date |
| --- | --- | --- | --- |
| Ambiances d’eau, oiseaux saisonniers, pluie et vent ; clic, ouverture, validation, erreur, caisse, nourrissage, camion, chantier, alerte et célébration | Créations originales du projet par synthèse Web Audio (oscillateurs et bruit déterministe filtré) | Aucune captation, banque de sons ou ressource tierce. Créations du dépôt. | `src/audio/mixer.ts`, 7 octobre 2026 |
| Musique générative, trois phrases harmoniques calmes | Composition algorithmique originale du projet | Aucun morceau ni échantillon tiers | `src/audio/mixer.ts`, 7 octobre 2026 |

La synthèse est un choix délibéré pour garder le portable autonome : aucun téléchargement audio n’a été tenté ou bloqué. Budget des fichiers audio intégrés : **0 octet** ; le synthétiseur fait partie du JavaScript mesuré dans le portable. Les signaux sont produits en mémoire après une interaction du joueur, jamais au chargement automatique.

Lot 3b : illustrations des cartes d’événement (relief, onde et feuilles en SVG/CSS) originales, créées dans le dépôt ; pictogrammes Lucide déjà recensés ci-dessus. Aucune ressource externe supplémentaire. Sources : `src/panels/EventCard.tsx`, `src/hud/time-events.css` (07/10/2026).

Lot 3c : bilans, tableaux et prévision sont des composants originaux du projet, calculés localement depuis les états du moteur. Aucune nouvelle ressource externe, police, texture ou piste sonore.

Lot 4a : portraits WebP (640 × 300) générés localement par `scripts/render-portraits.mjs` / `src/world/portraitScene.ts` à partir des trois modèles originaux de `src/fish3d.ts`. Auteur : projet Les Étangs ; création originale, sans modèle, photo ni texture tiers. Palette commune de diorama dans `src/ui/tokens.css`. Bassins, cuves, végétation de rive, engin de chantier et équipements frigorifiques sont également des maillages originaux procéduraux. Date : 07/10/2026. Les deux anciennes images générées et leurs masques SVG sont retirés du jeu et du portable ; elles subsistent seulement dans l’historique Git.

Lot 4b : camions d’aliments, cuves de transport vivant et carrosseries frigorifiques, ondulations, silhouettes, gouttelettes, nuages et pluie sont des géométries/effets procéduraux originaux du projet. Aucun fichier de texture, son ou modèle externe ajouté. Sources : `src/world/LifeEffects.ts`, `src/world/WeatherScene.ts`, `src/farm3d.ts`, palette locale (07/10/2026).
