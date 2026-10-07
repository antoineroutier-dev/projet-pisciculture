import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { PerspectiveCamera, Vector3 } from "three";
import { POND_POSITIONS } from "../src/farm3d";
import { withoutWebGL } from "./ui-helpers";
import { STORAGE_KEY, type Game } from "../src/game";
test("2a : sélectionner et construire une parcelle dans le vrai monde 3D", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByTestId("task-action").click();
  await page.getByTestId("task-action").click();
  await expect(
    page.getByRole("dialog", { name: "Votre analyse de l’eau" }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Choisir une parcelle", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Construire", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-frame", "rendered");
  const coordinates = (await canvas.getAttribute("data-camera"))!
    .split(",")
    .map(Number);
  const camera = new PerspectiveCamera(40, 1440 / 900, 0.08, 250);
  camera.position.fromArray(coordinates);
  camera.lookAt(new Vector3().fromArray(coordinates, 3));
  camera.updateMatrixWorld();
  const [x, z] = POND_POSITIONS[1],
    point = new Vector3(x, 0.4, z).project(camera);
  await page.mouse.click((point.x + 1) * 720, (1 - point.y) * 450);
  await expect(
    page.getByLabel("Parcelle sélectionnée", { exact: true }),
  ).toHaveValue("2");
  await expect(page.getByTestId("construction-card")).toContainText(
    "Carpe commune",
  );
  await page
    .getByRole("button", {
      name: "Choisir : Carpe commune · La Roselière",
      exact: true,
    })
    .click();
  const before: Game = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  await page
    .getByRole("button", { name: "Construire La Roselière", exact: true })
    .click();
  const after: Game = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(after.ponds[1].constructionDays).toBe(21);
  await expect(canvas).toHaveAttribute("data-ponds", /2:false:21:0:/);
  expect(after.money).toBeLessThan(before.money);
  await expect(canvas).toHaveCount(1);
  await expect(page.getByTestId("construction-card")).toContainText(
    "Mise en service",
  );
});
for (const [width, height] of [
  [1440, 900],
  [390, 844],
])
  test(`2a : quatre mesures, onglets et action unique en ${width}×${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
      key: STORAGE_KEY,
      raw: readFileSync("docs/ui/fixtures/contrat-client.json", "utf8"),
    });
    await page.goto("/");
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Bassins", exact: true })
      .click();
    await expect(page.locator("[data-vital]")).toHaveCount(4);
    const checks = [];
    for (const tab of ["Eau", "Alimentation", "Équipement", "Historique"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await expect(page.locator("[data-vital]")).toHaveCount(4);
      for (const vital of await page.locator("[data-vital]").all())
        await expect(vital).toBeInViewport();
      await expect(page.locator("[data-testid=pond-action]")).toHaveCount(0); // already reserved, still growing
      expect(
        await page
          .locator("[data-vital]")
          .evaluateAll((es) => es.every((e) => !e.closest("[role=tabpanel]"))),
      ).toBe(true);
      expect(
        await page
          .getByRole("button", {
            name: /Programmer la ration|Laissons-les grandir/,
          })
          .count(),
      ).toBe(0);
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(axe.violations).toEqual([]);
      checks.push({ tab, axe: axe.violations.length });
    }
    await page
      .getByRole("button", { name: "Jour suivant", exact: true })
      .click();
    await expect(page.locator(".readings-note")).toContainText("2 relevés");
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
    const urgent = JSON.parse(
      readFileSync("docs/ui/fixtures/contrat-client.json", "utf8"),
    );
    urgent.ponds[0].oxygen = 1;
    await page
      .getByLabel("Fichier de sauvegarde")
      .setInputFiles({
        name: "urgent.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(urgent)),
      });
    await page.getByTestId("task-action").click();
    await expect(
      page.getByRole("tab", { name: "Eau", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("[data-vital=oxygen]")).toContainText("Critique");
    await expect(page.locator(".readings-note")).toContainText("1 relevé");
    await info.attach("inspector-measures", {
      body: JSON.stringify({ width, height, checks }),
      contentType: "application/json",
    });
  });
