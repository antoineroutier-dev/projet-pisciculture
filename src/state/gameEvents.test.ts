import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import {
  act,
  advanceGuided,
  initialGame,
  nextDay,
  parseSave,
  type Game,
} from "../game";
import { gameEvents, hasUpcomingEvent } from "./gameEvents";
import { dayDuration } from "./useGameClock";
const fixture = (name: string) =>
  parseSave(readFileSync(`docs/ui/fixtures/${name}.json`, "utf8"));
const until = (before: Game, condition: (g: Game) => boolean) => {
  let g = before;
  for (let i = 0; i < 365; i++) {
    const after = nextDay(g);
    if (condition(after)) return { before: g, after };
    g = after;
  }
  throw Error("Expected engine event");
};
describe("horloge et événements de présentation", () => {
  it("la pause ne simule rien ; les quatre vitesses et la recherche ont des durées explicites", () => {
    expect(
      [0, 1, 2, 4, 8].map((s) => dayDuration(s as 0 | 1 | 2 | 4 | 8)),
    ).toEqual([Infinity, 4000, 2000, 1000, 500]);
    expect(dayDuration(0, true)).toBe(250);
  });
  it("lit les fins de travaux sans altérer la sauvegarde et ne rejoue pas les imports", () => {
    const { before, after } = until(
      fixture("chantier"),
      (g) =>
        g.ponds.some((p) => p.built) ||
        Object.values(g.development.assets).some(Boolean),
    );
    const raw = JSON.stringify({ before, after });
    expect(
      gameEvents(before, after, "Un chantier est terminé.").filter(
        (e) => e.illustration === "build",
      ),
    ).toHaveLength(1);
    expect(gameEvents(after, after)).toEqual([]);
    expect(JSON.stringify({ before, after })).toBe(raw);
  });
  it("une réception de poissons, une récolte et un paiement suivent les vrais cumuls", () => {
    let g = fixture("elevage");
    // Prepare a second pond only through the existing commands.
    const built = fixture("chantier");
    let ready = until(built, (s) => s.ponds[0].built).after;
    ready = act(ready, { type: "food", pack: 1 }).game;
    ready = nextDay(nextDay(ready));
    ready = act(ready, {
      type: "stock",
      pondId: 1,
      species: "trout",
      count: 100,
    }).game;
    const received = until(ready, (s) => s.ponds[0].count > 0);
    expect(
      gameEvents(received.before, received.after).some(
        (e) => e.illustration === "fish",
      ),
    ).toBe(true);
    g = fixture("contrat-client");
    g = act(g, { type: "food", pack: 2 }).game;
    g = until(g, (s) => s.ponds[0].weight >= 0.45).after;
    const harvested = act(g, { type: "harvest", pondId: 1 });
    expect(harvested.ok).toBe(true);
    expect(
      gameEvents(g, harvested.game).some((e) => e.illustration === "harvest"),
    ).toBe(true);
    const paid = until(fixture("expedition"), (s) => s.development.paid > 0);
    expect(
      gameEvents(
        paid.before,
        paid.after,
        "Un règlement client a été reçu.",
      ).filter((e) => e.illustration === "payment"),
    ).toHaveLength(1);
  });
  it("le résultat de l’analyse garde sa carte spécifique et une urgence précède une célébration", () => {
    const before = act(initialGame(), { type: "survey" }).game;
    const result = advanceGuided(before, 2);
    expect(gameEvents(before, result.game, result.reason)).toEqual([]);
    const state = fixture("elevage");
    state.ponds[0].oxygen = 1;
    const after = act(state, { type: "upgrade", pondId: 1 }).game;
    const events = gameEvents(
      state,
      after,
      "Les conditions d’élevage demandent votre attention.",
    );
    expect(events[0].kind).toBe("alert");
    expect(events.some((e) => e.illustration === "award")).toBe(true);
  });
});

it("ne lance pas une recherche infinie sur un terrain sans activité", () => {
  const game = initialGame();
  expect(hasUpcomingEvent(game)).toBe(false);
  expect(hasUpcomingEvent(act(game, { type: "survey" }).game)).toBe(true);
  expect(game.day).toBe(1);
});
