import fs from "node:fs";
import { chromium, expect } from "@playwright/test";
import { enterGame } from "./enter-game.mjs";
const directory = "docs/ui/apres/lot-5b";
fs.mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
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
    await page.addInitScript(
      (raw) => localStorage.setItem("les-etangs-save-v6", raw),
      fs.readFileSync("docs/ui/fixtures/elevage.json", "utf8"),
    );
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
    await page
      .getByRole("button", { name: "Nouvelle partie", exact: true })
      .click();
    await snap("nouvelle-partie-preference");
    await page.keyboard.press("Escape");
    await enterGame(page);
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
    for (const [name, slug] of [
      ["Affichage", "affichage"],
      ["Audio", "audio"],
      ["Jeu", "jeu"],
      ["Contrôles", "controles"],
      ["Langue", "langue"],
    ]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await snap(slug);
    }
    await page.getByRole("tab", { name: "Contrôles", exact: true }).click();
    await page
      .getByRole("button", { name: "Réassigner : Construire", exact: true })
      .click();
    await page.keyboard.press("Alt+b");
    await page.getByRole("alert").scrollIntoViewIfNeeded();
    await snap("raccourci-conflit");
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Affichage", exact: true }).click();
    await page.getByRole("switch", { name: "Motifs daltoniens" }).click();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Alt+b");
    await snap("jauges-motifs");
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const pad = {
        id: "Manette standard simulée",
        connected: true,
        index: 0,
        mapping: "standard",
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({
          pressed: false,
          value: 0,
        })),
      };
      Object.defineProperty(navigator, "getGamepads", {
        configurable: true,
        value: () => [pad],
      });
      Object.assign(window, { __capturePad: pad });
      window.dispatchEvent(new Event("gamepadconnected"));
      pad.buttons[13] = { pressed: true, value: 1 };
    });
    await expect(page.locator(".pad-hints")).toBeVisible();
    await page.evaluate(() => {
      window.__capturePad.buttons[13] = { pressed: false, value: 0 };
    });
    await snap("manette-hud");
    await page.keyboard.press("Alt+g");
    await page
      .locator("summary")
      .filter({ hasText: "Le rythme biologique" })
      .click();
    await page.locator(".guide-article[open] .hint").scrollIntoViewIfNeeded();
    await snap("guide-raccourcis");
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
