import { expect, it } from "vitest";
import { act, initialGame, nextDay } from "../game";
import { cashHistory, cashDomain } from "./financeSelectors";
it("affiche la trésorerie après achat sans réécrire les relevés quotidiens du moteur", () => {
  const original = initialGame(),
    game = act(original, { type: "survey" }).game;
  expect(cashHistory(game)).toEqual([{ day: 1, money: original.money - 240 }]);
  expect(game.history).toEqual(original.history);
  const next = nextDay(game);
  expect(cashHistory(next).at(-1)?.money).toBe(next.money);
  expect(new Set(cashHistory(next).map((h) => h.day)).size).toBe(
    cashHistory(next).length,
  );
});
it("garde un axe non nul et inclut soldes négatifs et trésorerie stable", () => {
  expect(cashDomain([0, 0])).toEqual({ low: -1, high: 1 });
  const domain = cashDomain([-1000, 60000]);
  expect(domain.low).toBeLessThan(-1000);
  expect(domain.high).toBeGreaterThan(60000);
});
