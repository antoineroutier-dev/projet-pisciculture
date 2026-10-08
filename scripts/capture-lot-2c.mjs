import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const directory = "docs/ui/apres/lot-2c";
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
const page = await browser.newPage({ reducedMotion: "reduce" }),
  captures = [],
  errors = [];
page.setDefaultTimeout(120000);
page.on("pageerror", (e) => errors.push(e.message));
try {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.addInitScript(
      (raw) => {
        localStorage.clear();
        localStorage.setItem("les-etangs-save-v3", raw);
      },
      fs.readFileSync("docs/ui/fixtures/cycle-paye.json", "utf8"),
    );
    await page.goto(process.env.UI_BASE_URL || "http://localhost:5173");
    await expect(
      page.locator('canvas[data-engine="three-webgl"]'),
    ).toHaveAttribute("data-settled", "true", { timeout: 120000 });
    async function seed(name) {
      await page
        .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
        .click();
      await page.getByRole("tab", { name: "Partie", exact: true }).click();
      await page.getByLabel("Fichier de sauvegarde").setInputFiles({
        name: `${name}.json`,
        mimeType: "application/json",
        buffer: fs.readFileSync(`docs/ui/fixtures/${name}.json`),
      });
    }
    async function snap(name) {
      await page.evaluate(() => document.fonts.ready);
      const game = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("les-etangs-save-v3")),
      );
      const canvas = page.locator('canvas[data-engine="three-webgl"]');
      await expect(canvas).toHaveAttribute("data-day", String(game.day), {
        timeout: 120000,
      });
      await expect(canvas).toHaveAttribute(
        "data-ponds",
        game.ponds
          .map(
            (p) =>
              `${p.id}:${p.built}:${p.constructionDays}:${p.count}:${p.upgrade}`,
          )
          .join("|"),
        { timeout: 120000 },
      );
      await expect(canvas).toHaveAttribute("data-settled", "true");
      await canvas.evaluate((c) => c.getContext("webgl2")?.finish());
      await page.locator(".toast").waitFor({ state: "hidden" });
      const file = `${directory}/${width}-${name}.jpg`;
      await page.screenshot({ path: file, type: "jpeg", quality: 70 });
      captures.push({ file, width, height, bytes: fs.statSync(file).size });
      console.log(file);
    }
    const panel = async (name) => {
      await page
        .getByRole("navigation")
        .getByRole("button", { name, exact: true })
        .click();
      await page
        .getByRole("region", { name: "Contenu du panneau", exact: true })
        .evaluate((e) => (e.scrollTop = 0));
    };
    await snap("objectif-exploitation");
    await page
      .getByRole("button", { name: "Voir les objectifs", exact: true })
      .click();
    await snap("objectifs");
    await page.keyboard.press("Escape");
    await panel("Journal");
    await snap("journal");
    await page
      .getByLabel("Type d’événement", { exact: true })
      .selectOption("weekly");
    await page.locator(".weekly-entry summary").first().click();
    await snap("bilan-hebdomadaire");
    await page
      .getByLabel("Type d’événement", { exact: true })
      .selectOption("all");
    await page
      .getByLabel("Bassin du journal", { exact: true })
      .selectOption("1");
    await snap("journal-bassin");
    await panel("Guide");
    await snap("guide-pratique");
    await page.locator(".guide-article summary").first().click();
    await snap("guide-conseil");
    for (const [name, file] of [
      ["Espèces", "especes"],
      ["Eau et alimentation", "eau"],
      ["À propos du modèle", "modele"],
    ]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await page
        .getByRole("region", { name: "Contenu du panneau", exact: true })
        .evaluate((e) => (e.scrollTop = 0));
      await snap("guide-" + file);
    }
    await seed("contrat-client");
    await panel("Bassins");
    await page
      .getByRole("button", {
        name: "Comprendre : Azote ammoniacal total · TAN",
        exact: true,
      })
      .focus();
    await snap("aide-tan");
    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Alimentation", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Comprendre : Indice de conversion · FCR",
        exact: true,
      })
      .focus();
    await snap("aide-fcr");
    await page.keyboard.press("Escape");
    await panel("Logistique");
    await page.getByRole("tab", { name: "Bâtiments", exact: true }).click();
    await snap("batiments");
  }
  if (errors.length) throw Error(errors.join("\n"));
} finally {
  await browser.close();
}
const totalBytes = captures.reduce((s, c) => s + c.bytes, 0);
if (totalBytes > 5e6) throw Error("Budget captures dépassé");
fs.writeFileSync(
  `${directory}/manifest.json`,
  JSON.stringify({ totalBytes, captures }, null, 2) + "\n",
);
console.log({ count: captures.length, totalBytes });
