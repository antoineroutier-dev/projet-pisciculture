# Prompt exécuté — Les Étangs, de la source au client (V3)

Refondre ce simulateur web de pisciculture en français pour que la première décision soit compréhensible et que la production ait une histoire complète. Conserver le modèle biologique quotidien, les cycles de plusieurs mois, la sauvegarde locale, le mode expert et les aides pédagogiques. Implémenter, tester et publier la nouvelle version du jeu.

## Nouvelle partie et pédagogie

Commencer avec un terrain, des bâtiments agricoles existants, du capital et **aucun bassin aménagé ni poisson**. Ne pas imposer une exploitation déjà lancée. Présenter une seule prochaine action prioritaire, son coût, sa durée et sa raison. Proposer un parcours visible : eau → espèce et installation → chantier → fournisseurs → élevage → client → récolte → livraison → paiement. Les détails techniques restent accessibles, mais ne doivent pas masquer l'objectif du moment.

Faire analyser l'eau avant de construire. Présenter la source fraîche, l'eau d'étang saisonnière et le besoin de chauffer un circuit fermé pour une espèce tropicale. Expliquer les températures, l'oxygène, le débit partagé disponible, la saisonnalité et les limites de densité. Choisir une espèce **à partir** de ces ressources : truite en eau courante fraîche, carpe en étang, tilapia uniquement dans une installation chauffée et filtrée. Aucun déblocage arbitraire par niveau. Afficher des budgets et délais prévisionnels comme des estimations, pas des garanties.

Autoriser le développement des parcelles dans l'ordre choisi, avec des délais de chantier et de mise en service réels dans le calendrier du scénario. Le temps commence en pause. Prévoir une avance jusqu'à une échéance, plafonnée, qui s'arrête sur les événements et risques nécessitant une décision. Ne jamais simuler la croissance de plusieurs mois en quelques jours biologiques.

## Chaîne amont

Distinguer commande, paiement et réception. Les juvéniles viennent d'une écloserie, transitent puis sont acclimatés et suivis en observation à la réception. Réserver le bassin pour éviter les commandes doubles. Les aliments ont un délai de livraison, un coût de transport et une capacité de stockage. Refuser les achats impossibles en expliquant pourquoi. Anticiper les ruptures avec une autonomie indicative et les livraisons en cours. Permettre d'aménager un magasin d'aliments pour augmenter la capacité. Conserver les bilans de masse : pas d'aliment gratuit, pas de croissance sans nourriture, pas de poisson apparaissant à la commande.

## Élevage

Conserver température, débit, oxygène dissous, TAN/NH₃-N, ration, croissance, mortalité, observation sanitaire et vide sanitaire. Une distribution automatique doit consommer le stock. Afficher les priorités urgentes avant les objectifs de développement. Les réglages avancés restent disponibles dans le bassin. La santé et le calibre conditionnent la récolte.

## Chaîne aval

Choisir un débouché avant la récolte : coopérative pour poissons entiers, poissonneries pour poissons préparés. Les clients ont un calibre, une quantité maximale, une échéance, un prix convenu et un délai de paiement. Aménager une chambre froide, puis éventuellement un atelier de préparation. La récolte produit un lot traçable en stock froid, pas de l'argent immédiat. La préparation prend du temps, coûte de l'argent et réduit la masse vendable. La durée de conservation est courte et explicite ; un lot périmé devient une perte, jamais une vente. Affréter un transport frigorifique, attendre la livraison puis le règlement. Suivre les stocks, transports, créances et pertes. Permettre plusieurs cycles et plusieurs bassins, sans détour contournant la logistique.

## Nage et rendu visuel

Remplacer les orbites elliptiques et les trajectoires synchronisées par des agents nageurs indépendants. Modéliser une direction persistante, des accélérations progressives, l'alternance propulsion/glisse, l'anticipation des parois, l'espacement entre individus, un regroupement souple et des comportements distincts par espèce. Orienter le museau dans le sens de déplacement ; limiter les changements de cap, sans téléportation ni traversée des murs. Faire onduler le corps et la queue avec une onde qui s'amplifie vers l'arrière, liée à la vitesse. Les nageoires suivent le corps. Garder les silhouettes et marques distinctives des espèces, une eau lisible et les bâtiments soignés. La carte initiale doit représenter les parcelles réellement vides ; une image d'ambiance d'une ferme achevée ne doit pas tenir lieu d'état du jeu. Respecter la réduction des animations, la pause hors écran et le fonctionnement sans WebGL.

## Fiabilité et validation

Migrer les sauvegardes V1/V2 en préservant poissons, argent et progression. Conserver les anciennes clés et proposer explicitement une nouvelle partie pour découvrir le nouveau départ. Valider les données importées, les quantités, les coûts, les délais et les références entre contrats et lots. Tester une nouvelle partie complète jusqu'au règlement client, les espèces incompatibles, les doubles commandes, les capacités de stockage, la péremption, le débit partagé et la nage. Vérifier l'interface dans le navigateur, au clavier et sur mobile. Documenter les paramètres économiques et logistiques comme des hypothèses de scénario, sans prétendre reproduire une réglementation sanitaire ou un plan d'entreprise réel.
