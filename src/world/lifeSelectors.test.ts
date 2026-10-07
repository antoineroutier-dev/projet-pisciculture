import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { act, nextDay, parseSave, initialGame } from "../game";
import {
  lifeEvents,
  oxygenMotion,
  sceneWeather,
  hasIce,
} from "./lifeSelectors";
it("les camions correspondent aux réceptions et départs réels, sans effet à état identique", () => {
  let g = parseSave(readFileSync("docs/ui/fixtures/elevage.json", "utf8"))!;
  const ordered = act(g, { type: "food", pack: 0 });
  expect(ordered.ok).toBe(true);
  expect(lifeEvents(g, ordered.game).some((e) => e.kind === "truck")).toBe(
    false,
  );
  g = ordered.game;
  const id = g.development.orders.at(-1)!.id;
  let delivered = false;
  for (let i = 0; i < 3; i++) {
    const after = nextDay(g),
      events = lifeEvents(g, after);
    if (events.some((e) => e.kind === "truck" && e.id === id)) {
      expect(events).toContainEqual({
        kind: "truck",
        id,
        cargo: "feed",
        amount: 25,
        pondId: undefined,
      });
      delivered = true;
    }
    g = after;
  }
  expect(delivered).toBe(true);
  expect(lifeEvents(g, g)).toEqual([]);
  const cold = parseSave(
    readFileSync("docs/ui/fixtures/lot-au-froid.json", "utf8"),
  )!;
  const dispatched = act(cold, {
    type: "dispatch",
    id: cold.development.batches[0].id,
  });
  expect(dispatched.ok).toBe(true);
  expect(lifeEvents(cold, dispatched.game)).toContainEqual({
    kind: "truck",
    id: dispatched.game.development.shipments.at(-1)!.id,
    cargo: "cold",
    amount: cold.development.batches[0].kg,
  });
  expect(
    lifeEvents(dispatched.game, nextDay(dispatched.game)).some(
      (e) => e.kind === "truck",
    ),
  ).toBe(false);
});
it("nourrissage, travaux et oxygène sont observés sans changer les mesures", () => {
  let g = parseSave(readFileSync("docs/ui/fixtures/elevage.json", "utf8"))!;
  const snapshot = JSON.stringify(g),
    fed = act(g, { type: "feed", pondId: 1 });
  expect(fed.ok).toBe(true);
  expect(lifeEvents(g, fed.game)).toContainEqual({
    kind: "feed",
    pondId: 1,
    amount: fed.game.ponds[0].feedToday - g.ponds[0].feedToday,
  });
  expect(JSON.stringify(g)).toBe(snapshot);
  expect(oxygenMotion({ ...g.ponds[0], oxygen: 3.5 })).toBe(0.5);
  expect(oxygenMotion({ ...g.ponds[0], oxygen: 9 })).toBe(1);
  g = parseSave(readFileSync("docs/ui/fixtures/chantier.json", "utf8"))!;
  for (let i = 0; i < 2; i++) g = nextDay(g);
  expect(lifeEvents(g, nextDay(g))).toContainEqual({
    kind: "reveal",
    asset: "warehouse",
  });
});
it("les saisons et le gel suivent les conditions du moteur, pas une glace hivernale fictive", () => {
  expect([1, 100, 200, 300].map((day) => sceneWeather(day).season)).toEqual([
    "spring",
    "summer",
    "autumn",
    "winter",
  ]);
  expect(sceneWeather(3).rainy).toBe(true);
  const pond = { ...initialGame().ponds[1], built: true };
  expect(hasIce({ ...pond, temperature: 2 })).toBe(false);
  expect(hasIce({ ...pond, temperature: 0 })).toBe(true);
  expect(hasIce({ ...pond, facility: "raceway", temperature: 0 })).toBe(false);
});
