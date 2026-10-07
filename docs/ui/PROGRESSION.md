# Progression — refonte UI des Étangs

Spécification : [PROMPT-UI-STEAM.md](../PROMPT-UI-STEAM.md). Audit : [AUDIT-UI-STEAM.md](../AUDIT-UI-STEAM.md).

Les lignes ci-dessous sont les **unités exécutables, dans l’ordre**. Un lot de la spécification est terminé lorsque tous ses sous-lots sont terminés. Par défaut, une tâche ne réalise qu’une ligne. Le 7 octobre 2026, l’utilisateur a explicitement demandé de continuer tous les lots jusqu’à la fin : la suite conserve cet ordre et un commit validé par sous-lot. Les découpages séparent des changements vérifiables en conservant toutes les fonctions de jeu entre deux PR.

Avant chaque tâche : récupérer `main`, vérifier dans le code les lignes marquées « terminé », puis choisir la première autre ligne. Si une réalisation manque, s’arrêter et le signaler. Ne jamais régénérer `avant/`.

Critères communs : moteurs et règles inchangés ; V1/V2/V3 et import/export conservés ; quatre commandes de validation vertes ; portable autonome ≤ 15 000 000 octets ; ressources recensées ; clavier, mouvement réduit et axe conservés ; captures uniquement des écrans modifiés en 1440×900 et 390×844, JPEG/WebP, ≤ 5 000 000 octets par sous-lot. Les PNG du lot 0 restent les références historiques, pas un modèle à reproduire.

| Lot | Statut | Objectif | Critères de fin propres au lot | Fichiers concernés (existants ou à créer) |
| --- | --- | --- | --- | --- |
| **0** | **terminé** | Huit bugs préalables : portraits, carte, mobile, formats, textes, Inter locale, HUD persistant | Commit `0da1338`, présent dans `main` via `a9cc57e` ; 48 tests unitaires, 14 E2E ; [bilan](LOT-0.md). Présence vérifiée le 07/10/2026, fichiers identiques au commit du lot 0. | `App.tsx`, `ProjectPanel.tsx`, `FarmMap.tsx`, `FishArt.tsx`, styles, `ui/format.ts`, portable, tests, captures |
| **1a** | **terminé** | Typographie locale, lisibilité et composants de base | Fraunces + Inter embarquées avec licences ; jetons sémantiques et échelle en rem ; aucun texte visible calculé < 12 px dans les vues et fenêtres existantes, y compris les libellés de carte après mise à l’échelle ; nombres de ressources du HUD ≥ 18 px ; Button/Tooltip/Dialog partagés et utilisés ; adaptations mobiles ; tests des polices hors ligne, du clavier et d’axe ; captures compressées. | `src/ui/{tokens.css,foundation.css,Button.tsx,Tooltip.tsx,Dialog.tsx}`, `main.tsx`, styles existants, `App.tsx`, `ProjectPanel.tsx`, `FarmMap.tsx`, tests UI, portable, crédits |
| **1b** | **terminé** | Monde plein écran persistant, HUD et dock | Un canvas monté une fois pendant la partie, repli sans WebGL ; surface ≥ 70 % aux trois tailles PC et aux sept états ; pas de défilement du document ; ressources/date/temps/objectif toujours visibles ; dock à six entrées, navigation clavier ; suppression sidebar/en-têtes/stats/objectifs dupliqués ; avertissements déplacés dans Guide → À propos du modèle. Les commandes V3 restent accessibles dans des panneaux provisoires. | `App.tsx`, `src/world/`, `src/hud/`, `src/state/`, `FarmScene.tsx`, styles, Guide, tests |
| **1c** | **terminé** | Finaliser la bibliothèque et consolider les styles | Drawer, Tabs, Toast, Stepper, Card, Badge, Gauge, Sparkline, CountdownChip, ResourcePill, SegmentedControl, Slider, Toggle et IconButton utilisés selon les besoins ; raisons de désactivation partout ; styles par composant ; suppression des trois feuilles concurrentes et de `!important` ; palette UI exclusivement en jetons ; échelle 80–150 % avec plancher 12 px et mouvement réduit. La palette des modèles est traitée en 4a. | `src/ui/`, `src/hud/`, `src/panels/`, anciennes feuilles CSS, tests statiques et géométriques |
| **2a** | **terminé** | Inspecteur et construction depuis le monde | Sélection parcelle → espèce/eau/coût/délai/débit ; résultat d’analyse illustré ; inspecteur avec mesures vitales visibles, seuils textuels, courbes glissantes, estimation de croissance, action contextuelle et onglets ; urgence pilotée par React ; aucun contrôle de bassin dupliqué. | `src/panels/`, `src/world/`, `WaterPanel.tsx`, `ProjectPanel.tsx`, sélecteurs de lecture testés |
| **2b** | **terminé** | Chaîne logistique et finances | Tiroir Approvisionnement/Bâtiments/Clients/Expéditions, chaîne visuelle et échéances ; boutique unique ; toutes les commandes V3 accessibles ; prix/clients fusionnés ; graphique de trésorerie avec axes. Prévisions détaillées et bilan par cycle en 3c. | `src/panels/`, `ProjectPanel.tsx`, `App.tsx`, composants de graphiques, tests de cycle |
| **2c** | **terminé** | Journal, Guide et nettoyage des doublons | Journal groupé par mois et filtrable, bilans hebdomadaires repliables ; encyclopédie et infobulles scientifiques ; « À propos du modèle » complet ; budget de texte réduit, parcours non régressif après paiement ; XP et verrous décoratifs retirés de l’UI ; aucun accès V3 perdu. | `src/panels/`, `RealismGuide.tsx`, `src/hud/`, sélecteurs, tests |
| **3a** | à faire | Audio et retours immédiats | Web Audio avec cinq volumes, démarrage au geste, suspension onglet masqué, ambiance/musique générative ou sous licence ; sons et retours visuels par action < 100 ms instrumentés ; compteurs et deltas ; budget audio ≤ 3 Mo ; réduction des mouvements. | `src/audio/`, `src/state/`, `src/hud/`, effets du monde, crédits, tests |
| **3b** | à faire | Horloge, événements et célébrations | Pause/×1/×2/×4/×8, Espace et 1–5, progression du jour ; avance au prochain événement interruptible ; cartes d’arrêt guidé avec vraies actions moteur ; célébrations des cinq jalons avec priorité et fermeture accessibles. Documenter l’ambiguïté des durées de la spécification sans changer le moteur. | `src/state/`, `src/hud/`, `src/panels/`, `src/world/`, tests horloge/événements |
| **3c** | à faire | Bilan de cycle et prévisions | Montants concordant avec le moteur, postes de coût, marge/kg, comparaison et trois conseils calculés ; explication des investissements et pertes ; projection à 90 jours sans double comptage des commandes payées ; résultat mensuel. Toute persistance indispensable exige version, migration et tests ; les données anciennes inconnues sont signalées. | `src/state/`, sélecteurs/ledger en lecture, panneaux Finances/bilan, migrations si nécessaires, tests |
| **4a** | à faire | Direction artistique et infrastructures | Portraits issus des modèles originaux ; eaux distinctes, végétation de rive, parcelles et chantiers ; magasins/froid/atelier reflétant l’état ; palette du rendu centralisée ; mises à jour incrémentales sans reconstruction complète ; licences et suppression du code visuel mort. | `farm3d.ts`, `fish3d.ts`, `FarmScene.tsx`, `src/world/`, `FishArt.tsx`, tokens, crédits |
| **4b** | à faire | Logistique visible, vie, saisons et météo | Camions synchronisés avec les vrais événements ; nourrissage visible ; silhouettes/ondulations ; effets saisonniers, pluie/brume/nuages et lumière ; mouvement réduit ; captures des saisons hors dépôt sauf sélection ≤ 5 Mo. | `src/world/`, `farm3d.ts`, `FarmScene.tsx`, tests états/saisons |
| **4c** | à faire | Caméra, sélection et performances | Contours/étiquettes et survol lisibles ; zoom borné, recentrage, rotation clavier ; quatre niveaux de qualité et détection initiale ; mesures réelles de FPS par niveau ; aucune fuite au démontage ; contrôle final de la palette hors tokens, sans altérer les règles du moteur. | `src/world/`, `FarmScene.tsx`, paramètres graphiques, tests et rapport de mesures |
| **5a** | à faire | Écran titre, pause et sauvegardes | Continuer/Nouvelle/Charger/Paramètres/Crédits ; survol de fond ; menu Échap ; trois emplacements manuels + automatique, vignettes/date/cash/durée ; import/export avancé et migrations testées ; sortie vers titre libérant le rendu. | `src/panels/`, `src/state/`, `src/world/`, migrations, tests |
| **5b** | à faire | Paramètres complets et manette | Affichage/audio/jeu/contrôles ; raccourcis réassignables et sensibilité ; Gamepad API, navigation au focus, caméra au stick et invites ; cycle entier au clavier puis manette simulée en 1280×800 ; aucune perte d’accessibilité. | `src/state/`, paramètres, contrôles, `src/world/`, tests périphériques |
| **5c** | à faire | Français et anglais complets | Chaînes extraites en JSON, `t()` léger, nombres/dates localisés, anglais relu sur toutes les vues/événements ; adaptation des messages du moteur sans altérer les données ; zéro débordement aux deux langues. | `src/i18n/`, interface complète, tests langues |
| **5d** | à faire | Succès, tutoriel et réception finale | Adaptateur plateforme web sans effet, 12 succès dérivés ; tutoriel interactif passable/rejouable sur éléments réels ; objectifs d’exploitation ; réception complète section 13, documentation Steamworks/bureau sans revendiquer une publication Steam. | `platform.ts`, tutoriel, sélecteurs, Guide, tests complets, README, bilan |

## Lot 1a — journal de cette tâche

Base : `main` à `a9cc57e`. Périmètre volontairement limité à la première ligne non terminée. Aucune capture « avant » régénérée. Le monde persistant (1b), la migration complète de la palette et des composants (1c/4a) ne sont pas inclus dans 1a : il ne faut pas déclarer le lot 1 global terminé après cette tâche.

Réalisations :

- Inter conservée ; Fraunces Latin 400/600 ajoutée via `@fontsource/fraunces` 5.3.0. Licence OFL 1.1 vérifiée dans le paquet, copiée dans `docs/licenses/` et intégrée au portable. Aucune nouvelle image, texture ou ressource sonore.
- Jetons sémantiques, échelle 12/14/16/20/24/32/44 en rem avec plancher physique ; nombres du HUD à 20 px ; chiffres tabulaires ; titres Fraunces et interface Inter. Remplacement des tailles dispersées dans les trois anciennes feuilles et adaptation des grilles mobiles.
- `Button`, `Tooltip` et `Dialog` partagés. Les achats de bâtiments expliquent leur indisponibilité au survol ou au clavier, y compris avec un bouton désactivé. Les dialogues piègent le focus, se ferment avec Échap et restituent le focus après retrait de `inert`, y compris sous StrictMode. Infobulles survolables et fermables avec Échap.
- Noms de parcelles HTML au-dessus du SVG : 12 px physiques même sur mobile ; position initiale mesurée avant affichage. Le lecteur d’écran conserve les statistiques dans le nom du bouton. Carte de secours dégagée de ses superpositions 3D ; message de repli exact.
- Retours à la ligne des unités d’eau, portraits du marché conservés sur mobile, séparation des contrôles de visite et de sélection. Contrastes des paramètres et de la confirmation de nouvelle partie corrigés.
- Moteurs `game.ts`, `development.ts`, `swimming.ts` inchangés. Ni champ de sauvegarde, ni migration supplémentaire. Les références `avant/` et les fixtures existantes sont inchangées.

Mesures observées le 07/10/2026, Node 24.19.0, Chromium 151.0.7922.173 sous Linux, rendu logiciel SwiftShader :

| Mesure | Résultat / portée |
| --- | --- |
| Portable | **10 185 132 octets (10,19 Mo)**, limite 15 000 000 octets |
| Texte | **12 px minimum** dans les **210 combinaisons** des 7 états × 6 vues × 5 tailles, ainsi que les fenêtres et vues 3D vérifiées ; ressources du HUD **20 px**. Le test d’échelle 80 % conserve le plancher 12 px ; aucun réglage joueur d’échelle n’est encore ajouté. |
| Captures | **24 JPEG, 1 582 126 octets**, fenêtres exactement 1440×900 ou 390×844. [Manifeste](apres/lot-1a/manifest.json). Toutes inspectées ; les images intermédiaires ont permis de corriger le marché mobile, les superpositions, les unités et la position des libellés de secours. |
| Validation | Unitaire : **49 passed (49)**, 5 fichiers ; build web : **1610 modules transformed**, **built in 12.03s** ; portable : **10.19 MB** ; E2E : **26 passed (9.2m)**, aucun test ignoré ni flaky. |
| Axe WCAG 2.1 AA | **0 violation** dans les six vues, paramètres, commandes de juvéniles, équipement, objectifs, construction, confirmation de nouvelle partie et observation des poissons, selon la couverture PC/mobile des tests. |
| Clavier | Cycle entier en **1280×800**, **0 événement de pointeur**, premier règlement à **J192**, **453,989 kg vendus**, **0 mortalité**, sauvegarde identique après rechargement. Focus des dialogues et infobulles vérifié séparément. |
| Réseau | **0 requête supplémentaire** après le chargement du portable dans une origine isolée, polices/images chargées et passage au jour suivant. Zéro requête externe dans les cinq tests HUD/portraits/ration. |
| Images par seconde | **Non mesurées dans ce sous-lot.** Aucun niveau de qualité ajouté ; mesures prévues en 4c. |

Les [mesures détaillées](verification/lot-1a/measures.json) conservent les 210 relevés et le parcours clavier. Les sorties brutes des quatre commandes sont dans [verification/lot-1a/](verification/lot-1a/). Le build Vite avertit que le morceau Three.js dépasse 500 Ko ; ce n’est pas une erreur de compilation.

Historique des vérifications : la première série ciblée a relevé deux défauts de contraste, corrigés puis vérifiés. La première série complète a terminé avec 25 tests réussis et un échec d’artefact `ENOENT` : un autre lancement Playwright partageait son dossier `test-results`. La relance finale complète, **26/26**, a utilisé un seul lancement Playwright. Les sorties finales conservées ne doivent pas être confondues avec ces essais intermédiaires.

Écarts et limites conservés :

- **Le lot 1 global reste partiel.** Les pages, la sidebar, le défilement du document, les duplications et les avertissements scientifiques actuels restent à reprendre en 1b/2. Le critère « monde ≥ 70 % et aucun défilement » n’est pas revendiqué ici.
- Les trois feuilles historiques contiennent encore des couleurs littérales et des `!important`. Le contrôle statique couvre les nouvelles feuilles UI et l’absence de tailles px dispersées ; la consolidation globale de la palette UI est en 1c, celle des modèles en 4a.
- Les raisons de désactivation ne sont généralisées qu’aux boutons de bâtiments migrés. Le reste de la bibliothèque, le réglage 80–150 %, les nouveaux raccourcis temporels, les tiroirs, l’audio, les événements, l’unification artistique, la manette et l’anglais restent à faire selon le tableau.
- La validation d’accessibilité automatisée ne constitue pas un audit humain complet. La manette n’est pas testée dans 1a ; la vérification hors ligne utilise une origine isolée avec toutes les requêtes suivantes bloquées, sans nouvelle vérification directe de `file://`.

**Reprise exacte : Les Étangs – lot 1b**, après fusion de cette PR dans `main`. Aucun travail du lot 1b n’a été commencé.


## Lot 1b — monde persistant et navigation

Base : `main` à `f7b23ac` (fusion du lot 1a vérifiée, même arbre que `1ea7e8a`). Les règles, les sauvegardes et les fixtures historiques restent inchangées. Aucun fichier de `avant/` régénéré.

Réalisations :

- Canvas plein écran conservé pendant la navigation, l’ouverture des dialogues et les imports ; caméra conservée. Le mode SVG devient exclusivement le repli en cas d’indisponibilité de WebGL. La scène mémorise ses entrées pour ne pas redessiner sous mouvement réduit lors d’une simple ouverture de panneau ; deux images stabilisent un changement avant de figer le rendu. Le cadrage d’observation s’adapte à la largeur et la fiche mobile laisse le poisson visible.
- HUD fixe avec date, saison, météo, trésorerie et variation quotidienne, aliments et autonomie, jauge, alertes, sauvegarde et horloge. Objectif unique et parcours repliable. Après paiement, le parcours initial disparaît ; les objectifs d’exploitation détaillés suivent en 2c/5d.
- Dock Construire/Bassins/Logistique/Finances/Journal/Guide. Alt+C/B/L/F/J/G, Échap, focus de titre à l’ouverture et restitution à la fermeture. Contenus défilants atteignables au clavier. Le document reste fixe ; les panneaux mobiles s’adaptent à la hauteur mesurée du HUD et de l’objectif.
- Sélection d’un bassin depuis la 3D ou via un sélecteur clavier unique. Les corps V3 restent provisoires dans des panneaux : toutes les actions sont conservées, une seule boutique d’aliments, prix regroupés avec Logistique, comptes dans Finances. La prochaine étape urgente ouvre les réglages d’eau par état React.
- Suppression effective du DOM de la sidebar, des en-têtes de page, du pied de page, des statistiques et objectifs répétés et des onglets de parcelles. Les avertissements scientifiques figurent dans Guide → À propos du modèle. L’illustration paysagère fixe n’est plus embarquée ; aucune nouvelle ressource externe.

Limites de ce sous-lot : les corps de panneaux et anciennes feuilles CSS restent à consolider dans 1c/2 ; les vitesses ×1/×3/×12/×60 existantes sont conservées jusqu’à 3b ; les bâtiments et la direction artistique relèvent du lot 4. La surface du canvas et la surface du monde non couverte par les panneaux sont deux mesures distinctes ; la seconde est relevée avec les panneaux fermés.

Historique de validation : les premiers essais ont relevé une région défilante non atteignable au clavier, la largeur du dock à 1280 px et un chevauchement de l’observation des poissons sur mobile. Corrigés avant la relance complète. Le test d’alignement du repli attend désormais la stabilisation du redimensionnement. Les captures attendent la disparition automatique du toast d’import, pour éviter une course avec son bouton de fermeture. Les essais partiels et interrompus ne sont pas une validation finale.


Validation finale du 07/10/2026 : **49 tests unitaires / 5 fichiers**, build **1616 modules, 6,20 s**, portable **4 810 233 octets**, **30 E2E réussis en 10,8 minutes**, aucun ignoré ni instable. La suite utilise désormais le build de production servi par Vite Preview. Les deux derniers défauts étaient une mesure avant stabilisation du redimensionnement et une restitution différée du focus ; corrigés puis vérifiés sur la suite entière.

Mesures : **12 px minimum dans 210 combinaisons**, nombres du HUD **20 px**, **0 violation axe** dans les vues et fenêtres couvertes. Canvas **100 %** de la fenêtre ; monde visible panneaux fermés **85,76 % à 1920×1080**, **80,07 % à 1440×900**, **75,98 % à 1280×800** (minimum parmi sept stades). Cycle complet au clavier réussi sans événement de pointeur ; portable sans requête après chargement. **28 JPEG, 2 218 353 octets**, aux deux dimensions prescrites, tous inspectés. Les FPS ne sont pas mesurées dans ce sous-lot.

Preuves : [sorties et mesures](verification/lot-1b/measures.json), [captures](apres/lot-1b/manifest.json). Aucune nouvelle ressource ni migration. Prochain sous-lot : **1c** ; poursuite autorisée dans cette même tâche.


## Lot 1c — bibliothèque et styles

Réalisations validées. Suppression de `styles.css`, `realism.css` et `progression.css` ; styles séparés entre fondations/primitives, dialogues, panneaux, carte et disposition du monde. Les couleurs de l’interface viennent des jetons sémantiques, sans `!important`. La palette historique des modèles et du SVG de repli reste prévue au lot 4a ; les trois couleurs d’identification stockées dans le moteur ne sont pas modifiées.

Composants partagés utilisés : Drawer pour les panneaux, Tabs pour les paramètres, Toast pour les notifications, Stepper pour le parcours, Card pour le Guide, Badge pour l’état du bassin, Gauge linéaire pour la densité et circulaire pour le calibre, Sparkline pour la trésorerie, CountdownChip pour les livraisons, ResourcePill pour le HUD, SegmentedControl/Slider pour l’affichage, Toggle pour la distribution et IconButton pour les commandes secondaires. Tous les boutons désactivés passent par Button et donnent une raison accessible au clavier.

Échelle 80–150 % et mouvement réduit dans Paramètres → Affichage. Préférences locales versionnées indépendamment de la sauvegarde biologique ; aucune modification de schéma du jeu. Le rendu écoute aussi les changements de préférence système pendant la partie. Les durées et transformations CSS respectent le réglage.

Les contrôles ciblés ont passé les six panneaux à 80, 100 et 150 % en 1440×900 et 390×844, sans chevauchement de leurs enveloppes ni sortie de fenêtre, avec plancher 12 px et axe sans violation à 150 %. Les tests de polices vérifient désormais la graisse 600 effectivement utilisée pour les titres Fraunces ; leur première exécution vérifiait une graisse 400 devenue inutilisée.


Inspection des 22 captures PC/mobile : la première série a révélé des libellés qui dépassaient les boutons à 150 %. Le dock s’élargit maintenant avec la typographie et « Jour suivant » se replie sur mobile. Un test mesure le rectangle du texte lui-même, en plus de l’enveloppe des panneaux. Série corrigée réinspectée : **22 JPEG, 1 596 990 octets**. Une première validation complète a été interrompue pendant le premier test pour intégrer cette correction ; elle ne compte pas comme réussite.


Validation finale du 07/10/2026 : **50 tests unitaires dans 6 fichiers**, build web réussi, portable **4 755 521 octets**, **32 E2E réussis en 10,4 minutes**, aucun ignoré ni instable. La première suite complète avait 30 réussites et deux assertions obsolètes (graisse 400 au lieu de 600 dans le portable ; comparaison de la chaîne « 0s » au lieu de vérifier chaque durée nulle). Corrigées, puis suite entière relancée avec succès.

Mesures : **12 px minimum** sur les 210 combinaisons historiques et **36 combinaisons supplémentaires** de panneau/échelle/résolution ; ressources du HUD ≥ 18 px. **0 violation axe** dans les vues/fenêtres et les six panneaux à 150 % couverts par les tests. Le portable ne demande aucune requête supplémentaire après chargement. Tous les parcours de migration/import/export et le cycle clavier sont verts. Les mesures du monde, les relevés d’échelle et les sorties complètes figurent dans [verification/lot-1c/](verification/lot-1c/measures.json). Les [22 captures](apres/lot-1c/manifest.json) ont été inspectées ; budget 1,60 Mo.

Limites : la palette 3D/SVG est encore historique (4a), les paramètres complets sont en 5b, les contenus de panneaux sont repris en 2, l’audio et les retours animés en 3. FPS non mesurées avant 4c. Le contrôle hors ligne utilise une origine isolée, pas encore une ouverture directe `file://`. Le lot 1 est désormais terminé ; prochain sous-lot : **2a**, dans cette même tâche.

## Lot 2a — construction dans le monde et inspecteur

Implémentation : sélection d’une parcelle par clic dans la scène ou sélecteur clavier, fiche unique eau/espèce/coût/délai/débit et lancement du chantier sans fenêtre supplémentaire. L’analyse achevée ouvre un schéma original de la source et de l’étang ; les sauvegardes déjà analysées n’ouvrent pas cette carte à chaque chargement.

L’inspecteur remplace l’ancien panneau Bassins et `WaterPanel.tsx`. Quatre mesures chiffrées restent dans son en-tête fixe : température, oxygène, NH₃-N et densité, avec unités, état écrit et infobulle. Seuils, courbes des quatorze derniers jours observés et estimation de croissance accompagnent les onglets Eau, Alimentation, Équipement et Historique. Les données manquantes ne sont pas inventées ; l’import et la nouvelle partie effacent les relevés de cette session. Le froid qui arrête la croissance n’est pas présenté à lui seul comme une maladie. Les actions contextuelles remplacent les boutons inactifs sans utilité ; distribution manuelle masquée quand l’automatique est activée. Une urgence ouvre l’onglet Eau par état React.

Les disponibilités de construction, commande, entretien et actions contextuelles interrogent la fonction pure du moteur sans appliquer le résultat hypothétique. Les sélecteurs sont testés ; aucun changement des trois fichiers de règles ni du format de sauvegarde. Les graphiques du bassin sont des relevés de session, non une nouvelle base scientifique ou une reconstitution rétroactive.

Inspection des premières captures : les noms complets des mesures se coupaient à 150 %, remplacés par les libellés usuels « Temp. » et « O₂ », tout en conservant leur nom complet pour les lecteurs d’écran et les infobulles. Les contrôles de dimensions portent sur les valeurs réellement affichées dans l’en-tête fixe. Validation finale à consigner ci-dessous.

La première suite complète a relevé une violation ARIA sur la trace infinitésimale de NH₃-N de la sauvegarde « élevage » : JavaScript la sérialisait en notation exponentielle, refusée par `aria-valuenow`. Correction de présentation dans Gauge (six décimales, au-delà de la précision affichée), sans altérer la concentration du moteur ; test de non-régression sur cette valeur. Les contrôles clavier et les 210 relevés typographiques avaient réussi dans cette première série.


Validation finale : **54 tests unitaires dans 8 fichiers**, build web **1622 modules, 5,24 s**, portable **4 757 563 octets**, **35 E2E réussis en 12,0 minutes**, zéro ignoré ou instable. La suite détecte désormais aussi les tests de composants `.test.tsx`. La première série avait 34 réussites et une violation ARIA ; le test ciblé a ensuite réussi, puis la suite entière a été relancée.

Mesures : **12 px minimum**, 210 combinaisons historiques et 36 d’échelle, **0 violation axe** dans les vues/fenêtres et les quatre onglets du nouvel inspecteur couverts ; urgence en faible oxygène également vérifiée. Canvas 100 % ; monde non recouvert, panneaux fermés, au moins **76,47 %** aux tailles PC. Cycle clavier, imports/migrations et portable hors réseau réussis. **22 JPEG, 1 753 183 octets**, toutes inspectées, en 1440×900 et 390×844. Les corrections finales d’ARIA et de pluriel accessible ne changent pas leur rendu visuel. [Mesures et sorties](verification/lot-2a/measures.json), [captures](apres/lot-2a/manifest.json).

Limites : les courbes conservent seulement les observations de la session, au maximum quatorze jours ; l’estimation de croissance utilise la croissance de la veille, sans promesse de date. Les bâtiments et chantiers conservent encore leur rendu historique, à reprendre au lot 4. FPS non mesurées ; test hors ligne sur origine isolée, pas encore `file://`. Aucun nouveau champ de sauvegarde. Prochain sous-lot : **2b**.

## Lot 2b — logistique et trésorerie

Implémentation : quatre onglets Approvisionnement/Bâtiments/Clients/Expéditions, reliés par les sept étapes de la chaîne. Le diagramme reflète les commandes, stocks, bassins occupés, froid, transports, contrats et cycles réglés ; ses boutons ouvrent le détail concerné. Il est repliable, ouvert au départ sur PC et fermé au départ sur mobile après inspection du premier rendu, qui masquait les commandes sous le diagramme.

Une seule boutique d’aliments, commandes de juvéniles, travaux, réservations/annulations, récolte, préparation et expédition conservés. Disponibilité demandée au moteur pur, sans recopier ses règles. Les tâches guidées ouvrent l’onglet utile ; une récolte bascule le tiroir sur Expéditions. Dates et comptes à rebours distinguent livraison, péremption et encaissement. Les prix des espèces se trouvent avec les clients. `ProjectPanel.tsx` et le marché détaché sont supprimés.

La courbe de trésorerie affiche axes, montants, dates et un tableau de relevés au clavier. Un sélecteur testé remplace uniquement le point courant de la courbe par la trésorerie réelle après achat, sans modifier l’historique du moteur. Les valeurs négatives et les séries constantes ont une échelle valide. Le titre promotionnel redondant de Finances est supprimé. Prévisions à 90 jours, résultat mensuel et bilans détaillés restent au lot 3c.

Premiers contrôles : 56 tests unitaires, build web, cycle clavier complet et six tests ciblés verts. Après le repli du diagramme mobile, quatre tests ciblés supplémentaires verts, couvrant ses deux états, les quatre onglets à 100/150 %, axe, le graphique et l’égalité exacte de l’expédition UI avec la commande du moteur. Le premier script de capture a rencontré un serveur de développement arrêté ; le serveur a été relancé et les captures produites, sans changer le code du jeu pour contourner le problème. Validation finale à consigner ci-dessous.


Validation finale : **56 tests unitaires dans 9 fichiers**, build web **1625 modules, 5,21 s**, portable **4 761 180 octets**, **38 E2E réussis en 13,4 minutes**, zéro ignoré ou instable. Le démarrage logiciel de la 3D a dépassé une fois les 30 secondes du script de capture ; celui-ci attend désormais explicitement la première image stabilisée avant les commandes.

Mesures : **12 px minimum**, 210 combinaisons historiques, 36 d’échelle, plus les quatre onglets logistiques à 100/150 % sur PC/mobile. **0 violation axe** dans les vues couvertes, y compris diagramme mobile déplié, quatre onglets et tableau financier. Canvas 100 %, monde visible panneaux fermés au moins 76,47 % aux tailles PC. Cycle clavier et portable hors réseau verts. **19 JPEG, 1 556 808 octets**, toutes inspectées, dimensions prescrites ; [manifestes](apres/lot-2b/manifest.json), [sorties et mesures](verification/lot-2b/measures.json).

Limites : le graphique couvre les 90 derniers relevés disponibles, avec valeur courante actualisée ; il ne reconstitue pas les périodes anciennes et n’est pas encore une prévision. Les bâtiments/camions dans la scène suivent au lot 4. Aucune nouvelle ressource externe, aucun changement des moteurs ou du schéma de sauvegarde. FPS non mesurées. Prochain sous-lot : **2c**.

## Lot 2c — journal, encyclopédie et progression

Journal groupé par mois avec filtres de type et de bassin. Les rattachements viennent des noms de bassins réellement présents dans les messages, sans inventer l’origine des événements globaux. Tous les détails sont repliables ; les bilans hebdomadaires montrent une mini-courbe des relevés encore disponibles. Les périodes anciennes sans relevé sont signalées.

Guide en quatre rubriques Pratique/Espèces/Eau et alimentation/À propos du modèle, articles dépliables, schéma original et aides contextuelles TAN/débit/FCR en plus des mesures vitales. Les limites scientifiques restent intégralement consultables dans « À propos ». Le FCR est correctement nommé « du lot » : le moteur conserve un cumul, pas un FCR journalier. Après le premier règlement, l’objectif devient la diversification puis les 5 tonnes vendues ; les urgences du moteur gardent la priorité. XP retirée de l’interface, objectifs pédagogiques et leurs vraies aides conservés. Finances est extrait du dernier composant historique supprimé. Aucun moteur ni schéma de sauvegarde modifié.

Les trois nouveaux tests ciblés passent (PC/mobile, filtres, onglets, objectifs, aides clavier, axe). Première tentative : association implicite des labels et listes d’options ambiguë pour le sélecteur de test ; labels explicites ajoutés. **26 JPEG, 2 146 556 octets**, tous inspectés aux deux résolutions prescrites. Schéma et icônes originaux/Lucide existants, aucune nouvelle ressource externe.

Écart mesuré au budget rédactionnel : à 1440×900, 7 stades × 6 panneaux ouverts sans défilement, **57 634 caractères avant / 33 982 après**, soit **−41,0 % (division par 1,70)**. Le script mesure les mots visibles à 80 %, exclut réellement les détails fermés, les zones coupées et les textes lecteurs d’écran ; comparaison avec `0da1338`, sans régénérer les captures « avant ». La division par trois demandée n’est pas atteinte sur ce protocole ; elle reste un point de réception à traiter avec le tutoriel et la réduction finale des consignes en 5d. Les descriptions d’objectif sont limitées à 140 caractères/deux lignes, les détails restent accessibles. [Mesures brutes avant](verification/lot-2c/text-before.json), [après](verification/lot-2c/text-after.json).

La première suite complète rencontre un délai de rendu de changement de caméra supérieur à 15 s sous SwiftShader ; le contrôle 3D attend désormais jusqu’à 60 s pour une image effective, sans changer l’assertion. Une relance entière est requise avant le commit.


Validation finale : **59 tests unitaires / 11 fichiers**, build **1631 modules, 5,01 s**, portable **4 770 615 octets**, **41 E2E réussis en 13,8 minutes**, aucun ignoré ou instable. La première suite complète avait 40 réussites et un dépassement de délai de caméra ; la relance entière passe, y compris ce test en 39,7 s.

Mesures : **12 px minimum**, 210 combinaisons historiques et 36 d’échelle ; **0 violation axe** sur les vues couvertes, dont quatre rubriques du Guide, filtres du Journal, objectifs et infobulles. Canvas 100 %, monde non recouvert panneaux fermés ≥ 76,47 % aux tailles PC ; cycle complet au clavier, migrations et portable sans requête supplémentaire verts. Les [26 captures](apres/lot-2c/manifest.json) sont toutes inspectées (2,15 Mo) ; [sorties et mesures](verification/lot-2c/measures.json). FPS non mesurées avant 4c ; ouverture directe `file://` non vérifiée à ce stade. Budget rédactionnel encore en écart (−41 % au protocole décrit), portraits historiques à remplacer en 4a. Prochain sous-lot : **3a**, poursuite autorisée dans cette même tâche.
