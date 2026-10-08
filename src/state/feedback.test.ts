import { expect, it } from "vitest";
import { feedbackSound } from "./feedback";
it("assigne un signal explicite à toutes les commandes et signale les refus", () => {
  for (const action of [
    "survey",
    "plan",
    "asset",
    "build",
    "stock",
    "food",
    "harvest",
    "process",
    "dispatch",
    "contract",
    "cancelContract",
    "feed",
    "clean",
    "upgrade",
    "claim",
    "aid",
    "autoFeed",
    "flow",
    "ration",
    "mode",
    "day",
    "advance",
  ]) {
    expect(feedbackSound(action, true)).toBeTruthy();
    expect(feedbackSound(action, false)).toBe("error");
  }
  expect(feedbackSound("feed", true)).toBe("feed");
  expect(feedbackSound("payment", true)).toBe("cash");
});

import { act, advanceGuided, initialGame, parseSave } from "../game";
import { readFileSync } from "node:fs";
import { transitionSound } from "./feedback";
it("priorise les vraies fins de chantier et règlements, sans modifier les états", () => {
  let game = act(initialGame(), { type: "survey" }).game;
  game = advanceGuided(game, 2).game;
  game = act(game, { type: "plan", pondId: 1, species: "trout" }).game;
  game = act(game, { type: "build", pondId: 1 }).game;
  const raw = JSON.stringify(game),
    built = advanceGuided(game, 14).game;
  expect(transitionSound(game, built, "advance", true)).toBe("build");
  expect(JSON.stringify(game)).toBe(raw);
  const shipment = parseSave(
    readFileSync("docs/ui/fixtures/expedition.json", "utf8"),
  );
  const delivered = advanceGuided(shipment, 14).game;
  const paid = advanceGuided(delivered, 14).game;
  expect(paid.development.paid).toBeGreaterThan(delivered.development.paid);
  expect(transitionSound(delivered, paid, "advance", true)).toBe("cash");
  expect(transitionSound(delivered, paid, "advance", false)).toBe("error");
});
