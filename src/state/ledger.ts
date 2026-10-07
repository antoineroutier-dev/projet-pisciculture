import {
  costBreakdown,
  dailyCost,
  FOOD_PACKS,
  type Action,
  type Game,
} from "../game";
import { FEED_FREIGHT, STOCK_FREIGHT } from "../development";
export const COST_LABELS = {
  seed: "Juvéniles",
  feed: "Aliments",
  labour: "Travail",
  energy: "Énergie",
  water: "Eau",
  transport: "Transport",
  investment: "Investissements",
  maintenance: "Entretien",
  preparation: "Récolte et préparation",
  survey: "Étude de l’eau",
  unknown: "Non ventilé",
} as const;
export type Cost = keyof typeof COST_LABELS;
export type Costs = Record<Cost, number>;
export const costKeys = Object.keys(COST_LABELS) as Cost[];
export const cents = (value: number) => Math.round(value * 100);
export const emptyCosts = (): Costs =>
  Object.fromEntries(costKeys.map((key) => [key, 0])) as Costs;
export const sumCosts = (costs: Costs) =>
  costKeys.reduce((n, key) => n + costs[key], 0);
const addCosts = (a: Costs, b: Costs): Costs =>
  Object.fromEntries(costKeys.map((key) => [key, a[key] + b[key]])) as Costs;
export type Period = {
  startDay: number;
  endDay: number;
  metricsStartDay: number;
  costs: Costs;
  income: number;
  aid: number;
  kg: number;
  feedKg: number;
  gainKg: number;
  wasteKg: number;
  mortality: number;
  dispatchDays: number;
  dispatchCount: number;
  incomplete: boolean;
};
export type Cycle = Period & {
  id: number;
  payments: { id: number; kg: number; value: number; buyer: string }[];
};
export type Month = Period & { month: string };
export type Ledger = {
  version: 1;
  startDay: number;
  lastDay: number;
  openingIncomplete: boolean;
  cumulativeCosts: Costs;
  current: Period;
  months: Month[];
  cycles: Cycle[];
};
export function emptyPeriod(day: number, incomplete = false): Period {
  return {
    startDay: day,
    endDay: day,
    metricsStartDay: day,
    costs: emptyCosts(),
    income: 0,
    aid: 0,
    kg: 0,
    feedKg: 0,
    gainKg: 0,
    wasteKg: 0,
    mortality: 0,
    dispatchDays: 0,
    dispatchCount: 0,
    incomplete,
  };
}
export function initialLedger(game: Game): Ledger {
  const cumulativeCosts = emptyCosts();
  cumulativeCosts.unknown = cents(game.stats.expenses);
  const current = emptyPeriod(
    game.day,
    game.development.migrated || game.development.paid > 0,
  );
  // Before the first settlement, the total cost of the first cycle is known,
  // although the historical categories were not stored by V1–V3.
  if (!current.incomplete) {
    current.startDay = 1;
    current.costs.unknown = cents(game.stats.expenses);
  }
  return {
    version: 1,
    startDay: game.day,
    lastDay: game.day,
    openingIncomplete:
      game.day > 1 || game.stats.expenses > 0 || game.development.migrated,
    cumulativeCosts,
    current,
    months: [],
    cycles: [],
  };
}
export function expenseCategories(
  before: Game,
  after: Game,
  action: Action | { type: "day" },
): Costs {
  const costs = emptyCosts(),
    debit = cents(after.stats.expenses) - cents(before.stats.expenses);
  if (!debit) return costs;
  if (action.type === "day") {
    const daily = costBreakdown(before);
    if (debit === cents(dailyCost(before))) {
      costs.labour = cents(daily.labour);
      costs.energy = cents(daily.electricity);
      costs.water = cents(daily.water);
      costs.maintenance = cents(daily.maintenance);
    } // When unfunded, the engine records only a partial total, no per-post allocation.
  } else if (action.type === "food") {
    costs.feed = cents(FOOD_PACKS[action.pack].cost);
    costs.transport = cents(FEED_FREIGHT);
  } else if (action.type === "stock") {
    costs.transport = cents(STOCK_FREIGHT);
    costs.seed = debit - costs.transport;
  } else if (["asset", "build", "upgrade"].includes(action.type))
    costs.investment = debit;
  else if (action.type === "dispatch") costs.transport = debit;
  else if (action.type === "harvest" || action.type === "process")
    costs.preparation = debit;
  else if (action.type === "clean") costs.maintenance = debit;
  else if (action.type === "survey") costs.survey = debit;
  costs.unknown = debit - sumCosts(costs);
  if (costKeys.some((k) => costs[k] < 0))
    throw Error("Ventilation incohérente avec la dépense du moteur.");
  return costs;
}
export const monthKey = (day: number) =>
  new Date(Date.UTC(2026, 3, day)).toISOString().slice(0, 7);
/** Exact observation of one successful command / one engine day, never a simulation rule. */
export function recordLedger(
  ledger: Ledger,
  before: Game,
  after: Game,
  action: Action | { type: "day" },
): Ledger {
  if (
    ledger.lastDay !== before.day ||
    sumCosts(ledger.cumulativeCosts) !== cents(before.stats.expenses)
  )
    throw Error("Le registre doit correspondre à l’état avant la commande.");
  if (after.day < before.day || after.day > before.day + 1)
    throw Error("Le registre attend une commande ou une seule journée.");
  const costs = expenseCategories(before, after, action),
    debit = sumCosts(costs);
  const income = cents(after.stats.income) - cents(before.stats.income);
  const aid = cents(after.money) - cents(before.money) + debit - income;
  const batch =
    action.type === "dispatch"
      ? before.development.batches.find((b) => b.id === action.id)
      : undefined;
  const add = (p: Period): Period => ({
    ...p,
    endDay: after.day,
    costs: addCosts(p.costs, costs),
    income: p.income + income,
    aid: p.aid + aid,
    kg: p.kg + after.stats.soldKg - before.stats.soldKg,
    feedKg: p.feedKg + after.stats.feedUsed - before.stats.feedUsed,
    gainKg:
      p.gainKg +
      after.ponds.reduce(
        (n, pond, i) =>
          n + Math.max(0, pond.totalGain - before.ponds[i].totalGain),
        0,
      ),
    wasteKg: p.wasteKg + after.development.wasteKg - before.development.wasteKg,
    mortality: p.mortality + after.stats.mortality - before.stats.mortality,
    dispatchDays: p.dispatchDays + (batch ? before.day - batch.harvested : 0),
    dispatchCount: p.dispatchCount + (batch ? 1 : 0),
  });
  const current = add(ledger.current),
    month = monthKey(after.day);
  const oldMonth = ledger.months.find((m) => m.month === month);
  const monthRow = {
    ...add(
      oldMonth ||
        emptyPeriod(
          after.day,
          ledger.openingIncomplete && month === monthKey(ledger.startDay),
        ),
    ),
    month,
  };
  const next: Ledger = {
    ...ledger,
    lastDay: after.day,
    cumulativeCosts: addCosts(ledger.cumulativeCosts, costs),
    current,
    months: [...ledger.months.filter((m) => m.month !== month), monthRow].slice(
      -120,
    ),
    cycles: [...ledger.cycles],
  };
  if (after.development.paid > before.development.paid) {
    next.cycles = [
      ...next.cycles,
      {
        ...current,
        id: after.development.paid,
        payments: before.development.shipments
          .filter((s) => s.payment <= after.day)
          .map((s) => ({
            id: s.id,
            kg: s.kg,
            value: cents(s.value),
            buyer: s.buyer,
          })),
      },
    ].slice(-24);
    next.current = emptyPeriod(after.day);
  }
  if (sumCosts(next.cumulativeCosts) !== cents(after.stats.expenses))
    throw Error("Le registre ne concorde pas avec les dépenses cumulées.");
  return next;
}
/** Cash already spent on orders/construction is never subtracted a second time. */
export function cashProjection(game: Game) {
  const cost = cents(dailyCost(game));
  let cash = cents(game.money);
  return Array.from({ length: 91 }, (_, i) => {
    const day = game.day + i;
    if (i)
      cash =
        cash -
        cost +
        game.development.shipments
          .filter((s) => Math.max(game.day + 1, s.payment) === day)
          .reduce((n, s) => n + cents(s.value), 0);
    return { day, money: cash / 100 };
  });
}
export function periodBalance(p: Period) {
  return p.income - sumCosts(p.costs);
}
export function operatingBalance(p: Period) {
  return periodBalance(p) + p.costs.investment;
}
/** Gross contractual estimate only, not money received; preparation yield is explicit. */
export function coldExpected(game: Game) {
  return game.development.batches.reduce((n, b) => {
    const c = game.development.contracts.find((c) => c.id === b.contractId);
    if (!c) return n;
    const factor = c.buyer === "fishmonger" && !b.processed ? 0.85 : 1;
    return n + cents(b.kg * factor * c.price);
  }, 0);
}
export type ReportData = {
  period: Period;
  previous?: Cycle;
  provisional: boolean;
  pending: number;
};
