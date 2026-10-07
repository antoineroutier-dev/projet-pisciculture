import { operatingBalance, periodBalance, type Period } from "./ledger";
import { formatMoney, formatKg } from "../ui/format";
/** Advice uses observed totals only; no inferred feed waste or fictitious batch accounting. */
export function cycleAdvice(p: Period): string[] {
  const fixed = p.costs.labour + p.costs.maintenance;
  const first =
    p.costs.investment > 0
      ? `${formatMoney(p.costs.investment / 100)} d’investissements équipent aussi les prochains lots. Hors investissements identifiés, le solde observé est de ${formatMoney(operatingBalance(p) / 100)}.`
      : p.kg > 0
        ? `${formatMoney(fixed / 100)} de travail et d’entretien identifiés, soit ${formatMoney(fixed / 100 / p.kg, true)}/kg payé. Comparez ce coût avant d’augmenter la production dans les limites de l’eau.`
        : "Aucun kilogramme payé sur cette période. Réservez un client avant la récolte et suivez la date de règlement.";
  const second =
    p.gainKg > 0 && p.feedKg >= 0
      ? `${formatKg(p.feedKg)} d’aliments utilisés pour ${formatKg(p.gainKg)} de gain observé (ratio ${(p.feedKg / p.gainKg).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}). Vérifiez ration et oxygène avant d’augmenter l’alimentation.`
      : "Le gain et les aliments observés ne permettent pas encore de calculer un ratio fiable. Suivez le FCR du lot dans Alimentation.";
  const third =
    p.wasteKg > 0
      ? `${formatKg(p.wasteKg)} perdus au froid. Expédiez plus tôt et préparez les débouchés avant de récolter.`
      : p.dispatchCount > 0
        ? `Aucune perte au froid observée. Expédition après ${(p.dispatchDays / p.dispatchCount).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} jour(s) en moyenne : conservez ce suivi des délais.`
        : "Aucune expédition observée sur cette période. Prévoyez la chambre froide et le transport avant la récolte.";
  return [first, second, third];
}
export function cycleComparison(p: Period, previous?: Period) {
  if (
    !previous ||
    p.incomplete ||
    previous.incomplete ||
    p.kg <= 0 ||
    previous.kg <= 0
  )
    return null;
  return (
    periodBalance(p) / 100 / p.kg - periodBalance(previous) / 100 / previous.kg
  );
}
