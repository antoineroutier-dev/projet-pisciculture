import { expect, it } from "vitest";
import { initialGame, act, nextDay } from "../game";
import { pondStructure, pondProgress, assetState } from "./artSelectors";
it("décrit uniquement les vrais changements de structure et la progression du moteur", () => {
  let g = act(initialGame(), { type: "survey" }).game;
  g = nextDay(nextDay(g));
  g = act(g, { type: "plan", pondId: 1, species: "trout" }).game;
  const planned = pondStructure(g.ponds[0]);
  g = act(g, { type: "build", pondId: 1 }).game;
  expect(pondStructure(g.ponds[0])).not.toBe(planned);
  expect(pondProgress(g.ponds[0])).toBe(0);
  const started = pondStructure(g.ponds[0]),
    copy = JSON.stringify(g);
  expect(assetState(g, "warehouse").built).toBe(false);
  expect(JSON.stringify(g)).toBe(copy);
  g = act(g, { type: "asset", asset: "warehouse" }).game;
  expect(assetState(g, "warehouse")).toEqual({
    built: false,
    working: true,
    progress: 0,
  });
  for (let i = 0; i < 7; i++) g = nextDay(g);
  expect(pondStructure(g.ponds[0])).toBe(started);
  expect(pondProgress(g.ponds[0])).toBe(0.5);
  expect(assetState(g, "warehouse")).toEqual({
    built: true,
    working: false,
    progress: 1,
  });
  for (let i = 0; i < 7; i++) g = nextDay(g);
  expect(pondProgress(g.ponds[0])).toBe(1);
  expect(pondStructure(g.ponds[0])).not.toBe(started);
});
it("ne reconstruit pas un bassin pour ses mesures ou son stock, et borne les silhouettes au nombre réel", () => {
  const pond = initialGame().ponds[0],
    source = { ...pond, built: true, species: "trout" as const, count: 1000 };
  expect(
    pondStructure({
      ...source,
      weight: 0.4,
      oxygen: 5,
      lastFeed: 3,
      count: 997,
    }),
  ).toBe(pondStructure(source));
  expect(pondStructure({ ...source, count: 2 })).not.toBe(
    pondStructure(source),
  );
  expect(pondStructure({ ...source, count: 0 })).not.toBe(
    pondStructure({ ...source, count: 2 }),
  );
  expect(pondProgress({ ...pond, constructionDays: 100 })).toBe(0);
});
