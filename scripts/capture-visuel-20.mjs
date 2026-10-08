// Reception captures for the "20/20" art direction: real title, world and panels,
// rendered at the High preset with reduced motion so frames are deterministic.
// Usage: npm run dev (port 5173), then node scripts/capture-visuel-20.mjs
import { chromium } from "@playwright/test";
import fs from "node:fs";
import { enterGame } from "./enter-game.mjs";

const directory = "docs/ui/apres/visuel-20";
fs.mkdirSync(directory, { recursive: true });
const base = process.env.UI_BASE_URL || "http://127.0.0.1:5173";
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
const plan = [
  [1440, 900, "high"],
  [390, 844, "medium"],
];
async function open(width, height, quality, fixture) {
  const page = await browser.newPage({
    viewport: { width, height },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(240000);
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ raw, quality }) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.clear();
      localStorage.setItem("les-etangs-save-v3", raw);
      localStorage.setItem(
        "les-etangs-graphics-v1",
        JSON.stringify({ version: 1, quality, labels: true }),
      );
    },
    {
      raw: fs.readFileSync(`docs/ui/fixtures/${fixture}.json`, "utf8"),
      quality,
    },
  );
  await page.goto(base);
  return page;
}
async function settle(page) {
  await page.waitForTimeout(500);
  await page.waitForFunction(
    () =>
      document.querySelector("canvas[data-engine]")?.dataset.settled === "true",
    null,
    { timeout: 240000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
}
async function snap(page, width, name) {
  const file = `${directory}/${width}-${name}.jpg`;
  await page.screenshot({ path: file, type: "jpeg", quality: 78 });
  captures.push({ file, width, bytes: fs.statSync(file).size });
  console.log(file);
}
try {
  for (const [width, height, quality] of plan) {
    // Title, then the growing farm and its panels.
    let page = await open(width, height, quality, "contrat-client");
    await page.getByTestId("title-screen").waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector(".title-world canvas[data-engine]")?.dataset
          .settled === "true",
      null,
      { timeout: 240000 },
    );
    await page.waitForTimeout(500);
    await snap(page, width, "titre");
    await enterGame(page);
    await settle(page);
    await snap(page, width, "monde");
    for (const [panel, name] of [
      ["Bassins", "bassin"],
      ["Logistique", "logistique"],
      ["Finances", "finances"],
      ["Guide", "guide"],
    ]) {
      await page
        .getByRole("navigation")
        .getByRole("button", { name: panel, exact: true })
        .click();
      await settle(page);
      await snap(page, width, name);
      await page.keyboard.press("Escape");
    }
    if (width > 700) {
      await page.keyboard.press("Escape");
      await page.getByRole("dialog").waitFor();
      await snap(page, width, "pause");
      await page.keyboard.press("Escape");
      for (const [view, name] of [
        ["Les poissons", "poissons"],
        ["Bâtiments", "batiments"],
      ]) {
        await page.getByRole("radio", { name: view, exact: true }).click();
        await settle(page);
        await snap(page, width, name);
      }
    }
    await page.close();
    // Construction sites and a cold-chain day.
    page = await open(width, height, quality, "chantier");
    await enterGame(page);
    await settle(page);
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Construire", exact: true })
      .click();
    await settle(page);
    await snap(page, width, "chantier");
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
