import { t, localeTag } from "../i18n";
import { operatingBalance, periodBalance, type Period } from "./ledger";
import { formatMoney, formatKg } from "../ui/format";
/** Advice uses observed totals only; no inferred feed waste or fictitious batch accounting. */
export function cycleAdvice(p: Period): string[] {
  const fixed = p.costs.labour + p.costs.maintenance;
  const first =
    p.costs.investment > 0
      ? t(
          "m_29293be4c2",
          formatMoney(p.costs.investment / 100),
          formatMoney(operatingBalance(p) / 100),
        )
      : p.kg > 0
        ? t(
            "m_71c19a4bd9",
            formatMoney(fixed / 100),
            formatMoney(fixed / 100 / p.kg, true),
          )
        : t("m_7c999d25b1");
  const second =
    p.gainKg > 0 && p.feedKg >= 0
      ? t(
          "m_3d55d098b9",
          formatKg(p.feedKg),
          formatKg(p.gainKg),
          (p.feedKg / p.gainKg).toLocaleString(localeTag(), {
            maximumFractionDigits: 2,
          }),
        )
      : t("m_ecab0a2e15");
  const third =
    p.wasteKg > 0
      ? t("m_c61e528d30", formatKg(p.wasteKg))
      : p.dispatchCount > 0
        ? t(
            "m_c23b9ea92c",
            (p.dispatchDays / p.dispatchCount).toLocaleString(localeTag(), {
              maximumFractionDigits: 1,
            }),
          )
        : t("m_6ff480c627");
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
