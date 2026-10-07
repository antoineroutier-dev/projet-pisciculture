import { expect, it } from "vitest";
import { parsePreferences } from "./preferences";
it("borne les préférences locales sans toucher à la sauvegarde de simulation", () => {
  expect(parsePreferences("{oops")).toEqual({
    version: 1,
    scale: 100,
    motion: "system",
  });
  expect(parsePreferences('{"scale":45,"motion":"reduce"}')).toEqual({
    version: 1,
    scale: 80,
    motion: "reduce",
  });
  expect(parsePreferences('{"scale":200}').scale).toBe(150);
  expect(parsePreferences('{"scale":"150"}').scale).toBe(100);
});
