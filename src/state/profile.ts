import type { Game } from "../game";
import type { Ledger, Period } from "./ledger";
import { monthKey, sumCosts } from "./ledger";
import { t } from "../i18n";
export const ACHIEVEMENT_IDS = [
  "water",
  "pond",
  "fish",
  "feeding",
  "contract",
  "harvest",
  "dispatch",
  "paid",
  "diversify",
  "volume",
  "profitable",
  "cold",
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];
export type Earned = {
  id: AchievementId;
  observedDay: number;
  imported: boolean;
};
export type Profile = {
  version: 1;
  earned: Earned[];
  profitableMonths: string[];
  introSeen: boolean;
  tutorial: "active" | "dismissed" | "completed";
};
export const initialProfile = (legacy = false): Profile => ({
  version: 1,
  earned: [],
  profitableMonths: [],
  introSeen: legacy,
  tutorial: legacy ? "dismissed" : "active",
});
const complete = (p: Period) =>
  !p.incomplete && p.metricsStartDay === p.startDay;
/** Only fully observed, closed calendar months count. Aid is excluded from income. */
export function profitableMonths(ledger: Ledger) {
  return ledger.months
    .filter(
      (m) =>
        complete(m) &&
        m.month < monthKey(ledger.lastDay) &&
        new Date(Date.UTC(2026, 3, m.startDay)).getUTCDate() === 1 &&
        monthKey(m.endDay + 1) !== m.month &&
        m.income > sumCosts(m.costs),
    )
    .map((m) => m.month);
}
export const cleanPaidCycle = (ledger: Ledger) =>
  ledger.cycles.some(
    (c) =>
      complete(c) &&
      c.income > 0 &&
      c.kg > 0 &&
      c.dispatchCount > 0 &&
      c.wasteKg === 0,
  );
/** Read-only observations; neither the engine nor the financial ledger is modified. */
export function observeProfile(
  profile: Profile,
  game: Game,
  ledger: Ledger,
  imported = false,
): Profile {
  const months = [
    ...new Set([...profile.profitableMonths, ...profitableMonths(ledger)]),
  ]
    .sort()
    .slice(0, 12);
  const d = game.development,
    sold = game.stats.soldKg > 0;
  const facts: Record<AchievementId, boolean> = {
    water: d.surveyed,
    pond: game.ponds.some((p) => p.built),
    fish:
      game.ponds.some((p) => p.count > 0) ||
      d.batches.length > 0 ||
      d.shipments.length > 0 ||
      sold,
    feeding: game.stats.feedUsed > 0,
    contract:
      d.contracts.length > 0 ||
      d.batches.length > 0 ||
      d.shipments.length > 0 ||
      sold,
    harvest: d.batches.length > 0 || d.shipments.length > 0 || sold,
    dispatch: d.shipments.length > 0 || sold,
    paid: d.paid > 0,
    diversify:
      new Set(game.ponds.filter((p) => p.built).map((p) => p.facility)).size >=
      2,
    volume: game.stats.soldKg >= 5000,
    profitable: months.length >= 12,
    cold: cleanPaidCycle(ledger),
  };
  const added = ACHIEVEMENT_IDS.filter(
    (id) => facts[id] && !profile.earned.some((e) => e.id === id),
  ).map((id) => ({ id, observedDay: game.day, imported }));
  if (!added.length && months.join() === profile.profitableMonths.join())
    return profile;
  return {
    ...profile,
    earned: [...profile.earned, ...added],
    profitableMonths: months,
  };
}
export function parseProfile(raw: unknown, game: Game): Profile {
  const fail = (): never => {
    throw Error(t("profile.invalid"));
  };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail();
  const r = raw as Record<string, unknown>;
  if (
    r.version !== 1 ||
    typeof r.introSeen !== "boolean" ||
    !["active", "dismissed", "completed"].includes(String(r.tutorial)) ||
    !Array.isArray(r.earned) ||
    r.earned.length > 12 ||
    !Array.isArray(r.profitableMonths) ||
    r.profitableMonths.length > 12
  )
    return fail();
  const earned: Earned[] = r.earned.map((v) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return fail();
    const e = v as Record<string, unknown>;
    if (
      !ACHIEVEMENT_IDS.includes(e.id as AchievementId) ||
      typeof e.observedDay !== "number" ||
      !Number.isSafeInteger(e.observedDay) ||
      e.observedDay < 1 ||
      e.observedDay > game.day ||
      typeof e.imported !== "boolean"
    )
      return fail();
    return {
      id: e.id as AchievementId,
      observedDay: e.observedDay,
      imported: e.imported,
    };
  });
  if (new Set(earned.map((e) => e.id)).size !== earned.length) return fail();
  const months = r.profitableMonths.map((v) =>
    typeof v === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(v) &&
    v >= "2026-04" &&
    v < monthKey(game.day)
      ? v
      : fail(),
  );
  if (new Set(months).size !== months.length) return fail();
  return {
    version: 1,
    earned,
    profitableMonths: months,
    introSeen: r.introSeen,
    tutorial: r.tutorial as Profile["tutorial"],
  };
}
