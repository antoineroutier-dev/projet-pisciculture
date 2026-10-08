import { enterGame } from "./ui-helpers";
import { SAVE_KEY } from "../src/state/saves";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { STORAGE_KEY } from "../src/game";
import { withoutWebGL } from "./ui-helpers";
for (const [width, height] of [
  [1440, 900],
  [390, 844],
])
  test(`2c : journal, encyclopédie et progression à ${width}×${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
      key: STORAGE_KEY,
      raw: readFileSync("docs/ui/fixtures/cycle-paye.json", "utf8"),
    });
    await page.goto("/");
    await enterGame(page);
    await expect(page.getByTestId("next-task")).toContainText(
      "Diversifier la ferme",
    );
    await expect(page.locator(".goal-hud > p")).toHaveCount(0);
    const before = await page.evaluate(
      (key) => localStorage.getItem(key),
      SAVE_KEY,
    );
    await page.getByTestId("task-action").click();
    await expect(
      page.getByLabel("Parcelle sélectionnée", { exact: true }),
    ).toHaveValue("2");
    expect(
      await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
    ).toBe(before);
    await page
      .getByRole("button", { name: "Conseils d’exploitation", exact: true })
      .click();
    await expect(
      page.getByLabel("Parcours du premier cycle", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Masquer les conseils", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Voir les objectifs", exact: true })
      .click();
    await expect(
      page.getByRole("region", {
        name: "Objectifs d’exploitation",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).not.toContainText("XP");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.keyboard.press("Escape");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Journal", exact: true })
      .click();
    expect(await page.locator(".journal-month").count()).toBeGreaterThan(1);
    await page
      .getByLabel("Type d’événement", { exact: true })
      .selectOption("weekly");
    const weeks = page.locator(".weekly-entry");
    expect(await weeks.count()).toBeGreaterThan(0);
    expect(
      await weeks.evaluateAll((es) =>
        es.every((e) => !(e as HTMLDetailsElement).open),
      ),
    ).toBe(true);
    await weeks.first().locator("summary").click();
    await expect(weeks.first()).toContainText("Bilan hebdomadaire");
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page
      .getByLabel("Type d’événement", { exact: true })
      .selectOption("all");
    await page
      .getByLabel("Bassin du journal", { exact: true })
      .selectOption("1");
    const entries = page.locator(".journal-entry");
    expect(await entries.count()).toBeGreaterThan(0);
    expect(
      await entries.evaluateAll((es) =>
        es.every((e) => e.getAttribute("data-ponds")?.split(",").includes("1")),
      ),
    ).toBe(true);
    await page
      .getByLabel("Bassin du journal", { exact: true })
      .selectOption("2");
    await expect(
      page.getByText("Aucun événement pour ces filtres.", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Guide", exact: true })
      .click();
    const checks = [];
    for (const tab of [
      "Pratique",
      "Espèces",
      "Eau et alimentation",
      "À propos du modèle",
    ]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      const article = page.locator(".guide-article summary").first();
      if (await article.count()) await article.click();
      const min = await page
        .locator(".guide-content *")
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
      expect(min).toBeGreaterThanOrEqual(12);
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(axe.violations).toEqual([]);
      checks.push({ tab, min, axeViolations: axe.violations.length });
    }
    await expect(
      page.getByRole("heading", { name: "À propos du modèle", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".research-card")).toContainText(
      "n’est pas un outil de dimensionnement professionnel",
    );
    await info.attach("editorial-measures", {
      body: JSON.stringify({ width, height, checks }),
      contentType: "application/json",
    });
  });
test("2c : TAN, débit et conversion expliqués au clavier dans leur contexte", async ({
  page,
}) => {
  await withoutWebGL(page);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: STORAGE_KEY,
    raw: readFileSync("docs/ui/fixtures/contrat-client.json", "utf8"),
  });
  await page.goto("/");
  await enterGame(page);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Bassins", exact: true })
    .click();
  for (const [name, expected] of [
    ["Comprendre : Azote ammoniacal total · TAN", "mg N/L"],
    ["Comprendre : Débit d’eau neuve", "24 L/s"],
  ]) {
    await page.getByRole("button", { name, exact: true }).focus();
    await expect(page.getByRole("tooltip")).toContainText(expected);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("tab", { name: "Eau", exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("tab", { name: "Alimentation", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Comprendre : Indice de conversion · FCR",
      exact: true,
    })
    .focus();
  await expect(page.getByRole("tooltip")).toContainText("FCR nominal");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
