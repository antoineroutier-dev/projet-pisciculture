import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { initialGame, act, nextDay, parseSave, type Action } from "../game";
import { dailyFeed } from "../development";
import { initialLedger, recordLedger, emptyPeriod, monthKey } from "./ledger";
import { initialMetadata } from "./saveMetadata";
import {
  initialProfile,
  observeProfile,
  parseProfile,
  cleanPaidCycle,
  profitableMonths,
  ACHIEVEMENT_IDS,
} from "./profile";
import { parseSavedGame, serializeSave, SAVE_KEY, V5_SAVE_KEY } from "./saves";
import { readSlot } from "./saveSlots";
import { platform } from "../platform";
import { tutorialStep } from "../onboarding/tutorial";
it("observe le vrai premier cycle sans modifier le moteur ; conserve les succès après rotation du registre", () => {
  let game = initialGame(),
    ledger = initialLedger(game),
    profile = initialProfile();
  const step = (action: Action | { type: "day" }) => {
    const before = JSON.stringify({ game, ledger });
    const result =
      action.type === "day"
        ? { ok: true, game: nextDay(game), message: "" }
        : act(game, action);
    expect(result.ok, result.message).toBe(true);
    const next = recordLedger(ledger, game, result.game, action);
    expect(JSON.stringify({ game, ledger })).toBe(before);
    game = result.game;
    ledger = next;
    const proof = JSON.stringify({ game, ledger });
    profile = observeProfile(profile, game, ledger);
    expect(JSON.stringify({ game, ledger })).toBe(proof);
    expect(
      parseSavedGame(
        serializeSave(game, ledger, false, initialMetadata(), profile),
      ).profile,
    ).toEqual(profile);
  };
  const days = (n: number) => {
    for (let i = 0; i < n; i++) step({ type: "day" });
  };
  expect(tutorialStep(game, [])).toBe("water");
  step({ type: "survey" });
  expect(tutorialStep(game, [])).toBe("results");
  days(2);
  expect(tutorialStep(game, [])).toBe("plot");
  step({ type: "plan", pondId: 1, species: "trout" });
  expect(tutorialStep(game, [])).toBe("build");
  step({ type: "build", pondId: 1 });
  expect(tutorialStep(game, [])).toBe("works");
  step({ type: "asset", asset: "warehouse" });
  days(14);
  step({ type: "food", pack: 2 });
  days(2);
  step({ type: "stock", pondId: 1, species: "trout", count: 1000 });
  days(4);
  expect(tutorialStep(game, [])).toBe("feed");
  step({ type: "autoFeed", pondId: 1, enabled: true });
  expect(tutorialStep(game, [])).toBe("ponds");
  expect(tutorialStep(game, ["ponds", "logistics", "finance"])).toBe("finish");
  step({ type: "asset", asset: "coldstore" });
  for (let i = 0; i < 400 && game.ponds[0].weight < 0.45; i++) {
    if (
      game.food < dailyFeed(game) * 8 &&
      !game.development.orders.some((o) => o.kind === "feed")
    )
      step({ type: "food", pack: 2 });
    days(1);
  }
  step({ type: "contract", pondId: 1, buyer: "cooperative" });
  step({ type: "harvest", pondId: 1 });
  step({ type: "dispatch", id: game.development.batches[0].id });
  days(8);
  expect(profile.earned.map((e) => e.id)).toEqual([
    "water",
    "pond",
    "fish",
    "feeding",
    "contract",
    "harvest",
    "dispatch",
    "paid",
    "cold",
  ]);
  expect(profile.earned.every((e) => !e.imported)).toBe(true);
  expect(
    observeProfile(profile, game, { ...ledger, cycles: [], months: [] }),
  ).toBe(profile);
  expect(
    cleanPaidCycle({
      ...ledger,
      cycles: ledger.cycles.map((c) => ({ ...c, incomplete: true })),
    }),
  ).toBe(false);
  expect(
    cleanPaidCycle({
      ...ledger,
      cycles: ledger.cycles.map((c) => ({
        ...c,
        metricsStartDay: c.startDay + 1,
      })),
    }),
  ).toBe(false);
  expect(
    cleanPaidCycle({
      ...ledger,
      cycles: ledger.cycles.map((c) => ({ ...c, wasteKg: 0.1 })),
    }),
  ).toBe(false);
});
it("ne crée pas un succès sans pertes à partir de l’historique inconnu d’un import", () => {
  const game = parseSave(
      readFileSync("docs/ui/fixtures/cycle-paye.json", "utf8"),
    ),
    ledger = initialLedger(game);
  const p = observeProfile(initialProfile(true), game, ledger, true);
  expect(p.earned.some((e) => e.id === "paid")).toBe(true);
  expect(p.earned.some((e) => e.id === "cold")).toBe(false);
  expect(p.earned.every((e) => e.imported && e.observedDay === game.day)).toBe(
    true,
  );
  expect(p.profitableMonths).toEqual([]);
});
it("compte les mois clos complets hors aides, sans doublon, et retient douze mois malgré la rotation", () => {
  const game = initialGame();
  game.day = 500;
  const ledger = initialLedger(game);
  ledger.months = Array.from({ length: 12 }, (_, i) => {
    const startDay = Math.round(
        (Date.UTC(2026, 3 + i, 1) - Date.UTC(2026, 3, 0)) / 86400000,
      ),
      endDay = Math.round(
        (Date.UTC(2026, 4 + i, 0) - Date.UTC(2026, 3, 0)) / 86400000,
      );
    return {
      ...emptyPeriod(startDay),
      endDay,
      month: monthKey(startDay),
      income: 100,
      costs: { ...emptyPeriod(startDay).costs, feed: 99 },
    };
  });
  expect(profitableMonths(ledger)).toHaveLength(12);
  const profile = observeProfile(initialProfile(), game, ledger);
  expect(profile.earned.some((e) => e.id === "profitable")).toBe(true);
  expect(observeProfile(profile, game, ledger)).toBe(profile);
  expect(observeProfile(profile, game, { ...ledger, months: [] })).toBe(
    profile,
  );
  const first = ledger.months[0];
  for (const row of [
    { ...first, income: 0, aid: 1000 },
    { ...first, incomplete: true },
    { ...first, metricsStartDay: first.startDay + 1 },
    {
      ...first,
      startDay: first.startDay + 1,
      metricsStartDay: first.startDay + 1,
    },
    { ...first, endDay: first.endDay - 1 },
  ])
    expect(profitableMonths({ ...ledger, months: [row] })).toEqual([]);
  expect(
    profitableMonths({ ...ledger, lastDay: first.endDay, months: [first] }),
  ).toEqual([]);
});
it("migre V5 sans remplacer son original, valide V6 et rejette une progression incohérente", () => {
  const game = initialGame(),
    ledger = initialLedger(game),
    metadata = initialMetadata();
  const raw = JSON.stringify({ version: 5, game, ledger, metadata });
  const migrated = parseSavedGame(raw);
  expect(migrated).toEqual({
    version: 6,
    game,
    ledger,
    metadata,
    profile: initialProfile(true),
  });
  const map = new Map([[V5_SAVE_KEY, raw]]);
  expect(readSlot("auto", { getItem: (k) => map.get(k) ?? null }).save).toEqual(
    migrated,
  );
  expect(map.has(SAVE_KEY)).toBe(false);
  expect(map.get(V5_SAVE_KEY)).toBe(raw);
  for (const extra of [
    { version: 2 },
    { introSeen: 1 },
    { tutorial: "unknown" },
    { earned: [{ id: "made-up", observedDay: 1, imported: false }] },
    { earned: [{ id: "paid", observedDay: 2, imported: false }] },
    {
      earned: [
        { id: "paid", observedDay: 1, imported: false },
        { id: "paid", observedDay: 1, imported: false },
      ],
    },
    { profitableMonths: ["2026-04"] },
    { profitableMonths: ["2025-12"] },
    { profitableMonths: ["2026-99"] },
  ])
    expect(() =>
      parseProfile({ ...initialProfile(), ...extra }, game),
    ).toThrow();
  expect(ACHIEVEMENT_IDS).toHaveLength(12);
});
it("l’adaptateur web ne fait aucune requête de plateforme", async () => {
  const fetch = vi.spyOn(globalThis, "fetch");
  await platform.unlockAchievement("water");
  expect(await platform.readCloudSave()).toBeNull();
  await platform.writeCloudSave("local-save");
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});

it("distingue deux filières construites et le seuil exact des cinq tonnes", () => {
  const game = initialGame();
  const check = () =>
    observeProfile(initialProfile(true), game, initialLedger(game)).earned.map(
      (e) => e.id,
    );
  game.ponds[0].built = true;
  game.ponds[2].built = true;
  expect(check()).not.toContain("diversify");
  game.ponds[1].plannedSpecies = "carp";
  expect(check()).not.toContain("diversify");
  game.ponds[1].built = true;
  expect(check()).toContain("diversify");
  game.stats.soldKg = 4999.99;
  expect(check()).not.toContain("volume");
  game.stats.soldKg = 5000;
  expect(check()).toContain("volume");
});
