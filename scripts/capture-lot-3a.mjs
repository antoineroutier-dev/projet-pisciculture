import { expect } from "@playwright/test";
import { captureLot } from "./capture-helpers.mjs";
await captureLot("lot-3a", async ({ page, snap, seed, canvas }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.getByTestId("task-action").click();
  await expect(page.locator(".world-feedback")).toBeVisible();
  await snap("retour-analyse", { toast: false });
  await page.clock.resume();
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await page.getByRole("tab", { name: "Audio", exact: true }).click();
  await snap("audio");
  await page.keyboard.press("Escape");
  await seed("contrat-client");
  await expect(canvas).toHaveAttribute("data-day", "157", { timeout: 120000 });
  await expect(canvas).toHaveAttribute("data-settled", "true");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Bassins", exact: true })
    .click();
  const maintain = page.getByRole("button", {
    name: /^Entretenir & renouveler/,
  });
  await maintain.scrollIntoViewIfNeeded();
  await page.clock.pauseAt(new Date());
  await maintain.click();
  await expect(
    page.locator('.world-feedback[data-pond-source="1"]'),
  ).toBeVisible();
  await snap("retour-bassin", { toast: false });
  await page.clock.resume();
});
