// Developer helper: capture the running game in several views for visual review.
// Usage: node scripts/dev-shot.mjs <fixture> <outPrefix> [width] [height] [quality] [views,comma,separated] [motion]
// Views: world, a dock panel name (Construire…), pond, title, pause, settings, save.
import { chromium } from "@playwright/test";
import fs from "node:fs";
import { enterGame } from "./enter-game.mjs";
const [
  fixture = "elevage",
  out = "shot",
  w = "1440",
  h = "900",
  quality = "high",
  views = "world",
  motion = "reduce",
] = process.argv.slice(2);
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
const page = await browser.newPage({
  viewport: { width: +w, height: +h },
  reducedMotion: motion,
});
page.setDefaultTimeout(180000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.addInitScript(
  ({ raw, quality }) => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "1");
    localStorage.clear();
    if (raw) localStorage.setItem("les-etangs-save-v3", raw);
    localStorage.setItem(
      "les-etangs-graphics-v1",
      JSON.stringify({ version: 1, quality, labels: true }),
    );
  },
  {
    raw:
      fixture === "new"
        ? ""
        : fs.readFileSync(`docs/ui/fixtures/${fixture}.json`, "utf8"),
    quality,
  },
);
await page.goto(process.env.UI_BASE_URL || "http://127.0.0.1:5173");
const settle = async () => {
  await page.waitForTimeout(400);
  try {
    await page.waitForFunction(
      () =>
        document.querySelector("canvas[data-engine]")?.dataset.settled ===
        "true",
      null,
      { timeout: 180000 },
    );
  } catch {}
  await page.waitForTimeout(+process.env.WAIT || 300);
};
const list = views.split(",");
if (list[0] === "title") {
  await page.getByTestId("title-screen").waitFor();
  await page.waitForTimeout(+process.env.WAIT || 9000);
  await page.screenshot({ path: `${out}-title.png` });
  list.shift();
}
if (list.length) await enterGame(page);
for (const view of list) {
  if (view === "pond")
    await page
      .getByRole("button", { name: /^Les Saules/ })
      .first()
      .click();
  else if (view === "pause") await page.keyboard.press("Escape");
  else if (view === "settings")
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
  else if (view !== "world")
    await page
      .getByRole("navigation")
      .getByRole("button", { name: view, exact: true })
      .click();
  await settle();
  await page.screenshot({ path: `${out}-${view}.png` });
  console.log(`${out}-${view}.png`);
  if (view !== "world") await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "ok");
await browser.close();
