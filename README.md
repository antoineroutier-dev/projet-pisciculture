# Les Étangs · de la source au client · V3

Jeu de pisciculture solo en français et en anglais pour navigateur. La V3 commence sur un terrain sans bassin aménagé : étude de l’eau, choix d’espèce, construction, fournisseurs, élevage, récolte, chaîne du froid, livraison et paiement. La biologie conserve des cycles de plusieurs mois et des bilans d’eau horaires.

**Jouer en ligne : <https://antoineroutier-dev.github.io/projet-pisciculture/>**

Le [prompt complet exécuté pour cette refonte](docs/PROMPT-PROGRESSION.md) détaille le parcours, la logistique, la nage et les validations.

L’[audit de l’interface](docs/AUDIT-UI-STEAM.md) recense ce qui sépare la V3 d’un jeu de gestion de qualité Steam ; le [prompt de refonte UI](docs/PROMPT-UI-STEAM.md) définit les lots à exécuter. Le [lot 0](docs/ui/LOT-0.md) corrige les huit bugs préalables. Le **lot 1a** apporte les polices locales Inter/Fraunces, un plancher typographique de 12 px, les premiers composants partagés et des contrôles au clavier. Le **lot 1b** installe le monde 3D plein écran, le HUD fixe, le dock à six entrées et des panneaux de gestion provisoires. Le **lot 1c** consolide les styles et les composants partagés, avec une échelle de 80 à 150 % et un réglage de mouvement réduit dans Paramètres → Affichage. Le **lot 2a** apporte la construction depuis les parcelles et l’inspecteur à quatre onglets, avec mesures vitales fixes. Le **lot 2b** regroupe la logistique en quatre onglets et donne des axes au graphique de trésorerie. Le **lot 2c** organise le journal par mois et filtres, le guide en quatre rubriques et les objectifs après le premier cycle, avec aides scientifiques au clavier. Le **lot 3a** ajoute des ambiances et une musique originales synthétisées localement, cinq volumes, les compteurs animés et les deltas d’action dans le monde. Le **lot 3b** ajoute l’horloge progressive et les cartes d’événement. Le **lot 3c** ajoute les bilans de cycle et les onglets financiers Prévision, Mois et Cycles. Le **lot 4a** unifie les portraits et le monde en diorama, différencie les eaux et fait apparaître les équipements selon leurs travaux réels. Le **lot 4b** relie les camions, le nourrissage et la fin des travaux aux opérations réelles, avec saisons, météo et lumière animées. Le **lot 4c** ajoute les étiquettes et contours de sélection, les bâtiments/camions interactifs, les notifications, la rotation/zoom au clavier et quatre niveaux graphiques ; une perte du contexte 3D permet de reprendre sans perdre la partie. Le **lot 5a** ajoute l’écran titre, le menu pause, trois emplacements manuels et une sauvegarde automatique, avec vignette réelle et durée mesurée. Le **lot 5b** complète les paramètres, rend les raccourcis réassignables et ajoute la navigation et la caméra à la manette standard. Le **lot 5c** traduit l’interface et les messages connus du moteur en anglais, avec dates et nombres locaux et changement de langue sans quitter la partie. Le [suivi des sous-lots](docs/ui/PROGRESSION.md) détaille les validations et la suite. Les [captures et commandes de vérification](docs/ui/README.md) et les [crédits et licences](docs/CREDITS.md) documentent chaque livraison.

## Édition autonome, sans installation pour le joueur

L’édition `Les-Etangs.html` contient le jeu et ses images dans un seul fichier. Télécharger ce fichier (ou décompresser l’archive de livraison), puis l’ouvrir avec un navigateur moderne. Aucun serveur ni accès Internet n’est nécessaire pour jouer ; les liens vers les sources documentaires demandent Internet. La 3D requiert WebGL 2, avec carte de secours si indisponible.

Pour produire cette édition depuis les sources : `npm ci`, puis `npm run build:portable`. Le résultat est `portable/Les-Etangs.html` (1 829 289 octets, soit 1,83 Mo au lot 5c), distinct du build web `dist/`. Le script vérifie la limite de 15 Mo et intègre les polices locales et leurs licences.

Sur l’écran titre, choisir **Nouvelle partie**, puis les aides pédagogiques ou le mode expert ; **Continuer** reprend la sauvegarde automatique. Commencer avec **Analyser l’eau** sur la carte d’objectif, puis suivre la carte **Votre prochaine action**. La partie démarre en pause. Les sauvegardes locales peuvent être attachées au chemin du fichier selon le navigateur : utiliser **Paramètres & sauvegarde → Exporter ma partie** avant de déplacer ou remplacer le fichier.

L’ouverture directe `file://` reste à revérifier pour cette refonte. Les contrôles effectués utilisent le contenu HTML complet dans une origine locale isolée et bloquent tout chargement supplémentaire.

## Lancer

Node.js 22 ou supérieur (vérifié sous Node 24), npm ; aucun secret, service tiers ou fichier `.env`.

```bash
npm ci
npm run dev
npm test
npm run build
npm run test:e2e
```

Le serveur Vite écoute sur toutes les interfaces. `npm run preview` sert le dossier de production `dist/`. Les tests Playwright reconstruisent puis servent le build de production au port 4173 et utilisent `/usr/bin/chromium` ; `CHROMIUM_PATH` permet de changer ce chemin. Le rendu de test utilise SwiftShader lorsque le GPU n’est pas disponible. Les traces d’échec vont dans `test-results/`.

## Jouer

1. La simulation démarre en pause au 1er avril 2026 : terrain vide, bâtiments agricoles existants, 60 000 € de capital, aucun poisson ni aliment.
2. Depuis l’objectif ou **Construire**, faites analyser l’eau (240 €, 2 jours). Choisissez truite/source fraîche, carpe/étang saisonnier ou tilapia/circuit chauffé. Lancez le chantier de la parcelle choisie ; aucun ordre imposé entre parcelles.
3. Suivez la **prochaine action**. Aménagez le magasin d’aliments, commandez une réserve (livraison en 2 jours), puis les juvéniles (4 jours, transport vivant inclus). À réception, activez la distribution automatique et surveillez les 14 jours d’observation.
4. Laissez passer les mois en réapprovisionnant avant les ruptures. L’avance guidée traite chaque journée et s’arrête aux événements importants. Les réglages techniques se trouvent dans **Bassins → Eau / Alimentation / Équipement**.
5. Préparez la chambre froide (10 jours). À 80 % du calibre commercial, réservez un client pour 30 jours. La coopérative prend les poissons entiers ; les poissonneries demandent un atelier et une préparation d’un jour, avec rendement de 85 %.
6. Au calibre commercial, récoltez depuis **Logistique → Clients**. Les grands lots sont fractionnés selon les capacités du froid et du client ; les poissons restants continuent leur élevage. Le bassin entièrement vidé observe 7 jours de vide sanitaire.
7. Depuis **Logistique → Expéditions**, expédiez immédiatement les poissons entiers, ou dès la fin de préparation les poissons éviscérés. Le froid du scénario conserve au maximum 3 jours ; le transport prend 1 jour. Une rupture de financement du froid entraîne une perte. Le paiement arrive 7 jours après livraison à la coopérative, 3 jours pour les poissonneries.
8. Réinvestissez et lancez d’autres cycles ou parcelles. La ferme 3D reste visible pendant la partie. Le sélecteur de caméra permet de voir la ferme, le bassin sélectionné, les poissons ou les bâtiments. Cliquez sur une parcelle pour ouvrir son panneau, ou choisissez-la dans **Bassins** au clavier. Les poissons utilisent des trajectoires individuelles, un évitement des parois et des voisins et une ondulation continue du corps et de la queue.

**Anciennes parties :** la migration conserve vos lots et votre argent. Pour découvrir le nouveau départ, exportez votre sauvegarde puis utilisez **Paramètres & sauvegarde → Nouvelle partie**.

Le mode **réaliste avec aides pédagogiques** est activé par défaut. Le mode expert supprime les primes fictives ; les pauses de l’horloge se règlent séparément dans Paramètres → Jeu. La biologie reste identique. Le guide intégré explique chaque grandeur. Les dialogues modaux et l’onglet navigateur masqué suspendent le temps ; les panneaux du dock laissent l’horloge tourner ; il n’y a pas de progression hors ligne. Une partie rechargée revient en pause.

**Clavier :** Tab / Maj+Tab parcourent les commandes, Entrée active un bouton. Alt+C / B / L / F / J / G ouvre Construire / Bassins / Logistique / Finances / Journal / Guide. Échap ferme un panneau et restitue son focus ; sans panneau, Échap ouvre le menu pause. Les contenus des panneaux défilent au clavier sans faire défiler le document. Dans une fenêtre, le focus reste à l’intérieur ; Échap ferme la fenêtre et rend le focus à la commande d’ouverture. Les boutons de bâtiments indisponibles expliquent la raison au survol ou au focus clavier ; Échap masque l’infobulle. Les flèches gauche/droite, Début et Fin parcourent les onglets. L’échelle de l’interface (80–150 %) et le mouvement réduit se règlent dans Paramètres → Affichage. Paramètres → Audio donne cinq volumes indépendants ; le son attend votre première interaction et se suspend quand l’onglet est masqué. L’horloge propose Pause/×1/×2/×4/×8 et une avance interruptible vers le prochain événement. Espace suspend/reprend hors des boutons et champs ; 1–5 choisissent les vitesses hors des champs de saisie. Les cartes d’événement arrêtent le calendrier et proposent une prochaine action. Les commandes de manette sont décrites ci-dessous.


Les paramètres séparent **Partie**, **Affichage**, **Audio**, **Jeu**, **Contrôles** et **Langue**. Affichage permet le plein écran, les motifs daltoniens, la qualité, les étiquettes, l’échelle et le mouvement réduit. Jeu règle les pauses courantes, le mode de gestion, les conseils et la vitesse de reprise ; les urgences, premiers jalons, bilans et l’avance explicite restent des arrêts obligatoires. Une nouvelle partie commence toujours en pause. Les préférences UI V1/V2 migrent vers `les-etangs-ui-v3`, indépendamment des sauvegardes d’élevage ; l’ancienne clé est conservée.

Avec une manette standard reconnue par le navigateur : **A** active, **B** revient, **Start** ouvre la pause, **croix haut/bas** déplace le focus, **gauche/droite** règle un champ ou change d’onglet, **LB/RB** change de zone. Le stick gauche déplace la caméra, le droit la tourne, les gâchettes zooment. Un cadre visible suit le focus. Selon le navigateur, un premier clic ou une touche du clavier peut rester nécessaire pour le son et le plein écran. Le parcours est vérifié avec la Gamepad API simulée ; aucun périphérique physique n’a été testé.


**Langue :** Paramètres → Langue, depuis le titre ou une partie. Le choix est local au navigateur et conservé séparément des sauvegardes. La monnaie reste l’euro et les unités physiques restent celles du modèle. Les raccourcis ne changent pas lors du passage français/anglais. Les messages connus des anciennes parties sont adaptés à l’affichage ; les noms de parcelles, textes de licences et éventuelles notes inconnues importées restent inchangés.

## Modèle et recherche

- Installations adaptées à chaque espèce ; température d’eau distincte de l’air.
- Biomasse, densité, ration ajustable, FCR, gaspillage, croissance, jeûne et hivernage des carpes.
- Oxygène en mg/L, débit en L/s, TAN en mg N/L, NH₃-N selon température et pH ; échanges calculés chaque heure.
- Aération, biofiltre avec maturation, entretien partiel, exposition critique et mortalités.
- Travaux différés, débit de source partagé (24 L/s), suivi de lot et vide sanitaire.
- Fournisseurs, transport de juvéniles, commandes et réceptions d’aliments, capacité de stockage et équipements.
- Réservations clients, récoltes partielles, préparation, pertes, expéditions frigorifiques, créances et règlements.
- Budget de travail/eau/énergie/entretien et journal de traçabilité.
- Ferme Three.js avec bâtiments détaillés, eau, végétation et trois anatomies de poissons ; carte SVG de secours sans WebGL. Les images et textures restent locales.

Le [prompt de recherche et de réalisme V2](docs/PROMPT-REALISME.md) définit la recherche, la simulation, le rendu et la validation. Le [registre de recherche](docs/research/REALISME.md) sépare **sources effectivement consultées**, hypothèses de scénario et références métier encore bloquées par le réseau. La documentation scientifique `respirometry` et `marelac` a été consultée ; les manuels FAO identifiés n’ont pas pu être lus (HTTP 403). Les coefficients d’élevage doivent encore être confrontés à ces sources et à un professionnel.

Le rendu utilise une scène 3D persistante et des portraits d’identification rendus depuis les mêmes modèles de poissons. Le plan SVG prend le relais en cas d’indisponibilité de WebGL. Les anciennes images photoréalistes ne subsistent que dans l’historique Git. Ce n’est pas une capture documentaire ou de la photogrammétrie. Les poissons visibles sont un échantillon à échelle indicative ; l’observation sous l’eau accentue volontairement sa transparence.

## Sauvegardes

Clé locale `les-etangs-save-v5` : enveloppe V5 contenant le jeu V3 et le registre financier inchangés, plus une vignette, une date d’enregistrement et la durée visible réellement jouée. À défaut de V5, migration de V4, V3, V2 puis V1. La durée antérieure aux métadonnées reste explicitement inconnue. Le temps passé sur le titre ou dans un onglet masqué est exclu ; la planification en pause est comptée. Lots, dates, trésorerie et progression sont conservés ; les anciennes clés restent intactes. Les anciennes fermes conservent leurs bâtiments et reçoivent un magasin et une chambre froide en service pour passer au circuit logistique. Les JSON V1/V2/V3 restent importables. Les réglages d’eau V1 sont convertis en unités physiques. Une nouvelle partie est une action explicite, jamais une conséquence de la mise à jour.


Trois emplacements manuels (`les-etangs-slot-1` à `-3`) sont accessibles par **Menu pause → Sauvegarder / Charger**, avec confirmation avant remplacement. Les options JSON restent dans les paramètres et dans les options avancées des emplacements. Le titre ne réécrit aucune partie. Une modification externe de l’automatique bloque son écrasement silencieux ; les copies JSON et manuelles restent disponibles. La vignette provient d’un vrai rendu récent, ou indique son indisponibilité sans WebGL. L’enregistrement au retour au titre doit réussir ; sinon, le jeu reste ouvert et propose un export ou une sortie explicite sans sauvegarder.

Le registre observe les dépenses réelles, les recettes et les aides, avec ventilation en centimes. Les bilans décrivent les dépenses de toute la ferme entre règlements, pas un coût attribué arbitrairement à chaque bassin. Les investissements et le déficit du premier cycle restent visibles. Les données historiques absentes de V1–V3 sont marquées inconnues ; 120 mois et 24 bilans sont conservés. La projection à 90 jours garde les charges actuelles constantes et n’inclut que les factures déjà expédiées ; les commandes déjà payées ne sont pas débitées à nouveau.

Import/export JSON V1–V5 (maximum 2 Mo), validation des nombres, espèces, lots, unités et délais, reconstruction des seuls champs connus. Un import invalide conserve la partie active. Une sauvegarde locale corrompue n’est pas automatiquement remplacée ; une alerte permet une récupération explicite. En cas de stockage plein ou interdit, l’export manuel reste disponible. Une sauvegarde est propre au domaine et au port du navigateur, sans synchronisation distante.

## Architecture

| Fichier | Rôle |
| --- | --- |
| `src/game.ts` | Moteur pur, espèces, bilans, actions, sauvegardes V1/V2/V3 |
| `src/game.test.ts` | Tests physiques, biologiques, économiques et migrations |
| `src/development.ts`, `src/development.test.ts` | Étapes, fournisseurs, froid, contrats, transport, paiements et validation |
| `src/panels/ConstructionPanel.tsx`, `src/panels/LogisticsPanel.tsx` | Parcelles et chaîne Fournisseur → Magasin → Bassin → Froid → Camion → Client → Paiement |
| `src/hud/`, `src/world/`, `src/panels/`, `src/state/navigation.ts` | HUD, objectif unique, dock, contrôles de caméra, panneaux et état de navigation |
| `src/swimming.ts`, `src/swimming.test.ts` | Nage indépendante, orientation et limites des bassins |
| `src/i18n/{fr,en}.json`, `src/i18n/index.ts`, `src/ui/format.ts` | Catalogues locaux, `t()`, formats et adaptateur de lecture des anciens messages ; aucune réécriture des données |
| `src/controls/`, `src/state/preferences.ts` | Commandes réassignables, navigation manette et préférences d’interface V3 indépendantes |
| `src/App.tsx`, `src/GameSession.tsx` | Titre/session, horloge et orchestration des fenêtres |
| `src/state/saves.ts`, `src/state/saveSlots.ts`, `src/state/useSessionSaves.ts` | Enveloppe V5, migrations, emplacements, durée visible et écritures protégées |
| `src/panels/PondInspector.tsx`, `src/RealismGuide.tsx` | Mesures, réglages et explications pédagogiques |
| `src/FarmScene.tsx` | Caméra, interactions, cycle de vie WebGL, repli |
| `src/farm3d.ts`, `src/fish3d.ts` | Géométries, matériaux, textures et animations originales |
| `src/world/SpeciesPortrait.tsx`, `src/assets/portraits/`, `scripts/render-portraits.mjs` | Portraits locaux générés depuis les mêmes modèles que le monde |
| `src/FarmMap.tsx` | Carte accessible de secours |
| `src/ui/{tokens,foundation,dialog,game-shell}.css`, `src/panels/panels.css`, `src/world/map.css` | Jetons, composants et adaptation mobile ; anciennes feuilles supprimées |
| `src/ui/CashChart.tsx`, `src/state/financeSelectors.ts` | Courbe de trésorerie, axes et tableau de relevés ; lecture sans modifier l’historique du moteur |
| `src/ui/Button.tsx`, `src/ui/Tooltip.tsx`, `src/ui/Dialog.tsx` | Premiers composants partagés accessibles |
| `tests/game.spec.ts` | Parcours Chromium, 3D et contrôles axe |
| `tests/ui-lot1a.spec.ts`, `tests/keyboard-cycle.spec.ts` | Lisibilité sur sept états/cinq résolutions, géométrie, dialogues, axe et premier paiement au clavier seul |

React 19, TypeScript, Vite, Three.js, Lucide, Vitest, Playwright et axe. Dépendances verrouillées dans `package-lock.json`. Le moteur 3D se charge séparément de l’interface ; le titre possède une scène de présentation, remplacée par celle de la partie. Le canvas et sa caméra persistent pendant la navigation et les imports ; ses ressources sont libérées au démontage du composant. Les bassins et bâtiments sont mis à jour séparément, sans reconstruire toute la ferme. Les scènes hors écran ne sont pas animées et les préférences de mouvement réduit sont respectées.

## Publication et limites

Le workflow `.github/workflows/pages.yml` teste, construit puis déploie le jeu sur **GitHub Pages** à chaque envoi sur `main`. Il construit avec le préfixe `/projet-pisciculture/` pour que les images et les scripts fonctionnent à l’adresse du projet.

À la première publication, activer **Settings → Pages → Build and deployment → Source → GitHub Actions** dans le dépôt. Si le premier workflow a échoué avant cette activation, relancer **Actions → Publier Les Étangs → Run workflow**. Une fois le déploiement réussi, l’adresse attendue est <https://antoineroutier-dev.github.io/projet-pisciculture/>. L’activation et la réussite du déploiement distant doivent être vérifiées dans GitHub ; un commit envoyé ne prouve pas que le site est déjà en ligne.

`npm run build` reste disponible pour un hébergement statique à la racine d’un autre domaine. Publier la configuration de l’environnement cloud ne publie pas le jeu.

Ce simulateur n’est pas validé pour le dimensionnement ou la conduite d’une exploitation réelle. Maladies, traitements, reproduction, tri des tailles, nourriture naturelle d’étang, nitrites/nitrates, effluents, et fiscalité ne sont pas simulés. Froid et préparation sont des modèles de scénario, sans simulation microbiologique ni procédure réglementaire complète. Prix et coûts sont fictifs. Voir le registre de recherche pour les formules, coefficients et limites précises. Solo, sans compte, multijoueur ou sauvegarde serveur. Les contrôles automatiques d’accessibilité ne remplacent pas une évaluation complète avec des utilisateurs.

Le [prompt initial V1](docs/PROMPT.md) reste disponible comme historique de conception ; les règles V3 ci-dessus le remplacent.
