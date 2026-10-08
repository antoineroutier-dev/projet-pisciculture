# Prompt — Les Étangs, direction artistique « 20/20 »

Tu es directeur artistique, UI/UX designer de jeux de gestion et développeur graphique senior
(React, TypeScript, Three.js, GLSL). **Les Étangs** a déjà une interface fonctionnelle et
accessible (lots 0 à 5d), mais elle ressemble encore à une application web claire posée sur
une maquette 3D délavée. Ta mission : en faire **le simulateur de pisciculture le plus beau et
le plus agréable à prendre en main**, au niveau visuel des meilleurs jeux de gestion vendus sur
Steam. Exécute réellement ce prompt jusqu’au bout : implémente, lance, capture, regarde les
captures, corrige, teste, documente. Ne revendique rien que tu n’as pas observé.

## 0. Diagnostic de départ (captures `docs/ui/apres/lot-5d/`)

| Zone | Constat |
| --- | --- |
| Monde | Lumière de midi zénithale, ombres quasi absentes, herbe pastel uniforme, plaine vide jusqu’au bord, ciel gris sans horizon, routes en boîtes beiges à angles vifs, parcelles réduites à des rectangles de fil. |
| Eau | Aplats turquoise translucides sans profondeur, reflet, rive ni écume crédible. |
| Végétation | Arbres « boules » identiques, herbe clairsemée, aucune fleur, pierre, buisson ni lisière. |
| HUD | Barre blanche pleine largeur façon SaaS, chiffres sans icône, boutons de vitesse en grille de cases. |
| Panneaux | Formulaires blancs, `<select>` natifs, onglets gris, aucune hiérarchie visuelle de jeu. |
| Étiquettes | Bulles blanches de type infobulle web, sans pointe ni couleur d’état lisible à distance. |
| Titre | Carte blanche sur la scène ; aucune mise en scène. |

## 1. Contraintes non négociables (héritées)

- **Moteur intact** : `src/game.ts`, `src/development.ts`, `src/swimming.ts` ne changent pas.
  Aucune règle biologique, économique ou logistique modifiée. Sauvegardes V1–V6 inchangées.
- **Ressources originales** : géométries, textures et shaders procéduraux écrits dans le dépôt,
  aucun téléchargement d’asset. Polices locales existantes (Inter, Fraunces, OFL).
- **Palette centralisée** : aucune couleur hexadécimale hors de `src/ui/tokens.css`
  (test `foundation.test.ts`), aucun `!important`, aucune taille de police en `px` dans les CSS.
  Le monde 3D lit ses couleurs dans les jetons `--paint-*`.
- **Accessibilité conservée** : axe WCAG 2.1 AA sans violation, texte ≥ 12 px, contraste ≥ 4,5:1,
  focus visible, partie complète au clavier et à la manette, mouvement réduit respecté,
  aucun état transmis par la seule couleur.
- **Contrats de test** : noms accessibles, rôles, `data-testid` et classes structurelles
  (`.game-hud`, `.goal-hud`, `.game-dock`, `.world-controls`, `.management-panel`, `.hud-clock`…)
  restent valides ; aucun chevauchement HUD/objectif/panneau/dock ; monde non masqué ≥ 70 %
  panneaux fermés aux résolutions PC.
- **Performances** : la qualité **Bas** reste rendable en logiciel (SwiftShader). Les effets coûteux
  (ombres douces, bloom, étalonnage, profondeur de champ) sont réservés à Moyen/Élevé/Ultra.
- **Portable** : `npm run build:portable` reste sous 15 Mo, sans ressource distante.

## 2. Vision

> « L’heure dorée au bord de l’eau : un diorama chaud et vivant, une interface sombre et précieuse
> qui s’efface devant lui. »

Piliers :

1. **Le monde d’abord, et il doit donner envie** : lumière rasante chaude, ombres bleutées,
   profondeur atmosphérique, eau qui accroche la lumière, végétation dense et variée.
2. **Une interface de jeu, pas de formulaire** : panneaux en verre sombre teinté d’étang, filets
   laiton, icônes en médaillons colorés, grands chiffres, actions principales dorées.
3. **Lisibilité instantanée** : chaque ressource a son icône et sa couleur, chaque état son
   pictogramme, chaque bassin une étiquette en épingle visible de loin.
4. **Chaque geste est récompensé** : survol, pression, ouverture, sélection et validation ont un
   retour soigné et cohérent.

Références d’ambiance (sans copier d’élément protégé) : la lumière de *Townscaper* et
*Dorfromantik*, la densité végétale de *Timberborn*, les panneaux sombres de *Planet Zoo* et
*Cities: Skylines II*, la chaleur de *Stardew Valley*.

## 3. Barème de réception « 20/20 »

Chaque critère vaut 1 point et n’est accordé que sur preuve (capture, mesure ou test) consignée
dans `docs/ui/BILAN-VISUEL-20.md`. Un point non démontré n’est pas compté.

| # | Critère | Preuve attendue |
| --- | --- | --- |
| 1 | Lumière dorée rasante et ombres colorées, jamais de midi zénithal plat | captures Élevé + Bas |
| 2 | Ciel dégradé avec soleil, nuages peints et horizon fermé (collines, lisière) | capture plein cadre |
| 3 | Sol peint : variations d’herbe, chemins aux bords doux, terre des parcelles | capture zoom parcelle |
| 4 | Eau stylisée : profondeur, rive, reflet du ciel, scintillement, écume | capture bassin |
| 5 | Végétation dense et variée : deux silhouettes d’arbres, buissons, fleurs, roseaux, pierres | capture ferme |
| 6 | Bâtiments différenciés (toits, matériaux, silhouettes) et détails vivants (fumée, oiseaux) | capture bâtiments |
| 7 | Étalonnage et post-traitement par qualité (vignette, contraste, bloom discret) | relevé qualité |
| 8 | Thème UI sombre cohérent : jetons, verre, filets laiton, élévation | captures HUD/panneaux |
| 9 | HUD en plaques : médaillons de ressources, grands chiffres, horloge segmentée lisible | capture HUD |
| 10 | Dock de jeu : tuiles d’icônes, état actif lumineux, raccourcis visibles | capture dock |
| 11 | Carte d’objectif façon « quête » : progression visible, action dorée unique | capture objectif |
| 12 | Étiquettes du monde en épingles, couleur + pictogramme d’état, anneau de calibre | capture monde |
| 13 | Panneaux : en-tête à médaillon, onglets de jeu, cartes de contenu, contrôles natifs restylés | captures 6 panneaux |
| 14 | Contrôle de caméra en boutons-icônes segmentés, plus de liste déroulante | capture + test |
| 15 | Écran titre cinématique : logo, scène dorée, menu de jeu, vignette | capture titre |
| 16 | Fenêtres (pause, sauvegardes, paramètres, événements) dans le même langage | captures |
| 17 | Micro-interactions : survol, pression, ouverture de panneau, focus, notifications animées (désactivées en mouvement réduit) | revue CSS + test mouvement réduit |
| 18 | Mobile 390×844 aussi soigné que le PC, sans chevauchement | captures mobiles + tests |
| 19 | Accessibilité intacte : axe 0 violation, texte ≥ 12 px, clavier et manette | suite E2E |
| 20 | Aucune régression : tests unitaires, build, portable, suite E2E complète | journaux |

## 4. Sous-lots

Un commit par sous-lot, tests unitaires verts à chaque commit, captures avant/après regardées.

### Lot V1 — Système de design « Étang profond »

**V1a · Jetons et composants**

- Réécris `tokens.css` en thème sombre : surfaces vert-encre (`--surface`, `--surface-raised`,
  `--surface-muted`, `--surface-glass` translucide), encre crème (`--ink`, `--ink-muted` ≥ 4,5:1),
  action principale **laiton doré** (`--primary`, `--on-primary` sombre), eau turquoise, feuille,
  ambre, corail ; filets (`--border`, `--border-strong`), lueurs (`--glow-*`), élévations
  (`--shadow-1..3`), rayons (8/12/16/999), dégradés de panneau, anneau de focus clair.
- Jetons de médaillons par ressource (argent, aliments, eau, poisson, alerte, temps).
- Restyle tous les primitifs : `Button` (principal doré à relief, secondaire verre, discret,
  danger), `IconButton`, onglets en capsules avec indicateur, badges, jauges linéaires et
  circulaires lumineuses, interrupteurs, curseurs, **`select`/`input` natifs** (flèche dessinée,
  fond sombre, `color-scheme: dark`), barres de défilement fines, infobulles, toasts, dialogues.
- Fond `body` sombre ; plus aucun aplat blanc.

**V1b · HUD, dock, objectif, étiquettes, caméra**

- `.game-hud` devient une bande transparente de **plaques** : date (médaillon de saison, date
  Fraunces, météo), ressources (médaillon pièce/sac, grand chiffre, tendance colorée avec
  flèche), horloge segmentée avec piste et curseur actif, utilitaires en boutons ronds.
- Dock : tuiles carrées avec icône 24 px, libellé, raccourci en pastille, état actif doré lumineux.
- Objectif : carte « quête » avec ruban d’étape, barre de progression 1–9, action dorée.
- Étiquettes du monde : épingle avec pointe, pastille d’état colorée + pictogramme, anneau de
  calibre, état sélectionné doré.
- Caméra : groupe de **boutons radio iconographiques** (Ferme, Bassin, Poissons, Bâtiments) au lieu
  du `<select>`, nom accessible « Vue du terrain » conservé ; tests adaptés.
- Notifications : cartes à médaillon et liseré d’état, entrée animée.

**V1c · Panneaux, fenêtres et titre**

- Tiroir de gestion : en-tête avec médaillon d’icône du panneau, titre Fraunces, filet laiton,
  contenu en cartes, lignes de données alignées, tableaux sombres, graphique de trésorerie
  re-teinté.
- Inspecteur de bassin : quatre jauges vitales en tuiles colorées, grands nombres, portrait
  sur fond d’eau.
- Dialogues (pause, sauvegardes, paramètres, événements, bilan, succès) : verre sombre centré
  sur fond flouté, en-têtes cohérents.
- Écran titre : logo typographique doré avec ornement, scène à l’heure dorée, dégradé
  cinématique, menu vertical de jeu avec indicateur de survol, version discrète.
- Chargement : écran de marque au lieu d’une boîte blanche.

### Lot V2 — Monde « heure dorée »

**V2a · Lumière, ciel et atmosphère**

- Dôme de ciel en shader (zénith, horizon, halo solaire, disque du soleil) piloté par l’heure,
  la saison et la pluie ; brouillard accordé à l’horizon.
- Soleil rasant : l’élévation ne dépasse jamais ~50°, azimut balayant ; heure figée en
  mouvement réduit sur une fin d’après-midi lisible (et non midi).
- Lumière hémisphérique ciel/sol accordée, ombres douces (PCF doux) en Moyen et plus, intensité
  et exposition réétalonnées, mapping tonal ACES.
- Nuages peints (sprites à texture procédurale) qui dérivent.
- Post-traitement par qualité : Élevé = FXAA + étalonnage (contraste, saturation, vignette chaude) ;
  Ultra = + bloom discret.

**V2b · Terrain et horizon**

- Texture de sol peinte procéduralement (canvas) : nuances d’herbe par bruit, chemins de gravier
  aux bords irréguliers, terre des parcelles, ombres de contact peintes sous les arbres.
- Relief : collines douces en périphérie (heightfield), disparition de la plaine infinie,
  lisière forestière fermant l’horizon.
- Chemins et parcelles intégrés au sol (plus de boîtes beiges flottantes).

**V2c · Eau**

- Shader d’eau commun (bassins, étang, ruisseau) : couleur profonde/peu profonde, Fresnel vers
  le ciel, scintillement solaire, rides animées, écume de rive ; teintes par installation et
  turbidité (TAN), mode « eau claire » conservé.
- Étang de terre : berges herbeuses, roseaux en touffes, nénuphars fleuris.

**V2d · Végétation, bâtiments et vie**

- Deux silhouettes d’arbres (feuillus en grappes, conifères étagés) à dégradé de couleur, vent
  doux ; buissons, fleurs, pierres, touffes d’herbe plus denses et colorées.
- Bâtiments différenciés : ferme à tuiles terre cuite, magasin en bardage bois, chambre froide en
  panneaux blancs ; fumée de cheminée, fenêtres chaudes le soir.
- Oiseaux en vol et papillons (désactivés en mouvement réduit), sélection lumineuse dorée.

### Lot V3 — Finition, mobile et réception

- **V3a** Micro-interactions et transitions (entrées de panneaux, survol, pression, deltas),
  toutes neutralisées en mouvement réduit ; repli SVG re-teinté dans le même langage.
- **V3b** Mobile 390×844 : plaques empilées, dock compact, panneaux en feuille basse.
- **V3c** Réception : tests unitaires, build, portable, suite E2E complète, axe, captures avant/après
  aux deux résolutions de référence (1440×900, 390×844) dans `docs/ui/apres/visuel-20/`,
  relevés de qualité, `docs/ui/BILAN-VISUEL-20.md` notant chaque critère du barème avec preuve,
  README mis à jour.

## 5. Méthode de travail

1. Avant chaque sous-lot, capture l’état courant ; après, capture à nouveau et **regarde** les
   images. Corrige ce qui est laid, illisible ou incohérent avant de committer.
2. Valide à chaque sous-lot : `npm test`, `npm run build`, puis les spécifications E2E touchées.
3. À la fin : suite E2E complète, `npm run build:portable`, audit des secrets, push de la branche.
4. Le bilan distingue ce qui est démontré, ce qui est limité par l’environnement (rendu logiciel,
   absence de GPU, aucun joueur réel) et ce qui reste à faire. « 20/20 » est une note sur ce barème,
   pas une promesse de classement Steam.
