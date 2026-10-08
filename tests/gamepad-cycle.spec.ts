import { test, expect, type Locator } from "@playwright/test";
import { withoutWebGL } from "./ui-helpers";
import { installPad, padActivate, padPress } from "./pad-helpers";
import { SAVE_KEY } from "../src/state/saves";
import type { Game } from "../src/game";
test("5b : du terrain vide au premier paiement, uniquement à la manette simulée en 1280×800", async ({
  page,
}, info) => {
  test.setTimeout(360000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await withoutWebGL(page);
  await installPad(page);
  await page.goto("/");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const button = (name: string | RegExp) =>
    page.getByRole("button", { name, exact: typeof name === "string" });
  await padActivate(page, button("Nouvelle partie"));
  await padActivate(page, button("Commencer avec les aides pédagogiques"));
  await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 90000 });
  await padActivate(page, button("Passer le tutoriel"));
  await expect(page.locator(".game-shell")).toBeVisible();
  const current = (): Promise<Game> =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
  const press = async (target: Locator) => {
    await padActivate(page, target);
    await expect(page.locator(".hud-clock")).toHaveAttribute(
      "data-seeking",
      "false",
      { timeout: 20000 },
    );
    for (
      let i = 0;
      i < 8 && (await page.getByTestId("event-card").count());
      i++
    )
      await padActivate(page, button("Continuer"));
  };
  const step = () => press(page.getByTestId("task-action"));
  expect((await current()).ponds.every((p) => !p.built && !p.count)).toBe(true);
  await step();
  await step();
  await press(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Choisir une parcelle", exact: true }),
  );
  await press(button("Choisir : Truite arc-en-ciel · Les Saules"));
  await step();
  await step();
  await expect(page.getByTestId("day")).toHaveAttribute("data-day", "17");
  await step();
  await step();
  await step();
  await press(button("Commander 100 kg"));
  await step();
  await step();
  await expect(page.getByLabel("Nombre d’alevins")).toHaveValue("1000");
  await press(button(/Commander 1.?000 juvéniles/));
  await step();
  await step();
  expect((await current()).ponds[0].autoFeed).toBe(true);
  let iterations = 0;
  while ((await current()).development.paid === 0 && iterations++ < 90) {
    const state = await current(),
      title = await page
        .getByTestId("next-task")
        .getByRole("heading")
        .evaluate((e) => e.getAttribute("aria-label") || e.textContent || "");
    if (state.development.batches.length)
      await press(button(/^Expédier le lot/));
    else if (title.includes("Anticipez la rupture")) {
      await step();
      await press(button("Commander 100 kg"));
    } else if (title.includes("Trouvez un client")) {
      await step();
      await press(button("Réserver Les Saules · Coopérative régionale"));
    } else if (title.includes("prêt à récolter")) {
      await step();
      await press(button("Récolter Les Saules"));
    } else await step();
  }
  const game = await current();
  expect(game.development.paid).toBe(1);
  expect(game.stats.soldKg).toBeGreaterThanOrEqual(450);
  expect(game.stats.mortality).toBe(0);
  expect(game.day).toBeGreaterThan(130);
  expect(game.money).toBeGreaterThan(1000);
  await expect(page.locator(".pad-hints")).toBeVisible();
  await padPress(page, 9);
  await expect(
    page.getByRole("dialog", { name: "Partie en pause" }),
  ).toBeVisible();
  await padPress(page, 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const browserInputs = await page.evaluate(
    () =>
      (window as typeof window & { __browserInputs: string[] }).__browserInputs,
  );
  expect(browserInputs).toEqual([]);
  expect(errors).toEqual([]);
  const audioStates = await page.evaluate(() =>
    (window as typeof window & { __padAudio: AudioContext[] }).__padAudio.map(
      (c) => c.state,
    ),
  );
  await info.attach("gamepad-cycle", {
    contentType: "application/json",
    body: JSON.stringify({
      day: game.day,
      paid: game.development.paid,
      soldKg: game.stats.soldKg,
      mortality: game.stats.mortality,
      money: game.money,
      iterations,
      browserInputs,
      audioStates,
      scope:
        "Manette standard simulée, lectures DOM et Gamepad API uniquement ; aucun périphérique physique.",
    }),
  });
});
