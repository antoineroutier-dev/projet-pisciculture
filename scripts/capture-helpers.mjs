import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
export async function captureLot(lot, visit, initial = "terrain-vide") {
  const directory = `docs/ui/apres/${lot}`;
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
        (raw) => {
          localStorage.clear();
          localStorage.setItem("les-etangs-save-v3", raw);
        },
        fs.readFileSync(`docs/ui/fixtures/${initial}.json`, "utf8"),
      );
      await page.goto(process.env.UI_BASE_URL || "http://127.0.0.1:5173");
      const canvas = page.locator('canvas[data-engine="three-webgl"]');
      await expect(canvas).toHaveAttribute("data-settled", "true", {
        timeout: 120000,
      });
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
      async function snap(name, { toast = true } = {}) {
        await page.evaluate(() => document.fonts.ready);
        const game = await page.evaluate(() =>
          JSON.parse(localStorage.getItem("les-etangs-save-v4"))?.game || JSON.parse(localStorage.getItem("les-etangs-save-v3")),
        );
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
        await expect(canvas).toHaveAttribute("data-settled", "true", {
          timeout: 120000,
        });
        await canvas.evaluate((c) => c.getContext("webgl2")?.finish());
        if (toast) await page.locator(".toast").waitFor({ state: "hidden" });
        const file = `${directory}/${width}-${name}.jpg`;
        await page.screenshot({ path: file, type: "jpeg", quality: 70 });
        captures.push({ file, width, height, bytes: fs.statSync(file).size });
        console.log(file);
      }
      await visit({ page, width, height, seed, snap, canvas });
      await page.close();
    }
  } finally {
    await browser.close();
  }
  if (errors.length) throw Error(errors.join("\n"));
  const totalBytes = captures.reduce((sum, c) => sum + c.bytes, 0);
  if (totalBytes > 5e6) throw Error("Budget captures dépassé");
  fs.writeFileSync(
    `${directory}/manifest.json`,
    JSON.stringify({ totalBytes, captures }, null, 2) + "\n",
  );
  console.log({ count: captures.length, totalBytes });
}
