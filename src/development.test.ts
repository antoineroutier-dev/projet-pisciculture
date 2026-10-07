import { describe, expect, it } from "vitest";
import {
  act,
  advanceGuided,
  biomass,
  dailyCost,
  initialGame,
  nextDay,
  parseSave,
  SPECIES,
  type Action,
  type Game,
} from "./game";
import {
  BUYERS,
  coldStock,
  dailyFeed,
  feedCapacity,
  nextTask,
  reservedFood,
  waterUsed,
} from "./development";
import { operatingGame } from "./test-fixtures";
const days = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g = nextDay(g);
  return g;
};
const action = (g: Game, a: Action) => {
  const r = act(g, a);
  expect(r.ok, r.message).toBe(true);
  expect(parseSave(JSON.stringify(r.game))).toEqual(r.game);
  return r.game;
};
const assessed = () => days(action(initialGame(), { type: "survey" }), 2);
const readyFarm = () => {
  let g = assessed();
  g = action(g, { type: "plan", pondId: 1, species: "trout" });
  g = action(g, { type: "build", pondId: 1 });
  g = action(g, { type: "asset", asset: "warehouse" });
  return days(g, 14);
};
const nearHarvest = () => {
  const g = operatingGame();
  Object.assign(g.ponds[0], { weight: 0.45, autoFeed: true });
  Object.assign(g.ponds[1], { species: null, count: 0, weight: 0 });
  return g;
};

describe("départ sur terrain vide et décisions guidées", () => {
  it("commence sans production, sans frais cachés et avec une seule prochaine décision", () => {
    const g = initialGame();
    expect(
      g.ponds.every((p) => !p.built && !p.count && !p.plannedSpecies),
    ).toBe(true);
    expect(g.food).toBe(0);
    expect(dailyCost(g)).toBe(0);
    expect(nextTask(g).action).toEqual({ type: "survey" });
    expect(parseSave(JSON.stringify(g))).toEqual(g);
    expect(act(g, { type: "build", pondId: 1 }).ok).toBe(false);
  });
  it("reçoit une analyse après deux jours, puis permet un choix adapté sans ordre artificiel des parcelles", () => {
    let g = action(initialGame(), { type: "survey" });
    expect(g.money).toBe(59760);
    expect(act(g, { type: "survey" }).ok).toBe(false);
    expect(act(g, { type: "plan", pondId: 4, species: "tilapia" }).ok).toBe(
      false,
    );
    g = days(g, 2);
    expect(act(g, { type: "plan", pondId: 1, species: "tilapia" }).ok).toBe(
      false,
    );
    g = action(g, { type: "plan", pondId: 4, species: "tilapia" });
    g = action(g, { type: "build", pondId: 4 });
    expect(g.ponds[3].constructionDays).toBe(45);
    expect(days(g, 44).ponds[3].built).toBe(false);
    expect(days(g, 45).ponds[3]).toMatchObject({
      built: true,
      filterAge: 31,
      upgrade: 2,
    });
  });
  it("partage le débit de la source entre tous les bassins et les chantiers", () => {
    let g = readyFarm();
    g = action(g, { type: "plan", pondId: 3, species: "trout" });
    g = action(g, { type: "build", pondId: 3 });
    g = days(g, 14);
    g = action(g, { type: "flow", pondId: 3, value: 12 });
    expect(waterUsed(g)).toBe(24);
    g.money = 50000;
    g = action(g, { type: "plan", pondId: 4, species: "tilapia" });
    expect(act(g, { type: "build", pondId: 4 }).ok).toBe(false);
    g = action(g, { type: "flow", pondId: 3, value: 10 });
    g = action(g, { type: "build", pondId: 4 });
    expect(act(g, { type: "flow", pondId: 3, value: 12 }).ok).toBe(false);
  });
});

describe("chaîne amont : commandes, capacités, réception", () => {
  it("réserve le stockage dès la commande et ne crédite les aliments qu’à la réception", () => {
    let g = assessed();
    g = action(g, { type: "food", pack: 1 });
    expect(g.food).toBe(0);
    expect(reservedFood(g)).toBe(100);
    expect(feedCapacity(g)).toBe(100);
    expect(act(g, { type: "food", pack: 0 }).ok).toBe(false);
    expect(days(g, 1).food).toBe(0);
    const arrived = days(g, 2);
    expect(arrived.food).toBe(100);
    expect(arrived.development.orders).toEqual([]);
    expect(arrived.money).toBe(59760 - 230 - 18);
  });
  it("attend le chantier, les aliments et les juvéniles ; bloque les doubles lots", () => {
    let g = readyFarm();
    expect(
      act(g, { type: "stock", pondId: 1, species: "trout", count: 1000 }).ok,
    ).toBe(false);
    g = action(g, { type: "food", pack: 1 });
    g = action(g, { type: "stock", pondId: 1, species: "trout", count: 1000 });
    expect(g.ponds[0].count).toBe(0);
    expect(
      act(g, { type: "stock", pondId: 1, species: "trout", count: 100 }).ok,
    ).toBe(false);
    expect(days(g, 3).ponds[0].count).toBe(0);
    const arrived = days(g, 4);
    expect(arrived.ponds[0]).toMatchObject({
      count: 1000,
      weight: 0.05,
      quarantineDays: 14,
      autoFeed: false,
    });
    expect(arrived.food).toBe(100);
    expect(nextTask(arrived).action).toEqual({
      type: "autoFeed",
      pondId: 1,
      enabled: true,
    });
  });
});

describe("chaîne aval : réservation, frais, froid, préparation, transport et créance", () => {
  it("ne vend rien directement et encaisse une seule fois après la livraison et son délai", () => {
    let g = nearHarvest();
    const cash = g.money,
      kg = biomass(g.ponds[0]);
    expect(act(g, { type: "harvest", pondId: 1 }).ok).toBe(false);
    g = action(g, { type: "contract", pondId: 1, buyer: "cooperative" });
    const price = g.development.contracts[0].price;
    g = action(g, { type: "harvest", pondId: 1 });
    expect(coldStock(g)).toBe(kg);
    expect(g.money).toBe(cash - kg * 0.25);
    expect(g.ponds[0].fallowDays).toBe(7);
    expect(g.stats.income).toBe(0);
    const id = g.development.batches[0].id;
    g = action(g, { type: "dispatch", id });
    expect(coldStock(g)).toBe(0);
    expect(act(g, { type: "dispatch", id }).ok).toBe(false);
    g = days(g, 1);
    expect(g.development.shipments[0].delivered).toBe(true);
    expect(g.stats.income).toBe(0);
    g = days(g, BUYERS.cooperative.payment);
    expect(g.stats.income).toBeCloseTo(kg * price, 2);
    expect(g.stats.soldKg).toBe(kg);
    expect(g.stats.sales).toBe(1);
    expect(days(g, 10).stats.income).toBe(g.stats.income);
    expect(parseSave(JSON.stringify(g))).toEqual(g);
  });
  it("transforme la masse avec un rendement, une journée de travail et aucune extension de fraîcheur", () => {
    let g = nearHarvest();
    g.development.assets.workshop = true;
    g = action(g, { type: "contract", pondId: 1, buyer: "fishmonger" });
    g = action(g, { type: "harvest", pondId: 1 });
    const b = g.development.batches[0];
    expect(act(g, { type: "dispatch", id: b.id }).ok).toBe(false);
    g = action(g, { type: "process", id: b.id });
    expect(g.development.batches[0].kg).toBe(b.kg);
    expect(act(g, { type: "process", id: b.id }).ok).toBe(false);
    g = days(g, 1);
    expect(g.development.batches[0].kg).toBeCloseTo(b.kg * 0.85);
    expect(g.development.batches[0].expires).toBe(b.expires);
    g = action(g, { type: "dispatch", id: b.id });
    g = days(g, 4);
    expect(g.stats.soldKg).toBeCloseTo(b.kg * 0.85);
    expect(g.development.paid).toBe(1);
  });
  it("fractionne les grandes récoltes puis détruit les invendus périmés sans encaissement", () => {
    let g = nearHarvest();
    g.ponds[0].count = 3000;
    g.ponds[0].weight = 0.6;
    g = action(g, { type: "contract", pondId: 1, buyer: "cooperative" });
    g = action(g, { type: "harvest", pondId: 1 });
    expect(g.ponds[0].count).toBe(500);
    expect(coldStock(g)).toBe(1500);
    expect(g.ponds[0].fallowDays).toBe(0);
    g = nearHarvest();
    g = action(g, { type: "contract", pondId: 1, buyer: "cooperative" });
    g = action(g, { type: "harvest", pondId: 1 });
    const id = g.development.batches[0].id;
    expect(act(days(g, 2), { type: "dispatch", id }).ok).toBe(false);
    g = days(g, 3);
    expect(g.development.batches).toEqual([]);
    expect(g.development.contracts).toEqual([]);
    expect(g.development.wasteKg).toBe(540);
    expect(g.stats.income).toBe(0);
    expect(parseSave(JSON.stringify(g))).toEqual(g);
  });
  it("expire les promesses non tenues et permet de réserver à nouveau", () => {
    let g = nearHarvest();
    g = action(g, { type: "contract", pondId: 1, buyer: "cooperative" });
    g = days(g, 31);
    expect(g.development.contracts).toEqual([]);
    expect(g.logs.some((l) => l.text.includes("expirée"))).toBe(true);
  });
});

it("parcourt une nouvelle exploitation jusqu’au paiement, avec croissance de plusieurs mois et réapprovisionnements", () => {
  let g = readyFarm();
  g = days(action(g, { type: "food", pack: 1 }), 2);
  g = days(
    action(g, { type: "stock", pondId: 1, species: "trout", count: 1000 }),
    4,
  );
  g = action(g, { type: "autoFeed", pondId: 1, enabled: true });
  const start = g.day;
  for (let i = 0; i < 400 && g.ponds[0].weight < 0.45; i++) {
    if (
      g.food < dailyFeed(g) * 8 &&
      !g.development.orders.some((o) => o.kind === "feed")
    )
      g = action(g, { type: "food", pack: 1 });
    if (
      g.ponds[0].weight >= 0.27 &&
      !g.development.assets.coldstore &&
      !g.development.works.length
    )
      g = action(g, { type: "asset", asset: "coldstore" });
    if (
      g.ponds[0].weight >= 0.36 &&
      g.development.assets.coldstore &&
      !g.development.contracts.length
    )
      g = action(g, { type: "contract", pondId: 1, buyer: "cooperative" });
    g = nextDay(g);
    expect(g.ponds[0].count).toBe(1000);
    expect(parseSave(JSON.stringify(g))).toEqual(g);
  }
  expect(g.ponds[0].weight).toBeGreaterThanOrEqual(SPECIES.trout.harvestWeight);
  expect(g.day - start).toBeGreaterThan(100);
  expect(g.money).toBeGreaterThan(1000);
  if (!g.development.contracts.length)
    g = action(g, { type: "contract", pondId: 1, buyer: "cooperative" });
  g = action(g, { type: "harvest", pondId: 1 });
  g = action(g, { type: "dispatch", id: g.development.batches[0].id });
  g = days(g, 8);
  expect(g.development.paid).toBe(1);
  expect(g.stats.soldKg).toBeGreaterThanOrEqual(450);
  expect(g.stats.income).toBeGreaterThan(4000);
  expect(g.stats.mortality).toBe(0);
});

it("arrête une avance de calendrier à la réception et au besoin de nourrir", () => {
  const analyzed = advanceGuided(action(initialGame(), { type: "survey" }), 14);
  expect(analyzed.elapsed).toBe(2);
  let g = readyFarm();
  g = action(g, { type: "food", pack: 1 });
  g = action(g, { type: "stock", pondId: 1, species: "trout", count: 100 });
  const first = advanceGuided(g, 14);
  expect(first.elapsed).toBe(2);
  const second = advanceGuided(first.game, 14);
  expect(second.elapsed).toBe(2);
  const third = advanceGuided(second.game, 14);
  expect(third.elapsed).toBe(1);
  expect(third.reason).toContain("ration");
});

it("migre les V2 sans effacer la progression et rejette les références logistiques incohérentes", () => {
  const old = operatingGame();
  const migrated = parseSave(
    JSON.stringify({ ...old, version: 2, development: undefined }),
  );
  expect(migrated.money).toBe(old.money);
  expect(migrated.ponds[0].count).toBe(old.ponds[0].count);
  expect(migrated.development.surveyed).toBe(true);
  expect(migrated.development.migrated).toBe(true);
  const valid = action(assessed(), { type: "food", pack: 1 });
  const broken = structuredClone(valid);
  broken.development.orders[0].due = -1;
  expect(() => parseSave(JSON.stringify(broken))).toThrow();
  broken.development = structuredClone(valid.development);
  broken.development.orders.push(broken.development.orders[0]);
  expect(() => parseSave(JSON.stringify(broken))).toThrow();
  const badBatch = nearHarvest();
  badBatch.development.batches.push({
    id: 1,
    contractId: 99,
    species: "trout",
    kg: 2,
    harvested: 1,
    expires: 4,
    processed: false,
    processingDue: null,
  });
  expect(() => parseSave(JSON.stringify(badBatch))).toThrow();
});

it("retire les lots froids de la vente quand les charges ne permettent plus de maintenir le froid", () => {
  let g = action(nearHarvest(), {
    type: "contract",
    pondId: 1,
    buyer: "cooperative",
  });
  g = action(g, { type: "harvest", pondId: 1 });
  g.money = 0;
  g = nextDay(g);
  expect(g.development.batches).toEqual([]);
  expect(g.development.wasteKg).toBe(540);
  expect(g.stats.income).toBe(0);
  expect(g.logs.some((l) => l.text.includes("froid interrompu"))).toBe(true);
  expect(parseSave(JSON.stringify(g))).toEqual(g);
});

it("conserve les aliments et les poissons lors d’une récolte partielle", () => {
  let g = nearHarvest();
  Object.assign(g.ponds[0], { count: 3000, weight: 0.6 });
  g = action(g, { type: "feed", pondId: 1 });
  const reserved = g.ponds[0].feedToday,
    food = g.food,
    used = g.stats.feedUsed;
  g = action(g, { type: "contract", pondId: 1, buyer: "cooperative" });
  g = action(g, { type: "harvest", pondId: 1 });
  expect(g.ponds[0].count).toBe(500);
  expect(g.ponds[0].species).toBe("trout");
  expect(g.ponds[0].fallowDays).toBe(0);
  expect(g.ponds[0].autoFeed).toBe(true);
  expect(biomass(g.ponds[0]) + coldStock(g)).toBeCloseTo(1800);
  expect(g.ponds[0].feedToday).toBeCloseTo(reserved / 6, 2);
  expect(g.food + g.ponds[0].feedToday).toBeCloseTo(food + reserved, 3);
  expect(g.stats.feedUsed + g.food).toBeCloseTo(used + food, 3);
});
