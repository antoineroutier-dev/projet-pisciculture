import { expect, it } from "vitest";
import { initialGame, STORAGE_KEY } from "../game";
import { initialLedger } from "./ledger";
import {
  initialMetadata,
  parseMetadata,
  VisiblePlaytime,
} from "./saveMetadata";
import { parseSavedGame, serializeSave, SAVE_KEY, V4_SAVE_KEY } from "./saves";
import { readSlot, readSlots, newSave } from "./saveSlots";

it("V5 conserve le jeu, son registre et la durée observée, sans changer les données V4 d’origine", () => {
  const game = initialGame(),
    ledger = initialLedger(game),
    old = { version: 4, game, ledger },
    raw = JSON.stringify(old);
  const migrated = parseSavedGame(raw);
  expect(migrated).toEqual({
    version: 5,
    game,
    ledger,
    metadata: initialMetadata(true),
  });
  expect(JSON.stringify(old)).toBe(raw);
  const metadata = {
    playedMs: 73000,
    priorPlaytimeUnknown: true,
    savedAt: "2026-10-07T23:00:00.000Z",
    thumbnail: "data:image/webp;base64,UklGRgAAAABXRUJQ",
  };
  expect(parseSavedGame(serializeSave(game, ledger, true, metadata))).toEqual({
    version: 5,
    game,
    ledger,
    metadata,
  });
  expect(newSave("expert").game.mode).toBe("expert");
  expect(newSave().metadata.priorPlaytimeUnknown).toBe(false);
});
it("rejette les durées, dates, vignettes et tailles invalides sans remplacer les données", () => {
  const fresh = newSave();
  for (const extra of [
    { playedMs: -1 },
    { playedMs: 0.5 },
    { playedMs: Infinity },
    { playedMs: 1e12 + 1 },
    { savedAt: "2026-02-31T00:00:00.000Z" },
    { savedAt: "yesterday" },
    { priorPlaytimeUnknown: 1 },
    { thumbnail: "https://example.com/image.png" },
    { thumbnail: "data:image/svg+xml;base64,PHN2Zz4=" },
    { thumbnail: "data:image/webp;base64," + "A".repeat(180001) },
  ])
    expect(() => parseMetadata({ ...fresh.metadata, ...extra })).toThrow(
      /incompatibles/,
    );
  expect(() =>
    parseSavedGame(JSON.stringify({ ...fresh, metadata: null })),
  ).toThrow();
  expect(() =>
    parseSavedGame(JSON.stringify({ ...fresh, version: 99 })),
  ).toThrow();
  expect(() => parseSavedGame('"' + "é".repeat(1_000_001) + '"')).toThrow(
    /volumineux/,
  );
});
it("trois emplacements indépendants et un automatique ne réécrivent ni l’ancien format ni une sauvegarde corrompue", () => {
  const game = initialGame(),
    legacy = JSON.stringify({ version: 4, game, ledger: initialLedger(game) });
  const data = new Map([
    [V4_SAVE_KEY, legacy],
    ["les-etangs-slot-2", JSON.stringify(newSave("expert"))],
  ]);
  const reader = { getItem: (key: string) => data.get(key) ?? null };
  expect(readSlots(reader).map((s) => [s.id, !!s.save])).toEqual([
    ["auto", true],
    [1, false],
    [2, true],
    [3, false],
  ]);
  expect(readSlot("auto", reader).key).toBe(V4_SAVE_KEY);
  expect(data.get(V4_SAVE_KEY)).toBe(legacy);
  expect(data.has(SAVE_KEY)).toBe(false);
  for (const corrupt of ["{broken", ""]) {
    data.set(SAVE_KEY, corrupt);
    const slot = readSlot("auto", reader);
    expect(slot.save).toBeNull();
    expect(slot.raw).toBe(corrupt);
    expect(slot.error).toContain("conservée");
    expect(data.get(V4_SAVE_KEY)).toBe(legacy);
  }
  data.delete(SAVE_KEY);
  data.delete(V4_SAVE_KEY);
  data.set(STORAGE_KEY, JSON.stringify(game));
  expect(readSlot("auto", reader).save?.game).toEqual(game);
  expect(
    readSlot(1, {
      getItem: () => {
        throw Error("denied");
      },
    }).error,
  ).toContain("stockage");
});
it("la durée compte la planification visible, exclut l’onglet masqué et ne recompte pas les snapshots", () => {
  const clock = new VisiblePlaytime(12000, 100, true);
  expect(clock.read(1100)).toBe(13000);
  expect(clock.read(1100)).toBe(13000);
  clock.visibility(2100, false);
  expect(clock.read(50000)).toBe(14000);
  clock.visibility(50100, true);
  expect(clock.read(51100)).toBe(15000);
  clock.visibility(52100, false);
  expect(clock.read(99000)).toBe(16000);
  const resumed = new VisiblePlaytime(clock.read(99000), 1, false);
  resumed.visibility(10000, true);
  expect(resumed.read(10100)).toBe(16100);
});
