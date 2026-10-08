import { expect, it, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { parseSave } from "../game";
import { presentationTask } from "../state/operatingGoals";
import { goalCopy } from "./goalCopy";
import { setLocale } from "../i18n";
afterEach(() => setLocale("fr"));
it("raccourcit la présentation sans réécrire le jeu ni la commande proposée", () => {
  for (const locale of ["fr", "en"] as const) {
    setLocale(locale);
    for (const state of [
      "terrain-vide",
      "chantier",
      "elevage",
      "contrat-client",
      "lot-au-froid",
      "expedition",
      "cycle-paye",
    ]) {
      const game = parseSave(
          readFileSync(`docs/ui/fixtures/${state}.json`, "utf8"),
        ),
        task = presentationTask(game),
        before = JSON.stringify({ game, task });
      const copy = goalCopy(game, task);
      expect(copy.title).not.toBe("");
      expect(copy.label).not.toBe("");
      expect(copy.text.length).toBeLessThanOrEqual(200);
      expect(JSON.stringify({ game, task })).toBe(before);
    }
  }
});
