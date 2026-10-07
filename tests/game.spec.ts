import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { initialGame, STORAGE_KEY, LEGACY_STORAGE_KEY } from "../src/game";

test("3D : ferme, bassin, bâtiments et identification des trois espèces", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByAltText(/Vue d’ambiance de la ferme/)).toBeVisible();
  await page
    .getByRole("button", { name: "Explorer en 3D", exact: true })
    .click();
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-frame", "rendered", {
    timeout: 60000,
  });
  await page
    .getByTestId("farm-scene")
    .screenshot({ path: "/tmp/les-etangs-v2-farm.png" });
  for (const [label, view] of [
    ["Bâtiments", "buildings"],
    ["Le bassin", "pond"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(canvas).toHaveAttribute("data-view", view);
    await page
      .getByTestId("farm-scene")
      .screenshot({ path: `/tmp/les-etangs-v2-${view}.png` });
  }
  await page
    .getByRole("button", { name: "Observer sous l’eau", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Vue pédagogique", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Les poissons", exact: true }).click();
  await expect(page.locator(".photo-observation")).toBeVisible();
  await page.getByRole("button", { name: "Modèle 3D", exact: true }).click();
  for (const [label, id, trait] of [
    ["Truite arc-en-ciel", "trout", "adipeuse"],
    ["Carpe commune", "carp", "barbillons"],
    ["Tilapia du Nil", "tilapia", "épineuse"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(canvas).toHaveAttribute("data-species", id);
    await expect(page.locator(".fish-observation")).toContainText(trait);
    await page
      .getByTestId("farm-scene")
      .screenshot({ path: `/tmp/les-etangs-v2-${id}.png` });
  }
  await page.getByRole("button", { name: "Marché", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("button", { name: "Mes bassins", exact: true })
    .click();
  await expect(page.getByAltText(/Vue d’ambiance de la ferme/)).toBeVisible();
  expect(errors).toEqual([]);
});

test("gestion : ration, mesures, récolte, vide sanitaire et nouveau lot", async ({
  page,
}) => {
  const seed = initialGame();
  seed.ponds[0].weight = 0.449;
  await page.addInitScript(
    ({ key, seed }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(seed));
    },
    { key: STORAGE_KEY, seed },
  );
  await page.goto("/");
  await page.getByRole("switch", { name: "Distribution automatique" }).click();
  await page.getByRole("button", { name: /Programmer la ration/ }).click();
  await expect(
    page.getByRole("button", { name: /Ration programmée/ }),
  ).toBeDisabled();
  await page.getByLabel("Débit d’eau neuve").selectOption("12");
  await page.getByRole("button", { name: "Jour suivant", exact: true }).click();
  await expect(page.getByTestId("day")).toHaveText("Jour 2");
  await page.getByRole("button", { name: /Vendre la récolte/ }).click();
  await page
    .getByRole("button", { name: "Confirmer la vente", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Vide sanitaire · 7 jours/ }),
  ).toBeDisabled();
  for (let i = 0; i < 7; i++)
    await page
      .getByRole("button", { name: "Jour suivant", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Introduire des alevins", exact: true })
    .click();
  await page.getByLabel("Nombre d’alevins").fill("100");
  await page
    .getByRole("button", { name: "Introduire 100 alevins", exact: true })
    .click();
  await expect(page.locator(".water-panel")).toContainText("14 jours");
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(state.ponds[0].count).toBe(100);
  expect(state.ponds[0].weight).toBe(0.05);
  expect(state.stats.sales).toBe(1);
  await page.reload();
  await expect(page.getByTestId("day")).toHaveText("Jour 9");
  await expect(
    page.getByRole("button", { name: "Lancer la simulation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      STORAGE_KEY,
    ),
  ).toEqual(state);
});

test("construction différée et navigation au clavier", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Améliorer ce bassin", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Installer l’équipement", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sélectionner Le Pré neuf", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Le Pré neuf", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Aménager le bassin", exact: true })
    .click();
  await page.getByRole("button", { name: /Aménager pour/ }).click();
  await expect(
    page.getByRole("button", { name: /Chantier · encore/ }),
  ).toBeDisabled();
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(state.ponds[2].constructionDays).toBe(14);
  expect(state.ponds[2].built).toBe(false);
  await page
    .getByRole("button", { name: "Voir les objectifs", exact: true })
    .click();
  await page.getByRole("button", { name: "Réclamer", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Guide", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Des mois, pas des minutes biologiques",
    }),
  ).toBeVisible();
});

test("import, export, mode expert et protection de sauvegarde corrompue", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Jour suivant", exact: true }).click();
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await page.getByLabel("Mode de gestion").selectOption("expert");
  const valid = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );
  expect(JSON.parse(valid!).mode).toBe("expert");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exporter ma partie/ }).click();
  expect((await download).suggestedFilename()).toBe("les-etangs-jour-2.json");
  await page.getByLabel("Fichier de sauvegarde").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(page.getByRole("status")).toContainText("incompatible");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe(valid);
  await page.getByRole("button", { name: /Nouvelle partie/ }).click();
  await page
    .getByRole("button", { name: "Recommencer maintenant", exact: true })
    .click();
  await expect(page.getByTestId("day")).toHaveText("Jour 1");
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await page.getByLabel("Fichier de sauvegarde").setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(valid!),
  });
  await expect(page.getByTestId("day")).toHaveText("Jour 2");
  await page.evaluate(
    (key) => localStorage.setItem(key, "{broken"),
    STORAGE_KEY,
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "sauvegarde ne peut pas être lue",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe("{broken");
});

test("migration automatique V1 conserve le fichier original", async ({
  page,
}) => {
  const g = initialGame();
  const legacy = {
    ...g,
    version: 1,
    lastAidDay: -20,
    ponds: g.ponds.map((p, i) => ({
      ...p,
      capacity: [80, 100, 120, 160][i],
      count: i < 2 ? 30 : 0,
      oxygen: 90,
    })),
  };
  const raw = JSON.stringify(legacy);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: LEGACY_STORAGE_KEY,
    raw,
  });
  await page.goto("/");
  await expect(page.getByTestId("day")).toHaveText("Jour 1");
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))
    .not.toBeNull();
  const migrated = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(migrated.version).toBe(2);
  expect(migrated.ponds[0].count).toBe(30);
  expect(migrated.ponds[0].oxygen).toBeGreaterThan(8);
  expect(migrated.ponds[0].oxygen).toBeLessThan(12);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), LEGACY_STORAGE_KEY),
  ).toBe(raw);
});

test("horloge : vitesse ×60, fenêtre de gestion et pause", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
  for (const [from, to] of [
    [1, 3],
    [3, 12],
    [12, 60],
  ])
    await page
      .getByRole("button", {
        name: `Vitesse ${from}, passer à ${to}`,
        exact: true,
      })
      .click();
  await page.getByRole("button", { name: "Lancer la simulation" }).click();
  await page.clock.fastForward(210);
  await expect(page.getByTestId("day")).toHaveText("Jour 2");
  await page
    .getByRole("button", { name: "Voir les objectifs", exact: true })
    .click();
  await page.clock.fastForward(1000);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("day")).toHaveText("Jour 2");
  await page.getByRole("button", { name: "Mettre en pause" }).click();
  await page.clock.fastForward(1000);
  await expect(page.getByTestId("day")).toHaveText("Jour 2");
});

test("sans WebGL : la carte et la gestion restent disponibles", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorer en 3D", exact: true })
    .click();
  await expect(page.getByText(/La 3D n’est pas disponible/)).toBeVisible();
  await page.getByRole("button", { name: /Bassin 2, La Roselière/ }).click();
  await expect(
    page.getByRole("heading", { name: "La Roselière", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Programmer la ration/ }).click();
  await expect(
    page.getByRole("button", { name: /Ration programmée/ }),
  ).toBeDisabled();
});

test("mobile et accessibilité des pages principales", async ({ page }) => {
  await page.goto("/");
  for (const name of ["Mes bassins", "Marché", "Journal", "Guide"]) {
    await page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("button", { name, exact: true })
      .click();
    if (name === "Mes bassins")
      await expect(
        page.getByRole("button", { name: "Explorer en 3D", exact: true }),
      ).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations, `Accessibilité ${name}`).toEqual([]);
  }
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 360, height: 800 });
  for (const name of ["Mes bassins", "Marché", "Journal", "Guide"]) {
    await page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("button", { name, exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Largeur de ${name}`,
    ).toBe(true);
    if (name === "Mes bassins") {
      await page
        .getByRole("button", { name: "Sélectionner La Roselière", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "La Roselière", exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: "/tmp/les-etangs-v2-mobile.png",
        fullPage: true,
      });
    }
  }
});
