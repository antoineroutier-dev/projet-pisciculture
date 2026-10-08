import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initialGame, parseSave, SPECIES, act } from "../game";
import {
  availability,
  expectedHarvestDays,
  pondVitals,
  recordReadings,
} from "./pondSelectors";
it("interroge les mêmes gardes que le moteur sans modifier la partie", () => {
  const g = initialGame(),
    raw = JSON.stringify(g);
  expect(availability(g, { type: "build", pondId: 1 })).toEqual({
    disabled: true,
    reason: act(g, { type: "build", pondId: 1 }).message,
  });
  expect(availability(g, { type: "survey" }).disabled).toBe(false);
  expect(JSON.stringify(g)).toBe(raw);
});
it("distingue seuils de croissance, eau et densité sans inventer un délai à croissance nulle", () => {
  const g = parseSave(readFileSync("docs/ui/fixtures/elevage.json", "utf8")),
    p = g.ponds[0];
  expect(expectedHarvestDays({ ...p, lastGrowth: 0 })).toBe(null);
  expect(
    expectedHarvestDays({
      ...p,
      weight: SPECIES.trout.harvestWeight,
      lastGrowth: 0,
      quarantineDays: 3,
    }),
  ).toBe(3);
  expect(
    pondVitals({ ...p, oxygen: 3 }).find((v) => v.key === "oxygen")?.tone,
  ).toBe("danger");
  expect(
    pondVitals({ ...p, oxygen: 6 }).find((v) => v.key === "oxygen")?.tone,
  ).toBe("warning");
  expect(
    pondVitals({ ...p, oxygen: 9 }).find((v) => v.key === "oxygen")?.tone,
  ).toBe("success");
  expect(
    pondVitals({ ...p, count: 3000, weight: 1 }).find(
      (v) => v.key === "density",
    )?.tone,
  ).toBe("danger");
});
it("garde quatorze jours observés, remplace le relevé courant et réinitialise un retour en arrière", () => {
  const g = initialGame();
  let history = recordReadings({}, g);
  history = recordReadings(history, { ...g, day: 8 });
  history = recordReadings(history, { ...g, day: 15 });
  expect(history[1].map((r) => r.day)).toEqual([8, 15]);
  history = recordReadings(history, { ...g, day: 15 });
  expect(history[1]).toHaveLength(2);
  expect(recordReadings(history, g)[1].map((r) => r.day)).toEqual([1]);
});
