import { readFileSync } from "node:fs";
import { act, advanceGuided, nextDay, parseSave } from "../game";
import { describe, expect, it } from "vitest";
import {
  bindingError,
  bindingFromEvent,
  DEFAULT_BINDINGS,
  parseBindings,
  normalizeBinding,
} from "./bindings";
import { parsePreferences, DEFAULT_PREFERENCES } from "../state/preferences";
import { interruptingEvents } from "./interruptions";
import { deadZone } from "./gamepad";
describe("préférences et commandes indépendantes du moteur", () => {
  it("le détecteur d’arrêt conserve exactement chaque journée biologique, même en expert", () => {
    for (const name of [
      "terrain-vide",
      "chantier",
      "elevage",
      "contrat-client",
      "lot-au-froid",
      "expedition",
      "cycle-paye",
    ]) {
      const game = parseSave(
        readFileSync(`docs/ui/fixtures/${name}.json`, "utf8"),
      )!;
      for (const mode of ["guided", "expert"] as const) {
        const state = act(game, { type: "mode", mode }).game;
        expect(advanceGuided(state, 1).game).toEqual(nextDay(state));
      }
    }
  });
  it("migre V1, borne les valeurs et garde toutes les commandes atteignables", () => {
    expect(
      parsePreferences('{"version":1,"scale":80,"motion":"reduce"}'),
    ).toEqual({ ...DEFAULT_PREFERENCES, scale: 80, motion: "reduce" });
    expect(
      parsePreferences(
        '{"scale":300,"sensitivity":-2,"defaultSpeed":3,"autoPause":false}',
      ),
    ).toMatchObject({
      scale: 150,
      sensitivity: 25,
      defaultSpeed: 1,
      autoPause: false,
    });
    expect(parsePreferences("null")).toEqual(DEFAULT_PREFERENCES);
    expect(parseBindings({ project: "X", ponds: "X" })).toEqual(
      DEFAULT_BINDINGS,
    );
    expect(parseBindings({ project: "Alt+X" }).project).toBe("Alt+X");
  });
  it("refuse collisions, touches réservées et combinaisons navigateur", () => {
    expect(normalizeBinding("Alt+c")).toBe("Alt+C");
    expect(normalizeBinding("=")).toBe("+");
    for (const key of [
      "Escape",
      "Tab",
      "Enter",
      "ArrowUp",
      "Control+R",
      "Meta+Q",
    ])
      expect(normalizeBinding(key)).toBeNull();
    expect(bindingError(DEFAULT_BINDINGS, "project", "=")).toContain(
      "Rapprocher",
    );
    expect(bindingError(DEFAULT_BINDINGS, "project", "Alt+X")).toBe("");
    expect(
      bindingFromEvent({
        key: "r",
        code: "KeyR",
        altKey: false,
        ctrlKey: true,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBeNull();
    expect(
      bindingFromEvent({
        key: "+",
        code: "Equal",
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: true,
      }),
    ).toBe("+");
  });
  it("ne supprime jamais une urgence, un premier jalon ou une avance explicite", () => {
    const base = { title: "", text: "", illustration: "water" as const };
    const events = [
      { ...base, id: "routine", kind: "event" as const },
      { ...base, id: "danger", kind: "alert" as const },
      { ...base, id: "first", kind: "celebration" as const },
    ];
    expect(interruptingEvents(events, false, false).map((e) => e.id)).toEqual([
      "danger",
      "first",
    ]);
    expect(interruptingEvents(events, true, false)).toEqual(events);
    expect(interruptingEvents(events, false, true)).toEqual(events);
  });
  it("ignore la dérive des sticks et borne les axes reçus", () => {
    expect(deadZone(0.19)).toBe(0);
    expect(deadZone(NaN)).toBe(0);
    expect(deadZone(-1)).toBe(-1);
    expect(deadZone(2)).toBe(1);
    expect(deadZone(0.6)).toBeCloseTo(0.5);
  });
});
