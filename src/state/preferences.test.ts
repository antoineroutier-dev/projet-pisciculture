import { expect, it } from "vitest";
import { parsePreferences, DEFAULT_PREFERENCES } from "./preferences";
it("borne les préférences locales sans toucher à la sauvegarde de simulation", () => {
  expect(parsePreferences("{oops")).toEqual({
    ...DEFAULT_PREFERENCES,
    scale: 100,
    motion: "system",
  });
  expect(parsePreferences('{"scale":45,"motion":"reduce"}')).toEqual({
    ...DEFAULT_PREFERENCES,
    scale: 80,
    motion: "reduce",
  });
  expect(parsePreferences('{"scale":200}').scale).toBe(150);
  expect(parsePreferences('{"scale":"150"}').scale).toBe(100);
});
