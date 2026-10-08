# Bilan de la refonte de Les Étangs

Référence : [spécification](../PROMPT-UI-STEAM.md), [suivi par sous-lot](PROGRESSION.md). Réception du 8 octobre 2026 sur Linux, Node 24.19 et Chromium 151, rendu logiciel ANGLE/Vulkan SwiftShader. Les résultats ci-dessous concernent cet environnement, pas une machine de joueur ni une certification Steam.

## Périmètre livré

Les lots 0 et 1a étaient déjà fusionnés dans `main`. La suite ajoute un commit vérifié pour chacun des sous-lots 1b à 5d :

| Lot | Réalisation |
| --- | --- |
| 1 | Monde plein écran persistant, HUD, dock, composants partagés, palette et typographie locales, échelle de l’interface |
| 2 | Construction depuis les parcelles, inspecteur, chaîne logistique, finances, journal filtrable, encyclopédie et objectifs |
| 3 | Audio original synthétisé, retours d’action, horloge interruptible, événements, célébrations, registre financier et bilans de cycle |
| 4 | Diorama cohérent, portraits des modèles, infrastructures, logistique animée, saisons, météo, sélection, caméra et quatre qualités |
| 5 | Titre, pause, emplacements, paramètres, manette, français/anglais, tutoriel rejouable, douze succès et récompenses décoratives |

Les trois fichiers de règles `src/game.ts`, `src/development.ts` et `src/swimming.ts` restent identiques à `0da1338`. Le jeu conserve son format interne V3. L’enveloppe V6 ajoute le registre, les métadonnées et le profil sans modifier les règles ; les migrations V1–V5 conservent les anciennes clés. L’import/export JSON et les trois emplacements manuels restent accessibles. Les références « avant » n’ont pas été régénérées.

Le tutoriel observe les vraies commandes : analyse de l’eau, choix de parcelle, construction, approvisionnement, poissons, ration et visite des panneaux. Il peut être sauté puis rejoué au stade actuel. Les succès ne fabriquent pas d’historique : un mois rentable doit être clos et entièrement observé, les aides sont exclues, et le cycle sans perte au froid doit être suivi jusqu’au règlement. Jardin et banc n’ont aucun effet économique.

## Réception automatisée

Validation finale sur le même code, sans modification pendant la suite navigateur :

| Commande / mesure | Sortie observée |
| --- | --- |
| `npm test` | **25 passed (25)** fichiers, **105 passed (105)** tests, **10,41 s** |
| `npm run build` | **built in 7.15s**, code de sortie 0 |
| `npm run build:portable` | **1 857 707 bytes; 1.86 MB**, code de sortie 0, sous 15 000 000 octets |
| `npm run test:e2e -- --reporter=list,json` | **76 passed (51.9m)** ; 0 échec, 0 ignoré, 0 flaky, aucune erreur globale |
| Typographie | **12 px minimum** ; 210 combinaisons historiques, 36 relevés d’échelle, matrices anglaises et nouvelles vues de tutoriel/succès |
| Axe WCAG 2.1 AA | **0 violation** sur les vues couvertes ; les pièces jointes conservent 211 relevés numériques, en plus des assertions directes des scénarios |
| Monde | Canvas **100 %** ; surface non masquée **≥ 77,18 %** dans la matrice des sept états aux trois résolutions PC, panneaux fermés. Le scénario séparé avec étiquettes mesure **76,05 %** à 1280×800 et **71,33 %** à 1024×768. |
| Clavier / manette simulée | Deux cycles complets jusqu’à **J192**, premier paiement, **453,989 kg**, **0 mortalité**. Clavier : 0 événement de pointeur ; manette : aucun événement clavier/pointeur. |
| Hors ligne | Même HTML portable chargé en mémoire, contexte hors ligne dès le départ ; **0 requête de ressource**, polices/portraits chargés, analyse jusqu’à J3 et reprise identique. Accès direct `file://` bloqué par la politique, voir limite ci-dessous. |
| Stabilité | Changement de langue conservant canvas/caméra/données ; compteurs de ressources à zéro après libération ; ouverture/fermeture des succès sans nouvelle mise à jour du modèle de ferme au repos. |

Les [mesures détaillées](verification/lot-5d/measures.json) et les sorties [unitaires](verification/lot-5d/unit.log), [build](verification/lot-5d/build.log), [portable](verification/lot-5d/portable.log) et [E2E](verification/lot-5d/e2e.log) sont conservées. Les retours immédiats mesurent la programmation Web Audio et l’insertion DOM, pas la latence d’un périphérique audio. Chaque lot antérieur possède ses propres sorties dans `verification/lot-N/` ; les échecs intermédiaires et leurs corrections figurent dans le suivi, et ne sont pas comptés comme validations.

## Images par seconde mesurées

| Qualité | Taille réelle du tampon | Images/s | Temps entre les 24 images retenues |
| --- | --- | ---: | ---: |
| Bas | 1080×675 | 1,2373 | 18,590 s |
| Moyen | 1440×900 | 0,8960 | 25,669 s |
| Élevé | 2160×1350 | 0,3824 | 60,141 s |
| Ultra | 2880×1800 | 0,1541 | 149,225 s |

Fenêtre 1440×900, fixture historique `elevage`, calendrier arrêté et animations décoratives actives. Six images de chauffe, puis 24 images réellement terminées ; `gl.finish()` précède les horodatages. Un seul navigateur, aucun build ni autre test en parallèle. Le temps entre la première et la dernière image contient 23 intervalles. Ce relevé est réalisé après stabilisation des références de récompenses et d’horloge ; le [premier relevé](verification/lot-5d/fps-before-cache.json) reste séparé. Les variations entre exécutions ne permettent pas d’attribuer un gain de cadence à cette seule correction. [Échantillons finaux et environnement](verification/lot-5d/fps.json).

## Ressources et captures

Inter et Fraunces sont embarquées sous OFL 1.1 ; Lucide sous ISC ; Three.js et React sous MIT. Les notices sont fournies dans le dépôt et accessibles depuis les crédits du titre. Les modèles, textures procédurales, portraits, illustrations, traductions et sons sont des créations originales du projet. La synthèse Web Audio est un choix local : aucun téléchargement audio n’a été bloqué ou remplacé sans attribution. Aucun fichier audio externe, banque de sons ou service de traduction distant n’est utilisé. [Crédits détaillés](../CREDITS.md).

Les captures de chaque sous-lot respectent le budget de 5 Mo. Le dernier comprend **54 JPEG, 3 188 093 octets**, à 1440×900 et 390×844, inspectés visuellement, y compris les versions corrigées du tutoriel, des filtres et des jauges. Le script suspend brièvement l’horloge de capture pour photographier le survol de trois secondes ; sa durée et son mouvement sont testés indépendamment. [Manifeste 5d](apres/lot-5d/manifest.json).

## Écarts et limites de réception

- **Budget de texte non atteint** : 57 634 caractères avant, 26 569 après, soit −53,90 % et une division par **2,17**, au lieu de trois. Protocole inchangé : sept états, six panneaux ouverts, fenêtre 1440×900 sans défilement, mots visibles à au moins 80 %. Les consignes ont été abrégées et les détails déplacés dans les aides ; les commandes et informations de gestion accessibles restent présentes. Cette réception n’est donc pas une conformité intégrale à la spécification. [Mesure finale](verification/lot-5d/text.json), [référence](verification/lot-2c/text-before.json).
- **Ouverture directe du portable** : Chromium renvoie `ERR_BLOCKED_BY_ADMINISTRATOR` pour `file://`. Le test charge le même HTML en mémoire dans une origine isolée, avec le contexte hors ligne dès le départ, sans contourner cette politique. Le chargement des polices et portraits, une analyse d’eau et la reprise de sauvegarde sont contrôlés. Ce test ne valide pas l’ouverture directe d’un fichier sur cette machine.
- **Mesures graphiques limitées au rendu logiciel** : SwiftShader est lent, surtout aux qualités élevées. Les FPS rapportées ne prédisent ni un GPU physique, ni les performances d’une ferme entièrement développée. Aucun objectif de fluidité matérielle ne peut être déclaré atteint ici.
- **Périphériques et audio** : cycle complet à la Gamepad API simulée ; aucune manette physique et aucune écoute humaine. Les retours immédiats sont instrumentés ; le temps de résultat du moteur est distingué du premier acquittement. Il n’y a pas de garantie de latence audio matérielle.
- **Palette** : trois couleurs d’identification historiques dans `game.ts` sont conservées pour respecter le gel du moteur. Les couleurs de présentation sont centralisées dans `tokens.css` ; aucun `!important` dans les styles.
- **Surface du monde** : le canvas occupe toute la fenêtre. La surface non masquée est mesurée séparément, panneaux fermés ; le seuil PC de 70 % ne décrit pas un panneau ouvert ni l’écran mobile. Les notifications et étiquettes peuvent se masquer lorsqu’elles n’ont pas la place, sans supprimer les alertes du HUD.
- **Langues et accessibilité** : les noms propres et les textes libres inconnus des sauvegardes importées restent inchangés. Zéro violation axe sur les vues couvertes ne remplace pas une évaluation avec des utilisateurs et lecteurs d’écran réels.
- **Steam** : aucun empaquetage bureau, SDK Steamworks, sauvegarde cloud distante, publication ni certification Steam Deck. L’adaptateur web est sans effet réseau ; [l’approche de portage](../STEAM-DESKTOP.md) documente le travail distinct restant.

La direction artistique finale suit le diorama stylisé demandé par la spécification UI, sans revendiquer un rendu photoréaliste. Les limites scientifiques et économiques du simulateur restent dans le Guide et le README.
