import { Card, Tabs } from "./ui/Primitives";
import { useState } from "react";
import { SpeciesPortrait } from "./world/SpeciesPortrait";
import { SPECIES, number } from "./game";
import {
  SCIENCE_TERMS,
  scienceText,
  type ScienceTerm,
} from "./ui/ScientificHelp";
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
  const [tab, setTab] = useState<"practice" | "species" | "water" | "model">(
    "practice",
  );
  const sections = [
    {
      icon: <BookOpen />,
      title: "Analyser l’eau",
      text: "Ouvrez Construire et suivez la prochaine action. Le laboratoire répond après 2 jours, puis vous choisissez une filière adaptée au site. Lancez le chantier et préparez le magasin d’aliments. L’écloserie livre les juvéniles en 4 jours ; le fabricant livre les aliments en 2 jours. Commandez avant d’en avoir besoin.",
    },
    {
      icon: <Landmark />,
      title: "Du client au paiement",
      text: "À 80 % du calibre commercial, réservez un client pour les 30 prochains jours. Une chambre froide opérationnelle est obligatoire. Récoltez au calibre et expédiez rapidement : le stock froid se conserve 3 jours dans ce scénario. La coopérative prend les poissons entiers et règle 7 jours après livraison. Les poissonneries demandent un atelier : 1 jour de préparation, 85 % de masse vendable, puis paiement à 3 jours. Le transport prend 1 jour. Les lots périmés deviennent des pertes.",
    },
    {
      icon: <Clock3 />,
      title: "Le rythme biologique",
      text: "Une journée de jeu contient 24 pas horaires de calcul de l’eau. La croissance de 50 g à la taille de vente prend des mois. Pause arrête le calendrier. ×1, ×2, ×4 et ×8 durent respectivement 4, 2, 1 et 0,5 seconde par jour. L’avance au prochain événement prend 0,25 seconde par jour et peut être interrompue. Espace suspend/reprend ; 1–5 choisissent Pause à ×8 hors des champs de saisie. Vous démarrez sans bassin aménagé. L’avance guidée s’arrête aux réceptions, aux risques et aux étapes de vente. Il n’y a pas de progression hors ligne.",
    },
    {
      icon: <Thermometer />,
      title: "Choisir son installation",
      text: "La truite occupe les bassins alimentés par la source fraîche ; la carpe, l’étang de terre ; le tilapia, un circuit recirculé chauffé à 27 °C sous serre. Le jeu refuse les introductions incompatibles. La température de l’air n’est pas celle de l’eau : chaque installation possède une inertie thermique.",
    },
    {
      icon: <Package />,
      title: "Cibler la ration",
      text: "Programmer une ration réserve des aliments pour les prochaines 24 h. La recommandation dépend du poids, de l’espèce, de la température et de l’eau. La croissance provient de l’aliment consommé, divisé par un FCR nominal, puis limité par les conditions. La distribution automatique recalcule chaque journée. Les excédents deviennent une charge polluante.",
    },
    {
      icon: <Droplets />,
      title: "Lire les unités",
      text: "L’oxygène est exprimé en mg/L ; le débit en L/s ; la densité en kg/m³. TAN désigne l’azote ammoniacal total en mg N/L. NH₃-N désigne la fraction non ionisée, calculée avec le pH et la température : les deux mesures ne sont pas interchangeables. Le pH est supposé tamponné dans ce scénario.",
    },
    {
      icon: <ShieldCheck />,
      title: "Prévenir les risques",
      text: "Augmentez le débit et installez une aération si l’oxygène baisse. Un biofiltre met 30 jours à atteindre sa capacité simulée. Retirer les boues et renouveler 30 % de l’eau réduit la charge azotée mais ne guérit pas instantanément le lot. L’indice de santé n’est pas un diagnostic vétérinaire ; aucune maladie ni médicament n’est simulé.",
    },
    {
      icon: <Fish />,
      title: "Réception et vide sanitaire",
      text: "Les nouveaux juvéniles sont considérés acclimatés à la livraison puis observés pendant 14 jours. Cette observation dans le bassin ne remplace pas une véritable quarantaine isolée. Après récolte, le jeu réserve 7 jours au nettoyage et au vide sanitaire. Les bassins de source demandent 14 jours de chantier, l’étang 21 jours et la serre 45 jours avec mise en service.",
    },
    {
      icon: <Landmark />,
      title: "Comprendre les charges",
      text: "Le bilan distingue 18 €/jour de travail partiel dès le premier bassin, puis 10 €/bassin supplémentaire, 2,50 €/bassin/jour d’entretien, l’électricité à 0,22 €/kWh et une redevance simplifiée d’eau. Chauffage et pompes pèsent sur les coûts. Ces prix, investissements et salaires sont des hypothèses de scénario, pas des devis ou cours réels. Les petites primes sont des aides pédagogiques ; le mode expert les supprime.",
    },
    {
      icon: <Eye />,
      title: "Reconnaître les espèces",
      text: "La truite a une bande rosée, des points noirs et une nageoire adipeuse. La carpe porte de grandes écailles bronze et des barbillons. Le tilapia a une dorsale épineuse et une queue striée. Le terrain montre l’état actuel des bassins. La carte prend le relais lorsque la 3D est indisponible. La vue Poissons permet de tourner les modèles et de consulter un portrait issu du même modèle 3D. Les poissons de la ferme sont un échantillon visuel ; le mode observation accentue la transparence de l’eau.",
    },
  ];
  const article = (i: number) => (
    <details className="guide-article" key={sections[i].title}>
      <summary>
        {sections[i].icon}
        <span>{sections[i].title}</span>
      </summary>
      <p>{sections[i].text}</p>
    </details>
  );
  return (
    <div className="guide-content">
      <Tabs
        label="Encyclopédie"
        value={tab}
        onChange={setTab}
        items={[
          { id: "practice", label: "Pratique" },
          { id: "species", label: "Espèces" },
          { id: "water", label: "Eau et alimentation" },
          { id: "model", label: "À propos du modèle" },
        ]}
      >
        {tab === "practice" && (
          <div className="guide-articles">
            <svg
              className="guide-illustration"
              viewBox="0 0 320 90"
              role="img"
              aria-label="De l’eau au poisson, puis du bassin au client"
            >
              <path
                d="M0 75Q45 25 90 65T190 50T320 60V90H0Z"
                fill="var(--surface-muted)"
              />
              <path
                d="M10 60Q90 80 140 62T300 62"
                stroke="var(--water)"
                strokeWidth="6"
                fill="none"
              />
              <path
                d="M30 48V25H84V52M156 52V20H208V52M251 49V15H297V53"
                fill="var(--surface-raised)"
                stroke="var(--primary)"
                strokeWidth="3"
              />
            </svg>
            {[0, 1, 2, 6, 7, 8].map(article)}
          </div>
        )}
        {tab === "species" && (
          <div className="guide-articles">
            {Object.values(SPECIES).map((s) => (
              <Card className="guide-species" key={s.id}>
                <SpeciesPortrait species={s.id} />
                <h3>{s.name}</h3>
                <p>
                  {s.id === "trout"
                    ? "Bande rosée, points noirs et nageoire adipeuse."
                    : s.id === "carp"
                      ? "Grandes écailles bronze et barbillons autour de la bouche."
                      : "Dorsale épineuse et queue striée."}
                </p>
                <small>
                  {s.temperature.join("–")} °C · oxygène ≥ {s.minOxygen} mg/L ·
                  FCR nominal {number(s.fcr, 2)}
                </small>
              </Card>
            ))}
            {[3, 9].map(article)}
          </div>
        )}
        {tab === "water" && (
          <div className="guide-articles">
            <p>
              Ouvrez une mesure pour connaître son unité et les interventions
              utiles. Les seuils du bassin sélectionné figurent dans son
              inspecteur.
            </p>
            {(Object.keys(SCIENCE_TERMS) as ScienceTerm[]).map((term) => (
              <details className="guide-article" key={term}>
                <summary>
                  <Droplets size={20} />
                  <span>{SCIENCE_TERMS[term].label}</span>
                </summary>
                <p>{scienceText(term)}</p>
              </details>
            ))}
            {[4, 5].map(article)}
          </div>
        )}
        {tab === "model" && (
          <>
            <section className="research-card">
              <span className="section-kicker">
                DOCUMENTATION & TRANSPARENCE
              </span>
              <h2>À propos du modèle</h2>
              <p>
                Le rendu 3D représente un échantillon des poissons du lot, à une
                échelle indicative. L’observation sous l’eau accentue sa
                transparence. Les portraits utilisent les mêmes modèles
                originaux que le monde. Ce sont des repères visuels, pas des
                mesures scientifiques. Magasin, froid et atelier apparaissent à
                la fin des travaux ; la maison initiale appartient au décor.
              </p>
              <p>
                Les camions illustrent les arrivées et départs enregistrés. La
                lumière suit l’horloge du jeu ; elle ne change pas la biologie.
                Le givre du décor interprète l’air froid. La glace sur l’étang
                exige une eau à 0 °C ou moins : le climat annuel standard ne la
                produit pas. Les saisons ne déclenchent pas un gel artificiel.
              </p>
              <p>
                Les coûts, prix, températures et coefficients sont ceux d’un
                scénario pédagogique. Le froid, les contrôles et les délais sont
                simplifiés ; les obligations sanitaires réelles ne sont pas
                simulées intégralement.
              </p>
              <p>
                La documentation des logiciels scientifiques respirometry et
                marelac a été consultée pour les unités d’oxygène, le
                renouvellement d’eau, la dépendance thermique de la respiration
                et les formes de l’azote. Les documents FAO de conduite
                d’élevage sont identifiés mais leur accès réseau reste à
                débloquer. Les seuils d’élevage et les coefficients économiques
                sont donc des hypothèses de scénario, à confirmer avec des
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
                <Info size={17} /> Les maladies, le tri de tailles, la
                reproduction, les autorisations de prélèvement, les effets des
                effluents sur le milieu et la TVA ne sont pas simulés. La chaîne
                du froid et la préparation sont simplifiées. Ce modèle
                pédagogique n’est pas un outil de dimensionnement professionnel.
              </p>
            </section>
            <p className="model-limit">
              Les courbes d’eau mémorisent les observations de cette session sur
              quatorze jours. L’estimation de durée prolonge la croissance de la
              veille ; ce n’est pas une date garantie.
            </p>
          </>
        )}
      </Tabs>
    </div>
  );
}
