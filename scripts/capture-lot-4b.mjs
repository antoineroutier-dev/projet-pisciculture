import { captureLot } from "./capture-helpers.mjs";
import { build } from "esbuild";
import fs from "node:fs";
await build({
  entryPoints: ["src/game.ts"],
  outfile: "/tmp/etangs-capture4b-engine.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
});
const { initialGame, act, nextDay, parseSave, weather } = await import(
  "/tmp/etangs-capture4b-engine.mjs"
);
function command(game, a) {
  const result = act(game, a);
  if (!result.ok) throw Error(result.message);
  return result.game;
}
let seasonal = initialGame();
seasonal = command(seasonal, { type: "survey" });
seasonal = nextDay(nextDay(seasonal));
seasonal = command(seasonal, { type: "plan", pondId: 2, species: "carp" });
seasonal = command(seasonal, { type: "build", pondId: 2 });
const seasons = [];
for (const [target, name] of [
  [30, "printemps"],
  [100, "ete"],
  [200, "automne"],
  [280, "hiver"],
]) {
  while (seasonal.day < target) seasonal = nextDay(seasonal);
  seasons.push({ raw: JSON.stringify(seasonal), name });
}
let rain = seasonal;
while (!weather(rain.day).rainy) rain = nextDay(rain);
let feed = parseSave(fs.readFileSync("docs/ui/fixtures/elevage.json", "utf8"));
feed = command(feed, { type: "food", pack: 0 });
feed = nextDay(feed);
let living = initialGame();
living = command(living, { type: "survey" });
living = nextDay(nextDay(living));
living = command(living, { type: "plan", pondId: 1, species: "trout" });
living = command(living, { type: "build", pondId: 1 });
for (let i = 0; i < 14; i++) living = nextDay(living);
living = command(living, { type: "food", pack: 1 });
living = nextDay(nextDay(living));
living = command(living, {
  type: "stock",
  pondId: 1,
  species: "trout",
  count: 500,
});
for (let i = 0; i < 3; i++) living = nextDay(living);
await captureLot("lot-4b", async ({ page, snap, width }) => {
  async function clearEvents() {
    for (
      let i = 0;
      i < 8 && (await page.getByTestId("event-card").count());
      i++
    )
      await page
        .getByRole("button", { name: "Continuer", exact: true })
        .click();
  }
  async function load(raw) {
    await clearEvents();
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
    await page.getByRole("tab", { name: "Partie", exact: true }).click();
    await page.getByLabel("Fichier de sauvegarde").setInputFiles({
      name: "scene.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
  }
  for (const { raw, name } of seasons) {
    await load(raw);
    await snap(name);
  }
  await load(JSON.stringify(rain));
  await snap("pluie-hiver");
  await load(JSON.stringify(feed));
  if (width < 700) await page.getByLabel("Vue du terrain", {exact:true}).selectOption("buildings");
  await page.getByRole("button", { name: "Jour suivant", exact: true }).click();
  await clearEvents();
  await snap("livraison-aliments", { toast: false });
  await page.getByLabel("Vue du terrain", { exact: true }).selectOption("pond");
  await snap("nourrissage", { toast: false });
  await load(JSON.stringify(living));
  await page.getByLabel("Vue du terrain", { exact: true }).selectOption(width < 700 ? "pond" : "farm");
  await page.getByRole("button", { name: "Jour suivant", exact: true }).click();
  await clearEvents();
  await snap("livraison-vivant", { toast: false });
  await load(fs.readFileSync("docs/ui/fixtures/lot-au-froid.json", "utf8"));
  await page.getByLabel("Vue du terrain", {exact:true}).selectOption(width < 700 ? "buildings" : "farm");
  await page.getByRole("button", { name: "Logistique", exact: true }).click();
  await page.getByRole("tab", { name: "Expéditions", exact: true }).click();
  await page
    .getByRole("button", { name: /^Expédier le lot/ })
    .first()
    .click();
  await page.keyboard.press("Escape");
  await snap("depart-frigorifique", { toast: false });
  await load(fs.readFileSync("docs/ui/fixtures/chantier.json", "utf8"));
  await page.getByLabel("Vue du terrain", {exact:true}).selectOption(width < 700 ? "pond" : "farm");
  await snap("chantier-vivant");
});
