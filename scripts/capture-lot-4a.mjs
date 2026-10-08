import { captureLot } from "./capture-helpers.mjs";
import { build } from "esbuild";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const file = "/tmp/etangs-capture4a-engine.mjs";
await build({
  entryPoints: ["src/game.ts"],
  outfile: file,
  bundle: true,
  platform: "node",
  format: "esm",
});
const { initialGame, act, nextDay } = await import(pathToFileURL(file));
let g = initialGame();
function command(a) {
  const result = act(g, a);
  if (!result.ok) throw Error(JSON.stringify(result));
  g = result.game;
}
command({ type: "survey" });
g = nextDay(nextDay(g));
for (const [pondId, species] of [
  [2, "carp"],
  [4, "tilapia"],
]) {
  command({ type: "plan", pondId, species });
  command({ type: "build", pondId });
}
for (const asset of ["warehouse", "coldstore"])
  command({ type: "asset", asset });
for (let i = 0; i < 10; i++) g = nextDay(g);
command({ type: "asset", asset: "workshop" });
const works = JSON.stringify(g);
for (let i = 0; i < 35; i++) g = nextDay(g);
if (!g.ponds[1].built || !g.ponds[3].built)
  throw Error("Construction unfinished");
const developed = JSON.stringify(g);
await writeFile("/tmp/etangs-4a-developed.json", developed);
await captureLot("lot-4a", async ({ page, seed, snap }) => {
  await snap("terrain-vide");
  await seed("chantier");
  await snap("chantier-source");
  await seed("elevage");
  await snap("bassin-source");
  async function load(raw) {
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
    await page.getByRole("tab", { name: "Partie", exact: true }).click();
    await page.getByLabel("Fichier de sauvegarde").setInputFiles({
      name: "ferme.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
  }
  await load(works);
  await snap("chantiers-terre-serre");
  await load(developed);
  await snap("ferme-developpee");
  for (const [id, name] of [
    ["2", "etang-terre"],
    ["4", "serre-cuves"],
  ]) {
    await page.getByRole("button", { name: "Bassins", exact: true }).click();
    await page
      .getByLabel("Bassin sélectionné", { exact: true })
      .selectOption(id);
    await page.keyboard.press("Escape");
    await page
      .getByLabel("Vue du terrain", { exact: true })
      .selectOption("pond");
    await snap(name);
  }

  await page
    .getByLabel("Vue du terrain", { exact: true })
    .selectOption("buildings");
  await snap("batiments");
  await page.getByRole("button", { name: "Logistique", exact: true }).click();
  await page.getByRole("tab", { name: "Clients", exact: true }).click();
  await page.getByText("Prix et espèces", { exact: true }).click();
  for (const [i, species] of ["trout", "carp", "tilapia"].entries()) {
    await page.locator(".market-species-card").nth(i).scrollIntoViewIfNeeded();
    await snap(`portrait-${species}`);
  }
  await page.keyboard.press("Escape");
  for (const species of ["trout", "carp", "tilapia"]) {
    await page
      .getByLabel("Vue du terrain", { exact: true })
      .selectOption("fish");
    await page
      .getByLabel("Espèce à observer", { exact: true })
      .selectOption(species);
    await snap(`modele-${species}`);
  }
});
