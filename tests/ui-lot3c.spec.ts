import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { parseSave, act, nextDay } from "../src/game";
import { parseSavedGame, SAVE_KEY, type Save } from "../src/state/saves";
import {
  initialLedger,
  recordLedger,
  sumCosts,
  periodBalance,
  cents,
  cashProjection,
} from "../src/state/ledger";
import { formatMoney } from "../src/ui/format";
import { withoutWebGL } from "./ui-helpers";
import { typography } from "./ui-measures";
for (const [width, height] of [
  [1440, 900],
  [390, 844],
])
  test(`3c : bilan exact, prévision, registre V4 à ${width}×${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    let game = parseSave(
      readFileSync("docs/ui/fixtures/expedition.json", "utf8"),
    );
    let ledger = initialLedger(game);
    await page.addInitScript(
      (raw) => localStorage.setItem("les-etangs-save-v3", raw),
      JSON.stringify(game),
    );
    await page.goto("/");
    const current = () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        SAVE_KEY,
      ) as Promise<Save>;
    const initial = await current();
    expect(
      await page.evaluate(() => localStorage.getItem("les-etangs-save-v3")),
    ).toBe(JSON.stringify(initial.game));
    expect(initial.version).toBe(4);
    expect(initial.game).toEqual(game);
    while (!game.development.paid) {
      const after = nextDay(game);
      ledger = recordLedger(ledger, game, after, { type: "day" });
      game = after;
      await page
        .getByRole("button", { name: "Jour suivant", exact: true })
        .click();
      if (!game.development.paid)
        while (await page.getByTestId("event-card").count())
          await page
            .getByRole("button", { name: "Continuer", exact: true })
            .click();
    }
    await expect(page.getByRole("dialog")).toContainText(
      "Votre premier règlement",
    );
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Bilan du cycle payé");
    expect((await current()).game).toEqual(game);
    expect((await current()).ledger).toEqual(ledger);
    const cycle = ledger.cycles.at(-1)!;
    await expect(page.locator('[data-report="income"]')).toHaveText(
      formatMoney(cycle.income / 100, true),
    );
    await expect(page.locator('[data-report="balance"]')).toHaveText(
      formatMoney(periodBalance(cycle) / 100, true),
    );
    await page.locator(".report-breakdown summary").click();
    await expect(page.locator('[data-cost="unknown"]')).toHaveText(
      formatMoney(initial.game.stats.expenses, true),
    );
    await page.locator(".report-advice summary").click();
    await expect(page.locator(".report-advice li")).toHaveCount(3);
    expect(sumCosts(ledger.cumulativeCosts)).toBe(cents(game.stats.expenses));
    expect((await typography(page)).tooSmall).toEqual([]);
    expect(
      await page.locator(".report-totals dd").evaluateAll((nodes) =>
        nodes.map((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return range.getClientRects().length;
        }),
      ),
    ).toEqual([1, 1, 1]);

    const checks: { name: string; violations: number }[] = [];
    const axe = async (name: string) => {
      const v = (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations;
      expect(v).toEqual([]);
      checks.push({ name, violations: v.length });
    };
    await axe("cycle-details");
    // Summaries are included in the real dialog tab loop, including from the close button.
    await page
      .getByRole("button", { name: "Fermer la fenêtre", exact: true })
      .focus();
    await page.keyboard.press("Tab");
    await expect(page.locator(".report-breakdown summary")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: "Fermer la fenêtre", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Voir les finances", exact: true })
      .click();
    while (await page.getByTestId("event-card").count())
      await page
        .getByRole("button", { name: "Continuer", exact: true })
        .click();
    await page.getByRole("tab", { name: "Prévision", exact: true }).click();
    await expect(page.locator(".cash-y span")).toHaveCount(3);
    await page.locator(".chart-data summary").click();
    await expect(page.locator(".chart-data tbody tr")).toHaveCount(91);
    await expect(page.locator(".chart-data tbody tr").first()).toContainText(
      formatMoney(cashProjection(game).at(-1)!.money),
    );
    await axe("forecast");
    await page.getByRole("tab", { name: "Mois", exact: true }).click();
    await page.locator(".monthly-result summary").first().click();
    await axe("monthly");
    await page.getByRole("tab", { name: "Cycles", exact: true }).click();
    await page.locator(".finance-cycle > summary").last().click();
    await axe("saved-cycle");
    const saved = await current();
    await page.reload();
    expect(await current()).toEqual(saved);
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Exporter ma partie/ }).click();
    const file = await download;
    const exported = parseSavedGame(readFileSync((await file.path())!, "utf8"));
    expect(exported).toEqual(saved);
    const bad = structuredClone(saved);
    bad.ledger.cumulativeCosts.feed++;
    await page.getByLabel("Fichier de sauvegarde").setInputFiles({
      name: "bad-v4.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(bad)),
    });
    await expect(page.locator(".toast")).toContainText("registre financier");
    expect(await current()).toEqual(saved);
    await page.getByLabel("Fichier de sauvegarde").setInputFiles({
      name: "good-v4.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(saved)),
    });
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await current()).toEqual(saved);
    await info.attach("finance-ledger", {
      body: JSON.stringify({
        width,
        height,
        checks,
        portableSaveBytes: Buffer.byteLength(JSON.stringify(saved)),
        incomeCents: cycle.income,
        expenseCents: sumCosts(cycle.costs),
        balanceCents: periodBalance(cycle),
        sourceV3Preserved: await page.evaluate(
          () => !!localStorage.getItem("les-etangs-save-v3"),
        ),
      }),
      contentType: "application/json",
    });
  });
test("3c : première récolte célébrée puis bilan provisoire sans encaissement fictif", async ({
  page,
}) => {
  await withoutWebGL(page);
  let game = act(
    parseSave(readFileSync("docs/ui/fixtures/contrat-client.json", "utf8")),
    { type: "food", pack: 2 },
  ).game;
  for (let i = 0; i < 60 && game.ponds[0].weight < 0.45; i++)
    game = nextDay(game);
  await page.addInitScript(
    (raw) => localStorage.setItem("les-etangs-save-v3", raw),
    JSON.stringify(game),
  );
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Logistique", exact: true })
    .click();
  await page.getByRole("tab", { name: "Clients", exact: true }).click();
  await page
    .getByRole("button", { name: "Récolter Les Saules", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Votre première récolte",
  );
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("bilan provisoire");
  await expect(page.locator('[data-report="income"]')).toHaveText(
    formatMoney(0, true),
  );
  const actual = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(actual).toEqual(act(game, { type: "harvest", pondId: 1 }).game);
});
