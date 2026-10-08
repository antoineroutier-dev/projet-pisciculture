import { expect, it } from "vitest";
import { initialGame } from "../game";
import { journalMonths } from "./journalSelectors";
it("groupe les dates par mois et conserve le filtrage du type et du bassin explicite", () => {
  const g = initialGame();
  g.logs = [
    { day: 40, kind: "purchase", text: "Les Saules : juvéniles reçus." },
    { day: 28, kind: "info", text: "Bilan hebdomadaire : 100 poissons." },
    { day: 1, kind: "info", text: "Bienvenue sur le terrain." },
  ];
  const raw = JSON.stringify(g);
  expect(journalMonths(g, "all", "all").map((g) => g.key)).toEqual([
    "2026-05",
    "2026-04",
  ]);
  expect(
    journalMonths(g, "all", "1")
      .flatMap((g) => g.entries)
      .map((e) => e.log.day),
  ).toEqual([40]);
  expect(journalMonths(g, "weekly", "all")[0].entries[0].history).toEqual([]);
  expect(
    journalMonths(g, "info", "farm")[0].entries.map((e) => e.log.day),
  ).toEqual([1]);
  expect(JSON.stringify(g)).toBe(raw);
});
