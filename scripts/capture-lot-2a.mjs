import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const directory = "docs/ui/apres/lot-2a";
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
  captures = [];
page.on("pageerror", (e) => console.error(e));
for (const [width, height] of [
  [1440, 900],
  [390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.goto(process.env.UI_BASE_URL || "http://localhost:5173");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  async function snap(name) {
    await page.evaluate(() => document.fonts.ready);
    const game = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("les-etangs-save-v3")),
    );
    const signature = game.ponds
      .map(
        (p) =>
          `${p.id}:${p.built}:${p.constructionDays}:${p.count}:${p.upgrade}`,
      )
      .join("|");
    const canvas = page.locator('canvas[data-engine="three-webgl"]');
    await expect(canvas).toHaveAttribute("data-day", String(game.day), {
      timeout: 120000,
    });
    await expect(canvas).toHaveAttribute("data-ponds", signature, {
      timeout: 120000,
    });
    await expect(canvas).toHaveAttribute("data-settled", "true");
    await canvas.evaluate((c) => c.getContext("webgl2")?.finish());
    await page.locator(".toast").waitFor({ state: "hidden" });
    const file = `${directory}/${width}-${name}.jpg`;
    await page.screenshot({ path: file, type: "jpeg", quality: 70 });
    captures.push({ file, width, height, bytes: fs.statSync(file).size });
    console.log(file);
  }
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Construire", exact: true })
    .click();
  await snap("analyse-commande");
  await page.keyboard.press("Escape");
  await page.getByTestId("task-action").click();
  await page.getByTestId("task-action").click();
  await snap("analyse-resultats");
  await page
    .getByRole("button", { name: "Choisir une parcelle", exact: true })
    .click();
  await snap("construction-truite");
  await page
    .getByLabel("Parcelle sélectionnée", { exact: true })
    .selectOption("2");
  await snap("construction-carpe");
  await page
    .getByRole("button", {
      name: "Choisir : Carpe commune · La Roselière",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Construire La Roselière", exact: true })
    .click();
  await snap("chantier");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await page
    .getByLabel("Fichier de sauvegarde")
    .setInputFiles({
      name: "contract.json",
      mimeType: "application/json",
      buffer: fs.readFileSync("docs/ui/fixtures/contrat-client.json"),
    });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Bassins", exact: true })
    .click();
  await snap("inspecteur");
  for (const name of ["Eau", "Alimentation", "Équipement", "Historique"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await page.getByRole("tabpanel").scrollIntoViewIfNeeded();
    await snap(
      `onglet-${{ Eau: "eau", Alimentation: "alimentation", Équipement: "equipement", Historique: "historique" }[name]}`,
    );
  }
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await page.getByRole("tab", { name: "Affichage", exact: true }).click();
  await page
    .getByRole("slider", { name: "Échelle de l’interface" })
    .fill("150");
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Bassins", exact: true })
    .click();
  await snap("inspecteur-150");
  await page.keyboard.press("Escape");
}
await browser.close();
const totalBytes = captures.reduce((s, c) => s + c.bytes, 0);
if (totalBytes > 5e6) throw Error("Budget captures");
fs.writeFileSync(
  `${directory}/manifest.json`,
  JSON.stringify({ totalBytes, captures }, null, 2) + "\n",
);
console.log({ count: captures.length, totalBytes });
