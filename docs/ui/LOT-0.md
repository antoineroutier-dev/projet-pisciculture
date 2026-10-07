# Lot 0 — corrections préalables

Les huit défauts de la section 10 sont traités :

1. La règle du badge de niveau ne cible plus les portraits du Marché.
2. L’atlas est affiché dans trois fenêtres SVG distinctes, avec masques séparant les nageoires voisines et proportions conservées. Le fichier original reste intact ; aucune image distante ajoutée.
3. L’encart d’ambiance est masqué sur le plan SVG ; la légende décorative sous le bouton 3D est retirée ; les parcelles vides ont des cartouches opaques.
4. Les montants ne se coupent plus avant le symbole euro. Les réglages d’eau sont disposés sur une colonne pour garder la ration sélectionnée entière.
5. `src/ui/format.ts` centralise les euros entiers, les prix unitaires à deux décimales (y compris les alevins pour préserver les prix inférieurs à 1 €), les pluriels et la suppression du zéro négatif. Un adaptateur affiche correctement les anciens messages sans modifier les sauvegardes ni les fonctions du moteur.
6. Les noms des espèces gardent leurs majuscules ; les actions des bâtiments comportent leur article.
7. Inter Latin 400/500/600/700 est chargée depuis `@fontsource/inter` 5.3.0, sous OFL 1.1, et intégrée au portable avec sa notice.
8. Le bandeau supérieur persistant contient désormais argent, aliments, date/jour et contrôles du temps, sur toutes les vues.

## Validation

- `npm test` : **48 passed**, 4 fichiers ; dont les 45 tests initiaux et 3 tests du formatage.
- `npm run build` : **succès**, 1 602 modules ; avertissement Vite conservé sur la taille du chunk Three.js (625,63 ko avant compression).
- `npm run build:portable` : **succès**, **10 055 512 octets**, soit **10,06 Mo** décimaux, notices de licences incluses.
- `npm run test:e2e` : **14 passed**. Les huit tests fonctionnels initiaux restent actifs : trois espèces en 3D, défaillance WebGL, import/export, migrations V1/V2, horloge, pages et premier cycle complet jusqu’au règlement.
- Cinq nouveaux parcours vérifient la persistance du HUD après défilement, la ligne de trésorerie, les portraits, la largeur utile de la ration, le chargement réel d’Inter, une navigation au clavier, l’absence de requêtes externes et axe aux cinq résolutions.
- Portable testé sur une origine isolée dont toutes les requêtes supplémentaires sont bloquées : police réellement chargée, portraits intégrés, passage au jour suivant. Ce contrôle ne prouve pas la gestion du stockage de tous les navigateurs ouvrant un fichier `file://`.
- axe WCAG 2.1 AA : **0 violation** sur les six vues et paramètres testés, et sur la vue Bassins avec mesures ouvertes aux cinq tailles. Cela ne remplace pas un audit manuel complet.
- `game.ts`, `development.ts`, `swimming.ts` : **aucune modification**. Format V3 inchangé, anciennes clés conservées.

Les sorties intégrales sont dans [verification/lot-0/](verification/lot-0/).

## Limites à ce stade

L’architecture reste celle de la V3. Le monde persistant, les jetons, la typographie minimale de 12 px et la suppression des doublons appartiennent aux lots suivants. Des textes de 7 px subsistent dans les vues existantes ; ils ne sont pas présentés comme conformes à la réception finale. Aucun niveau de qualité graphique n’existe encore : les FPS par niveau ne sont **pas mesurés**. Pas de nouvelle bande-son, de bilan de cycle, de sauvegardes par emplacement, de manette ou de traduction anglaise dans ce lot.

## Inspection visuelle et reprise

Les captures comparées directement comprennent le Marché en 1440×900 et 390×844 (les trois silhouettes isolées), le plan et le bassin en 1280×800, ainsi que la logistique après paiement en 390×844. Des captures de détail supplémentaires dans `apres/lot-0/details/` montrent la ration ouverte, le HUD après défilement, le choix du tilapia et l’atelier. Les 336 images de la matrice avant/après sont produites ; chaque fichier n’a pas fait l’objet d’une inspection manuelle individuelle. Les vérifications géométriques automatisées complètent cet échantillonnage.

**Reprise exacte : lot 1, section 4 et section 3.2 de `docs/PROMPT-UI-STEAM.md`.** Partir de ce commit sur `codex/ui-steam`, lire ce bilan, conserver les fixtures et les captures `avant/`, puis remplacer l’architecture de pages par un canvas persistant, le HUD et le dock. Créer les jetons et la bibliothèque de composants, embarquer Fraunces, porter tous les textes à 12 px minimum et ajouter les assertions de surface du monde et d’absence de défilement. Les couleurs hexadécimales déjà présentes dans les données d’espèces du moteur devront être traitées en respectant la priorité donnée à son intégrité ; ne pas changer les règles pour faire passer une recherche textuelle. Aucun code du lot 1 n’est entamé dans ce commit.

Environnement de validation : Node v24.19.0, Chromium 151.0.7922.173, Debian 13, rendu logiciel SwiftShader pour les tests 3D, préférence de mouvement réduit. Les quatre niveaux graphiques et leurs mesures de performance restent au lot 4. La validation actuelle du premier cycle utilise les commandes visibles du jeu ; le parcours complet au clavier seul et à la manette simulée reste à ajouter, et n’est pas revendiqué.
