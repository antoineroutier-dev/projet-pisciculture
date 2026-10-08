import { build } from "esbuild";
import { expect } from "@playwright/test";
import { captureLot } from "./capture-helpers.mjs";
await build({
  stdin: {
    contents:
      'export * from "./src/game.ts"; export * from "./src/state/ledger.ts"; export * from "./src/state/saves.ts"; export { dailyFeed } from "./src/development.ts";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "/tmp/etangs-capture-3c-engine.mjs",
});
const {
  initialGame,
  initialLedger,
  act,
  nextDay,
  recordLedger,
  serializeSave,
  dailyFeed,
} = await import("/tmp/etangs-capture-3c-engine.mjs");
let game = initialGame(),
  ledger = initialLedger(game);
const step = (a) => {
  const result =
    a.type === "day" ? { game: nextDay(game), ok: true } : act(game, a);
  if (!result.ok) throw Error(result.message);
  ledger = recordLedger(ledger, game, result.game, a);
  game = result.game;
};
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
const beforeHarvest = serializeSave(game, ledger);
step({ type: "harvest", pondId: 1 });
step({ type: "dispatch", id: game.development.batches[0].id });
days(7);
const beforePayment = serializeSave(game, ledger);
await captureLot("lot-3c", async ({ page, snap }) => {
  const restore = async (raw) => {
    while (await page.getByTestId("event-card").count())
      await page
        .getByRole("button", { name: "Continuer", exact: true })
        .click();
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
    await page.getByRole("tab", { name: "Partie", exact: true }).click();
    await page
      .getByLabel("Fichier de sauvegarde")
      .setInputFiles({
        name: "registre-v4.json",
        mimeType: "application/json",
        buffer: Buffer.from(raw),
      });
    await expect(page.getByRole("dialog")).toBeHidden();
  };
  await restore(beforeHarvest);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Logistique", exact: true })
    .click();
  await page.getByRole("tab", { name: "Clients", exact: true }).click();
  await page
    .getByRole("button", { name: "Récolter Les Saules", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("bilan provisoire");
  await snap("bilan-recolte");
  await restore(beforePayment);
  await page.getByRole("button", { name: "Jour suivant", exact: true }).click();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Bilan du cycle payé");
  await snap("bilan-paye");
  await page.locator(".report-breakdown summary").click();
  await page.locator('[data-cost="investment"]').scrollIntoViewIfNeeded();
  await snap("postes");
  await page.locator(".report-breakdown summary").click();
  await page.locator(".report-advice summary").click();
  await page.locator(".report-advice li").last().scrollIntoViewIfNeeded();
  await snap("conseils");
  await page
    .getByRole("button", { name: "Voir les finances", exact: true })
    .click();
  while (await page.getByTestId("event-card").count())
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await snap("tresorerie");
  await page.getByRole("tab", { name: "Prévision", exact: true }).click();
  await snap("prevision");
  await page.getByRole("tab", { name: "Mois", exact: true }).click();
  await page.locator(".monthly-result summary").first().click();
  await snap("resultat-mensuel");
  await page.getByRole("tab", { name: "Cycles", exact: true }).click();
  await snap("cycles");
});
