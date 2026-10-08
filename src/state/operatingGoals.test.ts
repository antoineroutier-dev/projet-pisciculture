import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { initialGame, parseSave } from "../game";
import { nextTask } from "../development";
import { operatingGoals, presentationTask } from "./operatingGoals";
it("garde le premier parcours puis propose une vraie diversification après règlement", () => {
  const empty = initialGame();
  expect(presentationTask(empty)).toEqual(nextTask(empty));
  const g = parseSave(readFileSync("docs/ui/fixtures/cycle-paye.json", "utf8")),
    raw = JSON.stringify(g);
  expect(presentationTask(g).target).toBe("project");
  expect(presentationTask(g).pondId).toBe(2);
  expect(presentationTask(g).text.length).toBeLessThanOrEqual(140);
  expect(operatingGoals(g)[0].progress).toBe(1);
  expect(JSON.stringify(g)).toBe(raw);
});
it("priorise l’eau en danger sur les objectifs à long terme", () => {
  const g = parseSave(
    readFileSync("docs/ui/fixtures/contrat-client.json", "utf8"),
  );
  g.development.paid = 1;
  g.ponds[0].oxygen = 1;
  expect(presentationTask(g)).toEqual(nextTask(g));
  expect(presentationTask(g).urgent).toBe(true);
});
