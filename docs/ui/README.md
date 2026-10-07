# Vérification de la refonte UI

Branche de départ : `claude/epic-heisenberg-nas9c6`, commit `3db0c33`. Branche de travail : `codex/ui-steam`.

## Reproduire les références

```bash
npm ci
npm run dev
# Dans un autre terminal, à la racine du dépôt :
node scripts/ui-fixtures.mjs
node scripts/ui-capture.mjs avant
# Après un lot validé :
node scripts/ui-capture.mjs apres/lot-N
```

`UI_BASE_URL` change l’origine locale de capture (défaut : port 5173). `CHROMIUM_PATH` change le chemin de Chromium. Ne pas régénérer `avant/` après modification de l’interface : ces images sont celles du code initial.

Le générateur utilise uniquement `initialGame`, `act` et `nextDay`, puis valide chaque JSON avec `parseSave`. Il ne réécrit ni les poids, ni l’argent, ni les dates pour forcer les étapes. Les sept sauvegardes sont dans `fixtures/` : terrain vide (J1), chantier (J7), élevage (J23), contrat (J157), froid et expédition (J177), premier règlement (J185). Le cycle porte sur 1 000 truites, sans mortalité.

Chaque série contient les six vues principales × sept états × quatre résolutions, soit **168 captures plein document** : 1920×1080, 1440×900, 1280×800, 390×844. Les noms des fichiers permettent la comparaison directe. Les fenêtres et variantes 3D sont également exercées par les tests existants ; elles ne sont pas toutes représentées dans cette matrice des six vues.

Les manifestes enregistrent la hauteur réelle du document et la plus petite taille de texte calculée. Ce sont des observations, pas une preuve que les critères finaux sont déjà remplis. Les vérifications automatiques supplémentaires couvrent également 1280×720.

Les sorties effectives des quatre commandes de validation sont conservées dans `verification/lot-N/`. Les tests arrêtés, les échecs et les relances doivent être distingués des dernières validations complètes.
