import { chromium } from "playwright";
import fs from "node:fs";
const directory = "docs/ui/apres/lot-1c";
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
for (const [width, height] of [
  [1440, 900],
  [390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.goto(process.env.UI_BASE_URL || "http://localhost:5173");
  await page.evaluate(
    (raw) => {
      localStorage.clear();
      localStorage.setItem("les-etangs-save-v3", raw);
    },
    fs.readFileSync("docs/ui/fixtures/contrat-client.json", "utf8"),
  );
  await page.reload();
  async function snap(name) {
    await page.evaluate(() => document.fonts.ready);
    await page
      .locator('canvas[data-settled="true"]')
      .waitFor({ timeout: 120000 });
    await page
      .locator('canvas[data-engine="three-webgl"]')
      .evaluate((c) => c.getContext("webgl2")?.finish());
    const file = `${directory}/${width}-${name}.jpg`;
    await page.screenshot({ path: file, type: "jpeg", quality: 70 });
    captures.push({ file, width, height, bytes: fs.statSync(file).size });
    console.log(file);
  }
  for (const [name, id] of [
    ["Construire", "project"],
    ["Bassins", "ponds"],
    ["Logistique", "logistics"],
    ["Finances", "finance"],
    ["Journal", "journal"],
    ["Guide", "guide"],
  ]) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
    if (id === "ponds") {
      await page.locator(".water-details summary").click();
      await page.locator(".water-panel").scrollIntoViewIfNeeded();
    }
    await snap(id);
    await page.keyboard.press("Escape");
  }
  await page.getByTestId("task-action").focus();
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await snap("settings-save");
  await page.getByRole("tab", { name: "Affichage", exact: true }).click();
  await snap("settings-display");
  await page
    .getByRole("slider", { name: "Échelle de l’interface" })
    .fill("150");
  await snap("settings-150");
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Bassins", exact: true })
    .click();
  await snap("ponds-150");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await page
    .getByRole("slider", { name: "Échelle de l’interface" })
    .fill("100");
  await page.getByRole("tab", { name: "Partie", exact: true }).click();
  await page
    .getByLabel("Fichier de sauvegarde")
    .setInputFiles({
      name: "cycle.json",
      mimeType: "application/json",
      buffer: fs.readFileSync("docs/ui/fixtures/cycle-paye.json"),
    });
  await page.locator(".toast").waitFor({ state: "hidden" });
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Bassins", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Commander des juvéniles", exact: true })
    .click();
  await snap("stock");
  await page.keyboard.press("Escape");
}
await browser.close();
const totalBytes = captures.reduce((s, c) => s + c.bytes, 0);
if (totalBytes > 5e6) throw Error("Budget captures");
fs.writeFileSync(
  `${directory}/manifest.json`,
  JSON.stringify({ totalBytes, captures }, null, 2) + "\n",
);
console.log({ totalBytes, count: captures.length });
