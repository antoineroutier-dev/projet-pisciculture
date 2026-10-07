import { parseSave, type Game } from "../game";
import {
  costKeys,
  cents,
  initialLedger,
  sumCosts,
  monthKey,
  type Costs,
  type Period,
  type Ledger,
} from "./ledger";
export const SAVE_KEY = "les-etangs-save-v4";
export type Save = { version: 4; game: Game; ledger: Ledger };
const bad = () => {
  throw Error(
    "Le registre financier de cette sauvegarde est incompatible ou incohérent. La partie actuelle est conservée.",
  );
};
const obj = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return bad();
  return v as Record<string, unknown>;
};
const amount = (v: unknown): number => {
  if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0) return bad();
  return v;
};
const real = (v: unknown): number => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1e12)
    return bad();
  return v;
};
const signed = (v: unknown): number => {
  if (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > 1e12)
    return bad();
  return v;
};
const flag = (v: unknown): boolean => {
  if (typeof v !== "boolean") return bad();
  return v;
};
const costs = (v: unknown): Costs => {
  const r = obj(v);
  if (Object.keys(r).length !== costKeys.length) return bad();
  return Object.fromEntries(costKeys.map((k) => [k, amount(r[k])])) as Costs;
};
function period(v: unknown, day: number): Period {
  const r = obj(v),
    startDay = amount(r.startDay),
    endDay = amount(r.endDay),
    metricsStartDay = amount(r.metricsStartDay);
  if (
    startDay < 1 ||
    endDay < startDay ||
    endDay > day ||
    metricsStartDay < startDay ||
    metricsStartDay > endDay
  )
    return bad();
  return {
    startDay,
    endDay,
    metricsStartDay,
    costs: costs(r.costs),
    income: amount(r.income),
    aid: amount(r.aid),
    kg: real(r.kg),
    feedKg: signed(r.feedKg),
    gainKg: real(r.gainKg),
    wasteKg: real(r.wasteKg),
    mortality: amount(r.mortality),
    dispatchDays: amount(r.dispatchDays),
    dispatchCount: amount(r.dispatchCount),
    incomplete: flag(r.incomplete),
  };
}
export function parseLedger(raw: unknown, game: Game): Ledger {
  const r = obj(raw),
    startDay = amount(r.startDay),
    lastDay = amount(r.lastDay);
  if (
    r.version !== 1 ||
    startDay < 1 ||
    startDay > game.day ||
    lastDay !== game.day ||
    !Array.isArray(r.months) ||
    r.months.length > 120 ||
    !Array.isArray(r.cycles) ||
    r.cycles.length > 24
  )
    return bad();
  const cumulativeCosts = costs(r.cumulativeCosts);
  if (sumCosts(cumulativeCosts) !== cents(game.stats.expenses)) return bad();
  const current = period(r.current, game.day);
  const months = r.months.map((value) => {
    const m = obj(value),
      month = m.month;
    const p = period(m, game.day);
    if (
      typeof month !== "string" ||
      month !== monthKey(p.endDay) ||
      month !== monthKey(p.startDay)
    )
      return bad();
    return { ...p, month };
  });
  if (new Set(months.map((m) => m.month)).size !== months.length) return bad();
  const cycles = r.cycles.map((value) => {
    const c = obj(value),
      p = period(c, game.day),
      id = amount(c.id);
    if (
      id < 1 ||
      id > game.development.paid ||
      !Array.isArray(c.payments) ||
      !c.payments.length ||
      c.payments.length > 100
    )
      return bad();
    const payments = c.payments.map((value) => {
      const x = obj(value);
      if (typeof x.buyer !== "string" || x.buyer.length > 100) return bad();
      return {
        id: amount(x.id),
        kg: real(x.kg),
        value: amount(x.value),
        buyer: x.buyer,
      };
    });
    if (payments.reduce((n, p) => n + p.value, 0) !== p.income) return bad();
    return { ...p, id, payments };
  });
  if (
    new Set(cycles.map((c) => c.id)).size !== cycles.length ||
    cycles.some((c, i) => i > 0 && c.id <= cycles[i - 1].id)
  )
    return bad();
  if (
    sumCosts(current.costs) +
      cycles.reduce((n, c) => n + sumCosts(c.costs), 0) >
    sumCosts(cumulativeCosts)
  )
    return bad();
  if (
    current.income + cycles.reduce((n, c) => n + c.income, 0) >
    cents(game.stats.income)
  )
    return bad();
  if (
    months.some(
      (m, i) =>
        m.startDay < startDay || (i > 0 && m.startDay <= months[i - 1].endDay),
    )
  )
    return bad();
  if (months.reduce((n, m) => n + m.income, 0) > cents(game.stats.income))
    return bad();
  for (const key of costKeys) {
    if (months.reduce((n, m) => n + m.costs[key], 0) > cumulativeCosts[key])
      return bad();
    if (
      current.costs[key] + cycles.reduce((n, c) => n + c.costs[key], 0) >
      cumulativeCosts[key]
    )
      return bad();
  }
  if (cycles.at(-1) && current.startDay < cycles.at(-1)!.endDay) return bad();
  return {
    version: 1,
    startDay,
    lastDay,
    openingIncomplete: flag(r.openingIncomplete),
    cumulativeCosts,
    current,
    months,
    cycles,
  };
}
export function parseSavedGame(raw: string): Save {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new SyntaxError("Ce fichier n’est pas un JSON valide.");
  }
  if (
    value &&
    typeof value === "object" &&
    "version" in value &&
    value.version === 4
  ) {
    const v = value as Record<string, unknown>;
    const game = parseSave(JSON.stringify(v.game));
    return { version: 4, game, ledger: parseLedger(v.ledger, game) };
  }
  const game = parseSave(raw);
  return { version: 4, game, ledger: initialLedger(game) };
}
export const serializeSave = (game: Game, ledger: Ledger, pretty = false) =>
  JSON.stringify(
    { version: 4, game, ledger } satisfies Save,
    null,
    pretty ? 2 : undefined,
  );
