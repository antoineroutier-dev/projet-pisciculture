# Audit UI — ce qui sépare Les Étangs d’un 10/10 sur Steam

Audit réalisé le 7 octobre 2026 sur la V3 (`ee517b2`), en jouant réellement le jeu dans Chromium : 35 captures (1440×900, 1280×720, 390×844), 8 états de partie générés par le moteur (terrain vide → premier règlement client au jour 185), audit axe WCAG 2 AA et mesures automatiques du DOM et des CSS. Le prompt de correction associé est [PROMPT-UI-STEAM.md](PROMPT-UI-STEAM.md).

## Verdict

Les Étangs possède une **simulation rare** (oxygène horaire, TAN/NH₃, FCR, chaîne du froid, créances) et une interface **propre, calme et accessible**. Mais elle se présente comme **un tableau de bord SaaS ou un site pédagogique**, pas comme un jeu. Le monde vivant — la raison pour laquelle on achète un jeu de gestion sur Steam — est relégué sous la ligne de flottaison d’un seul des six onglets, derrière un clic supplémentaire. Le joueur lit des paragraphes, remplit des formulaires et attend des toasts. Il n’entend rien, ne voit presque rien bouger et ne reçoit aucune célébration après six mois de travail.

| Dimension | Note actuelle | Cible Steam « Extrêmement positives » |
| --- | --- | --- |
| Profondeur de simulation | 8/10 | conserver |
| Accessibilité technique (axe, clavier, mouvement réduit) | 7/10 | conserver, compléter (taille du texte, manette) |
| Architecture d’écran (le monde au centre, HUD) | 2/10 | monde plein écran, HUD persistant |
| Direction artistique cohérente | 3/10 | un seul style, assumé |
| Sensation de jeu (retours, animation, son) | 1/10 | chaque geste se voit et s’entend |
| Onboarding et lisibilité du texte | 4/10 | apprendre en jouant, peu de texte |
| Progression et récompenses | 3/10 | objectifs significatifs, bilans, succès |
| Finitions et standards PC (menu, options, sauvegardes, langue, manette) | 2/10 | standard Steam |

## Ce qu’il faut absolument préserver

- Le moteur pur (`game.ts`, `development.ts`, `swimming.ts`) et ses tests : c’est l’actif principal.
- Le principe « une décision à la fois » de la carte **Votre prochaine action** et l’avance guidée qui s’arrête aux événements.
- La palette ivoire / vert forêt / bleu d’eau et le ton bienveillant.
- L’honnêteté scientifique (hypothèses, sources) — mais à sa place, pas dans le HUD.
- Les sauvegardes robustes (V1→V3, import validé), l’édition portable hors ligne, axe sans violation.

## P0 — Bloquants pour un jeu commercial

### 1. Le monde n’est pas l’écran principal

- Le jeu s’ouvre sur **Mon projet**, une page de texte (capture `d_s0_project_fold`) : aucun élément visuel du domaine au premier écran.
- Dans **Mes bassins**, la carte commence à y ≈ 690 px sur 900 : elle est sous la carte d’étape (220 px) et les quatre cartes de statistiques (115 px).
- La 3D exige un clic sur **Explorer en 3D** (`FarmScene.tsx`, état `started`) et tient dans une carte d’environ 820×540 px.
- Le canvas est détruit à chaque changement d’onglet (`App.tsx:777`, rendu conditionnel `view === "ponds"`) : le monde n’existe pas en dehors d’une page.
- À 1280×720 (proche Steam Deck), seul le texte de l’étape et les statistiques sont visibles : **zéro pixel de ferme**.

### 2. Un paradigme de site web, pas de jeu

- Barre latérale à six « pages », fil d’Ariane `Mon exploitation › Mon projet`, sur-titres (`SIMULATION DE TERRAIN · ÉDITION V3`), titres ponctués d’un point décoratif (`Mon projet.`), pied de page « Faites grandir quelque chose de beau · V3.0 ».
- Pages à défilement très long : Logistique 2 928 px, Projet 2 337 px, Bassins sur mobile 2 942 px.
- **HUD non persistant** : trésorerie, date et contrôles du temps sont dans l’en-tête de page et disparaissent au défilement (`.topbar` n’est pas `sticky`, `styles.css:272`, et ne contient que le fil d’Ariane et « Partie sauvegardée »).

### 3. Doublons et systèmes concurrents

- Sélection d’un bassin à **trois** endroits : carte/3D, sélecteur `01–04` de la scène (`FarmScene.tsx:587`) et grille `pond-tabs` (`App.tsx:806`).
- Commande d’aliments à **deux** endroits avec deux présentations (Marché `App.tsx:1157` et Logistique `ProjectPanel.tsx:394`).
- **Trois** guides d’objectif simultanés : carte d’étape, bandeau « Le prochain petit pas » (`App.tsx:833`) et carte de niveau XP (`App.tsx:541`).
- **Trois** façons d’avancer le temps : lecture/vitesse, « Jour suivant », bouton d’étape « Avancer jusqu’à 14 jours ».

### 4. Aucune sensation de jeu (« juice ») ni son

- Aucun son, aucune musique, aucune ambiance (aucune occurrence d’`Audio` dans `src/`).
- Unique retour d’action : un toast de 5 s en bas de l’écran, qui remplace le précédent (`App.tsx:374-378`).
- Pas de compteur animé, de delta flottant (+1 240 €, −248 €), de transition, ni d’animation des camions, livraisons ou nourrissages dans le monde.
- **Premier cycle bouclé = une ligne de texte en 13 px** : « 1 cycle(s) réglé(s) » (`ProjectPanel.tsx:105`). Aucun écran de bilan.
- Récompenses d’objectifs dans une fenêtre, bouton « Réclamer la récompense » sous la ligne de flottaison.

### 5. Le premier cycle se termine par une perte inexpliquée

En suivant exactement la prochaine action recommandée (script automatique, lot de 800 truites), la trésorerie passe de **60 000 € à 39 912 € au jour 185** (−33 %). Le joueur « réussit » le tutoriel et finit plus pauvre, sans compte de résultat ni explication. Le graphique de trésorerie (`App.tsx:1207-1240`) n’a ni axe ni valeur et sa normalisation sur le maximum rend la chute presque plate.

### 6. Tempo du temps inadapté

- ×1 = **12 secondes par jour** (`App.tsx:370`, `12000 / speed`) ; un premier cycle de 185 jours dure plus de 35 minutes à ×1.
- Les vitesses ×1 → ×3 → ×12 → ×60 sont parcourues avec **un seul bouton** sans indication de la suivante (`App.tsx:670-680`).
- Aucun raccourci clavier (Espace, 1–4), aucune progression visible de la journée, aucun effet visuel d’accélération.

## P1 — Direction artistique

### 7. Trois styles incompatibles

1. Carte SVG plate « cartoon » (`FarmMap.tsx`).
2. 3D low-poly sans texture forte : bassins de source semblables à des piscines (margelle blanche, eau turquoise), parcelles non aménagées en simples rectangles verts, poisson 3D primitif à nageoires triangulaires plates (`d_s3_3d_fishmodel`).
3. Planches photoréalistes générées sur fond crème (`species-atlas.png`).

À cela s’ajoutent des icônes Lucide génériques. Aucun de ces styles ne domine ; l’ensemble paraît assemblé.

### 8. Bugs visuels constatés

- **Images d’espèces vides dans le Marché** : `.species-art > span` (`styles.css:1233`, prévu pour le badge « Niveau ») cible aussi le `span.species-photo` rendu par `FishArt` et le positionne en absolu en petit (`d_s3_market_full`).
- **Débordement de l’atlas** : `background-size: 100% 300%` (`realism.css:265`) laisse apparaître les nageoires du poisson voisin (dorsale du tilapia sous la carpe, nageoire de carpe sous la truite) et rogne les sujets.
- **Chevauchements sur la carte** : l’encart « Une ferme au fil de l’eau » masque l’étiquette du bassin sélectionné (« es » visible) ; « VOTRE PETIT COIN DE NATURE » passe sous le bouton « Explorer en 3D » ; les noms de parcelles traversent arbres et herbes.
- Sur mobile, la trésorerie « 47 007,08 € » passe sur deux lignes (le « € » seul à la ligne).
- Sélecteur « Ration cible » tronqué : « 100 % · recomm ».

### 9. Le monde ne raconte pas la simulation

- Les bâtiments logistiques (magasin, chambre froide, atelier) n’existent pas en 3D (aucune occurrence dans `farm3d.ts`).
- Saisons, météo et heure du jour sont simulées mais invisibles : même herbe, même lumière en avril et en décembre.
- Aucun camion d’aliments, de juvéniles ou frigorifique ; aucune éclaboussure au nourrissage ; aucune glace sur l’étang en hiver.
- Poissons à peine visibles dans la vue générale ; pas d’étiquette flottante ni d’état visible par bassin dans le monde.
- Anneau de sélection : grande ellipse blanche peu lisible.

## P1 — Typographie, couleurs, système de design

- **Inter est déclarée mais jamais chargée** (`styles.css:2`, aucun `@font-face` ni import) : la police dépend du système. Le serif est Georgia.
- **29 tailles de police** différentes ; corps de base à 14 px ; **≈ 100 nœuds de texte de moins de 12 px par écran** (mesuré : 98 sur Projet, 125 sur Bassins), jusqu’à **7 px**. Illisible à distance de canapé ou sur Steam Deck.
- Hiérarchie incohérente : titre d’étape en serif gras, titres de section en serif normal, titres de carte en sans-serif.
- **478 couleurs hexadécimales distinctes** dans les CSS pour 6 variables déclarées ; 15 `!important` ; `realism.css` et `progression.css` surchargent `styles.css`.
- Tout est vert pâle sur crème : les boutons principaux, la navigation active et les cartes ont presque le même poids ; l’état urgent n’est qu’un fond beige.
- Formats de nombres incohérents : `euro()` (`game.ts:192`) affiche « 37 113,6 € » ou « 47 007,08 € » selon la valeur ; « −0 € de charges / jour » en début de partie.

## P1 — Contenu, ton et onboarding

- **Murs de texte** : étape en 2–3 lignes, cartes de filière avec paragraphe et 4 lignes de données, Guide = 10 cartes de paragraphes, avertissements dans le HUD (« Rendu 3D en temps réel · poissons à échelle indicative · échantillon visuel du lot. », « Montants de scénario, hors foncier… »).
- Ton mélangé : titres poétiques (« À chaque jour, son festin. », « Un bassin encore plus heureux ») à côté de « NH₃-N 0,0001 mg/L » et « TAN mg N/L » sans explication contextuelle.
- Deux références temporelles : « Jour 51 » et « 21 mai 2026 » ; le journal et les échéances n’utilisent que « jour 187 ».
- Fautes générées : « Choisir tilapia du nil » (`toLowerCase` sur un nom propre, `ProjectPanel.tsx:311`), « Aménager atelier de préparation » (article manquant, `ProjectPanel.tsx:522`), « cycle(s) », « jour(s) ».
- Parcelles 1 et 3 : cartes identiques mot pour mot (« Le choix le plus direct sur ce terrain »).
- Après le premier cycle, l’étape **régresse** visuellement à « 4 · Approvisionner » et le bloc d’introduction « L’eau dessine votre ferme » reste en tête de Projet pour toujours.
- Pas de tutoriel interactif : le joueur doit lire puis chercher le bouton.

## P1 — Panneau de bassin et contrôles

- Oxygène et NH₃ — les variables vitales — sont repliés dans un `<details>` (`App.tsx:1020`) ; en urgence, l’application l’ouvre par manipulation du DOM (`App.tsx:421-426`).
- « Programmer la ration » reste proposé alors que la distribution automatique est active : contrôle redondant.
- Bouton désactivé « Laissons-les grandir » qui n’apporte rien ; boutons désactivés sans raison au survol (« Commander des juvéniles », « Demander l’aide »).
- Mesures sans jauge, sans tendance ni historique : impossible de voir l’oxygène baisser avant la crise.
- Journal : liste uniforme, même icône pour 80 % des entrées, bilans hebdomadaires répétitifs, pas de regroupement par mois ni de filtre par bassin.
- Niveaux et XP **décoratifs** : le verrou d’espèce par niveau est du code mort (toutes les espèces au niveau 1) ; les primes de 80 à 500 € sont négligeables face à 60 000 € de capital.

## P1 — Standards attendus d’un jeu PC/Steam

- Pas d’écran titre, de menu pause (Échap), d’emplacements de sauvegarde avec vignette, ni de crédits.
- Paramètres réduits au mode et à l’import/export JSON : ni volume, qualité graphique, échelle d’interface, plein écran, daltonisme, raccourcis ou langue.
- Pas de manette (Gamepad API) ni de navigation au focus pensée pour le Steam Deck.
- Français uniquement, chaînes écrites en dur dans le JSX : une version anglaise est indispensable sur Steam.
- Pas de succès (les objectifs s’y prêtent), pas de sauvegarde cloud.

## P2 — Dette technique qui freine l’UI

- `App.tsx` : 1 690 lignes, ternaires imbriqués pour titres et sous-titres de pages, fenêtres et vues dans un seul composant.
- 5 235 lignes de CSS réparties en trois fichiers qui se surchargent ; pas de jetons de design.
- Scène 3D reconstruite à chaque changement de « signature » et détruite à chaque navigation.
- Le `FishArt` SVG historique de `FarmMap.tsx` coexiste avec le `FishArt` atlas de `FishArt.tsx`.

## Les 10 priorités, dans l’ordre

1. Monde 3D plein écran persistant + HUD superposé toujours visible.
2. Supprimer la navigation web : panneaux et tiroirs au-dessus du monde, une seule entrée par fonction.
3. Système de design : jetons, polices locales, échelle typographique (≥ 12 px), composants.
4. Retours d’action : compteurs animés, deltas flottants, son, célébrations, cartes d’événement.
5. Écran de bilan de cycle et prévision de trésorerie lisible.
6. Contrôle du temps segmenté, rythme ×1 raisonnable, raccourcis.
7. Direction artistique unique : diorama stylisé, saisons, météo, bâtiments et camions logistiques visibles.
8. Panneau de bassin : jauges vitales visibles, tendances, action principale contextuelle.
9. Onboarding interactif, texte divisé par trois, avertissements déplacés dans « À propos du modèle ».
10. Standards Steam : écran titre, pause, emplacements, paramètres complets, manette, anglais, succès.
