# Prompt — Refonte de l’interface de Les Étangs au niveau d’un jeu Steam (V4)

Tu es directeur artistique, game designer UI/UX et développeur front-end senior (React, TypeScript, Three.js, Web Audio). Fais passer **Les Étangs**, simulateur de pisciculture existant dans ce dépôt, d’un tableau de bord pédagogique à un **jeu de gestion PC digne d’évaluations « Extrêmement positives » sur Steam**. Exécute réellement ce prompt : lis le projet, implémente, lance le jeu, teste, capture et documente. Ne revendique rien que tu n’as pas observé.

## 0. Avant de coder

1. Lis `README.md`, `docs/AUDIT-UI-STEAM.md` (constats et références de lignes), `docs/PROMPT-PROGRESSION.md`, puis `src/App.tsx`, `src/ProjectPanel.tsx`, `src/FarmScene.tsx`, `src/farm3d.ts`, `src/fish3d.ts`, `src/game.ts` et `src/development.ts`.
2. Lance `npm ci`, `npm test`, `npm run dev`. Génère des sauvegardes à plusieurs stades avec le moteur (terrain vide, chantier, élevage, contrat, lot au froid, expédition, cycle payé) et capture **chaque écran avant refonte** à 1920×1080, 1440×900, 1280×800 et 390×844 dans `docs/ui/avant/`.
3. Corrige d’abord les bugs du lot 0 (section 10), puis avance lot par lot (section 12). Un commit par lot, tests verts à chaque commit.

## 1. Contraintes non négociables

- **Moteur intact.** `game.ts`, `development.ts` et `swimming.ts` restent purs et indépendants de React. Ne modifie pas les règles biologiques, économiques ou logistiques. Les seuls ajouts autorisés sont des fonctions de lecture (sélecteurs, prévisions, bilans) testées. Si un champ de sauvegarde devient nécessaire (historique par bassin, emplacements), incrémente la version, écris la migration et ses tests, conserve les anciennes clés.
- **Sauvegardes** V1/V2/V3 toujours chargées ; import/export JSON conservé en option avancée.
- **Édition portable hors ligne** (`npm run build:portable`) : aucune ressource distante à l’exécution. Polices, sons, musiques et textures sont locaux et intégrés. Budget du fichier portable ≤ 15 Mo ; documente sa taille réelle.
- **Licences** : uniquement des ressources originales, CC0 ou sous licence compatible, recensées dans `docs/CREDITS.md` (titre, auteur, licence, URL, date). Aucune ressource sans licence vérifiée. Si le réseau bloque le téléchargement, génère les sons par synthèse Web Audio et consigne-le.
- **Accessibilité** : axe WCAG 2.1 AA sans violation, partie complète au clavier, mouvement réduit respecté, aucun état transmis par la seule couleur, contraste ≥ 4,5:1 pour le texte.
- **Honnêteté** : les avertissements scientifiques restent disponibles, mais dans **Guide → À propos du modèle** et les crédits, pas dans le HUD.

## 2. Vision et piliers

> « Un domaine vivant au bord de l’eau, que l’on regarde grandir saison après saison. »

1. **Le vivant au centre** : le monde 3D occupe l’écran ; l’interface flotte par-dessus et s’efface.
2. **Une décision à la fois** : un seul objectif mis en avant, les détails à un clic.
3. **Chaque geste se voit et s’entend** : toute action produit en moins de 100 ms un retour visuel et sonore, et une conséquence visible dans le monde.
4. **Lisible à un mètre** : conçu pour un écran 1080p et un Steam Deck, pas pour un formulaire web.
5. **Calme mais exigeant** : ton chaleureux, conséquences réelles, la simulation reste vraie.

Références d’ambiance (sans copier d’éléments protégés) : la lisibilité de diorama de *Dorfromantik* et *Townscaper*, le HUD discret de *Against the Storm*, la chaleur de *Stardew Valley*, les tiroirs d’information de *Planet Zoo*.

## 3. Architecture d’écran « monde d’abord »

### 3.1 Écran titre

Fond animé : la ferme en 3D vue en survol lent à l’heure dorée, eau et végétation animées, musique douce. Menu : **Continuer** (avec vignette, jour, date et trésorerie de la dernière partie), **Nouvelle partie** (choix du mode guidé ou expert, avec une phrase d’explication), **Charger**, **Paramètres**, **Crédits**. Logo typographique soigné, version discrète.

### 3.2 Écran de jeu

Un unique canvas 3D **plein écran, monté une seule fois** à la racine et jamais détruit pendant la partie. Supprime la barre latérale, le fil d’Ariane, les en-têtes de page (sur-titre, titre ponctué, sous-titre), le pied de page, les quatre cartes de statistiques répétées, le bandeau d’objectif en double et la grille `pond-tabs`. Aucun défilement de la page : seuls les panneaux défilent en interne.

HUD superposé :

- **Barre supérieure** (toujours visible) : date unique « 21 mai 2026 » avec icône de saison et météo (le numéro de jour en infobulle) ; contrôle du temps segmenté **Pause / ×1 / ×2 / ×4 / ×8** + bouton **« Jusqu’au prochain événement »** ; trésorerie en euros entiers, animée, avec tendance journalière ; aliments en kg avec **autonomie en jours** et jauge (vert/ambre/rouge + icône) ; cloche d’alertes avec compteur ; icône discrète de sauvegarde automatique qui pulse à l’enregistrement ; menu (Échap).
- **Carte d’objectif** compacte en haut à gauche : titre, une ligne de 140 caractères maximum, un bouton d’action, et le parcours en 9 étapes repliable. Après le premier cycle, ne jamais régresser : remplacer le parcours par des **objectifs d’exploitation** à long terme.
- **Dock inférieur** : Construire, Bassins, Logistique, Finances, Journal, Guide — chacun ouvre un tiroir latéral ou un panneau au-dessus du monde, avec raccourci affiché.
- **Inspecteur contextuel** à droite : apparaît quand on sélectionne un bassin, un bâtiment ou un véhicule dans le monde (section 7).
- **Pile de notifications** (3 au maximum, typées par icône et couleur, cliquables pour centrer la caméra, fermeture automatique sauf alertes critiques).
- **Étiquettes dans le monde** au-dessus de chaque bassin : nom, icône d’état (bon / attention / critique), anneau de calibre commercial ; masquables.

La carte SVG reste uniquement comme repli sans WebGL (et éventuellement comme minicarte).

### 3.3 Correspondance avec les vues actuelles

| Actuel | Nouveau |
| --- | --- |
| Mon projet (étude de l’eau, filières) | Mode **Construire** dans le monde : clic sur une parcelle → carte de chantier (espèce adaptée, eau, coût, délai, débit). L’analyse de l’eau devient le premier événement illustré avec une carte de résultats. |
| Mes bassins | Sélection dans le monde + inspecteur. |
| Logistique | Tiroir à onglets **Approvisionnement · Bâtiments · Clients · Expéditions**, construit comme une **chaîne visuelle** Fournisseur → Magasin → Bassin → Froid → Camion → Client → Paiement, avec cartes de lots et comptes à rebours. |
| Marché | Fusionné : prix et clients dans Logistique → Clients ; comptes dans **Finances**. Une seule boutique d’aliments. |
| Journal | Chronologie groupée par mois, filtres par type et par bassin, bilans hebdomadaires repliés en une ligne avec mini-courbe. |
| Guide | Encyclopédie illustrée + infobulles contextuelles « ? » + tutoriel rejouable + « À propos du modèle ». |
| Paramètres & sauvegarde | Menu pause et écran Paramètres complets (section 8). |

## 4. Système de design

Crée `src/ui/tokens.css` et une bibliothèque de composants dans `src/ui/`.

- **Couleurs** : jetons sémantiques uniquement (`--surface`, `--surface-glass`, `--ink`, `--ink-muted`, `--primary` vert forêt, `--water`, `--accent` citron vert, `--warning` ambre, `--danger` terre cuite, `--success`, `--focus`) et leurs états. Garde l’identité ivoire / vert forêt / bleu d’eau, mais crée une vraie hiérarchie : action principale nettement plus forte que la navigation et les cartes. Objectif : **aucune couleur hexadécimale hors de `tokens.css`** (vérifié par une commande `grep` dans les tests).
- **Polices locales** via `@fontsource` (licence OFL) intégrées au build et au portable : un serif d’affichage à caractère (par exemple Fraunces) pour les titres, Inter pour l’interface, `font-variant-numeric: tabular-nums` pour tous les nombres. Vérifie le chargement avec `document.fonts.check`.
- **Échelle typographique** : 12 (légendes uniquement), 14, 16 (corps), 20, 24, 32, 44 px, exprimée en `rem`. **Aucun texte sous 12 px**, nombres du HUD ≥ 18 px. Paramètre **Échelle de l’interface** 80–150 %.
- **Panneaux** : papier ou verre dépoli au-dessus du monde (`backdrop-filter`), rayon 12 px, ombre douce, marge et espacements sur une grille de 4 px.
- **Mouvement** : jetons de durée (120 / 200 / 320 ms) et d’accélération ; tout désactivé ou réduit sous `prefers-reduced-motion` et via le paramètre.
- **Composants** : Button (principal, secondaire, discret, danger ; tailles ; indication de raccourci), IconButton, Tooltip (dont **raison d’un bouton désactivé**, obligatoire), Drawer, Tabs, Dialog, Toast, Stepper, Card, Badge, Gauge linéaire et circulaire avec seuils, icône et texte, Sparkline, CountdownChip, ResourcePill, SegmentedControl, Slider, Toggle.
- **Formatage** dans `src/ui/format.ts` : `formatMoney` (euros entiers dans le HUD, deux décimales seulement pour les prix au kg), `formatKg`, `formatDate`, `formatDuration`, pluriels avec `Intl.PluralRules` — plus jamais « jour(s) » ni « −0 € ». Les noms propres ne passent jamais par `toLowerCase`.
- **Ton** : chaleureux, concret, à la deuxième personne. Termes techniques précédés d’un libellé courant (« Oxygène dissous · 9,5 mg/L ») avec infobulle explicative et seuils.

## 5. Direction artistique unifiée du monde

Adopte **un seul style** : un **diorama stylisé peint à la main**, prolongement assumé du low-poly existant (couleurs chaudes, formes lisibles, matériaux simples mais riches). Les planches photoréalistes générées ne doivent plus coexister avec ce style dans l’interface : remplace les portraits d’espèces par des **rendus des modèles 3D** (rendu vers texture ou captures intégrées) ou par des illustrations dans le même style, avec les mêmes repères anatomiques.

- **Eaux distinctes** : étang de terre trouble vert-brun avec roseaux, nénuphars et berges naturelles ; bassin de source en béton patiné avec courant visible (normales défilantes, écume à l’arrivée, chute à la sortie) ; circuit recirculé sous serre vitrée avec cuves et tuyauteries.
- **Vie dans l’eau** : ombres et silhouettes des poissons, ondulations de surface, frénésie et éclaboussures au nourrissage, poissons plus lents si l’oxygène baisse.
- **Parcelles** : terrain non aménagé avec piquets de géomètre, fanions et herbes hautes ; chantier animé (terre retournée, engin, échafaudage, panneau d’avancement) ; mise en service avec un petit effet de révélation.
- **Logistique visible** : magasin d’aliments, chambre froide (groupe frigorifique) et atelier apparaissent une fois construits ; camions d’aliments, de transport vivant et frigorifique arrivent et repartent aux événements correspondants du moteur.
- **Saisons, météo, heure** : couleur de l’herbe et du feuillage, givre et glace sur l’étang en hiver, pluie, brume, nuages ; lumière qui suit l’heure quand le temps s’écoule ; étalonnage par saison.
- **Sélection** : contour doux et étiquette flottante au lieu de l’ellipse blanche ; survol avec mise en évidence.
- **Caméra** : vue d’ensemble, recentrage animé sur un bassin sélectionné, zoom borné, rotation par pas au clavier et à la manette.
- **Qualité graphique** Bas / Moyen / Élevé / Ultra (ratio de pixels, ombres, densité de végétation, post-traitement) avec détection automatique initiale.

## 6. Sensation de jeu

- **Audio** (`src/audio/`) : gestionnaire Web Audio avec bus Musique, Ambiance, Effets et Interface, volumes dans les paramètres, coupure quand l’onglet est masqué, démarrage après la première interaction. Ambiances (eau, oiseaux selon la saison, pluie, vent), sons d’interface (clic, validation, erreur, ouverture de panneau), sons de jeu (caisse, éclaboussure de nourrissage, camion, chantier, alerte). Deux ou trois pistes musicales calmes sous licence compatible, ou musique générative. Formats compressés, budget audio ≤ 3 Mo pour le portable.
- **Retours visuels** : compteurs animés, **deltas flottants** (+1 240 € en vert, −248 € en terre cuite) partant de leur source dans le monde, pression des boutons, transitions de panneaux, pulsation de la ressource concernée.
- **Célébrations** : premier chantier terminé, premier lot reçu, première récolte, premier paiement, objectifs. Carte illustrée, son, effet de gouttelettes ou de feuilles, et bouton pour continuer.
- **Cartes d’événement** : quand l’avance guidée s’arrête (`advanceGuided(...).reason`), afficher une carte illustrée avec titre, conséquence et une à trois actions qui appellent le moteur (« Commander 100 kg », « Voir le bassin », « Continuer »), au lieu d’un toast.
- **Temps** : vitesses Pause / ×1 / ×2 / ×4 / ×8 = environ 4 s, 2 s, 1 s, 0,5 s et 0,25 s par jour (constantes d’interface ajustables, jamais dans le moteur) ; Espace pour la pause, 1–5 pour les vitesses ; « Jusqu’au prochain événement » avec effet d’accélération (ciel en accéléré) interruptible ; anneau de progression de la journée.
- **Bilan de cycle** à chaque règlement client : recettes, coûts par poste (juvéniles, aliments, travail, énergie, eau, transport, investissements), marge par kg, comparaison avec le cycle précédent, trois conseils calculés à partir des données (lot trop petit pour les coûts fixes, gaspillage d’aliment, retard de livraison…). Le premier cycle déficitaire doit être **expliqué**, jamais caché.
- **Finances** : graphique de trésorerie avec axes, valeurs et repères ; projection à 90 jours fondée sur les charges quotidiennes, commandes et factures à encaisser ; compte de résultat mensuel.

## 7. Inspecteur de bassin

- En-tête : nom, portrait d’espèce, badge d’état avec icône et texte.
- Trois grands nombres : poissons, poids moyen, biomasse.
- Anneau de calibre commercial avec estimation de durée au rythme actuel, présentée comme une estimation.
- **Jauges vitales toujours visibles** : température de l’eau, oxygène dissous, NH₃-N, densité ; seuils bon / attention / critique, icône et texte, mini-courbe sur 14 jours. Un tampon glissant non sauvegardé suffit d’abord ; un historique sauvegardé exige migration et tests.
- **Action principale contextuelle** unique selon l’état : Construire, Commander des juvéniles, Activer la distribution, Réserver un client, Récolter, Expédier. Les actions secondaires sont regroupées.
- Supprime « Programmer la ration » quand la distribution automatique est active (afficher l’interrupteur et la ration prévue) et le bouton désactivé « Laissons-les grandir ».
- Onglets Eau, Alimentation, Équipement (cartes d’amélioration avec effet et coût d’énergie), Historique.
- En situation critique, l’inspecteur s’ouvre sur l’onglet Eau par l’état React, jamais par manipulation du DOM.

## 8. Standards d’un jeu PC sur Steam

- **Menu pause** (Échap) : Reprendre, Sauvegarder, Charger, Paramètres, Guide, Retour au menu.
- **Emplacements de sauvegarde** : trois manuels + automatique, avec vignette capturée du canvas, date de jeu, trésorerie et durée de jeu. Export/import JSON en option avancée.
- **Paramètres** : Affichage (plein écran, qualité, échelle de l’interface, étiquettes dans le monde, mouvement réduit, mode daltonien avec motifs et icônes), Audio (général, musique, ambiance, effets, interface), Jeu (pauses automatiques, mode expert, aides pédagogiques, vitesse), Contrôles (raccourcis réassignables, manette, sensibilité de caméra), Langue.
- **Manette** : Gamepad API, navigation au focus entre HUD, dock et panneaux, invites de boutons, caméra au stick ; parcours complet vérifié à 1280×800.
- **Langues** : extrais toutes les chaînes dans `src/i18n/fr.json` et `src/i18n/en.json` avec un petit utilitaire `t()` sans dépendance lourde ; dates et nombres selon la langue. Fournis une traduction anglaise complète et relue.
- **Succès** : couche `src/platform.ts` (succès, sauvegarde cloud) avec implémentation web sans effet ; propose une liste de 12 succès dérivés des objectifs et étapes. L’intégration Steamworks et l’empaquetage de bureau ne sont pas requis ici : documente l’approche recommandée.
- **Crédits** accessibles depuis l’écran titre.

## 9. Onboarding

- Tutoriel interactif des dix premières minutes, avec projecteur sur l’élément réel du monde ou du HUD, passable et rejouable depuis le Guide.
- Première minute cible : écran titre → Nouvelle partie → survol de caméra de 3 s (passable) au-dessus du terrain vide → repère sur la source : « Analysez l’eau » → carte de résultats → clic sur une parcelle → chantier animé.
- Infobulle « ? » sur chaque grandeur technique (oxygène, NH₃, TAN, FCR, densité, débit) avec définition courte, seuils et ce qu’il faut faire.
- **Budget de texte** : divise par trois le texte visible ; descriptions de carte ≤ 2 lignes ; aucun paragraphe dans le HUD.
- Supprime les doublons de contenu (cartes de parcelles 1 et 3 identiques) et le bloc d’introduction permanent après le premier cycle.
- Fais de la progression un vrai moteur : objectifs significatifs (diversifier une deuxième filière, 5 t vendues, 12 mois rentables, zéro perte au froid), récompenses non monétaires ou réalistes (décor, nouveaux clients, équipements) ; supprime le niveau XP décoratif et le verrou d’espèce mort, ou donne-leur un rôle réel.

## 10. Lot 0 — bugs à corriger immédiatement

1. Images d’espèces vides dans le Marché : le sélecteur `.species-art > span` (`styles.css:1233`) cible aussi `span.species-photo`.
2. Débordement de l’atlas d’espèces (`realism.css:265`, `background-size: 100% 300%`) : découpe exacte ou images séparées, sujets jamais rognés.
3. Chevauchements de la carte : encart « Une ferme au fil de l’eau » sur l’étiquette du bassin sélectionné, « VOTRE PETIT COIN DE NATURE » sous « Explorer en 3D », noms de parcelles sur la végétation.
4. Trésorerie sur deux lignes à 390 px ; sélecteur « Ration cible » tronqué.
5. Formats : `euro()` incohérent (« 37 113,6 € »), « −0 € de charges / jour », « cycle(s) », « jour(s) ».
6. Textes : « Choisir tilapia du nil », « Aménager atelier de préparation ».
7. Inter déclarée mais non chargée.
8. HUD qui disparaît au défilement (`.topbar` non persistante).

## 11. Architecture du code

- Découpe `App.tsx` en `src/hud/`, `src/panels/`, `src/world/` (canvas persistant, caméra, étiquettes, effets), `src/ui/`, `src/audio/`, `src/i18n/`, `src/state/` (état de partie, sélecteurs, horloge unique, file d’événements d’interface).
- Communication React → Three.js par abonnement à l’état plutôt que reconstruction complète de la ferme ; libération correcte des ressources à la sortie vers le menu.
- CSS : jetons + styles par composant ; supprime les surcharges croisées entre `styles.css`, `realism.css` et `progression.css`, et tous les `!important`.
- Supprime le code mort (verrou d’espèce par niveau, `FishArt` SVG historique de `FarmMap.tsx` s’il n’est plus utilisé).

## 12. Lots de livraison

| Lot | Contenu | Sortie attendue |
| --- | --- | --- |
| 0 | Bugs de la section 10 | captures avant/après |
| 1 | Jetons, polices, composants, formatage, monde plein écran persistant, HUD, dock | jeu jouable sans pages web |
| 2 | Inspecteur, tiroirs Logistique/Finances/Journal/Guide, construction dans le monde | toutes les fonctions V3 accessibles, aucun doublon |
| 3 | Audio, retours visuels, cartes d’événement, célébrations, bilan de cycle, contrôle du temps | chaque action se voit et s’entend |
| 4 | Direction artistique 3D : eaux, parcelles, chantiers, bâtiments, camions, saisons, météo, qualité graphique | le monde raconte la simulation |
| 5 | Écran titre, menu pause, emplacements, paramètres, manette, anglais, succès, tutoriel | standards Steam |

## 13. Critères de réception mesurables

Automatise ces contrôles dans Playwright ou Vitest quand c’est possible :

- À 1920×1080, 1440×900 et 1280×800, dans chaque état généré : le monde 3D occupe **≥ 70 % de la fenêtre** ; trésorerie, date, contrôle du temps, aliments et objectif sont visibles **sans défilement** ; la page ne défile jamais.
- **Aucun texte calculé sous 12 px** sur tous les écrans et panneaux ; nombres du HUD ≥ 18 px.
- **Aucune couleur hexadécimale hors de `tokens.css`** ; aucun `!important`.
- Polices chargées localement ; aucune requête réseau externe pendant une partie.
- **Aucun chevauchement** entre éléments du HUD, étiquettes et panneaux aux cinq tailles d’écran (comparaison des boîtes englobantes).
- Chaque action du moteur déclenche un retour visuel et sonore dans les 100 ms (vérifié par un journal d’événements d’interface en test).
- La première récolte et le premier paiement affichent une célébration puis le bilan de cycle, avec des montants égaux à ceux du moteur.
- Partie complète, du terrain vide au premier paiement, **au clavier seul**, puis **à la manette simulée**.
- axe WCAG 2.1 AA : zéro violation sur l’écran titre, le jeu, chaque tiroir, l’inspecteur, chaque fenêtre et chaque menu.
- Sauvegardes V1, V2 et V3 chargées ; emplacements et migration testés ; portable fonctionnel hors ligne et ≤ 15 Mo.
- Mesure réelle des images par seconde par niveau de qualité dans l’environnement de test, rapportée telle quelle, sans extrapolation au matériel réel.
- `npm test`, `npm run build`, `npm run build:portable` et `npm run test:e2e` passent.
- Captures après refonte de chaque écran et de chaque saison dans `docs/ui/apres/`, inspectées visuellement.

## 14. Livrables et compte rendu

Livre le code, ce prompt, `docs/CREDITS.md`, les captures avant/après, un README mis à jour (commandes, contrôles, raccourcis, paramètres, architecture) et un compte rendu précis : lots réalisés, écarts et raisons, ressources et licences, mesures obtenues (taille du portable, images par seconde, tailles de texte, couverture axe), tests effectivement passés et limites restantes. Ne confonds pas « prêt pour Steam » avec une publication Steam réelle, qui exige un empaquetage de bureau, Steamworks et une validation de Valve.
