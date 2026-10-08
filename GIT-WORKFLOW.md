# Synchronisation Git — Codex et Claude Code

Cette règle s'applique à chaque tâche de modification dans ce dépôt et dans ses
clones, sur tous les ordinateurs, avec Codex comme avec Claude Code. Elle remplace
l'ancien envoi d'instantanés sur une branche `synchronisation`. Le propriétaire
autorise le cycle ci-dessous sans nouvelle demande de confirmation de principe.
Une consigne explicite de sa part pour la tâche en cours reste prioritaire.

Dépôt GitHub privé attendu : https://github.com/antoineroutier-dev/projet-pisciculture

## Avant de modifier

1. Identifier la racine Git, la branche courante, son upstream et le remote
   d'envoi. Vérifier qu'ils correspondent à ce projet. Consulter `git status`.
2. Sur une copie propre et une branche suivie, exécuter `git pull --ff-only`.
   Ne commencer les modifications qu'après une mise à jour réussie.
3. Si des changements préexistent, si la branche diverge, si l'upstream manque,
   ou si le remote est ambigu, préserver tout le travail et expliquer le blocage
   avant de reprendre. Aucun stash, reset, nettoyage, changement de remote,
   merge ou rebase automatique pour contourner ce contrôle. Hors ligne, annoncer
   l'absence de synchronisation ; travailler sur cette base seulement avec une
   consigne explicite du propriétaire.

## À la fin de la tâche

1. Effectuer les vérifications adaptées au changement et aux consignes du projet.
   Examiner le diff. Sélectionner explicitement les fichiers ou portions de cette
   tâche ; ne jamais inclure du travail préexistant ou celui d'un autre agent.
   Vérifier l'index. Pas de `git add .` global ni d'ajout forcé de fichiers ignorés.
2. Avant tout envoi, examiner les fichiers et **tous les commits sortants** :
   rechercher les secrets dans le contenu avec un détecteur tel que Gitleaks,
   compléter par une revue des documents/données privés et des gros fichiers.
   Une clé ajoutée puis retirée dans un commit intermédiaire bloque aussi l'envoi.
   Ne pas désactiver de règles ou ignorer une alerte sans l'avoir qualifiée.
   Si l'audit n'est pas possible, aucun push : `ACTION REQUISE`.
3. Respecter `.gitignore` et les exclusions de la migration. Les `.env`, clés,
   credentials, cookies, bases locales, documents clients et autres données
   sensibles restent locaux. Un `.env.example` ne contient que les noms requis
   avec des valeurs vides. Ne jamais afficher un secret dans les logs, messages
   de commit, documents ou réponses. Conserver les fichiers locaux exclus.
4. Si les contrôles réussissent, créer un commit descriptif et auditer une dernière
   fois le contenu exact à envoyer. Reconfirmer le bon remote et sa visibilité
   privée, puis effectuer un push normal de la branche de travail. Ne jamais
   substituer un envoi sur `main` à un envoi sur une branche de développement.
   Pour une branche créée dans cette tâche à partir d'une base synchronisée,
   lier au besoin son upstream à la branche de même nom du remote vérifié.
   Si le distant a avancé, arrêter et expliquer le besoin de réconciliation.
5. Vérifier que le commit est présent sur la branche distante attendue. Terminer
   en indiquant dépôt, branche et commit réellement envoyé, ou la raison précise
   de l'échec. Ne pas annoncer « synchronisé » sans preuve distante.

## Limites et reprise sur un autre poste

- Une tâche correspond à une demande de modification achevée. Une question sans
  modification ne crée pas de commit ; ne pas committer à chaque sauvegarde.
- Aucun force-push, réécriture d'historique ou suppression de fichiers pour
  résoudre un problème de synchronisation. Ne pas contourner une protection de
  branche : suivre le processus de revue du dépôt et signaler cette étape.
- Cette autorisation concerne Git. Elle n'autorise pas à déployer ni à changer
  les services de production. Respecter leurs procédures existantes.
- Sur chaque poste : Git, identité Git et authentification GitHub doivent être
  configurés, et un détecteur de secrets doit être disponible pour l'audit.
  Ne pas inventer une identité de commit ni stocker un jeton dans le dépôt.
- Cloner ce dépôt, ou récupérer ces consignes avec un premier pull effectué sur
  une copie propre, puis ouvrir une nouvelle session Codex/Claude Code à la
  racine du dépôt. Installer les dépendances et restaurer les secrets/ressources
  privés localement d'après la documentation du projet.
- Pour reprendre une branche de développement sur un autre ordinateur, utiliser
  la même branche. Une seule IA modifie une même copie à la fois ; employer des
  worktrees/branches distincts pour des tâches simultanées et réconcilier ensuite.
- Ces instructions guident les assistants ; elles ne sont pas un service qui
  surveille les fichiers. Elles ne déclenchent aucun push après une édition
  manuelle, ni aucune nouvelle tentative en arrière-plan après un échec.
