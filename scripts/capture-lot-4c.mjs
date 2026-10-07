import { expect } from "@playwright/test";
import { captureLot } from "./capture-helpers.mjs";
await captureLot(
  "lot-4c",
  async ({ page, snap: rawSnap, canvas, height }) => {
    const snap = async (name) => {
      await page.mouse.move(1, height - 1);
      await rawSnap(name);
    };
    await snap("etiquettes");
    const label = page.locator('.world-label[aria-hidden="false"]').first();
    if (await label.count()) await label.click();
    else
      await page.getByRole("button", { name: "Bassins", exact: true }).click();
    await snap("bassin-selectionne");
    await page.keyboard.press("Escape");
    await page
      .getByLabel("Vue du terrain", { exact: true })
      .selectOption("buildings");
    await snap("batiments");
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
    await page.getByRole("tab", { name: "Affichage", exact: true }).click();
    await snap("parametres-graphiques");
    await page.keyboard.press("Escape");
    await page
      .getByLabel("Vue du terrain", { exact: true })
      .selectOption("farm");
    for (const quality of ["low", "medium", "high", "ultra"]) {
      await page
        .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
        .click();
      await page.getByRole("tab", { name: "Affichage", exact: true }).click();
      await page
        .getByLabel("Qualité graphique", { exact: true })
        .selectOption(quality);
      await page.keyboard.press("Escape");
      await expect(canvas).toHaveAttribute("data-quality", quality);
      await snap(`qualite-${quality}`);
    }
    await page.getByText("Caméra", { exact: true }).click();
    await snap("commandes-camera");
  },
  "elevage",
);
