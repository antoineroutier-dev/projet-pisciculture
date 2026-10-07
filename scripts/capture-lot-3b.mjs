import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { expect } from "@playwright/test";
import { captureLot } from "./capture-helpers.mjs";
await build({
  entryPoints: ["src/game.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "/tmp/etangs-engine-capture-3b.mjs",
});
const { act, advanceGuided, initialGame, nextDay, parseSave } = await import(
  "/tmp/etangs-engine-capture-3b.mjs"
);
const fixture = (name) =>
  parseSave(readFileSync(`docs/ui/fixtures/${name}.json`, "utf8"));
const command = (g, a) => {
  const r = act(g, a);
  if (!r.ok) throw Error(r.message);
  return r.game;
};
const beforeEvent = (g, predicate) => {
  for (let i = 0; i < 365; i++) {
    const n = nextDay(g);
    if (predicate(g, n)) return g;
    g = n;
  }
  throw Error("Événement absent");
};
const construction = beforeEvent(
  fixture("chantier"),
  (a, b) =>
    b.ponds.some((p) => p.built) ||
    Object.values(b.development.assets).some(Boolean),
);
let received = command(initialGame(), { type: "survey" });
received = advanceGuided(received, 2).game;
received = command(received, { type: "plan", pondId: 1, species: "trout" });
received = command(received, { type: "build", pondId: 1 });
for (let i = 0; i < 14; i++) received = nextDay(received);
received = command(received, { type: "food", pack: 1 });
received = nextDay(nextDay(received));
received = command(received, {
  type: "stock",
  pondId: 1,
  species: "trout",
  count: 1000,
});
received = beforeEvent(received, (a, b) => b.ponds[0].count > 0);
let harvest = command(fixture("contrat-client"), { type: "food", pack: 2 });
for (let i = 0; i < 60 && harvest.ponds[0].weight < 0.45; i++)
  harvest = nextDay(harvest);
const payment = beforeEvent(
  fixture("expedition"),
  (a, b) => b.development.paid > 0,
);
let urgent = fixture("contrat-client");
urgent = command(urgent, { type: "flow", pondId: 1, value: 0 });
urgent = beforeEvent(urgent, (a, b) =>
  advanceGuided(a, 1).reason.includes("conditions d’élevage"),
);
const only = new Set(
  (process.env.UI_CAPTURE_ONLY || "").split(",").filter(Boolean),
);
const manifestPath = "docs/ui/apres/lot-3b/manifest.json";
const previous = only.size
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : null;
await captureLot("lot-3b", async ({ page, snap }) => {
  if (!only.size || only.has("horloge")) {
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
    await page.getByRole("button", { name: "Vitesse ×4", exact: true }).click();
    await page.clock.runFor(400);
    await snap("horloge");
    await page
      .getByRole("button", { name: "Mettre en pause", exact: true })
      .click();
    await page.clock.resume();
  }
  for (const [name, game, action] of [
    ["chantier-termine", construction, null],
    ["premiers-poissons", received, null],
    ["premiere-recolte", harvest, { type: "harvest", pondId: 1 }],
    ["premier-paiement", payment, null],
    ["objectif", fixture("elevage"), { type: "upgrade", pondId: 1 }],
    ["urgence", urgent, null],
  ]) {
    if (only.size && !only.has(name)) continue;
    while (await page.getByTestId("event-card").count())
      await page
        .getByRole("button", { name: "Continuer", exact: true })
        .click();
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
    await page.getByRole("tab", { name: "Partie", exact: true }).click();
    await page.getByLabel("Fichier de sauvegarde").setInputFiles({
      name: `${name}.json`,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(game)),
    });
    await expect(page.getByRole("dialog")).toBeHidden();
    if (action?.type === "upgrade") {
      await page
        .getByRole("navigation")
        .getByRole("button", { name: "Bassins", exact: true })
        .click();
      await page.getByRole("tab", { name: "Équipement", exact: true }).click();
      await page
        .getByRole("button", { name: "Améliorer ce bassin", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Installer l’équipement", exact: true })
        .click();
    } else if (action?.type === "harvest") {
      await page
        .getByRole("navigation")
        .getByRole("button", { name: "Logistique", exact: true })
        .click();
      await page.getByRole("tab", { name: "Clients", exact: true }).click();
      await page
        .getByRole("button", { name: "Récolter Les Saules", exact: true })
        .click();
    } else
      await page
        .getByRole("button", { name: "Jour suivant", exact: true })
        .click();
    await expect(page.getByTestId("event-card")).toBeVisible();
    await snap(name);
  }
});

if (previous) {
  const current = JSON.parse(readFileSync(manifestPath, "utf8"));
  const captures = [
    ...new Map(
      [...previous.captures, ...current.captures].map((c) => [c.file, c]),
    ).values(),
  ];
  const totalBytes = captures.reduce((n, c) => n + c.bytes, 0);
  if (totalBytes > 5e6) throw Error("Budget total dépassé");
  writeFileSync(
    manifestPath,
    JSON.stringify({ totalBytes, captures }, null, 2) + "\n",
  );
  console.log({ mergedCaptures: captures.length, totalBytes });
}
