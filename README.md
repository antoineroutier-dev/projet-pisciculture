# Les Étangs · édition de terrain

Jeu de pisciculture solo en français pour navigateur, avec ferme 3D, poissons identifiables et simulation pédagogique sur des mois. La V2 remplace la croissance accélérée de la première version par une ration en kg, des bilans d’eau horaires et un calendrier annuel.

## Édition autonome, sans installation pour le joueur

L’édition `Les-Etangs.html` contient le jeu et ses images dans un seul fichier. Télécharger ce fichier (ou décompresser l’archive de livraison), puis l’ouvrir avec un navigateur moderne. Aucun serveur ni accès Internet n’est nécessaire pour jouer ; les liens vers les sources documentaires demandent Internet. La 3D requiert WebGL 2, avec carte de secours si indisponible.

Pour produire cette édition depuis les sources : `npm ci`, puis `npm run build:portable`. Le résultat est `portable/Les-Etangs.html` (environ 9,2 Mo), distinct du build web `dist/`.

Commencer par activer **Distribution automatique** dans les deux bassins peuplés, puis utiliser **Jour suivant** ou la lecture ▶. La partie démarre en pause. Les sauvegardes locales peuvent être attachées au chemin du fichier selon le navigateur : utiliser **Paramètres & sauvegarde → Exporter ma partie** avant de déplacer ou remplacer le fichier.

Le navigateur administré de l’environnement cloud bloque les URL `file://`. La vérification de l’édition autonome utilise donc le contenu HTML complet dans une origine locale isolée, en bloquant tout chargement supplémentaire ; l’ouverture directe depuis le disque n’est pas vérifiable ici.

## Lancer

Node.js 22 ou supérieur (vérifié sous Node 24), npm ; aucun secret, service tiers ou fichier `.env`.

```bash
npm ci
npm run dev
npm test
npm run build
npm run test:e2e
```

Le serveur Vite écoute sur toutes les interfaces. `npm run preview` sert le dossier de production `dist/`. Les tests Playwright démarrent Vite au port 4173 et utilisent `/usr/bin/chromium` ; `CHROMIUM_PATH` permet de changer ce chemin. Le rendu de test utilise SwiftShader lorsque le GPU n’est pas disponible. Les traces d’échec vont dans `test-results/`.

## Jouer

1. La simulation démarre en pause, au 1er avril 2026. Vous reprenez deux lots déjà avancés, 48 000 € et 500 kg d’aliments.
2. Sélectionnez **Les Saules**, lisez température/O₂/TAN/NH₃-N puis **Programmer la ration**. Activez **Distribution automatique** pour le suivi quotidien. Faites de même pour les carpes de **La Roselière**.
3. Avancez avec **Jour suivant** ou l’horloge ×1/×3/×12/×60. Une journée biologique correspond toujours à 24 h simulées ; les vitesses réduisent seulement l’attente. Surveillez aliments, débit, oxygène et charges.
4. Récoltez au calibre commercial. Respectez ensuite 7 jours de vide sanitaire avant de réintroduire un lot. Les nouveaux lots restent 14 jours en observation.
5. **Le Pré neuf** est un bassin de truites construit en 14 jours ; **Les Sources**, un circuit recirculé chauffé pour tilapias, demande 45 jours de travaux et mise en service.
6. Les vues **La ferme**, **Le bassin**, **Les poissons** et **Bâtiments** donnent accès à la visite. Glissez pour tourner, utilisez molette/pincement pour zoomer. La vue Poissons propose une planche réaliste et des modèles 3D. Les boutons de sélection sont utilisables au clavier.

Le mode **réaliste avec aides pédagogiques** est activé par défaut. Le mode expert supprime les primes fictives ; la biologie reste identique. Le guide intégré explique chaque grandeur. Fenêtres de gestion et onglets masqués suspendent le temps ; il n’y a pas de progression hors ligne. Une partie rechargée revient en pause.

## Modèle et recherche

- Installations adaptées à chaque espèce ; température d’eau distincte de l’air.
- Biomasse, densité, ration ajustable, FCR, gaspillage, croissance, jeûne et hivernage des carpes.
- Oxygène en mg/L, débit en L/s, TAN en mg N/L, NH₃-N selon température et pH ; échanges calculés chaque heure.
- Aération, biofiltre avec maturation, entretien partiel, exposition critique et mortalités.
- Travaux différés, suivi de lot, vide sanitaire, achat/vente, budget de travail/eau/énergie/entretien et journal.
- Ferme Three.js avec bâtiments détaillés, eau, végétation et trois anatomies de poissons ; carte SVG de secours sans WebGL. Les images et textures restent locales.

Le [prompt complet de refonte](docs/PROMPT-REALISME.md) définit la recherche, la simulation, le rendu et la validation. Le [registre de recherche](docs/research/REALISME.md) sépare **sources effectivement consultées**, hypothèses de scénario et références métier encore bloquées par le réseau. La documentation scientifique `respirometry` et `marelac` a été consultée ; les manuels FAO identifiés n’ont pas pu être lus (HTTP 403). Les coefficients d’élevage doivent encore être confrontés à ces sources et à un professionnel.

Le rendu combine une vue paysagère au rendu photographique, une scène 3D détaillée et une planche d’identification générée. La vue paysagère est une illustration d’ambiance fixe ; les travaux et l’état actuel sont visibles dans la visite 3D. Ce n’est pas une capture documentaire ou de la photogrammétrie. Les poissons visibles sont un échantillon à échelle indicative ; l’observation sous l’eau accentue volontairement sa transparence.

## Sauvegardes

Clé locale `les-etangs-save-v2`. Lorsqu’aucune V2 n’existe, une ancienne `les-etangs-save-v1` est migrée : lots, jours et trésorerie conservés, oxygène converti, installations incompatibles adaptées. La clé V1 d’origine n’est pas écrasée. Les anciens fichiers JSON peuvent aussi être importés. Le modèle V2 modifie l’équilibrage des anciennes parties ; celles-ci ne retrouvent pas les dotations financières d’une nouvelle partie.

Import/export JSON (maximum 300 Ko), validation des nombres, espèces, lots, unités et délais, reconstruction des seuls champs connus. Un import invalide conserve la partie active. Une sauvegarde locale corrompue n’est pas automatiquement remplacée ; une alerte permet une récupération explicite. En cas de stockage plein ou interdit, l’export manuel reste disponible. Une sauvegarde est propre au domaine et au port du navigateur, sans synchronisation distante.

## Architecture

| Fichier | Rôle |
| --- | --- |
| `src/game.ts` | Moteur pur, espèces, bilans, actions, sauvegardes V1/V2 |
| `src/game.test.ts` | Tests physiques, biologiques, économiques et migrations |
| `src/App.tsx` | Horloge, interface, fenêtres, stockage |
| `src/WaterPanel.tsx`, `src/RealismGuide.tsx` | Mesures et explications pédagogiques |
| `src/FarmScene.tsx` | Caméra, interactions, cycle de vie WebGL, repli |
| `src/farm3d.ts`, `src/fish3d.ts` | Géométries, matériaux, textures et animations originales |
| `src/FishArt.tsx`, `public/assets/species-atlas.png` | Illustration d’identification des espèces |
| `src/FarmMap.tsx` | Carte accessible de secours |
| `src/styles.css`, `src/realism.css` | Thème et adaptation mobile |
| `tests/game.spec.ts` | Parcours Chromium, 3D et contrôles axe |

React 19, TypeScript, Vite, Three.js, Lucide, Vitest, Playwright et axe. Dépendances verrouillées dans `package-lock.json`. Le moteur 3D se charge séparément de l’interface et le rendu démarre à la demande ; ses ressources sont libérées lors du changement de page. Les scènes hors écran ne sont pas animées et les préférences de mouvement réduit sont respectées.

## Publication et limites

Le workflow `.github/workflows/pages.yml` teste, construit puis déploie le jeu sur **GitHub Pages** à chaque envoi sur `main`. Il construit avec le préfixe `/projet-pisciculture/` pour que les images et les scripts fonctionnent à l’adresse du projet.

À la première publication, activer **Settings → Pages → Build and deployment → Source → GitHub Actions** dans le dépôt. Si le premier workflow a échoué avant cette activation, relancer **Actions → Publier Les Étangs → Run workflow**. Une fois le déploiement réussi, l’adresse attendue est <https://antoineroutier-dev.github.io/projet-pisciculture/>. L’activation et la réussite du déploiement distant doivent être vérifiées dans GitHub ; un commit envoyé ne prouve pas que le site est déjà en ligne.

`npm run build` reste disponible pour un hébergement statique à la racine d’un autre domaine. Publier la configuration de l’environnement cloud ne publie pas le jeu.

Ce simulateur n’est pas validé pour le dimensionnement ou la conduite d’une exploitation réelle. Maladies, traitements, reproduction, tri des tailles, nourriture naturelle d’étang, nitrites/nitrates, effluents, fiscalité et chaîne du froid ne sont pas simulés. Prix et coûts sont fictifs. Voir le registre de recherche pour les formules, coefficients et limites précises. Solo, sans compte, multijoueur ou sauvegarde serveur. Les contrôles automatiques d’accessibilité ne remplacent pas une évaluation complète avec des utilisateurs.

Le [prompt initial V1](docs/PROMPT.md) reste disponible comme historique de conception ; les règles V2 ci-dessus le remplacent.
