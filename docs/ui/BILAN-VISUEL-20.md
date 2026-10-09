# Bilan — direction artistique « 20/20 »

Référence : [prompt et barème](../PROMPT-VISUEL-20.md). Réception des 8 et 9 octobre 2026 sur Linux,
Node 22.22, Chromium 141 (Playwright 1.63) et rendu logiciel ANGLE/SwiftShader. Les observations
ci-dessous concernent cet environnement, pas un GPU de joueur ni une publication Steam.

## Ce qui a changé

| Sous-lot | Commit | Réalisation |
| --- | --- | --- |
| V1a | `05e96b4` | Thème « Étang profond » : surfaces vert-encre, encre crème, laiton ; boutons à relief, onglets à barre, jauges lumineuses, listes natives restylées, infobulles, toasts, médaillons. |
| V1b | `f09e8c4` | HUD en plaques (saison, trésorerie, aliments, horloge sur rail), objectif « quête » à neuf segments, dock de tuiles, épingles d’état orientées, caméra en groupe radio iconographique. |
| V2a–d | `bea2d61`, `e671dee` | Soleil rasant, dôme de ciel, nuages, brouillard d’horizon, mappage tonal neutre, étalonnage/bloom/focale miniature selon la qualité ; sol peint, chemins et ornières, collines et forêt ; eau stylisée ; végétation instanciée avec vent ; ferme, grange, chambre froide et atelier distincts ; fumée, oiseaux, fenêtres éclairées. Démarrage du rendu ramené de 85 s à 29 s en rendu logiciel. |
| V1c | `c813c55` | Titre cinématique (emblème, logo laiton, ornement), en-têtes de tiroir à médaillon, tuiles vitales, fenêtres en verre sombre ; infobulles à intention de survol ; caméra au-dessus du dock sous 1 480 px. |
| V3a | `5c17766`, `b5a00c5` | Glissement des tiroirs et des fenêtres, impulsion lumineuse des ressources, scripts de capture ; libération de la géométrie partagée des sprites (fuite relevée par le test de perte de contexte). |
| V3b | `aaca76d` | Fond animé du titre monté après 350 ms pour garder le menu réactif, tuiles du dock mobile à l’échelle du texte, ciel et nuages qui suivent la caméra, cumulus peints. |
| V3c | `35f5b36`, `107e23e`, `9aec8b5`, `578b997` et ce commit | Contrôles caméra et icônes du dock lisibles à 390 px (défauts relevés sur les captures) ; boucle de rendu qui suit le mouvement réduit même quand l’événement média est absorbé ; environnement préfiltré en 64 px ; canvas du jeu immédiat et monde construit après le premier affichage, fond du titre différé de 1,5 s (défauts révélés par les suites complètes) ; captures, documentation et réception. |

L’ordre d’exécution a placé le monde (V2) avant V1c, pour accorder l’interface à la nouvelle
lumière ; V2a à V2d forment un seul commit car ils modifient les mêmes fichiers de rendu.

## Réception automatisée

| Contrôle | Résultat |
| --- | --- |
| Tests unitaires (Vitest) | 25 fichiers, 105 tests réussis, dont l’absence de couleur hexadécimale hors `tokens.css`. |
| Types et build | `tsc -b` et `vite build` sans erreur. |
| Édition portable | `portable/Les-Etangs.html` : 1 930 937 octets (limite 15 Mo), aucune ressource distante. |
| Suite Playwright complète | **76/76 réussis** en 35,2 min sur `578b997` (Chromium 141, SwiftShader, un worker) : axe WCAG 2.1 AA, plancher de 12 px, clavier, manette simulée, cinq tailles d’écran, échelle 80–150 %, perte de contexte WebGL, qualités, portable hors ligne. |
| Passes précédentes | `b5a00c5` : 74/76 (retour au titre trop lent, icônes du dock rognées à 150 %), corrigés par `aaca76d`. `aaca76d` : 75/76 ; l’échec des saisons (4b), une image figée après passage en mouvement réduit, a été reproduit (3 bascules sur 5) puis corrigé par `107e23e`. Une passe ciblée de 30 tests (390 px, mobile, 1c, 4b, 5b, 5d) puis la suite complète sur `9aec8b5` (75/76) ont révélé un démarrage de partie trop long avant que le canvas soit observable (test 5d du survol) : `9aec8b5` réduit le préfiltrage d’environnement, `578b997` crée le canvas d’emblée et construit le monde après le premier affichage. |
| Démarrage d’une partie (rendu logiciel) | Montage du monde de 4,2 s à 2,6 s (mode développement). Build de production, partie lancée aussitôt : canvas et HUD observables 0,3 s après « Commencer » (14 à 24 s auparavant) ; première image à 18 s environ, compilation des shaders à froid comprise. |
| Captures | 17 JPEG, 1 791 132 octets (budget 5 Mo), produits sur `9aec8b5` après la dernière modification du rendu et inspectés un à un ; `578b997` ne change que l’ordre de démarrage, pas l’image. |

La revue des captures a trouvé deux défauts corrigés dans `35f5b36` : à 390 px, le menu « Caméra » dépassait le bord droit de 4 px et les icônes du dock étaient masquées à 100 % (requête de conteneur en `rem` non réévaluée par Chromium au changement d’échelle).

## Barème

Captures de réception : [`apres/visuel-20/`](apres/visuel-20/) (1440×900 qualité Élevée, 390×844 qualité
Moyenne). Référence « avant » : [`apres/lot-5d/`](apres/lot-5d/). Un point n’est accordé que sur
preuve consignée ; « partiel » vaut 0.

| # | Critère | Note | Preuve |
| --- | --- | ---: | --- |
| 1 | Lumière rasante, ombres colorées, jamais de midi zénithal | 1 | Trajectoire solaire plafonnée à 43° (`sunDirection`), ombres PCF douces en Moyen et plus, ombres de contact peintes en Bas ; `1440-monde.jpg`, `1440-batiments.jpg`. |
| 2 | Ciel dégradé, soleil, nuages peints, horizon fermé | 1 | Dôme avec halo solaire, nuages en sprites, collines et forêt ; `1440-titre.jpg`. |
| 3 | Sol peint : herbe variée, chemins doux, terre des parcelles | 1 | Taches d’herbe, ornières, bordures foulées, cour gravillonnée, friches ; `1440-monde.jpg`, `1440-chantier.jpg`. |
| 4 | Eau stylisée : profondeur, rive, reflet, scintillement, écume | 1 | Matériau commun des bassins et du ruisseau, fond sombre ; `1440-bassin.jpg`. |
| 5 | Végétation dense et variée | 1 | Feuillus, conifères, buissons, rochers, herbe, fleurs instanciés avec vent GPU ; `1440-monde.jpg`. |
| 6 | Bâtiments différenciés et détails vivants | 1 | Ferme à tuiles, grange rouge, chambre froide, atelier ; fumée, fenêtres éclairées ; `1440-batiments.jpg`. Les oiseaux sont masqués en mouvement réduit, donc absents des captures. |
| 7 | Étalonnage et post-traitement par qualité | 1 | Moyen : étalonnage ; Élevé : FXAA + étalonnage ; Ultra : bloom + focale miniature ; ressources libérées au cycle de qualités (test 4c). |
| 8 | Thème UI sombre cohérent | 1 | Jetons « Étang profond », contrastes ≥ 4,5:1 calculés, aucune couleur hors `tokens.css` (test unitaire). |
| 9 | HUD en plaques et médaillons | 1 | `1440-monde.jpg`, `390-monde.jpg`. |
| 10 | Dock de jeu | 1 | Tuiles d’icônes, état actif doré et barre, raccourci au survol ; `1440-bassin.jpg`. |
| 11 | Objectif façon quête | 1 | Ruban d’étape, neuf segments, action dorée ; `1440-monde.jpg`. |
| 12 | Étiquettes en épingles | 1 | Pastille d’état + pictogramme, pointe orientée, anneau de calibre ; `1440-monde.jpg`. |
| 13 | Panneaux de jeu | 1 | En-tête à médaillon, onglets à barre, tuiles vitales, listes natives restylées ; `1440-bassin.jpg`, `1440-logistique.jpg`, `1440-finances.jpg`, `1440-guide.jpg`. |
| 14 | Caméra en boutons-icônes | 1 | Groupe radio « Vue du terrain », flèches au clavier, tests adaptés (`game.spec`, 1a, 4a, 4c). |
| 15 | Écran titre cinématique | 1 | `1440-titre.jpg`, `390-titre.jpg`. |
| 16 | Fenêtres dans le même langage | 1 | `1440-pause.jpg` ; paramètres, sauvegardes et événements utilisent le même composant de fenêtre. |
| 17 | Micro-interactions neutralisées en mouvement réduit | 1 | Survol/pression du dock et des menus, glissement des tiroirs, entrée des notifications, lueur des ressources ; règles `prefers-reduced-motion` et `data-motion="reduce"` existantes. |
| 18 | Mobile soigné sans chevauchement | 1 | `390-*.jpg` ; contrôles géométriques mobiles de la suite E2E. |
| 19 | Accessibilité intacte | 1 | Suite complète 76/76 : axe sans violation, plancher de 12 px, parcours au clavier et à la manette, mouvement réduit, échelle 80–150 % sans texte rogné. |
| 20 | Aucune régression | 1 | 105 tests unitaires, build, portable de 1,93 Mo, suite complète 76/76 ; règles du jeu (`game.ts`, `development.ts`, `swimming.ts`) inchangées. |

**Total : 20/20**, chaque point adossé à une preuve consignée ci-dessus, dans les limites qui suivent.

## Limites

- Toutes les mesures et captures proviennent du rendu logiciel SwiftShader : ni GPU de joueur, ni fréquence d’images matérielle, ni test avec des joueurs. Le 20/20 est une auto-évaluation sur preuves consignées, pas un avis de joueurs ni une publication Steam.
- En rendu logiciel, la première image d’une partie reste longue : environ 18 s à froid, compilation des shaders comprise (le HUD et l’état de chargement s’affichent avant). Le fond 3D du titre attend 1,5 s pour laisser le menu réactif.
- Les captures sont prises en mouvement réduit pour être déterministes : oiseaux, nuages en dérive, fumée et vent n’y sont pas animés. L’Ultra (bloom, focale miniature) n’est pas capturé ; il est exercé par le test de cycle des qualités (4c).
- Sur téléphone, l’icône des tuiles du dock s’efface à partir de 120 % d’échelle ou sous 90 px de tuile pour garder le libellé entier.
- Chromium seul a été testé ; Firefox et Safari ne le sont pas.
- Le budget de texte du lot 5d (division par 2,17 au lieu de 3) n’a pas été retravaillé ici.
