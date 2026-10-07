# Recherche, hypothèses et limites du modèle V2

État au **7 octobre 2026**. Ce registre accompagne [le prompt de refonte](../PROMPT-REALISME.md). Le projet est un jeu pédagogique, sans validation terrain par un pisciculteur. Les sources scientifiques ci-dessous ont effectivement été lues ; elles ne valident pas à elles seules une conduite d’élevage.

## Sources effectivement consultées

Les dépôts CRAN sont des miroirs du code et de la documentation des logiciels scientifiques. Nous avons consulté leurs fonctions et leurs commentaires bibliographiques, sans reprendre leur implémentation logicielle. Les équations ont été réimplémentées dans le moteur TypeScript.

| Source et version consultée | Observation vérifiée | Application et limite |
| --- | --- | --- |
| [marelac, gas_O2sat.R](https://github.com/cran/marelac/blob/52e2d465abcc40d10ad1b7d1024fdf413657d8c8/R/gas_O2sat.R), [documentation](https://github.com/cran/marelac/blob/52e2d465abcc40d10ad1b7d1024fdf413657d8c8/man/gas_O2sat.Rd) | Équation APHA de saturation de l’oxygène en eau douce, température absolue, résultat en mg/L ; références APHA et Benson & Krause. | Courbe de saturation, environ 9,09 mg/L à 20 °C. Eau douce à pression de référence ; altitude et salinité non simulées. |
| [respirometry, conv_o2.R](https://github.com/cran/respirometry/blob/7bca952ba7792134d6c11c6afbe48185c69ce5da/R/conv_o2.R) | Concentration massique et pourcentage de saturation sont deux grandeurs distinctes ; température, salinité et pression comptent. | Abandon des anciennes jauges d’oxygène arbitraires ; affichage en mg/L, migration des anciens pourcentages. |
| [respirometry, flush_water.R](https://github.com/cran/respirometry/blob/7bca952ba7792134d6c11c6afbe48185c69ce5da/R/flush_water.R) | Fraction d’eau remplacée dans un volume parfaitement mélangé : `1 − exp(−Qt/V)` ; documentation citant Steffensen 1989, équation 5. | Solution exponentielle à chaque heure ; test analytique du renouvellement. Un bassin réel allongé possède des gradients que cette approximation ne décrit pas. |
| [respirometry, min_flow.R](https://github.com/cran/respirometry/blob/7bca952ba7792134d6c11c6afbe48185c69ce5da/R/min_flow.R) | Débit nécessaire lié à la consommation d’oxygène divisée par l’écart de concentration ; référence à Steffensen 1989, équation 8. Stress et activité changent la consommation. | Bilans entre débit, biomasse, respiration et aération. Le coefficient de respiration du jeu reste une hypothèse. |
| [respirometry, Q10.R](https://github.com/cran/respirometry/blob/7bca952ba7792134d6c11c6afbe48185c69ce5da/R/Q10.R) | Dépendance thermique par `R₂ = R₁ × Q10^((T₂−T₁)/10)`. | Respiration dépendant de la température. **Q10 = 2 est un choix de scénario**, pas une constante universelle pour ces trois espèces. |
| [respirometry, predict_nh3.R](https://github.com/cran/respirometry/blob/7bca952ba7792134d6c11c6afbe48185c69ce5da/R/predict_nh3.R), [conv_nh4.R](https://github.com/cran/respirometry/blob/7bca952ba7792134d6c11c6afbe48185c69ce5da/R/conv_nh4.R) | Distinction NH₃/NH₄⁺, excrétion, effet du pH et de la température ; distinction mg de molécule et mg d’azote. La prédiction documentée exclut la nitrification et possède des hypothèses propres. | TAN en **mg N/L**, NH₃-N en **mg N/L**. Aucun seuil en mg NH₃/L de cette documentation n’est transposé directement. Pour convertir NH₃-N en NH₃, multiplier approximativement par 17/14. |

Les références bibliographiques citées par ces logiciels ne sont pas présentées comme des articles originaux lus intégralement. Les révisions consultées sont figées dans les liens ci-dessus.

## Références métier identifiées, accès bloqué

Les requêtes directes ont renvoyé **HTTP 403 via le proxy réseau de l’environnement**. Ces documents ne sont donc **pas des sources consultées** pour cette livraison :

- FAO, *Small-scale rainbow trout farming*, Fisheries and Aquaculture Technical Paper 561, 2011 : <https://www.fao.org/4/i2125e/i2125e.pdf>.
- Fiches FAO : [truite arc-en-ciel](https://www.fao.org/fishery/en/culturedspecies/oncorhynchus_mykiss/en), [carpe commune](https://www.fao.org/fishery/en/culturedspecies/cyprinus_carpio/en), [tilapia du Nil](https://www.fao.org/fishery/en/culturedspecies/oreochromis_niloticus/en).

Le brouillon de configuration cloud ajoute `www.fao.org`, `fao.org`, `openknowledge.fao.org` et `edis.ifas.ufl.edu` aux domaines réseau, en conservant les réglages existants. Il nécessite publication dans les paramètres de l’environnement ; cela ne déploie pas le jeu. Une fois l’accès effectif, confronter les profils d’espèces, tables d’alimentation, densités, biosécurité et cycles aux documents métier. Aucun entretien, visite de ferme ou relevé d’exploitation n’a eu lieu.

## Traduction dans le jeu

Le joueur reprend une petite exploitation française fictive : 1 200 truites de 380 g en bassin de 60 m³ alimenté par une source, 300 carpes de 780 g dans un étang de 600 m³, 48 000 € de trésorerie et 500 kg d’aliment. Les lots ont déjà 180 jours de suivi à la reprise. Un troisième bassin de 90 m³ et une serre avec circuit recirculé de 40 m³ peuvent être construits. Cette combinaison est un scénario pédagogique multi-espèces, pas la reproduction documentée d’une ferme particulière.

Une journée calendaire est un jour biologique. Les vitesses ×1/×3/×12/×60 modifient uniquement la cadence de l’horloge : 12/4/1/0,2 seconde par journée. L’eau est calculée par 24 pas horaires. Les saisons ont un cycle annuel. L’eau de source possède une faible amplitude thermique, l’étang suit l’air avec inertie, le circuit recirculé vise 27 °C lorsque ses charges sont financées.

### Coefficients d’élevage à confirmer

| Paramètre | Truite | Carpe | Tilapia |
| --- | ---: | ---: | ---: |
| Installation imposée par le scénario | Eau courante | Étang | Recirculation chauffée |
| Juvénile acheté → calibre commercial | 50 → 450 g | 100 → 1 000 g | 30 → 650 g |
| Plage de température préférée | 12–18 °C | 20–26 °C | 26–30 °C |
| FCR nominal minimal | 1,1 | 1,8 | 1,5 |
| Ration de référence à 100 g | 1,8 % biomasse/j | 2 % | 2,5 % |
| Repère O₂ / seuil critique | 7 / 4 mg/L | 5 / 2 mg/L | 5 / 2 mg/L |
| Alerte NH₃-N | 0,02 mg N/L | 0,05 | 0,05 |
| Densité cible maximale | 25 kg/m³ | 0,8 | 25 |

Ces valeurs sont des **hypothèses de simulation**, non des seuils réglementaires ou des recommandations universelles. Le stade de vie, la souche, l’aliment, la durée d’exposition et le système réel changent les exigences. La capacité en nombre est aussi bornée par installation ; l’introduction vérifie la biomasse future au calibre de vente. Les poissons continuent de croître après ce calibre, donc le joueur doit surveiller la densité.

### Aliment et croissance

La ration vaut `biomasse × taux de référence × (0,1 / poids en kg)^0,25 × facteurs de milieu × réglage joueur`. Le réglage va de 50 à 150 %. La programmation réserve le stock dans le distributeur ; les 24 h suivantes consomment cette réserve. La vente restitue une ration encore réservée. L’automate ne double pas une ration déjà programmée et ne crée pas de stock si celui-ci est épuisé.

Le gain ne dépasse ni `aliment consommé / FCR`, ni un plafond de croissance spécifique lié au poids et à la température. Température, oxygène minimal de la journée, azote et santé le réduisent. L’excédent alimentaire produit des déchets. Le FCR affiché est l’aliment distribué divisé par le gain brut de biomasse calculé depuis le début du suivi ; il ne décrit pas le bilan net après mortalité ou amaigrissement. En hiver, la carpe peut entrer en repos à moins de 6 °C. Le modèle ne lui fournit **aucune nourriture naturelle** : plancton et benthos restent à ajouter pour représenter une vraie carpiculture extensive.

### Eau et azote

- Conversion du débit : 1 L/s = 3,6 m³/h = 86,4 m³/j.
- Bassin parfaitement mélangé : pour une concentration `C`, une source `S` et un taux de retrait `k`, `C(t+1 h) = S/k + (C(t) − S/k) × exp(−k)`.
- Respiration indicative : 0,18 g O₂/kg de poisson/h à 15 °C, modulée avec Q10 = 2. Demande organique simplifiée liée aux aliments et refus.
- L’apport d’eau arrive à 97 % de saturation ; l’aération rapproche l’eau de sa saturation. La consommation de nitrification utilise 4,57 g O₂/g d’azote nitrifié (hypothèse stœchiométrique, sans bilan complet de l’alcalinité).
- Rejets de TAN : 3 % de l’aliment distribué en équivalent azote, supplément pour les refus. Nitrification simplifiée de premier ordre ; filtre à pleine efficacité après 30 jours, dépendant de l’oxygène. Les coefficients ne dimensionnent pas un équipement réel.
- Partition en eau douce : `pKa = 0,09018 + 2729,92/(T+273,15)`, `NH₃-N = TAN/(1+10^(pKa−pH))`. Formule couramment attribuée à Emerson et al. ; **publication originale non consultée**, attribution et domaine de validité à confirmer. Le pH est supposé tamponné à une valeur fixe.
- Un entretien retire les boues de manière abstraite et renouvelle 30 % du volume. La dilution du TAN est calculée ; la santé ne remonte pas instantanément.

L’indice de santé est une variable de jeu. Les pertes dépendent de la durée d’hypoxie et de l’exposition à l’ammoniac ; elles sont déterministes, sans diagnostic de maladie. La consommation, l’excrétion et les échanges sont uniformes à l’intérieur de chaque journée ; le moteur ne reproduit pas les pics après repas ou les cycles photosynthèse/respiration nocturne.

### Exploitation et budget

Observation d’un nouveau lot pendant 14 jours ; ce délai ne représente **pas** une quarantaine physiquement séparée. Vide sanitaire de 7 jours après récolte. Ces durées sont fictives et ne se substituent pas à un protocole sanitaire. Travaux et mise en service : bassin 14 jours/12 000 €, serre 45 jours/28 000 € avec biofiltre considéré mature à la livraison. Aération 1 200 €, biofiltre supplémentaire 3 400 €.

Charges : travail 55 €/jour ; entretien 2,50 €/bassin/jour ; énergie 0,22 €/kWh ; redevance d’eau simplifiée 0,012 €/m³ traversant l’installation. L’énergie du chauffage est une approximation selon l’écart à l’air, sans enveloppe thermique détaillée. Les prix d’aliment, de juvéniles et de vente sont des paramètres fixes avec variation saisonnière fictive, sans cours en direct. Terrain et bâtiments initiaux sont déjà acquis. TVA, fiscalité, amortissements, dette, autorisations et rejets ne sont pas comptabilisés. Ces choix ne permettent pas de conclure à la rentabilité d’une vraie ferme.

L’absence de trésorerie suspend les équipements actifs et le chauffage dans le modèle. L’eau de source reste gravitaire. Il n’y a pas de dette cachée : les coûts impayés ne sont pas suivis, limite économique explicite. Les primes d’objectifs et l’aide de reprise sont annoncées comme **aides pédagogiques fictives** ; le mode expert les retire, avec la même biologie.

## Direction visuelle et fidélité

- Vue paysagère générée au rendu photographique, explicitement présentée comme illustration d’ambiance. Elle ne reflète pas les constructions ultérieures ; les repères de lots conduisent à la visite 3D.
- Ferme 3D en temps réel avec géométrie originale : maçonnerie, charpentes, toitures à deux pans, volets, portes, gouttières, passerelles, canal et bassins équipés. Textures procédurales, eau animée, ombres et lumière naturelle.
- Truite : silhouette fuselée, bande rose, points noirs, adipeuse. Carpe : corps haut, grandes écailles, barbillons. Tilapia : corps comprimé, dorsale épineuse, caudale striée. Modèles originaux inspectables en rotation et zoom.
- Planche d’identification générée par IA : illustration artistique réaliste, **pas une photographie documentaire** ni une source scientifique. Fichier local `public/assets/species-atlas.png` ; aucun chargement distant à l’exécution.
- Les poissons visibles constituent un échantillon du lot, à échelle indicative. La transparence accentuée sous l’eau est un outil pédagogique ; la turbidité réelle d’un étang peut masquer les poissons.
- Le rendu vise une observation détaillée et reconnaissable. Il ne prétend pas reproduire un environnement photogrammétrique ou un film indiscernable du réel. Reliefs, végétation, eau et anatomie restent simplifiés, notamment sur mobile.

## Vérifications et prochains niveaux de validation

Les tests couvrent les unités, les bilans de renouvellement, la conservation de l’aliment, la croissance bornée par le FCR, l’hypoxie, la maturation du biofiltre, l’hivernage, les délais et la persistance. Les scénarios de calibration à faible charge produisent environ 154 jours pour 50 → 450 g de truite et 207 jours pour 30 → 650 g de tilapia, et 529 jours sur deux saisons de croissance pour une carpe de 100 g à 1 kg ; **résultats du moteur**, pas observations expérimentales. Le parcours navigateur vérifie commandes, sauvegardes, 3D, repli sans WebGL, mobile et accessibilité automatisée.

Pour revendiquer une fidélité métier avancée, il reste à consulter les documents actuellement bloqués, confronter les paramètres à des données de lots et faire relire la conduite d’élevage par un professionnel. Le modèle omet encore tri/calibrage, dispersion individuelle, reproduction, maladies, traitements, chaîne du froid, O₂ d’entrée mesuré, hydraulique longitudinale, nitrates/nitrites, CO₂, alcalinité, sédiments, effluents et production naturelle d’étang.

### Résultat de vérification de cette livraison

- Installation reproductible : `npm ci --cache /tmp/les-etangs-npm-cache --no-audit --no-fund`, réussie.
- Moteur : **27 tests Vitest réussis**.
- Navigateur : **8 parcours Playwright validés**. La dernière exécution complète a validé 7 parcours ; le contrôle mobile/accessibilité restant a été relancé avec succès après correction du contraste des numéros de bassins.
- Production : `npm run build` réussi ; images locales, chargement du module de visite, ration, croissance, sauvegarde et restauration vérifiés sur le serveur de production. Vite signale la taille du module Three.js différé (environ 622 Ko avant compression, 161 Ko gzip).
- Inspection visuelle : vues ferme/bâtiments/bassin, trois espèces, interface ordinateur et mobile. Les modèles 3D restent visiblement simplifiés ; les illustrations d’ambiance et d’identification apportent le rendu photographique.
- Instructions d’installation/démarrage enregistrées dans le brouillon cloud ; activation réseau et publication restent à effectuer depuis les paramètres de l’environnement.
