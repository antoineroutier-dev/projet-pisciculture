import { Tooltip } from "./Tooltip";
import { SPECIES, number, type Pond } from "../game";
import { pondVitals } from "../state/pondSelectors";
export const SCIENCE_TERMS = {
  oxygen: {
    label: "Oxygène dissous",
    text: "Oxygène disponible dans l’eau, en mg/L. Les seuils dépendent de l’espèce. Si la valeur baisse, vérifiez débit et aération et réduisez la ration.",
  },
  ammonia: {
    label: "Ammoniac · NH₃-N",
    text: "Fraction non ionisée de l’azote ammoniacal, en mg/L. Sa toxicité dépend du pH et de la température. Vérifiez filtration, boues et apports d’aliments.",
  },
  tan: {
    label: "Azote ammoniacal total · TAN",
    text: "Somme de l’ammoniac et de l’ammonium, en mg N/L. Il n’existe pas de seuil unique sans connaître pH et température : surveillez la fraction NH₃-N et réduisez les apports excessifs.",
  },
  fcr: {
    label: "Indice de conversion · FCR",
    text: "Kilogrammes d’aliment consommé par kilogramme de biomasse produite. Une valeur plus basse indique une meilleure conversion, à conditions comparables. Corrigez la ration et la qualité de l’eau plutôt que de forcer la croissance.",
  },
  density: {
    label: "Densité d’élevage",
    text: "Biomasse divisée par le volume, en kg/m³. Les limites dépendent de l’installation. Anticipez les collectes avant saturation et vérifiez l’oxygène.",
  },
  flow: {
    label: "Débit d’eau neuve",
    text: "Litres d’eau renouvelés par seconde, en L/s. La source fournit 24 L/s partagés entre les installations. Augmenter un débit consomme cette ressource ; vérifiez les autres bassins avant de le modifier.",
  },
} as const;
export type ScienceTerm = keyof typeof SCIENCE_TERMS;
export function scienceText(term: ScienceTerm, pond?: Pond) {
  const entry = SCIENCE_TERMS[term];
  if (!pond) return entry.text;
  const vital = pondVitals(pond).find((v) => v.key === term);
  return `${entry.text}${vital ? ` ${vital.threshold} ${vital.unit}.` : term === "fcr" && pond.species ? ` FCR nominal de l’espèce dans ce scénario : ${number(SPECIES[pond.species].fcr, 2)}.` : ""}`;
}
export function ScientificHelp({
  term,
  pond,
}: {
  term: ScienceTerm;
  pond?: Pond;
}) {
  return (
    <Tooltip text={scienceText(term, pond)}>
      {(id) => (
        <button
          type="button"
          className="vital-help"
          aria-label={`Comprendre : ${SCIENCE_TERMS[term].label}`}
          aria-describedby={id}
        >
          ?
        </button>
      )}
    </Tooltip>
  );
}
