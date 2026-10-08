import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { withoutWebGL, enterGame } from "./ui-helpers";
import { typography } from "./ui-measures";
import { SAVE_KEY } from "../src/state/saves";
for (const [width, height] of [
  [1440, 900],
  [390, 844],
])
  test(`5a : titre, menus, trois emplacements et clavier à ${width}×${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const records: unknown[] = [];
    async function audit(view: string) {
      const a = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(a.violations).toEqual([]);
      const fonts = await typography(page);
      expect(fonts.tooSmall).toEqual([]);
      expect(fonts.width).toBeLessThanOrEqual(width);
      records.push({ view, violations: a.violations.length, ...fonts });
    }
    await expect(page.getByTestId("title-screen")).toBeVisible();
    expect(
      await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
    ).toBeNull();
    await audit("title");
    for (const label of [
      "Paramètres",
      "Crédits",
      "Charger une partie",
      "Nouvelle partie",
    ]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await audit(label);
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: label, exact: true }),
      ).toBeFocused();
    }
    await enterGame(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toContainText("Reprendre");
    await audit("pause");
    await page
      .getByRole("button", { name: "Sauvegarder", exact: true })
      .click();
    for (const id of [1, 2, 3]) {
      await page
        .locator(`[data-slot="${id}"]`)
        .getByRole("button", { name: "Sauvegarder ici", exact: true })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: `Emplacement ${id} enregistré.` }),
      ).toBeVisible();
    }
    const read = () =>
      page.evaluate(() =>
        [1, 2, 3].map((id) => localStorage.getItem(`les-etangs-slot-${id}`)),
      );
    const first = await read();
    expect(first.every(Boolean)).toBe(true);
    expect(JSON.parse(first[0]!).metadata.playedMs).toBeGreaterThan(0);
    await audit("slots");
    await page
      .locator('[data-slot="1"]')
      .getByRole("button", { name: "Sauvegarder ici", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Confirmer le remplacement" }),
    ).toBeVisible();
    await audit("overwrite");
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    expect(await read()).toEqual(first);
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Jour suivant", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Sauvegarder", exact: true })
      .click();
    await page
      .locator('[data-slot="1"]')
      .getByRole("button", { name: "Sauvegarder ici", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Remplacer cet emplacement", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Emplacement 1 enregistré." }),
    ).toBeVisible();
    const second = await read();
    expect(JSON.parse(second[0]!).game.day).toBe(2);
    expect(second.slice(1)).toEqual(first.slice(1));
    await page
      .locator('[data-slot="2"]')
      .getByRole("button", { name: "Charger emplacement 2", exact: true })
      .click();
    await expect(page.getByTestId("day")).toHaveAttribute("data-day", "1");
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Retour au menu", exact: true })
      .click();
    await expect(page.getByTestId("title-screen")).toBeVisible();
    const saved = await page.evaluate(
      (key) => localStorage.getItem(key),
      SAVE_KEY,
    );
    await page.waitForTimeout(1100);
    expect(
      await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
    ).toBe(saved);
    expect(await read()).toEqual(second);
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await expect(page.getByTestId("day")).toHaveAttribute("data-day", "1");
    await info.attach("title-slot-measures", {
      body: JSON.stringify(records),
      contentType: "application/json",
    });
  });
test("5a : vignette réelle, durée et nettoyage à chaque retour au titre", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.addInitScript(() => {
    (window as any).disposals = [];
    window.addEventListener("etangs-render-disposed", (e) =>
      (window as any).disposals.push((e as CustomEvent).detail),
    );
  });
  await page.goto("/");
  await enterGame(page);
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  await page.evaluate(() => {
    (window as any).disposals = [];
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Sauvegarder", exact: true }).click();
  await page
    .locator('[data-slot="1"]')
    .getByRole("button", { name: "Sauvegarder ici", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Emplacement 1 enregistré." }),
  ).toBeVisible();
  const value = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("les-etangs-slot-1")!),
  );
  expect(value.metadata.thumbnail).toMatch(/^data:image\/webp;base64,/);
  expect(value.metadata.playedMs).toBeGreaterThan(0);
  expect(value.metadata.savedAt).toMatch(/Z$/);
  const pixels = await page.evaluate(async (raw) => {
    const img = new Image();
    img.src = raw;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const colors = new Set<string>();
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < data.length; i += 40)
      colors.add(data.slice(i, i + 3).join(","));
    return { width: c.width, height: c.height, colors: colors.size };
  }, value.metadata.thumbnail);
  expect(pixels.width).toBeLessThanOrEqual(320);
  expect(pixels.height).toBeLessThanOrEqual(180);
  expect(pixels.colors).toBeGreaterThan(100);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Retour au menu", exact: true })
    .click();
  await expect(page.getByTestId("title-screen")).toBeVisible();
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(canvas).toHaveAttribute("data-viewport", "390x844");
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  const frames = Number(await canvas.getAttribute("data-render-count"));
  await page.waitForTimeout(1200);
  expect(Number(await canvas.getAttribute("data-render-count"))).toBe(frames);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(canvas).toHaveAttribute("data-viewport", "1440x900");
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  const cleanup = await page.evaluate(() => (window as any).disposals);
  expect(cleanup).toEqual([
    { contextLost: true, memory: { geometries: 0, textures: 0 } },
  ]);
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByTestId("day")).toHaveAttribute("data-day", "1");
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  expect(await page.evaluate(() => (window as any).disposals)).toHaveLength(2);
  await info.attach("title-render-lifecycle", {
    body: JSON.stringify({ pixels, cleanup }),
    contentType: "application/json",
  });
});
test("5a : erreur de stockage à la sortie conserve la session et offre un export", async ({
  page,
}) => {
  await withoutWebGL(page);
  await page.goto("/");
  await enterGame(page);
  await page.getByRole("button", { name: "Jour suivant", exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.includes("save-v6"))
        throw new DOMException("Quota", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Retour au menu", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Quitter sans enregistrer",
  );
  await expect(page.getByTestId("title-screen")).toHaveCount(0);
  const download = page.waitForEvent("download");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Exporter ma partie", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe("les-etangs-jour-2.json");
  await page
    .getByRole("button", { name: "Revenir au jeu", exact: true })
    .click();
  await expect(page.getByTestId("day")).toHaveAttribute("data-day", "2");
});
