import { SPECIES, weather, type Game, type Pond } from "../game";
import { ASSETS, type Asset } from "../development";
export type Cargo = "feed" | "living" | "cold";
export type LifeEvent =
  | { kind: "truck"; id: number; cargo: Cargo; amount: number; pondId?: number }
  | { kind: "feed"; pondId: number; amount: number }
  | { kind: "reveal"; pondId?: number; asset?: Asset };
/** Only actual committed transitions enter here; loading a save never calls this observer. */
export function lifeEvents(before: Game, after: Game): LifeEvent[] {
  const events: LifeEvent[] = [];
  for (const order of before.development.orders) {
    if (
      order.due <= after.day &&
      !after.development.orders.some((o) => o.id === order.id)
    )
      events.push({
        kind: "truck",
        id: order.id,
        cargo: order.kind === "feed" ? "feed" : "living",
        amount: order.amount,
        pondId: order.pondId ?? undefined,
      });
  }
  for (const shipment of after.development.shipments) {
    if (!before.development.shipments.some((s) => s.id === shipment.id))
      events.push({
        kind: "truck",
        id: shipment.id,
        cargo: "cold",
        amount: shipment.kg,
      });
  }
  for (const p of after.ponds) {
    const previous = before.ponds.find((v) => v.id === p.id)!;
    if (p.built && !previous.built)
      events.push({ kind: "reveal", pondId: p.id });
    const amount =
      after.day === before.day
        ? p.feedToday - previous.feedToday
        : after.day === before.day + 1
          ? p.lastFeed
          : 0;
    if (amount > 0 && p.count)
      events.push({ kind: "feed", pondId: p.id, amount });
  }
  for (const asset of Object.keys(ASSETS) as Asset[])
    if (after.development.assets[asset] && !before.development.assets[asset])
      events.push({ kind: "reveal", asset });
  return events;
}
/** Animation only: does not modify the engine or swimming rules. */
export function oxygenMotion(p: Pond) {
  return p.species
    ? Math.max(0.25, Math.min(1, p.oxygen / SPECIES[p.species].minOxygen))
    : 1;
}
export type Season = "spring" | "summer" | "autumn" | "winter";
export function sceneWeather(day: number) {
  const w = weather(day),
    seasons: Record<string, Season> = {
      Printemps: "spring",
      Été: "summer",
      Automne: "autumn",
      Hiver: "winter",
    };
  return { ...w, season: seasons[w.season], frost: w.temperature <= 2 };
}
export function hasIce(p: Pond) {
  return p.built && p.facility === "earth" && p.temperature <= 0;
}
