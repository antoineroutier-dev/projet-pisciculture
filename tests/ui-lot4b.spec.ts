import { enterGame } from "./ui-helpers";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { act, nextDay, parseSave, STORAGE_KEY } from "../src/game";
import { SAVE_KEY } from "../src/state/saves";
import { settleEvents } from "./ui-helpers";
import { sceneWeather } from "../src/world/lifeSelectors";
test("4b : camions et nourrissage suivent les transitions réelles, import sans rejeu", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const seed = parseSave(
    readFileSync("docs/ui/fixtures/elevage.json", "utf8"),
  )!;
  const ordered = act(seed, { type: "food", pack: 0 });
  expect(ordered.ok).toBe(true);
  const before = nextDay(ordered.game),
    expected = nextDay(before);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: STORAGE_KEY,
    raw: JSON.stringify(before),
  });
  await page.goto("/");
  await enterGame(page);
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  expect(JSON.parse((await canvas.getAttribute("data-life"))!)).toEqual([]);
  const farmId = await canvas.getAttribute("data-farm-id");
  await page.getByRole("button", { name: "Jour suivant", exact: true }).click();
  await settleEvents(page);
  await expect(canvas).toHaveAttribute("data-day", String(expected.day), {
    timeout: 60000,
  });
  await expect
    .poll(async () =>
      JSON.parse((await canvas.getAttribute("data-life"))!).some(
        (e: { kind: string; cargo?: string }) =>
          e.kind === "truck" && e.cargo === "feed",
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    ),
  ).toEqual(expected);
  if (expected.ponds[0].lastFeed > 0)
    expect(
      JSON.parse((await canvas.getAttribute("data-life"))!).some(
        (e: { kind: string }) => e.kind === "feed",
      ),
    ).toBe(true);
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await page.getByRole("tab", { name: "Partie", exact: true }).click();
  await page.getByLabel("Fichier de sauvegarde").setInputFiles({
    name: "same-day.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(expected)),
  });
  await expect(canvas).toHaveAttribute("data-life", "[]", { timeout: 60000 });
  await expect(canvas).toHaveAttribute("data-farm-id", farmId!);
  const weather = JSON.parse((await canvas.getAttribute("data-weather"))!);
  expect(weather.season).toBe(sceneWeather(expected.day).season);
  expect(weather.rain).toBe(sceneWeather(expected.day).rainy);
  expect(weather.hour).toBe(12);
});
test("4b : quatre saisons réelles, éclairage au repos et réduit, aucune glace sur eau positive", async ({
  page,
}) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1280, height: 800 });
  let game = parseSave(readFileSync("docs/ui/fixtures/chantier.json", "utf8"))!;
  const states = [];
  for (const target of [30, 100, 200, 280]) {
    while (game.day < target) game = nextDay(game);
    states.push(JSON.stringify(game));
  }
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: STORAGE_KEY,
    raw: states[0],
  });
  await page.goto("/");
  await enterGame(page);
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  for (let i = 0; i < states.length; i++) {
    if (i) {
      await page
        .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
        .click();
      await page.getByRole("tab", { name: "Partie", exact: true }).click();
      await page.getByLabel("Fichier de sauvegarde").setInputFiles({
        name: "season.json",
        mimeType: "application/json",
        buffer: Buffer.from(states[i]),
      });
    }
    await expect(canvas).toHaveAttribute(
      "data-day",
      String(JSON.parse(states[i]).day),
      { timeout: 60000 },
    );
    await expect(canvas).toHaveAttribute("data-settled", "true", {
      timeout: 60000,
    });
    const weather = JSON.parse((await canvas.getAttribute("data-weather"))!);
    expect(weather.season).toBe(["spring", "summer", "autumn", "winter"][i]);
    expect(weather.ice).toEqual([]);
    expect(weather.hour).toBe(12);
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Vitesse ×1", exact: true }).click();
  await expect
    .poll(
      async () => JSON.parse((await canvas.getAttribute("data-weather"))!).hour,
      { timeout: 15000 },
    )
    .not.toBe(12);
  await page
    .getByRole("button", { name: "Mettre en pause", exact: true })
    .click();
  await expect(page.locator(".hud-clock")).toHaveAttribute(
    "data-active",
    "false",
  );
  const hour = JSON.parse((await canvas.getAttribute("data-weather"))!).hour;
  // A running browser frame must retain the held hour while the game clock is paused.
  const frame = await canvas.getAttribute("data-camera"),
    rendered = await canvas.getAttribute("data-render-count");
  await expect
    .poll(() => canvas.getAttribute("data-render-count"))
    .not.toBe(rendered);
  expect(JSON.parse((await canvas.getAttribute("data-weather"))!).hour).toBe(
    hour,
  );
  expect(await canvas.getAttribute("data-camera")).toBe(frame);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(
      async () => JSON.parse((await canvas.getAttribute("data-weather"))!).hour,
    )
    .toBe(12);
});
