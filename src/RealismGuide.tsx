import {
  BookOpen,
  Droplets,
  Fish,
  Clock3,
  Package,
  ShieldCheck,
  Landmark,
  Info,
  ExternalLink,
  Eye,
  Thermometer,
} from "lucide-react";
export default function RealismGuide() {
  const sections = [
    {
      icon: <BookOpen />,
      title: "Votre première décision : faire analyser l’eau",
      text: "Ouvrez Mon projet et suivez la prochaine action. Le laboratoire répond après 2 jours, puis vous choisissez une filière adaptée au site. Lancez le chantier et préparez le magasin d’aliments. L’écloserie livre les juvéniles en 4 jours ; le fabricant livre les aliments en 2 jours. Commandez avant d’en avoir besoin.",
    },
    {
      icon: <Landmark />,
      title: "Une récolte n’est pas encore une vente payée",
      text: "À 80 % du calibre commercial, réservez un client pour les 30 prochains jours. Une chambre froide opérationnelle est obligatoire. Récoltez au calibre et expédiez rapidement : le stock froid se conserve 3 jours dans ce scénario. La coopérative prend les poissons entiers et règle 7 jours après livraison. Les poissonneries demandent un atelier : 1 jour de préparation, 85 % de masse vendable, puis paiement à 3 jours. Le transport prend 1 jour. Les lots périmés deviennent des pertes.",
    },
    {
      icon: <Clock3 />,
      title: "Des mois, pas des minutes biologiques",
      text: "Une journée de jeu contient 24 pas horaires de calcul de l’eau. La croissance de 50 g à la taille de vente prend des mois. Les vitesses ×1, ×3, ×12 et ×60 accélèrent seulement l’attente. Vous démarrez sans bassin aménagé. L’avance guidée s’arrête aux réceptions, aux risques et aux étapes de vente. Il n’y a pas de progression hors ligne.",
    },
    {
      icon: <Thermometer />,
      title: "À chaque espèce, son installation",
      text: "La truite occupe les bassins alimentés par la source fraîche ; la carpe, l’étang de terre ; le tilapia, un circuit recirculé chauffé à 27 °C sous serre. Le jeu refuse les introductions incompatibles. La température de l’air n’est pas celle de l’eau : chaque installation possède une inertie thermique.",
    },
    {
      icon: <Package />,
      title: "La ration devient de la biomasse",
      text: "Programmer une ration réserve des aliments pour les prochaines 24 h. La recommandation dépend du poids, de l’espèce, de la température et de l’eau. La croissance provient de l’aliment consommé, divisé par un FCR nominal, puis limité par les conditions. La distribution automatique recalcule chaque journée. Les excédents deviennent une charge polluante.",
    },
    {
      icon: <Droplets />,
      title: "Lire l’eau dans les bonnes unités",
      text: "L’oxygène est exprimé en mg/L ; le débit en L/s ; la densité en kg/m³. TAN désigne l’azote ammoniacal total en mg N/L. NH₃-N désigne la fraction non ionisée, calculée avec le pH et la température : les deux mesures ne sont pas interchangeables. Le pH est supposé tamponné dans ce scénario.",
    },
    {
      icon: <ShieldCheck />,
      title: "Prévenir avant de corriger",
      text: "Augmentez le débit et installez une aération si l’oxygène baisse. Un biofiltre met 30 jours à atteindre sa capacité simulée. Retirer les boues et renouveler 30 % de l’eau réduit la charge azotée mais ne guérit pas instantanément le lot. L’indice de santé n’est pas un diagnostic vétérinaire ; aucune maladie ni médicament n’est simulé.",
    },
    {
      icon: <Fish />,
      title: "Suivre les lots et respecter les délais",
      text: "Les nouveaux juvéniles sont considérés acclimatés à la livraison puis observés pendant 14 jours. Cette observation dans le bassin ne remplace pas une véritable quarantaine isolée. Après récolte, le jeu réserve 7 jours au nettoyage et au vide sanitaire. Les bassins de source demandent 14 jours de chantier, l’étang 21 jours et la serre 45 jours avec mise en service.",
    },
    {
      icon: <Landmark />,
      title: "Une vraie contrainte de budget",
      text: "Le bilan distingue 18 €/jour de travail partiel dès le premier bassin, puis 10 €/bassin supplémentaire, 2,50 €/bassin/jour d’entretien, l’électricité à 0,22 €/kWh et une redevance simplifiée d’eau. Chauffage et pompes pèsent sur les coûts. Ces prix, investissements et salaires sont des hypothèses de scénario, pas des devis ou cours réels. Les petites primes sont des aides pédagogiques ; le mode expert les supprime.",
    },
    {
      icon: <Eye />,
      title: "Observer les espèces",
      text: "La truite a une bande rosée, des points noirs et une nageoire adipeuse. La carpe porte de grandes écailles bronze et des barbillons. Le tilapia a une dorsale épineuse et une queue striée. La carte représente les parcelles encore vides. L’illustration d’ambiance montre une ferme achevée ; la visite 3D montre l’état actuel des bassins. La vue Poissons permet de tourner les modèles et de consulter une planche artistique réaliste. Les poissons de la ferme sont un échantillon visuel ; le mode observation accentue la transparence de l’eau.",
    },
  ];
  return (
    <div className="guide-content">
      <div className="guide-intro">
        <BookOpen size={30} />
        <div>
          <span className="eyebrow">LE CARNET DE TERRAIN · MODÈLE V3</span>
          <h2>Comprendre avant d’intervenir.</h2>
          <p>
            Des mesures concrètes, des délais biologiques et des décisions
            expliquées.
          </p>
        </div>
      </div>
      <div className="guide-grid">
        {sections.map((s) => (
          <article className="guide-card" key={s.title}>
            <span className="guide-icon">{s.icon}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </article>
        ))}
      </div>
      <section className="research-card">
        <span className="section-kicker">DOCUMENTATION & TRANSPARENCE</span>
        <h2>Sur quoi repose la simulation ?</h2>
        <p>
          La documentation des logiciels scientifiques respirometry et marelac a
          été consultée pour les unités d’oxygène, le renouvellement d’eau, la
          dépendance thermique de la respiration et les formes de l’azote. Les
          documents FAO de conduite d’élevage sont identifiés mais leur accès
          réseau reste à débloquer. Les seuils d’élevage et les coefficients
          économiques sont donc des hypothèses de scénario, à confirmer avec des
          références métier et un pisciculteur.
        </p>
        <div className="research-links">
          <a
            href="https://github.com/cran/respirometry/blob/7bca952ba7792134d6c11c6afbe48185c69ce5da/R/flush_water.R"
            target="_blank"
            rel="noreferrer"
          >
            Renouvellement d’eau <ExternalLink size={12} />
          </a>
          <a
            href="https://github.com/cran/respirometry/blob/7bca952ba7792134d6c11c6afbe48185c69ce5da/R/Q10.R"
            target="_blank"
            rel="noreferrer"
          >
            Température & respiration <ExternalLink size={12} />
          </a>
          <a
            href="https://www.fao.org/4/i2125e/i2125e.pdf"
            target="_blank"
            rel="noreferrer"
          >
            Manuel FAO · référence à consulter <ExternalLink size={12} />
          </a>
        </div>
        <p className="simulation-note">
          <Info size={17} /> Les maladies, le tri de tailles, la reproduction,
          les autorisations de prélèvement, les effets des effluents sur le
          milieu et la TVA ne sont pas simulés. La chaîne du froid et la
          préparation sont simplifiées. Ce modèle pédagogique n’est pas un outil
          de dimensionnement professionnel.
        </p>
      </section>
    </div>
  );
}
