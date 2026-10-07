import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const directory = "docs/ui/apres/lot-2b";
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
    await page.goto(process.env.UI_BASE_URL || "http://localhost:5173");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator('canvas[data-engine="three-webgl"]')).toHaveAttribute("data-settled", "true", { timeout: 120000 });
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
    await seed("contrat-client");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Logistique", exact: true })
      .click();
    await snap("chaine-approvisionnement");
    if (width === 390) {
      await page.locator(".production-flow summary").click();
      await snap("chaine-depliee");
      await page.locator(".production-flow summary").click();
    }
    await page.locator(".feed-shop").scrollIntoViewIfNeeded();
    await snap("boutique");
    for (const [name, file] of [
      ["Bâtiments", "batiments"],
      ["Clients", "clients"],
    ]) {
      await page.getByRole("tab", { name, exact: true }).click();
      await page.getByRole("tabpanel").scrollIntoViewIfNeeded();
      await snap(file);
    }
    await page.getByText("Prix et espèces", { exact: true }).click();
    await page.locator(".market-species").scrollIntoViewIfNeeded();
    await snap("prix");
    await seed("lot-au-froid");
    await page.getByTestId("task-action").click();
    await page.locator(".cold-batch-card").scrollIntoViewIfNeeded();
    await snap("lot-au-froid");
    await seed("expedition");
    await page.locator(".shipment-card").scrollIntoViewIfNeeded();
    await snap("expedition");
    await seed("cycle-paye");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Finances", exact: true })
      .click();
    await page
      .getByRole("region", { name: "Contenu du panneau", exact: true })
      .evaluate((e) => (e.scrollTop = 0));
    await snap("finances");
    await page.locator(".chart-data summary").click();
    await page.locator(".chart-data table").scrollIntoViewIfNeeded();
    await snap("releves");
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
