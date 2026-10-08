import fs from "node:fs";
import { build } from "esbuild";
import { chromium, expect } from "@playwright/test";
const directory = "docs/ui/apres/lot-5d";
const fr = JSON.parse(fs.readFileSync("src/i18n/fr.json", "utf8")),
  en = JSON.parse(fs.readFileSync("src/i18n/en.json", "utf8"));
const label = (locale, s) =>
  (locale === "en" ? en : fr)[Object.keys(fr).find((k) => fr[k] === s)] || s;
await build({
  stdin: {
    contents:
      'export * from "./src/game.ts"; export * from "./src/state/ledger.ts"; export * from "./src/state/saves.ts"; export * from "./src/state/profile.ts"; export { initialMetadata } from "./src/state/saveMetadata.ts"; export { dailyFeed } from "./src/development.ts";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "/tmp/etangs-5d-capture-engine.mjs",
});
const {
  initialGame,
  initialLedger,
  initialProfile,
  initialMetadata,
  observeProfile,
  act,
  nextDay,
  recordLedger,
  serializeSave,
  dailyFeed,
  SAVE_KEY,
} = await import("/tmp/etangs-5d-capture-engine.mjs");
let game = initialGame(),
  ledger = initialLedger(game),
  profile = { ...initialProfile(), introSeen: true, tutorial: "dismissed" };
function step(a) {
  const r = a.type === "day" ? { game: nextDay(game), ok: true } : act(game, a);
  if (!r.ok) throw Error(r.message);
  ledger = recordLedger(ledger, game, r.game, a);
  game = r.game;
  profile = observeProfile(profile, game, ledger);
}
const days = (n) => {
  for (let i = 0; i < n; i++) step({ type: "day" });
};
step({ type: "survey" });
days(2);
step({ type: "plan", pondId: 1, species: "trout" });
step({ type: "build", pondId: 1 });
step({ type: "asset", asset: "warehouse" });
days(14);
step({ type: "food", pack: 2 });
days(2);
step({ type: "stock", pondId: 1, species: "trout", count: 1000 });
days(4);
step({ type: "autoFeed", pondId: 1, enabled: true });
const stocked = serializeSave(game, ledger, false, initialMetadata(), profile);
step({ type: "asset", asset: "coldstore" });
for (let i = 0; i < 400 && game.ponds[0].weight < 0.45; i++) {
  if (
    game.food < dailyFeed(game) * 8 &&
    !game.development.orders.some((o) => o.kind === "feed")
  )
    step({ type: "food", pack: 2 });
  days(1);
}
step({ type: "contract", pondId: 1, buyer: "cooperative" });
step({ type: "harvest", pondId: 1 });
step({ type: "dispatch", id: game.development.batches[0].id });
days(8);
const paid = serializeSave(game, ledger, false, initialMetadata(), profile);
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
const only = new Set(
  (process.env.CAPTURE_ONLY || "").split(",").filter(Boolean),
);
const captures = only.size
    ? JSON.parse(
        fs.readFileSync(`${directory}/manifest.json`, "utf8"),
      ).captures.filter(
        (c) => ![...only].some((slug) => c.file.endsWith(`-${slug}.jpg`)),
      )
    : [],
  errors = [];
try {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ])
    for (const locale of ["fr", "en"]) {
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion: "reduce",
      });
      page.setDefaultTimeout(120000);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(
        ({ raw, key, locale }) => {
          localStorage.setItem(key, raw);
          localStorage.setItem(
            "les-etangs-ui-v3",
            JSON.stringify({ version: 3, locale, motion: "reduce" }),
          );
        },
        { raw: stocked, key: SAVE_KEY, locale },
      );
      await page.goto(process.env.UI_BASE_URL || "http://127.0.0.1:4177");
      const button = (s) =>
        page.getByRole("button", { name: label(locale, s), exact: true });
      const panel = (s) =>
        page
          .locator(".game-dock")
          .getByRole("button", { name: label(locale, s), exact: true })
          .click();
      await button("Continuer").click();
      const canvas = page.locator('canvas[data-engine="three-webgl"]');
      async function snap(name, { intro = false } = {}) {
        if (only.size && !only.has(name)) return;
        await page.mouse.move(width - 1, height - 1);
        await page.evaluate(() => document.fonts.ready);
        if (!intro) {
          const game = await page.evaluate(
            (key) => JSON.parse(localStorage.getItem(key)).game,
            SAVE_KEY,
          );
          await expect(canvas).toHaveAttribute("data-day", String(game.day), {
            timeout: 120000,
          });
          await expect(canvas).toHaveAttribute("data-settled", "true", {
            timeout: 120000,
          });
          await canvas.evaluate((c) => c.getContext("webgl2")?.finish());
          await page.locator(".toast").waitFor({ state: "hidden" });
        }
        const file = `${directory}/${width}-${locale}-${name}.jpg`;
        await page.screenshot({ path: file, type: "jpeg", quality: 67 });
        captures.push({
          file,
          width,
          height,
          locale,
          bytes: fs.statSync(file).size,
        });
        console.log(file);
      }
      async function restore(raw) {
        await button("Paramètres & sauvegarde").click();
        await page
          .getByRole("tab", { name: label(locale, "Partie"), exact: true })
          .click();
        await page
          .getByLabel(label(locale, "Fichier de sauvegarde"))
          .setInputFiles({
            name: "capture.json",
            mimeType: "application/json",
            buffer: Buffer.from(raw),
          });
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        if (await page.locator(".management-panel").count())
          await page.keyboard.press("Escape");
      }
      await snap("monde");
      for (const [name, slug] of [
        ["Construire", "construire"],
        ["Bassins", "bassin"],
        ["Logistique", "logistique"],
        ["Finances", "finances"],
        ["Journal", "journal"],
        ["Guide", "guide"],
      ]) {
        await panel(name);
        await snap(slug);
      }
      await button("Succès de cette ferme").click();
      await snap("succes-debut");
      await page.keyboard.press("Escape");
      await restore(paid);
      await snap("jardin");
      await panel("Guide");
      await button("Succès de cette ferme").click();
      await page.locator("[data-achievement=cold] summary").click();
      await snap("succes-cycle");
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await button("Voir les objectifs").click();
      await snap("objectifs");
      await page.keyboard.press("Escape");
      if (locale === "fr" && (!only.size || only.has("tutoriel-soins"))) {
        await restore(stocked);
        await panel("Bassins");
        await page.locator(".vital-curves summary").click();
        await snap("courbes");
        await panel("Guide");
        await button("Rejouer le tutoriel").click();
        await panel("Bassins");
        await expect(
          page.locator('.game-dock [data-panel="ponds"]'),
        ).toHaveAttribute("data-tutorial-target", "true");
        await snap("tutoriel-soins");
        await button("Passer le tutoriel").click();
        await page.keyboard.press("Escape");
        await button("Menu pause").click();
        await button("Retour au menu").click();
        // Hold the short intro only for its screenshot; its real duration is tested separately.
        const captureTime = Date.now();
        await page.clock.install({ time: captureTime });
        await page.clock.pauseAt(captureTime + 1000);
        await button("Nouvelle partie").click();
        await button("Commencer avec les aides pédagogiques").click();
        await expect(canvas).toHaveCount(1);
        await page.clock.runFor(200);
        await expect(canvas).toHaveAttribute("data-frame", "rendered", {
          timeout: 120000,
        });
        await expect(page.getByTestId("intro")).toBeVisible();
        await snap("survol", { intro: true });
        await page.clock.runFor(3500);
        await page.clock.resume();
        await page
          .getByTestId("intro")
          .waitFor({ state: "detached", timeout: 120000 });
        await snap("tutoriel-source");
        await page.getByTestId("task-action").click();
        await page.getByTestId("task-action").click();
        await page
          .getByRole("dialog")
          .getByRole("button", {
            name: label(locale, "Choisir une parcelle"),
            exact: true,
          })
          .click();
        await button("Choisir : Truite arc-en-ciel · Les Saules").click();
        await snap("tutoriel-chantier");
      }
      await page.close();
    }
} finally {
  await browser.close();
}
if (errors.length) throw Error(errors.join("\n"));
captures.sort((a, b) => a.file.localeCompare(b.file));
const totalBytes = captures.reduce((n, c) => n + c.bytes, 0);
if (totalBytes > 5e6) throw Error(`Capture budget: ${totalBytes}`);
fs.writeFileSync(
  `${directory}/manifest.json`,
  JSON.stringify({ totalBytes, captures }, null, 2) + "\n",
);
console.log({ totalBytes, count: captures.length });
