# Prompt — recherche métier, simulation biologique et réalisation visuelle réaliste

Tu es développeur de simulation, spécialiste de visualisation 3D et analyste documentaire. Fais évoluer **Les Étangs**, un jeu web React/TypeScript existant, vers une représentation beaucoup plus fidèle d’une pisciculture française. Lis le projet, préserve les parties existantes et exécute réellement les recherches, les modifications et les tests décrits ci-dessous.

## 1. Recherche avant calibration

Consulte des sources primaires ou techniques identifiables : FAO (fiches des espèces et manuel *Small-scale rainbow trout farming*), instituts aquacoles, publications universitaires de vulgarisation contrôlée (notamment UF/IFAS sur l’ammoniac), organismes professionnels et manuels d’équipement. Documente l’URL, le titre, l’organisme, la date de consultation, les passages utiles et les limites de transposition. Distingue les valeurs observées, les plages recommandées et les paramètres choisis pour le modèle. Ne présente pas un lien identifié comme un document réellement consulté. Si le réseau bloque une source, consigne le blocage, demande l’activation des domaines par la configuration prévue et continue le travail indépendant. N’invente aucune citation.

Étudier le déroulement réel : approvisionnement en juvéniles, acclimatation et biosécurité, conduite de lots, biométrie, rationnement selon taille/température, contrôle du débit et de l’oxygène, gestion des rejets et de l’ammoniac, entretien, suivi des mortalités, préparation de la récolte, vide sanitaire, commercialisation et coûts. Étudier séparément truite arc-en-ciel, carpe commune et tilapia du Nil : ce ne sont pas des poissons interchangeables dans un même milieu.

Produire `docs/research/REALISME.md`, une synthèse exploitable comprenant un tableau source → observation → règle du jeu → degré d’incertitude. Mentionner explicitement les processus non simulés. Aucun résultat non vérifié ne doit être qualifié de scientifiquement validé.

## 2. Cadre et temps biologique

Une exploitation diversifiée de démonstration en climat tempéré français : truites dans des bassins alimentés par une eau de source, carpes dans un étang de terre, tilapias uniquement dans un circuit recirculé chauffé sous serre. L’exploitation est une composition pédagogique de plusieurs systèmes ; ne pas la présenter comme l’organisation universelle d’une pisciculture.

Les cycles durent des mois simulés. Une journée simulée représente 24 heures biologiques. La vitesse de lecture peut accélérer l’attente mais ne multiplie jamais les gains de croissance par journée. Calendrier de 365 jours, température saisonnière, inertie thermique et chauffage selon l’installation. Des lots déjà avancés au début rendent les premiers résultats accessibles. Montrer le poids, la durée du lot et les paramètres réels, sans promettre une date fixe de récolte indépendante des conditions.

## 3. Moteur de simulation

Isoler les règles de la vue. Employer des unités explicites et testables : poids et biomasse en kg, volume en m³, densité en kg/m³, débit en L/s, température en °C, oxygène dissous en mg/L, azote ammoniacal total en mg N/L et NH₃ non ionisé en mg NH₃-N/L. La santé reste un indice de simulation, pas un diagnostic vétérinaire.

- Alimentation journalière en pourcentage de la biomasse, modulée par espèce, poids, température et état de l’eau. Distinguer ration programmée, ration distribuée et refus d’aliment. Aliment non consommé et suralimentation augmentent la charge organique.
- Croissance liée à l’aliment réellement consommé et à un indice de conversion (FCR), avec plafond biologique journalier. Pas de création de biomasse sans apport énergétique. Définir explicitement si la nourriture naturelle des carpes est incluse ou omise.
- Oxygène dépendant de la saturation liée à la température, des entrées d’eau, de la respiration, de la nitrification et de l’aération. Utiliser des sous-pas horaires pour éviter qu’une journée moyenne masque une hypoxie aiguë.
- Azote : production liée à la ration et au gaspillage, renouvellement d’eau et nitrification selon la maturité du biofiltre. Calcul de la fraction ammoniacale non ionisée selon température et pH, avec conventions d’unité explicites. Ne pas confondre TAN et NH₃.
- Effets physiologiques progressifs des mauvaises conditions : baisse de prise alimentaire, croissance, stress et mortalité en cas d’exposition sévère. Un renouvellement d’eau ne guérit pas immédiatement les poissons. Ne pas implémenter de médicament ou traitement vétérinaire arbitraire.
- Capacité technique exprimée en biomasse à taille de récolte. Refuser un lot incompatible avec l’installation ou dépassant sa capacité cible. Mise en observation des nouveaux lots et période de vide sanitaire après récolte. Délais réels de construction au lieu d’un bassin créé instantanément.
- Réglages de débit et de ration, nourrissage automatique optionnel, aération et filtration réellement actives. Alertes expliquant les conséquences et actions possibles.
- Journal de conduite avec ration, croissance, mortalité, récolte et qualité de l’eau. Indiquer les hypothèses, notamment l’absence de maladies pathogènes individualisées, de génétique et de reproduction complète.

## 4. Économie

Séparer cours de vente, prix de juvéniles, nourriture, eau, énergie, charges fixes et investissement. Présenter les montants comme hypothèses de scénario tant qu’ils ne sont pas étayés par des devis datés et régionaux. Le chauffage des tilapias doit avoir un coût significatif. La hausse de production doit consommer plus de nourriture et accroître les contraintes d’eau.

Conserver un mode pédagogique avec aides clairement identifiées. Ajouter un mode expert sans primes monétaires d’objectifs ni subvention de reprise fictive. Ne pas masquer la possibilité d’une exploitation déficitaire. Les récompenses pédagogiques ne sont jamais des recettes professionnelles réalistes.

## 5. Direction visuelle — une ferme crédible et belle

Remplacer la vue de carte simplifiée par une scène 3D WebGL interactive : orbitation, zoom, vue générale et inspection rapprochée d’un bassin. Matériaux physiquement plausibles, éclairage naturel, ombres, reflets et transparence de l’eau, variation subtile de la végétation, sols et détails d’usage. Prévoir une qualité réduite pour mobile et une vue de secours si WebGL échoue. Ne pas annoncer un photoréalisme atteint sur la seule base de l’utilisation de 3D.

Bâtiments : architecture rurale française soignée, volumes cohérents, façades en pierre et bardage de bois, toiture à pans en ardoise/tuiles, menuiseries, encadrements, portes, gouttières et détails visibles à l’approche. Montrer un bâtiment d’exploitation, une halle technique, des passerelles, conduites, arrivées/sorties d’eau et, une fois construite, une serre technique pour le tilapia. Les bâtiments doivent correspondre aux installations et équipements présents, sans éléments décoratifs faisant croire à une fonctionnalité inexistante.

Poissons reconnaissables **par leur anatomie et leur robe** :
- Truite : silhouette fuselée, dos ponctué, bande rosée, nageoire adipeuse, queue légèrement fourchue.
- Carpe : corps plus haut, grandes écailles bronze, longue dorsale, bouche charnue et barbillons.
- Tilapia : corps comprimé latéralement, dorsale épineuse continue, bandes sombres et caudale striée.

Créer des modèles distincts, écailles et motifs, yeux, nageoires et mouvements crédibles. Vitesse et comportement changent selon les conditions. Prévoir un mode d’observation rapprochée avec nom d’espèce, repères morphologiques et taille. Les poissons visibles dans la vue générale peuvent être un échantillon pour les performances ; l’indiquer, et ne pas les agrandir arbitrairement sans annoncer une vue d’observation. Une eau d’étang turbide ne doit pas être représentée comme de l’eau de piscine : séparer observation pédagogique et visibilité naturelle.

Une vue paysagère photoréaliste générée peut servir d’illustration d’ambiance, avec des repères vers les bassins ; annoncer qu’elle n’évolue pas avec les travaux, dont l’état réel est visible en 3D. Une planche d’identification photoréaliste générée peut enrichir les fiches, avec mention de son origine artistique. Elle ne constitue pas une référence scientifique. Ne pas attribuer une photographie générée à une source documentaire. Conserver les images localement pour éviter des services distants à l’exécution.

## 6. Ergonomie et sauvegardes

Interface française lisible, responsive, utilisable au clavier. Fournir la sélection des bassins et des vues hors du canvas pour l’accessibilité. Nommer les unités, seuils d’alerte et raisons des actions refusées. Maintenir lecture/pause, sauvegarde automatique et export/import. Faire évoluer la version du format avec migration contrôlée de la V1 ; garder la sauvegarde originale et expliquer la conversion des paramètres. Un fichier invalide n’est jamais écrasé silencieusement.

## 7. Critères de réception

Tester : conservation des bilans de ration/croissance, croissance sur plusieurs mois, absence de croissance sans aliment, réponse au froid et à la chaleur, effet du débit et de l’aération, nitrification et maturité du filtre, fraction NH₃ croissante avec pH/température, pertes après exposition critique, compatibilité espèce-installation, capacité en biomasse, durée d’observation/vide sanitaire/construction, coûts d’énergie, mode expert et migration des anciennes parties.

Dans Chromium, vérifier la vraie création d’un contexte WebGL, la présence du rendu, les vues ferme/bassin/poisson, les commandes, la navigation mobile, la sauvegarde, la vente et le réempoissonnement. Inspecter des captures écran de la ferme et des trois espèces. Vérifier le chargement des assets, le nettoyage des ressources 3D, la limite du nombre d’objets et la compilation de production. Le mode de secours ne doit jamais être utilisé pour prétendre que la 3D fonctionne.

Livrer le code, ce prompt, le carnet de recherche, la documentation mise à jour et un compte rendu précis : sources consultées ou bloquées, règles implémentées, rendu réellement observé, tests passés et limites restantes. Ne pas confondre ambition « ultra réaliste », rendu produit et validation professionnelle.
