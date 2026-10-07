# Vérification de la refonte UI

Le [suivi des sous-lots](PROGRESSION.md) fait foi pour choisir la prochaine tâche. Les références historiques du lot 0 partent de `claude/epic-heisenberg-nas9c6`, commit `3db0c33`, et ont été livrées sur `codex/ui-steam`.

## Captures à partir du lot 1a

Ne pas relancer la matrice historique : **uniquement les écrans modifiés**, en JPEG/WebP, avec fenêtres de 1440×900 et 390×844, **5 Mo maximum par sous-lot**. Pour reproduire la sélection du lot 1a, démarrer Vite, puis lancer `node scripts/ui-capture-lot1a.mjs`. Ce script produit des captures de la fenêtre, sans étirer la hauteur du document, et vérifie le budget. Le manifeste de `apres/lot-1a/` indique tailles, état moteur et position de défilement. Au lot 1b, `node scripts/capture-lot-1b.mjs` capture le monde aux sept stades et les six panneaux au-dessus du même canvas. Seul le contenu des panneaux défile. Les anciennes matrices testent explicitement le repli sans WebGL pour les contrôles DOM ; `ui-lot1b.spec.ts` exerce le vrai renderer et la persistance aux trois tailles PC.

Au lot 1c, `node scripts/capture-lot-1c.mjs` couvre les six panneaux, les paramètres et une commande de juvéniles, avec deux vues supplémentaires à 150 %. Les captures sont inspectées : le contrôle géométrique inclut désormais les libellés à l’intérieur des boutons du HUD et du dock, en complément de leurs boîtes.

Au lot 2, `capture-lot-2a.mjs`, `capture-lot-2b.mjs` et `capture-lot-2c.mjs` couvrent respectivement l’inspecteur/construction, la logistique/finance et le journal/guide/objectifs. Ils attendent les polices et la première image 3D stabilisée, vérifient le jour et l’état des bassins réellement rendus, puis exportent le manifeste sous 5 Mo.

Le budget rédactionnel est mesuré séparément par `node scripts/measure-ui-text.mjs before|after URL fichier.json`. Le mode `before` vise un checkout de `0da1338` servi sur un autre port ; `after` vise le code courant. Il ne produit ni ne modifie de capture. Les 42 lignes comparent sept sauvegardes et six vues en 1440×900, sans défilement. Seuls les mots visibles à 80 % dans la fenêtre et les régions défilantes comptent ; les détails fermés, textes masqués et variantes lecteurs d’écran sont exclus. Le repli WebGL isole le texte de gestion. La méthode et ses limites accompagnent les résultats dans PROGRESSION.md.

## Méthode historique du lot 0 (ne pas relancer)

```bash
npm ci
npm run dev
# Dans un autre terminal, à la racine du dépôt :
node scripts/ui-fixtures.mjs
node scripts/ui-capture.mjs avant
# Série historique après corrections du lot 0 :
node scripts/ui-capture.mjs apres/lot-0
```

`UI_BASE_URL` change l’origine locale de capture (défaut : port 5173). `CHROMIUM_PATH` change le chemin de Chromium. Ne pas régénérer `avant/` après modification de l’interface : ces images sont celles du code initial.

Le générateur utilise uniquement `initialGame`, `act` et `nextDay`, puis valide chaque JSON avec `parseSave`. Il ne réécrit ni les poids, ni l’argent, ni les dates pour forcer les étapes. Les sept sauvegardes sont dans `fixtures/` : terrain vide (J1), chantier (J7), élevage (J23), contrat (J157), froid et expédition (J177), premier règlement (J185). Le cycle porte sur 1 000 truites, sans mortalité.

Chaque série historique contient les six vues principales × sept états × quatre résolutions, soit **168 captures plein document** : 1920×1080, 1440×900, 1280×800, 390×844. Les noms des fichiers permettent la comparaison directe. Les fenêtres et variantes 3D sont également exercées par les tests existants ; elles ne sont pas toutes représentées dans cette matrice des six vues.

Les manifestes enregistrent la hauteur réelle du document et la plus petite taille de texte calculée. Ce sont des observations, pas une preuve que les critères finaux sont déjà remplis. Les vérifications automatiques supplémentaires couvrent également 1280×720.

Les sorties effectives des quatre commandes de validation sont conservées dans `verification/lot-N/`. Les tests arrêtés, les échecs et les relances doivent être distingués des dernières validations complètes.

À partir de 3a, `node scripts/capture-lot-3a.mjs` utilise l’aide commune `capture-helpers.mjs`. Les retours éphémères sont photographiés avec l’horloge de test suspendue, après rendu réel du monde ; le mode mouvement réduit évite de capturer une animation à mi-course. Les autres captures attendent l’expiration des notifications.

Playwright conserve les captures d’échec par défaut. `UI_TRACE=1 npm run test:e2e` active les traces complètes à des fins de diagnostic ; l’enregistrement de chaque état intermédiaire de la 3D est coûteux sous SwiftShader. Ce réglage ne retire aucune assertion et ne change pas le rendu demandé par les tests.

Lot 3b : `node scripts/capture-lot-3b.mjs` compose des états intermédiaires par appels au moteur existant, sans réécrire les fixtures ni les captures « avant ». Il capture l’horloge, les cinq familles de célébration et une urgence. Les tests parcourent aussi les arrêts et l’interruption avec une horloge de navigateur contrôlée ; axe s’exécute avec ses temporisateurs normaux, tandis que la simulation reste arrêtée dans la carte. Les cycles complets gardent les vraies commandes UI et l’écoulement progressif.

Lot 3c : `node scripts/capture-lot-3c.mjs` construit une partie et son registre par les seules commandes du moteur. Les captures montrent bilans provisoire/payé, postes, conseils, trésorerie, prévision, mois et cycles. Le helper lit l’enveloppe V4, avec repli V3 pour les références antérieures. La migration et chaque opération du registre sont testées séparément ; l’interface est comparée aux montants exacts du moteur, puis rechargée et réimportée.
