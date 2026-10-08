import { expect, it } from "vitest";
import { QUALITY, parseGraphics, detectQuality } from "./quality";
import { placeLabel, overlap } from "./placement";
it("choisit une qualité prudente et garde quatre niveaux distincts sans changer le jeu", () => {
  const base = {
    renderer: "GPU",
    threads: 8,
    width: 1440,
    maxTextureSize: 8192,
  };
  expect(detectQuality({ ...base, renderer: "ANGLE SwiftShader" })).toBe("low");
  expect(detectQuality({ ...base, width: 390 })).toBe("medium");
  expect(detectQuality(base)).toBe("high");
  expect(Object.values(QUALITY).map((q) => q.ratio)).toEqual([0.75, 1, 1.5, 2]);
  expect(parseGraphics('{"quality":"unknown","labels":false}')).toEqual({
    version: 1,
    quality: "auto",
    labels: false,
  });
  expect(parseGraphics("null").quality).toBe("auto");
  expect(parseGraphics('{"quality":"ultra"}').quality).toBe("ultra");
});
it("place les étiquettes sans chevaucher HUD, panneaux ou étiquettes voisines", () => {
  const hud = { x: 0, y: 0, width: 1280, height: 110 },
    panel = { x: 800, y: 110, width: 480, height: 600 };
  const first = placeLabel(
    { x: 500, y: 300 },
    { width: 150, height: 40 },
    { width: 1280, height: 800 },
    [hud, panel],
  )!;
  expect(first).not.toBeNull();
  expect(overlap(first, hud)).toBe(false);
  expect(overlap(first, panel)).toBe(false);
  const next = placeLabel(
    { x: 500, y: 300 },
    { width: 150, height: 40 },
    { width: 1280, height: 800 },
    [hud, panel, first],
  );
  if (next) expect(overlap(first, next)).toBe(false);
  expect(
    placeLabel(
      { x: 1100, y: 300 },
      { width: 150, height: 40 },
      { width: 1280, height: 800 },
      [hud, panel],
    ),
  ).toBeNull();
});
