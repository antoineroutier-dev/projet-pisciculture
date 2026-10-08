import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { enterGame, withoutWebGL } from "./ui-helpers";
import { typography, noOverlap } from "./ui-measures";
import { SAVE_KEY } from "../src/state/saves";
import { PREFERENCES_KEY, V2_PREFERENCES_KEY } from "../src/state/preferences";
const stages = [
  "terrain-vide",
  "chantier",
  "elevage",
  "contrat-client",
  "lot-au-froid",
  "expedition",
  "cycle-paye",
];
const panels = ["Build", "Ponds", "Logistics", "Finances", "Journal", "Guide"];
const settings = (page: Page) =>
  page.getByRole("button", { name: "Settings & saves", exact: true }).click();
const tab = (page: Page, name: string) =>
  page.getByRole("tab", { name, exact: true }).click();
for (const [width, height] of [
  [1440, 900],
  [390, 844],
])
  test(`5c : anglais complet, préférences et sept états à ${width}×${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(360000);
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    await page.addInitScript(
      ({ save, key, pref }) => {
        if (!sessionStorage.getItem("seeded-language")) {
          localStorage.setItem(key, save);
          localStorage.setItem(
            pref,
            JSON.stringify({
              version: 2,
              scale: 100,
              motion: "reduce",
              sensitivity: 125,
              patterns: true,
            }),
          );
          sessionStorage.setItem("seeded-language", "yes");
        }
      },
      {
        save: readFileSync("docs/ui/fixtures/elevage.json", "utf8"),
        key: SAVE_KEY,
        pref: V2_PREFERENCES_KEY,
      },
    );
    await page.goto("/");
    await enterGame(page);
    const savedBefore = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
    await tab(page, "Langue");
    await page
      .getByRole("combobox", { name: "Langue", exact: true })
      .selectOption("en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.getByRole("tab", { name: "Language", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    const records: unknown[] = [];
    for (const name of [
      "Saves",
      "Display",
      "Audio",
      "Gameplay",
      "Controls",
      "Language",
    ]) {
      await tab(page, name);
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(axe.violations).toEqual([]);
      const fonts = await typography(page);
      expect(fonts.tooSmall).toEqual([]);
      expect(fonts.width).toBeLessThanOrEqual(width);
      records.push({
        view: `settings:${name}`,
        violations: axe.violations.length,
        ...fonts,
      });
    }
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).game,
        SAVE_KEY,
      ),
    ).toEqual(savedBefore);
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        PREFERENCES_KEY,
      ),
    ).toMatchObject({
      version: 3,
      locale: "en",
      sensitivity: 125,
      patterns: true,
    });
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).version,
        V2_PREFERENCES_KEY,
      ),
    ).toBe(2);
    await expect(page.getByTestId("money")).toContainText("€47,772");
    const englishOnly = async () =>
      expect(await page.locator(".game-shell").innerText()).not.toMatch(
        /Trésorerie|Construire|Paramètres|Aucun lot|Truite arc-en-ciel|Prochaine action|Laissez grandir|poissons en élevage|poissons entiers|truite arc-en-ciel|indisponible/,
      );
    for (const stage of stages) {
      await page.evaluate(({ key, save }) => localStorage.setItem(key, save), {
        key: SAVE_KEY,
        save: readFileSync(`docs/ui/fixtures/${stage}.json`, "utf8"),
      });
      await page.reload();
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await expect(page.locator(".game-shell")).toBeVisible();
      for (const scale of [80, 100, 150]) {
        await settings(page);
        await tab(page, "Display");
        await page
          .getByRole("slider", { name: "Interface scale", exact: true })
          .fill(String(scale));
        await page.keyboard.press("Escape");
        for (const name of panels) {
          await page
            .locator(".game-dock")
            .getByRole("button", { name, exact: true })
            .click();
          const fonts = await typography(page);
          expect(fonts.tooSmall).toEqual([]);
          expect(fonts.width).toBeLessThanOrEqual(width);
          await noOverlap(page, [
            ".game-hud",
            ".goal-hud",
            ".management-panel",
            ".game-dock",
          ]);
          await englishOnly();
          let violations: number | undefined;
          if (scale === 100) {
            const axe = await new AxeBuilder({ page })
              .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
              .analyze();
            expect(axe.violations).toEqual([]);
            violations = axe.violations.length;
          }
          records.push({ stage, scale, panel: name, violations, ...fonts });
        }
      }
    }
    await settings(page);
    await tab(page, "Language");
    await page
      .getByRole("combobox", { name: "Language", exact: true })
      .selectOption("fr");
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(
      page
        .locator(".game-dock")
        .getByRole("button", { name: "Construire", exact: true }),
    ).toBeVisible();
    await info.attach("english-matrix", {
      contentType: "application/json",
      body: JSON.stringify(records),
    });
  });
test("5c : changer de langue conserve le vrai canvas, la caméra et les données", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(({ key, save }) => localStorage.setItem(key, save), {
    key: SAVE_KEY,
    save: readFileSync("docs/ui/fixtures/elevage.json", "utf8"),
  });
  await page.goto("/");
  await enterGame(page);
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  await canvas.evaluate((c) =>
    c.setAttribute("data-language-identity", "original"),
  );
  const camera = await canvas.getAttribute("data-camera");
  const original = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await tab(page, "Langue");
  await page
    .getByRole("combobox", { name: "Langue", exact: true })
    .selectOption("en");
  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("aria-label", /3D view of the farm/);
  await expect(canvas).toHaveAttribute("data-language-identity", "original");
  expect(await canvas.getAttribute("data-camera")).toBe(camera);
  await expect(page.locator(".world-labels")).toHaveAttribute(
    "aria-label",
    "Ponds in the world",
  );
  await settings(page);
  await tab(page, "Language");
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("fr");
  await page.keyboard.press("Escape");
  await expect(canvas).toHaveAttribute("aria-label", /Vue 3D/);
  await expect(canvas).toHaveAttribute("data-language-identity", "original");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    ),
  ).toEqual(original);
  await info.attach("language-canvas", {
    contentType: "application/json",
    body: JSON.stringify({
      persistent: true,
      cameraPreserved: true,
      gamePreserved: true,
    }),
  });
});
