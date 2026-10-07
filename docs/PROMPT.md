# Prompt de création — Les Étangs

Tu es un développeur full-stack, game designer et designer d’interface. Crée une application web complète et jouable de gestion d’une petite exploitation piscicole, intitulée **Les Étangs**. Exécute ce prompt dans le dépôt existant : produis les fichiers, installe les dépendances, lance le jeu et vérifie réellement les parcours principaux. Le livrable est une première version solo aboutie.

## 1. Intention et expérience

Le joueur reprend une ferme aquatique au bord d’une rivière. Il élève des poissons, prend soin de l’eau, vend ses récoltes et finance une exploitation plus grande. Le jeu doit être calme, lisible et satisfaisant, tout en donnant de vraies conséquences aux décisions. Interface et messages entièrement en français. Partie immédiate, sans compte ni serveur externe. Une session de 10 à 20 minutes permet de découvrir les systèmes, récolter et agrandir la ferme. Prévoir une progression libre après les objectifs initiaux.

Le modèle est pédagogique et volontairement accéléré : il ne représente pas des recommandations professionnelles d’élevage. Expliquer cette simplification dans le guide.

## 2. Boucle de jeu et simulation

- Commencer avec 2 bassins occupés, des poissons proches de leur taille de vente, une réserve d’aliments et 2 400 € de trésorerie. Deux emplacements supplémentaires sont constructibles.
- Chaque bassin contient une seule espèce et un lot homogène. Afficher quantité, poids moyen, biomasse, capacité maximale, état de santé, satiété, qualité de l’eau, oxygène, équipement et maturité.
- Trois espèces : truite, carpe et tilapia, avec prix d’alevins, taille initiale, croissance, poids de récolte, température préférée et prix au kilo distincts. Le tilapia se débloque au niveau 2.
- Faire progresser le temps par journées : bouton « Jour suivant », lecture/pause et vitesses x1 / x3. Démarrer et restaurer les parties en pause. Aucun progrès hors ligne. Suspendre le temps quand l’onglet est masqué ou qu’une fenêtre de gestion est ouverte.
- Les poissons consomment leur satiété chaque jour. Leur croissance dépend de la satiété, de l’eau, de l’oxygène, de la température, de la santé et de la densité. Ils cessent de grandir en mauvaises conditions et peuvent mourir après une négligence prolongée.
- Nourrir consomme les aliments du stock. Un nouveau nourrissage sur un bassin rassasié doit être refusé clairement.
- Renouveler l’eau coûte de l’argent et améliore la qualité de l’eau et l’oxygène. Les deux niveaux d’équipement apportent aération puis filtration et ont des effets réels sur la simulation et les charges.
- Acheter des alevins uniquement pour un bassin vide, respecter sa capacité et refuser les dépenses non financées. Construire les bassins dans l’ordre, avec prix connus.
- Vendre un lot arrivé au poids minimal : revenu = biomasse × prix actuel de l’espèce, avec facteur de santé visible. Vider le bassin, enregistrer la recette et la quantité vendue.
- Météo journalière et température déterministes. Marché à prix variables, reproductibles pour une même journée. Afficher clairement les coûts quotidiens. Journaliser les récoltes, achats, constructions, pertes et événements utiles.
- Prévoir une aide de reprise limitée pour rendre une situation de trésorerie critique récupérable.

## 3. Progression

Ajouter des niveaux fondés sur l’expérience et une liste d’objectifs vérifiables : premier nourrissage, première récolte, premier équipement, construction d’un troisième bassin et quantité totale vendue. Les récompenses ne sont attribuées qu’une fois, après une action explicite. Le niveau 2 débloque le tilapia. Les objectifs réalisés restent consultables. La partie continue après leur achèvement.

## 4. Interface et direction artistique

Concevoir un tableau de bord élégant et chaleureux : fond ivoire, vert forêt, bleu d’eau, accents citron vert et terre cuite, titres à empattements et texte courant très lisible. Éviter une esthétique sombre ou surchargée.

- Barre latérale avec marque, navigation « Mes bassins », « Marché », « Journal », « Guide » et petit état de la ferme.
- En-tête avec date simulée, météo, commandes temporelles et état de sauvegarde.
- Cartes synthétiques pour trésorerie, population, aliments et santé de la ferme.
- Grande illustration vectorielle originale d’une ferme vue du dessus, avec bassins interactifs, végétation, chemin, bâtiments, poissons et petits mouvements d’eau. Mettre en évidence le bassin sélectionné. Aucun service d’image ou d’API requis à l’exécution.
- Panneau de gestion du bassin sélectionné avec actions immédiates, jauges et explications des conditions de croissance.
- Objectif guidant la prochaine action et liste des objectifs à consulter.
- Marché avec achat de nourriture, comparaison des espèces, cours et résumé financier.
- Journal daté des actions et guide expliquant les règles réelles du moteur.
- Fenêtres accessibles pour empoissonnement, construction, récolte, objectifs et paramètres. Retours explicites sur les erreurs et confirmations des opérations sensibles.
- Mise en page responsive de 360 px au grand écran. Navigation mobile utilisable. Libellés accessibles, navigation clavier, focus visible, messages annoncés, contraste suffisant, prise en charge des préférences de réduction du mouvement. Ne jamais communiquer un état uniquement par la couleur.

## 5. Sauvegarde et robustesse

Sauvegarder automatiquement dans localStorage après chaque changement de partie, avec numéro de version. Restaurer au rechargement. Valider rigoureusement les données, gérer les sauvegardes invalides et les échecs de stockage avec un message compréhensible. Permettre export JSON, import contrôlé et nouvelle partie avec confirmation. Ne pas écraser silencieusement une sauvegarde illisible. Une partie ne doit jamais contenir de nombres non finis, quantités négatives, espèces inconnues ou identifiants de bassins incohérents. Un fichier importé invalide ne doit pas remplacer la partie active.

## 6. Architecture

Utiliser React, TypeScript et Vite. Isoler le moteur dans un module TypeScript pur : types, état initial, constantes, formules, passage d’une journée, actions, objectifs et validation des sauvegardes. Les règles ne doivent pas dépendre des composants. Utiliser une horloge unique nettoyée au démontage, des mises à jour cohérentes et un générateur déterministe pour l’environnement et les prix. Les icônes peuvent venir de lucide-react. Éviter les dépendances et services inutiles. Ne jamais stocker de secret.

## 7. Vérifications obligatoires

- Tests unitaires : croissance lorsque les conditions sont bonnes, conséquences d’une négligence, refus des achats sans fonds, capacité des bassins, vente uniquement à maturité, calcul de recette, effet des équipements, récompenses non répétables, progression déterministe et validation des sauvegardes.
- Tests navigateur : chargement sans erreur, sélection d’un bassin, nourrissage, journée suivante, récolte, achat d’alevins, marché, sauvegarde/restauration, paramètres et affichage mobile sans débordement horizontal.
- Vérifier que les tests exécutent réellement les parcours ; lancer la compilation TypeScript et le build de production.
- Documenter les commandes d’installation, lancement, tests, build, architecture, règles chiffrées et limites connues dans le README.

## 8. Livrables et fin de tâche

Livrer l’application fonctionnelle et son code dans le dépôt, ce prompt dans `docs/PROMPT.md`, les tests et le README. Démarrer l’application localement pour la valider. Rapporter les fonctionnalités réalisées, les tests effectivement passés et les limites. Ne pas revendiquer un déploiement public sans l’avoir effectué. Dans cet environnement d’onboarding, enregistrer également les instructions de démarrage réutilisables après validation ; la publication de l’environnement reste distincte d’un hébergement web public.
