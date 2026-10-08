import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { withoutWebGL, enterGame } from "./ui-helpers";
import { typography } from "./ui-measures";
import { installPad, padActivate, padTo, padPress } from "./pad-helpers";
import { PREFERENCES_KEY, V1_PREFERENCES_KEY } from "../src/state/preferences";
import { SAVE_KEY } from "../src/state/saves";
import { act, parseSave } from "../src/game";
for (const [width, height] of [
  [1440, 900],
  [390, 844],
])
  test(`5b : paramètres, raccourcis, motifs et préférences à ${width}×${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    await page.addInitScript((key) => {
      if (!sessionStorage.getItem("seeded-ui")) {
        localStorage.setItem(
          key,
          '{"version":1,"scale":100,"motion":"reduce"}',
        );
        sessionStorage.setItem("seeded-ui", "yes");
      }
    }, V1_PREFERENCES_KEY);
    await page.goto("/");
    await enterGame(page);
    const settings = () =>
      page
        .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
        .click();
    const tab = (name: string) => page.getByRole("tab", { name, exact: true });
    await settings();
    const records: unknown[] = [];
    for (const name of [
      "Partie",
      "Affichage",
      "Audio",
      "Jeu",
      "Contrôles",
      "Langue",
    ]) {
      await tab(name).click();
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(axe.violations).toEqual([]);
      const fonts = await typography(page);
      expect(fonts.tooSmall).toEqual([]);
      expect(fonts.width).toBeLessThanOrEqual(width);
      records.push({ view: name, violations: axe.violations.length, ...fonts });
    }
    await tab("Affichage").click();
    if (width === 1440) {
      await page
        .getByRole("button", { name: "Passer en plein écran", exact: true })
        .click();
      await expect
        .poll(() => page.evaluate(() => !!document.fullscreenElement))
        .toBe(true);
      await page
        .getByRole("button", { name: "Quitter le plein écran", exact: true })
        .click();
      await expect
        .poll(() => page.evaluate(() => !!document.fullscreenElement))
        .toBe(false);
    }
    await page.getByRole("switch", { name: "Motifs daltoniens" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-patterns", "true");
    await tab("Jeu").click();
    await page.getByLabel("Vitesse de reprise").selectOption("4");
    await page.getByRole("switch", { name: "Aides pédagogiques" }).click();
    await tab("Contrôles").click();
    const bind = page.getByRole("button", {
      name: "Réassigner : Construire",
      exact: true,
    });
    await bind.click();
    await page.keyboard.press("Alt+b");
    await expect(page.getByRole("alert")).toContainText("déjà");
    await page.keyboard.press("Escape");
    await expect(bind).toBeFocused();
    await expect(page.getByRole("dialog")).toBeVisible();
    await bind.click();
    await page.keyboard.press("Alt+x");
    await expect(bind).toContainText("Alt+X");
    await page.keyboard.press("Escape");
    await expect(page.locator(".goal-details-toggle")).toHaveCount(0);
    await page.keyboard.press("Alt+c");
    await expect(page.locator(".management-panel")).toHaveCount(0);
    await page.keyboard.press("Alt+x");
    await expect(
      page.locator('.management-panel[data-panel-id="project"]'),
    ).toBeVisible();
    await expect(
      page.locator('.game-dock [data-panel="project"]'),
    ).toHaveAttribute("aria-keyshortcuts", "Alt+X");
    await page.keyboard.press("Escape");
    await page.locator(".hud-date").click();
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: "Vitesse ×4", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press("1");
    const prefs = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      PREFERENCES_KEY,
    );
    expect(prefs).toMatchObject({
      version: 3,
      patterns: true,
      aids: false,
      defaultSpeed: 4,
      bindings: { project: "Alt+X" },
    });
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).version,
        V1_PREFERENCES_KEY,
      ),
    ).toBe(1);
    await page.reload();
    await enterGame(page);
    await settings();
    await tab("Contrôles").click();
    await expect(bind).toContainText("Alt+X");
    await page
      .getByRole("button", { name: "Rétablir les raccourcis", exact: true })
      .click();
    await expect(bind).toContainText("Alt+C");
    await info.attach("settings5b", {
      contentType: "application/json",
      body: JSON.stringify(records),
    });
  });
test("5b : la pause courante peut être désactivée, une avance explicite reste interrompue", async ({
  page,
}) => {
  await withoutWebGL(page);
  const fixture = parseSave(
    readFileSync("docs/ui/fixtures/elevage.json", "utf8"),
  )!;
  const order = act(fixture, { type: "food", pack: 0 });
  expect(order.ok).toBe(true);
  await page.addInitScript(
    ({ save, prefs, game }) => {
      localStorage.setItem(save, JSON.stringify(game));
      localStorage.setItem(
        prefs,
        JSON.stringify({ version: 3, autoPause: false, motion: "reduce" }),
      );
    },
    { save: SAVE_KEY, prefs: PREFERENCES_KEY, game: order.game },
  );
  await page.goto("/");
  await enterGame(page);
  const initial = order.game.day;
  await page.getByRole("button", { name: "Vitesse ×8", exact: true }).click();
  await expect
    .poll(async () =>
      Number(await page.getByTestId("day").getAttribute("data-day")),
    )
    .toBeGreaterThanOrEqual(initial + 3);
  await page
    .getByRole("button", { name: "Mettre en pause", exact: true })
    .click();
  await expect(page.getByTestId("event-card")).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) =>
        JSON.parse(localStorage.getItem(key)!).game.development.orders.length,
      SAVE_KEY,
    ),
  ).toBe(0);
  await page.keyboard.press("Alt+l");
  await page
    .getByRole("button", { name: "Commander 100 kg", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Jusqu’au prochain événement", exact: true })
    .click();
  await expect(page.getByTestId("event-card")).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".hud-clock")).toHaveAttribute(
    "data-active",
    "false",
  );
});
test("5b : manette, onglets, valeurs natives, régions et commandes caméra", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await withoutWebGL(page);
  await installPad(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const button = (name: string) =>
    page.getByRole("button", { name, exact: true });
  await padActivate(page, button("Paramètres"));
  await padTo(page, page.getByRole("tab", { name: "Affichage", exact: true }));
  await padPress(page, 15);
  await expect(
    page.getByRole("tab", { name: "Audio", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await padActivate(
    page,
    page.getByRole("tab", { name: "Contrôles", exact: true }),
  );
  await padTo(page, page.getByLabel("Sensibilité de caméra"));
  await padPress(page, 15);
  await expect(page.getByLabel("Sensibilité de caméra")).toHaveValue("105");
  await padActivate(page, page.getByRole("tab", { name: "Jeu", exact: true }));
  await padTo(page, page.getByLabel("Vitesse de reprise"));
  await padPress(page, 15);
  await expect(page.getByLabel("Vitesse de reprise")).toHaveValue("2");
  await padPress(page, 1);
  await padActivate(page, button("Nouvelle partie"));
  await padActivate(page, button("Commencer avec les aides pédagogiques"));
  await padPress(page, 5);
  await expect(page.locator(".game-shell")).toBeVisible();
  await page.evaluate(() => {
    (window as typeof window & { __pad: { axes: number[] } }).__pad.axes[0] =
      0.8;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __padCamera: unknown[] }).__padCamera
            .length,
      ),
    )
    .toBeGreaterThan(0);
  await page.evaluate(() => {
    (window as typeof window & { __pad: { axes: number[] } }).__pad.axes[0] = 0;
  });
  await padPress(page, 9);
  await expect(
    page.getByRole("dialog", { name: "Partie en pause" }),
  ).toBeVisible();
  const before = await page.evaluate(
    () =>
      (window as typeof window & { __padCamera: unknown[] }).__padCamera.length,
  );
  await page.evaluate(() => {
    (window as typeof window & { __pad: { axes: number[] } }).__pad.axes[0] =
      0.8;
  });
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { __padCamera: unknown[] }).__padCamera
          .length,
    ),
  ).toBe(before);
  await page.evaluate(() => {
    (window as typeof window & { __pad: { axes: number[] } }).__pad.axes[0] = 0;
  });
  const commands = await page.evaluate(
    () => (window as typeof window & { __padCamera: unknown[] }).__padCamera,
  );
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { __browserInputs: string[] })
          .__browserInputs,
    ),
  ).toEqual([]);
  await info.attach("pad-controls", {
    contentType: "application/json",
    body: JSON.stringify({ commands }),
  });
});

test("5b : sensibilité et raccourci réassigné déplacent la vraie caméra, sans remontage", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await installPad(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: SAVE_KEY,
    raw: readFileSync("docs/ui/fixtures/elevage.json", "utf8"),
  });
  await page.goto("/");
  await enterGame(page);
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  await canvas.evaluate((c) =>
    Object.assign(window, { __originalPadCanvas: c }),
  );
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await page.getByRole("tab", { name: "Contrôles", exact: true }).click();
  await page.getByLabel("Sensibilité de caméra").press("End");
  await expect(page.getByLabel("Sensibilité de caméra")).toHaveValue("200");
  await page
    .getByRole("button", { name: "Réassigner : Tourner à droite", exact: true })
    .click();
  await page.keyboard.press("t");
  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("data-settled", "true");
  const before = await canvas.getAttribute("data-camera");
  await page.keyboard.press("e");
  await page.waitForTimeout(150);
  expect(await canvas.getAttribute("data-camera")).toBe(before);
  await page.keyboard.press("t");
  await expect.poll(() => canvas.getAttribute("data-camera")).not.toBe(before);
  const turn = await page.evaluate(() =>
    (
      window as typeof window & {
        __padCamera: { kind: string; amount: number }[];
      }
    ).__padCamera.find((c) => c.kind === "rotate"),
  );
  expect(turn?.amount).toBeCloseTo(Math.PI / 4);
  await page.locator(".hud-date").click();
  await padPress(page, 13);
  expect(
    await page.evaluate(() =>
      parseFloat(getComputedStyle(document.activeElement!).outlineWidth),
    ),
  ).toBeGreaterThanOrEqual(3);
  const turned = await canvas.getAttribute("data-camera");
  await page.evaluate(() => {
    (window as typeof window & { __pad: { axes: number[] } }).__pad.axes[0] =
      0.8;
  });
  await expect.poll(() => canvas.getAttribute("data-camera")).not.toBe(turned);
  await page.evaluate(() => {
    (
      window as typeof window & {
        __pad: { axes: number[]; connected: boolean };
      }
    ).__pad.axes[0] = 0;
    (
      window as typeof window & { __pad: { connected: boolean } }
    ).__pad.connected = false;
  });
  await expect(page.locator(".pad-hints")).toHaveCount(0);
  expect(
    await canvas.evaluate(
      (c) =>
        c ===
        (window as typeof window & { __originalPadCanvas: HTMLCanvasElement })
          .__originalPadCanvas,
    ),
  ).toBe(true);
  await info.attach("pad-real-camera", {
    contentType: "application/json",
    body: JSON.stringify({ sensitivity: 200, turn, persistent: true }),
  });
});
