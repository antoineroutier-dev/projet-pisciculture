import fs from "node:fs";
import { chromium, expect } from "@playwright/test";
import { enterGame } from "./enter-game.mjs";
const directory = "docs/ui/apres/lot-5a";
fs.mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu-rasterization",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
  ],
});
const captures = [],
  errors = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(120000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.UI_BASE_URL || "http://127.0.0.1:5173");
    const canvas = page.locator('canvas[data-engine="three-webgl"]');
    async function snap(name) {
      await page.mouse.move(width - 1, height - 1);
      await page.evaluate(() => document.fonts.ready);
      await expect(canvas).toHaveAttribute("data-settled", "true", {
        timeout: 120000,
      });
      await canvas.evaluate((c) => c.getContext("webgl2")?.finish());
      const file = `${directory}/${width}-${name}.jpg`;
      await page.screenshot({ path: file, type: "jpeg", quality: 70 });
      captures.push({ file, width, height, bytes: fs.statSync(file).size });
      console.log(file);
    }
    await snap("titre");
    await page
      .getByRole("button", { name: "Nouvelle partie", exact: true })
      .click();
    await snap("nouvelle-partie");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Crédits", exact: true }).click();
    await snap("credits");
    await page.keyboard.press("Escape");
    await enterGame(page);
    await snap("hud-menu");
    await page.keyboard.press("Escape");
    await snap("pause");
    await page
      .getByRole("button", { name: "Sauvegarder", exact: true })
      .click();
    await page
      .locator('[data-slot="1"]')
      .getByRole("button", { name: "Sauvegarder ici", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Emplacement 1 enregistré." }),
    ).toBeVisible();
    await snap("emplacements");
    await page
      .locator('[data-slot="1"]')
      .getByRole("button", { name: "Sauvegarder ici", exact: true })
      .click();
    await snap("remplacement");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Retour au menu", exact: true })
      .click();
    await page.getByTestId("title-screen").waitFor();
    await page.getByText("Dernière exploitation", { exact: false }).click();
    await snap("titre-reprise");
    await page.close();
  }
} finally {
  await browser.close();
}
if (errors.length) throw Error(errors.join("\n"));
const totalBytes = captures.reduce((s, c) => s + c.bytes, 0);
if (totalBytes > 5e6) throw Error("Budget captures dépassé");
fs.writeFileSync(
  `${directory}/manifest.json`,
  JSON.stringify({ totalBytes, captures }, null, 2) + "\n",
);
console.log({ totalBytes, count: captures.length });
