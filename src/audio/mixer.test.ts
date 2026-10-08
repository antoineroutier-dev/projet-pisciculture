import { expect, it } from "vitest";
import { DEFAULT_VOLUMES, parseVolumes } from "./mixer";
it("migrates missing audio preferences, clamps each independent bus and rejects malformed values", () => {
  expect(parseVolumes(null)).toEqual(DEFAULT_VOLUMES);
  expect(parseVolumes("{")).toEqual(DEFAULT_VOLUMES);
  expect(
    parseVolumes(
      JSON.stringify({
        version: 1,
        volumes: {
          master: 999,
          music: -3,
          ambience: "x",
          effects: 45,
          ui: null,
        },
      }),
    ),
  ).toEqual({ ...DEFAULT_VOLUMES, master: 100, music: 0, effects: 45 });
  expect(
    parseVolumes(JSON.stringify({ version: 99, volumes: { master: 0 } })),
  ).toEqual(DEFAULT_VOLUMES);
});
