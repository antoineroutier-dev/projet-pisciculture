import { enterGame } from "./ui-helpers";
import { SAVE_KEY } from "../src/state/saves";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { STORAGE_KEY, act, type Game } from "../src/game";
import { withoutWebGL } from "./ui-helpers";
for (const [width, height] of [
  [1440, 900],
  [390, 844],
])
  test(`2b : chaîne, quatre onglets et graphique à ${width}×${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
      key: STORAGE_KEY,
      raw: readFileSync("docs/ui/fixtures/contrat-client.json", "utf8"),
    });
    await page.goto("/");
    await enterGame(page);
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Logistique", exact: true })
      .click();
    await expect(page.locator(".production-chain li")).toHaveCount(7);
    if (width === 390) {
      await expect(page.locator(".production-flow")).not.toHaveAttribute(
        "open",
        "",
      );
      await page.locator(".production-flow summary").click();
      await expect(page.locator(".production-chain")).toBeVisible();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.locator(".production-flow summary").click();
    }
    const checks = [];
    for (const scale of [100, 150]) {
      await page
        .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
        .click();
      await page.getByRole("tab", { name: "Affichage", exact: true }).click();
      await page
        .getByRole("slider", { name: "Échelle de l’interface" })
        .fill(String(scale));
      await page.keyboard.press("Escape");
      for (const label of [
        "Approvisionnement",
        "Bâtiments",
        "Clients",
        "Expéditions",
      ]) {
        await page.getByRole("tab", { name: label, exact: true }).click();
        await expect(page.getByRole("tabpanel")).toBeVisible();
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        expect(axe.violations).toEqual([]);
        const minimumFontPx = await page
          .locator(".logistics-panel *")
          .evaluateAll((es) =>
            Math.min(
              ...es
                .filter(
                  (e) =>
                    e.getClientRects().length &&
                    [...e.childNodes].some(
                      (n) => n.nodeType === 3 && n.textContent?.trim(),
                    ),
                )
                .map((e) => parseFloat(getComputedStyle(e).fontSize)),
            ),
          );
        expect(minimumFontPx).toBeGreaterThanOrEqual(12);
        checks.push({
          scale,
          label,
          minimumFontPx,
          axeViolations: axe.violations.length,
        });
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBe(width);
      }
    }
    await page.getByRole("tab", { name: "Expéditions", exact: true }).focus();
    await page.keyboard.press("Home");
    await expect(
      page.getByRole("tab", { name: "Approvisionnement", exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Commander 100 kg", exact: true }),
    ).toHaveCount(1);
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Finances", exact: true })
      .click();
    await expect(page.locator(".cash-y span")).toHaveCount(3);
    await expect(page.locator(".cash-x span")).toHaveCount(2);
    await page.locator(".chart-data summary").click();
    const game: Game = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
    await expect(page.locator(".chart-data tbody tr").first()).toContainText(
      new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(game.money),
    );
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await info.attach("logistics-measures", {
      body: JSON.stringify({ width, height, checks }),
      contentType: "application/json",
    });
  });
test("2b : récolte, transport et paiement restent des actions distinctes", async ({
  page,
}) => {
  await withoutWebGL(page);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: STORAGE_KEY,
    raw: readFileSync("docs/ui/fixtures/lot-au-froid.json", "utf8"),
  });
  await page.goto("/");
  await enterGame(page);
  await page.getByTestId("task-action").click();
  await expect(
    page.getByRole("tab", { name: "Expéditions", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const before: Game = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  const expected = act(before, {
    type: "dispatch",
    id: before.development.batches[0].id,
  });
  expect(expected.ok).toBe(true);
  await page.getByRole("button", { name: /^Expédier le lot/ }).click();
  const after: Game = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(after).toEqual(expected.game);
  expect(after.stats.income).toBe(before.stats.income);
  await expect(page.locator(".shipment-card")).toContainText("En transport");
  await page.getByRole("button", { name: "Jour suivant", exact: true }).click();
  await expect(page.locator(".shipment-card")).toContainText(
    "Livraison acceptée",
  );
  await expect(page.locator(".shipment-card")).toContainText("Règlement");
});
