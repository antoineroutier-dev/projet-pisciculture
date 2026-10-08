import { initialMetadata } from "./saveMetadata";
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { act, initialGame, nextDay, parseSave, type Action } from "../game";
import { dailyFeed } from "../development";
import { operatingGame } from "../test-fixtures";
import {
  initialLedger,
  recordLedger,
  sumCosts,
  cents,
  periodBalance,
  cashProjection,
  expenseCategories,
} from "./ledger";
import { parseSavedGame, serializeSave } from "./saves";
function farm(pondIds = [1]) {
  let game = initialGame(),
    ledger = initialLedger(game);
  const record = (after: typeof game, action: Action | { type: "day" }) => {
    const raw = JSON.stringify({ game, ledger });
    const updated = recordLedger(ledger, game, after, action);
    expect(JSON.stringify({ game, ledger })).toBe(raw);
    game = after;
    ledger = updated;
    expect(parseSavedGame(serializeSave(game, ledger))).toEqual({
      version: 5,
      game,
      ledger,
      metadata: initialMetadata(true),
    });
  };
  const command = (action: Action) => {
    const r = act(game, action);
    expect(r.ok, r.message).toBe(true);
    record(r.game, action);
  };
  const days = (n = 1) => {
    for (let i = 0; i < n; i++) record(nextDay(game), { type: "day" });
  };
  command({ type: "survey" });
  days(2);
  for (const pondId of pondIds) {
    command({ type: "plan", pondId, species: "trout" });
    command({ type: "build", pondId });
  }
  command({ type: "asset", asset: "warehouse" });
  days(14);
  command({ type: "food", pack: 2 });
  days(2);
  for (const pondId of pondIds)
    command({ type: "stock", pondId, species: "trout", count: 1000 });
  days(4);
  for (const pondId of pondIds)
    command({ type: "autoFeed", pondId, enabled: true });
  command({ type: "asset", asset: "coldstore" });
  for (
    let i = 0;
    i < 400 && pondIds.some((id) => game.ponds[id - 1].weight < 0.45);
    i++
  ) {
    if (
      game.food < dailyFeed(game) * 8 &&
      !game.development.orders.some((o) => o.kind === "feed")
    )
      command({ type: "food", pack: 2 });
    days();
  }
  for (const pondId of pondIds) {
    command({ type: "contract", pondId, buyer: "cooperative" });
    command({ type: "harvest", pondId });
  }
  for (const b of [...game.development.batches])
    command({ type: "dispatch", id: b.id });
  const dispatched = structuredClone(game),
    projection = cashProjection(game);
  days(8);
  return {
    get game() {
      return game;
    },
    get ledger() {
      return ledger;
    },
    dispatched,
    projection,
    command,
    days,
  };
}
it("réconcilie tous les centimes du terrain vide au règlement et recharge le registre à chaque étape", () => {
  const { game, ledger, dispatched, projection } = farm();
  expect(game.development.paid).toBe(1);
  expect(sumCosts(ledger.cumulativeCosts)).toBe(cents(game.stats.expenses));
  expect(ledger.cumulativeCosts.unknown).toBe(0);
  expect(ledger.cycles).toHaveLength(1);
  const cycle = ledger.cycles[0];
  expect(cycle.income).toBe(cents(game.stats.income));
  expect(cycle.incomplete).toBe(false);
  expect(periodBalance(cycle)).toBeLessThan(0);
  expect(ledger.months.reduce((n, m) => n + m.income, 0)).toBe(
    cents(game.stats.income),
  );
  expect(ledger.months.reduce((n, m) => n + sumCosts(m.costs), 0)).toBe(
    cents(game.stats.expenses),
  );
  let actual = dispatched;
  for (let i = 1; i <= 90; i++) {
    actual = nextDay(actual);
    expect(cents(projection[i].money)).toBe(cents(actual.money));
  }
});
it("groupe sans doublonner deux vrais règlements reçus le même jour", () => {
  const { game, ledger } = farm([1, 3]);
  expect(game.development.paid).toBe(2);
  expect(ledger.cycles).toHaveLength(1);
  expect(ledger.cycles[0].payments).toHaveLength(2);
  expect(ledger.cycles[0].payments.reduce((n, p) => n + p.value, 0)).toBe(
    cents(game.stats.income),
  );
});
it("les commandes déjà payées ne sont pas débitées à nouveau dans la prévision", () => {
  let g = parseSave(readFileSync("docs/ui/fixtures/chantier.json", "utf8"));
  g = act(g, { type: "food", pack: 1 }).game;
  const before = JSON.stringify(g),
    p = cashProjection(g);
  expect(p).toHaveLength(91);
  expect(p[0].money).toBe(g.money);
  expect(JSON.stringify(g)).toBe(before);
  // This unfinished farm has no current daily charges. The prediction explicitly keeps that baseline.
  expect(p[2].money).toBe(g.money);
});
it("les données V3 anciennes restent explicitement non ventilées, sans fausse marge du cycle courant", () => {
  const first = parseSave(
    readFileSync("docs/ui/fixtures/expedition.json", "utf8"),
  );
  const ledger = initialLedger(first);
  expect(ledger.current.costs.unknown).toBe(cents(first.stats.expenses));
  expect(ledger.current.startDay).toBe(1);
  expect(ledger.current.metricsStartDay).toBe(first.day);
  const paid = parseSave(
    readFileSync("docs/ui/fixtures/cycle-paye.json", "utf8"),
  );
  expect(initialLedger(paid).current.incomplete).toBe(true);
  expect(sumCosts(initialLedger(paid).current.costs)).toBe(0);
});
it("ne prétend pas ventiler des charges que le moteur n’a pu payer intégralement", () => {
  const g = parseSave(readFileSync("docs/ui/fixtures/elevage.json", "utf8"));
  g.money = 0.37;
  const after = nextDay(g),
    costs = expenseCategories(g, after, { type: "day" });
  expect(costs.unknown).toBe(37);
  expect(sumCosts(costs)).toBe(37);
  expect(g.money).toBe(0.37);
});
it("migre V1/V2/V3 et rejette les incohérences du registre V4 sans modifier l’entrée", () => {
  const g = initialGame();
  for (const version of [1, 2, 3]) {
    const old = version === 3 ? g : operatingGame();
    const raw = JSON.stringify({
      ...old,
      version,
      development: version === 3 ? old.development : undefined,
      ...(version === 1
        ? {
            lastAidDay: -20,
            ponds: old.ponds.map((p, i) => ({
              ...p,
              capacity: [80, 100, 120, 160][i],
              count: i < 2 ? 30 : 0,
              oxygen: 90,
            })),
          }
        : {}),
    });
    const parsed = parseSavedGame(raw);
    expect(parsed.version).toBe(5);
    expect(parsed.game.version).toBe(3);
    expect(parseSavedGame(serializeSave(parsed.game, parsed.ledger))).toEqual(
      parsed,
    );
  }
  const good = { version: 4, game: g, ledger: initialLedger(g) };
  const raw = JSON.stringify(good);
  expect(parseSavedGame(raw)).toEqual({
    ...good,
    version: 5,
    metadata: initialMetadata(true),
  });
  for (const mutate of [
    (x: typeof good) => {
      x.ledger.cumulativeCosts.feed = 100;
    },
    (x: typeof good) => {
      x.ledger.lastDay = 2;
    },
    (x: typeof good) => {
      x.ledger.version = 2 as 1;
    },
  ]) {
    const bad = structuredClone(good);
    mutate(bad);
    expect(() => parseSavedGame(JSON.stringify(bad))).toThrow(/registre/);
  }
  expect(JSON.stringify(good)).toBe(raw);
});
it("les conseils et comparaisons ne prétendent pas observer du gaspillage ou des périodes absentes", async () => {
  const { cycleAdvice, cycleComparison } = await import("./cycleAdvice");
  const p = initialLedger(initialGame()).current;
  expect(cycleAdvice(p)).toHaveLength(3);
  expect(cycleComparison(p)).toBeNull();
  const complete = { ...p, kg: 100, income: 10000 };
  expect(cycleComparison(complete, { ...complete, income: 8000 })).toBeCloseTo(
    0.2,
  );
  expect(
    cycleComparison({ ...complete, incomplete: true }, complete),
  ).toBeNull();
});

it("observe deux cycles successifs sans attribuer les investissements initiaux au second", () => {
  const farmState = farm();
  farmState.command({
    type: "stock",
    pondId: 1,
    species: "trout",
    count: 1000,
  });
  farmState.days(4);
  farmState.command({ type: "autoFeed", pondId: 1, enabled: true });
  for (let i = 0; i < 500 && farmState.game.ponds[0].weight < 0.45; i++) {
    if (
      farmState.game.food < dailyFeed(farmState.game) * 8 &&
      !farmState.game.development.orders.some((o) => o.kind === "feed")
    )
      farmState.command({ type: "food", pack: 2 });
    farmState.days();
  }
  farmState.command({ type: "contract", pondId: 1, buyer: "cooperative" });
  farmState.command({ type: "harvest", pondId: 1 });
  farmState.command({
    type: "dispatch",
    id: farmState.game.development.batches[0].id,
  });
  farmState.days(8);
  expect(farmState.ledger.cycles).toHaveLength(2);
  expect(farmState.ledger.cycles[0].costs.investment).toBeGreaterThan(0);
  expect(farmState.ledger.cycles[1].costs.investment).toBe(0);
  expect(farmState.ledger.cycles.every((c) => !c.incomplete)).toBe(true);
  expect(farmState.ledger.cycles[1].startDay).toBe(
    farmState.ledger.cycles[0].endDay,
  );
});
