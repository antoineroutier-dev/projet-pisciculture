import { operatingGame as initialGame } from "./test-fixtures";
import { describe, expect, it } from "vitest";
import {
  act,
  ammonia,
  biomass,
  cleaningCost,
  dailyCost,
  feedNeeded,
  growthFactor,
  nextDay,
  oxygenSaturation,
  parseSave,
  SPECIES,
  type Game,
  type SpeciesId,
} from "./game";
const advance = (g: Game, n: number) => {
  for (let i = 0; i < n; i++) g = nextDay(g);
  return g;
};
const mature = () => {
  const g = initialGame();
  g.ponds[0].weight = 0.45;
  return g;
};
const legacy = () => {
  const g = initialGame();
  return {
    ...g,
    version: 1,
    lastAidDay: -20,
    ponds: g.ponds.map((p, i) => ({
      ...p,
      capacity: [80, 100, 120, 160][i],
      count: i < 2 ? 30 : 0,
      oxygen: 90,
    })),
  };
};

describe("unités et bilans physiques", () => {
  it("retrouve la saturation de référence en eau douce et sa baisse avec la température", () => {
    expect(oxygenSaturation(0)).toBeCloseTo(14.62, 1);
    expect(oxygenSaturation(20)).toBeCloseTo(9.09, 1);
    expect(oxygenSaturation(30)).toBeCloseTo(7.56, 1);
  });
  it("distingue TAN et NH₃-N et augmente la fraction toxique avec le pH et la chaleur", () => {
    expect(ammonia(1, 25, 7)).toBeCloseTo(0.00564, 4);
    expect(ammonia(1, 25, 8)).toBeCloseTo(0.05366, 4);
    expect(ammonia(1, 30, 8)).toBeGreaterThan(ammonia(1, 20, 8));
    expect(ammonia(0, 25, 8)).toBe(0);
  });
  it("résout le lavage d’un bassin vide suivant une décroissance exponentielle", () => {
    const g = initialGame(),
      p = g.ponds[0];
    Object.assign(p, {
      count: 0,
      species: null,
      weight: 0,
      tan: 2,
      flow: 0.25,
    });
    const result = nextDay(g).ponds[0];
    expect(result.tan).toBeCloseTo(
      2 * Math.exp(-((0.25 * 3.6) / 60 + 0.004) * 24),
      10,
    );
  });
  it("un renouvellement partiel dilue de 30 % sans guérison immédiate", () => {
    const g = initialGame(),
      p = g.ponds[0];
    p.tan = 1;
    p.health = 50;
    const r = act(g, { type: "clean", pondId: 1 });
    expect(r.ok).toBe(true);
    expect(r.game.ponds[0].tan).toBeCloseTo(0.7);
    expect(r.game.ponds[0].health).toBe(50);
    expect(r.game.money).toBe(g.money - cleaningCost(p));
  });
  it("la perte de débit crée une hypoxie et des mortalités, l’aération augmente l’oxygène", () => {
    const g = initialGame();
    g.ponds[0].flow = 0;
    const stopped = nextDay(g),
      aerated = nextDay(act(g, { type: "upgrade", pondId: 1 }).game);
    expect(stopped.ponds[0].oxygen).toBeLessThan(4);
    expect(stopped.stats.mortality).toBeGreaterThan(0);
    expect(aerated.ponds[0].oxygen).toBeGreaterThan(stopped.ponds[0].oxygen);
  });
  it("un biofiltre mature retire davantage de TAN qu’un filtre neuf", () => {
    const g = initialGame();
    Object.assign(g.ponds[0], { upgrade: 2, flow: 0.5, count: 100, tan: 1 });
    const young = nextDay(g);
    g.ponds[0].filterAge = 30;
    const old = nextDay(g);
    expect(old.ponds[0].tan).toBeLessThan(young.ponds[0].tan);
    expect(young.ponds[0].filterAge).toBe(1);
  });
});

describe("lots et alimentation", () => {
  it("réserve la ration une fois, distribue sur la journée et conserve l’état initial", () => {
    const g = initialGame(),
      ration = feedNeeded(g.ponds[0]);
    const fed = act(g, { type: "feed", pondId: 1 });
    expect(fed.game.food).toBeCloseTo(g.food - ration, 3);
    expect(act(fed.game, { type: "feed", pondId: 1 }).ok).toBe(false);
    const n = nextDay(fed.game);
    expect(n.ponds[0].lastFeed).toBe(ration);
    expect(n.ponds[0].feedToday).toBe(0);
    expect(n.ponds[0].weight).toBeGreaterThan(g.ponds[0].weight);
    expect(g.ponds[0].feedToday).toBe(0);
    expect(n.money).toBe(g.money - dailyCost(fed.game));
  });
  it("ne produit pas de croissance sans aliment", () => {
    const g = initialGame();
    const n = advance(g, 7);
    expect(n.ponds[0].weight).toBe(g.ponds[0].weight);
  });
  it("borne le gain par l’aliment consommé et le FCR", () => {
    const g = act(initialGame(), { type: "feed", pondId: 1 }).game,
      n = nextDay(g);
    expect(biomass(n.ponds[0]) - biomass(g.ponds[0])).toBeLessThanOrEqual(
      g.ponds[0].feedToday / SPECIES.trout.fcr + 1e-8,
    );
  });
  it("ne double pas une ration manuelle lorsque le distributeur est actif", () => {
    const g = act(initialGame(), { type: "feed", pondId: 1 }).game;
    g.ponds[0].autoFeed = true;
    const n = nextDay(g);
    expect(n.food).toBe(g.food);
    expect(n.stats.feedUsed).toBe(g.stats.feedUsed);
  });
  it("le distributeur partage le stock restant sans créer d’aliment", () => {
    const g = initialGame();
    g.food = 0.01;
    g.ponds.forEach((p) => (p.autoFeed = true));
    const n = nextDay(g);
    expect(n.food).toBe(0);
    expect(n.stats.feedUsed).toBeCloseTo(0.01);
    expect(n.logs.some((l) => l.text.includes("ration incomplète"))).toBe(true);
  });
  it("le sur-nourrissage augmente le TAN et dégrade le FCR", () => {
    const g = initialGame();
    g.ponds[0].count = 100;
    g.ponds[0].autoFeed = true;
    const normal = advance(g, 5);
    g.ponds[0].rationMultiplier = 1.5;
    const excess = advance(g, 5);
    expect(excess.ponds[0].tan).toBeGreaterThan(normal.ponds[0].tan);
    expect(
      excess.ponds[0].totalFeed / excess.ponds[0].totalGain,
    ).toBeGreaterThan(normal.ponds[0].totalFeed / normal.ponds[0].totalGain);
  });
  it("permet aux carpes d’hiverner en eau froide", () => {
    const g = initialGame();
    g.day = 240;
    Object.assign(g.ponds[1], { count: 100, temperature: 4, autoFeed: true });
    const n = advance(g, 75);
    expect(n.ponds[1].count).toBe(100);
    expect(n.ponds[1].health).toBeGreaterThan(70);
  });
  it.each(["trout", "tilapia"] as SpeciesId[])(
    "%s atteint le calibre en plusieurs mois",
    (id) => {
      let g = initialGame();
      g.money = 1e7;
      g.food = 1e6;
      Object.assign(g.ponds[0], {
        species: id,
        facility: SPECIES[id].facility,
        count: 100,
        weight: SPECIES[id].initialWeight,
        temperature: id === "tilapia" ? 27 : 14,
        flow: id === "trout" ? 12 : 0.03,
        upgrade: 2,
        filterAge: 30,
        autoFeed: true,
      });
      let days = 0;
      while (g.ponds[0].weight < SPECIES[id].harvestWeight && days < 500) {
        g = nextDay(g);
        days++;
      }
      expect(days).toBeGreaterThan(100);
      expect(days).toBeLessThan(300);
      expect(g.ponds[0].count).toBe(100);
    },
  );
  it("fait grandir les carpes sur deux saisons avec hivernage", () => {
    let g = initialGame();
    g.money = 1e7;
    g.food = 1e6;
    Object.assign(g.ponds[1], {
      count: 100,
      weight: 0.1,
      autoFeed: true,
      upgrade: 1,
    });
    let days = 0;
    while (days < 800 && g.ponds[1].weight < 1) {
      g = nextDay(g);
      days++;
    }
    expect(days).toBeGreaterThan(365);
    expect(days).toBeLessThan(730);
    expect(g.ponds[1].count).toBe(100);
    expect(g.ponds[1].health).toBeGreaterThan(80);
  });
  it("réduit la croissance lors de mauvaises conditions", () => {
    const p = initialGame().ponds[0],
      healthy = growthFactor(p);
    p.oxygen = 4;
    expect(growthFactor(p)).toBe(0);
    p.oxygen = 9;
    p.temperature = 25;
    expect(growthFactor(p)).toBeLessThan(healthy);
  });
});

describe("gestion, délais et économie", () => {
  it("construit en 14 jours et refuse une introduction pendant le chantier", () => {
    const g = initialGame();
    expect(act(g, { type: "build", pondId: 4 }).ok).toBe(false);
    const started = act(g, { type: "build", pondId: 3 }).game;
    expect(started.money).toBe(36000);
    expect(
      act(started, { type: "stock", pondId: 3, species: "trout", count: 100 })
        .ok,
    ).toBe(false);
    expect(advance(started, 13).ponds[2].built).toBe(false);
    const built = advance(started, 14);
    expect(built.ponds[2].built).toBe(true);
    expect(built.ponds[2].constructionDays).toBe(0);
    expect(
      act(built, { type: "stock", pondId: 3, species: "carp", count: 100 }).ok,
    ).toBe(false);
    const ordered = act(built, {
      type: "stock",
      pondId: 3,
      species: "trout",
      count: 100,
    });
    expect(ordered.ok).toBe(true);
    expect(ordered.game.ponds[2].count).toBe(0);
    expect(advance(ordered.game, 4).ponds[2].quarantineDays).toBe(14);
  });
  it("refuse des lots invalides et dimensionne la capacité à la récolte", () => {
    const g = initialGame();
    Object.assign(g.ponds[1], { count: 0, species: null, weight: 0 });
    for (const count of [0, -1, 451, 1.2, NaN])
      expect(
        act(g, { type: "stock", pondId: 2, species: "carp", count }).ok,
      ).toBe(false);
    expect(
      act(g, { type: "stock", pondId: 2, species: "tilapia", count: 100 }).ok,
    ).toBe(false);
  });
  it("refuse une vente précoce ou un lot en observation ou en mauvaise santé", () => {
    expect(act(initialGame(), { type: "harvest", pondId: 1 }).ok).toBe(false);
    const g = mature();
    g.ponds[0].quarantineDays = 1;
    expect(act(g, { type: "harvest", pondId: 1 }).ok).toBe(false);
    g.ponds[0].quarantineDays = 0;
    g.ponds[0].health = 50;
    expect(act(g, { type: "harvest", pondId: 1 }).ok).toBe(false);
  });
  it("met la récolte au froid, restitue la ration réservée et impose le vide sanitaire", () => {
    const g = act(mature(), {
        type: "contract",
        pondId: 1,
        buyer: "cooperative",
      }).game,
      fed = act(g, { type: "feed", pondId: 1 }).game,
      sale = act(fed, { type: "harvest", pondId: 1 }).game;
    expect(sale.money).toBe(g.money - 540 * 0.25);
    expect(sale.development.batches[0].kg).toBe(540);
    expect(sale.stats.soldKg).toBe(0);
    expect(sale.food).toBe(g.food);
    expect(sale.stats.feedUsed).toBe(0);
    expect(sale.ponds[0].fallowDays).toBe(7);
    expect(
      act(advance(sale, 6), {
        type: "stock",
        pondId: 1,
        species: "trout",
        count: 100,
      }).ok,
    ).toBe(false);
    expect(
      act(advance(sale, 7), {
        type: "stock",
        pondId: 1,
        species: "trout",
        count: 100,
      }).ok,
    ).toBe(true);
  });
  it("refuse les dépenses non finançables sans modifier la partie", () => {
    const g = initialGame();
    g.money = 0;
    for (const a of [
      { type: "food", pack: 0 },
      { type: "build", pondId: 3 },
      { type: "upgrade", pondId: 1 },
      { type: "clean", pondId: 1 },
    ] as const) {
      const r = act(g, a);
      expect(r.ok).toBe(false);
      expect(r.game).toBe(g);
    }
  });
  it("les aides ne changent pas la biologie et sont supprimées en mode expert", () => {
    const g = initialGame(),
      e = initialGame("expert");
    expect(nextDay(g).ponds).toEqual(nextDay(e).ponds);
    const fed = act(e, { type: "feed", pondId: 1 }).game,
      claimed = act(fed, { type: "claim", id: "feed" }).game;
    expect(claimed.money).toBe(fed.money);
    expect(claimed.xp).toBeGreaterThan(fed.xp);
    expect(act(claimed, { type: "claim", id: "feed" }).ok).toBe(false);
    e.money = 0;
    expect(act(e, { type: "aid" }).ok).toBe(false);
    g.money = 0;
    const aided = act(g, { type: "aid" }).game;
    expect(aided.money).toBe(5000);
    aided.money = 0;
    expect(act(aided, { type: "aid" }).ok).toBe(false);
  });
});

describe("persistance et stabilité", () => {
  it("migre une V1 en conservant le lot, l’argent et une eau cohérente", () => {
    const v = legacy();
    v.ponds[1].species = "trout";
    const g = parseSave(JSON.stringify(v));
    expect(g.version).toBe(3);
    expect(g.money).toBe(v.money);
    expect(g.ponds[1].count).toBe(30);
    expect(g.ponds[1].facility).toBe("raceway");
    expect(g.ponds[1].flow).toBe(12);
    expect(g.ponds[1].oxygen).toBeCloseTo(oxygenSaturation(13.5) * 0.9);
    expect(parseSave(JSON.stringify(g))).toEqual(g);
  });
  it("accepte les parties V3 et ignore les champs inconnus", () => {
    const g = act(initialGame(), { type: "feed", pondId: 1 }).game;
    expect(parseSave(JSON.stringify({ ...g, extra: "ignored" }))).toEqual(g);
  });
  it("rejette les incohérences et les entrées corrompues", () => {
    for (const raw of ["{}", "{broken", "x".repeat(300001)])
      expect(() => parseSave(raw)).toThrow();
    const mutations = [
      (g: Game) => (g.ponds[0].count = -1),
      (g: Game) => (g.ponds[0].flow = 99),
      (g: Game) => (g.ponds[0].species = "carp"),
      (g: Game) => (g.ponds[0].quarantineDays = 999),
      (g: Game) => (g.ponds[0].feedToday = 10),
      (g: Game) => (g.ponds[2].feedToday = 2),
      (g: Game) => (g.money = Infinity),
    ];
    for (const mutate of mutations) {
      const g = initialGame();
      mutate(g);
      expect(() => parseSave(JSON.stringify(g))).toThrow();
    }
  });
  it("reste déterministe, finie et rechargeable après deux ans", () => {
    const a = advance(initialGame(), 730),
      b = advance(initialGame(), 730);
    expect(a).toEqual(b);
    expect(a.money).toBeGreaterThanOrEqual(0);
    expect(a.history).toHaveLength(90);
    expect(a.logs.length).toBeLessThanOrEqual(120);
    expect(parseSave(JSON.stringify(a))).toEqual(a);
  });
});
