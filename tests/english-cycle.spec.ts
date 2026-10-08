import { expect, test, type Locator } from "@playwright/test";
import { withoutWebGL } from "./ui-helpers";
import { SAVE_KEY } from "../src/state/saves";
import { PREFERENCES_KEY } from "../src/state/preferences";
import type { Game } from "../src/game";
test("5c : cycle guidé en anglais, du terrain vide au premier paiement", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  await withoutWebGL(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(
    (key) =>
      localStorage.setItem(key, JSON.stringify({ version: 3, locale: "en" })),
    PREFERENCES_KEY,
  );
  await page.goto("/");
  const button = (name: string | RegExp) =>
    page.getByRole("button", { name, exact: typeof name === "string" });
  await button("New game").click();
  await button("Start with learning support").click();
  const current = (): Promise<Game> =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
  const events: string[] = [];
  const press = async (target: Locator) => {
    await target.click();
    await expect(page.locator(".hud-clock")).toHaveAttribute(
      "data-seeking",
      "false",
      { timeout: 20000 },
    );
    for (
      let i = 0;
      i < 8 && (await page.getByTestId("event-card").count());
      i++
    ) {
      const text = await page.getByTestId("event-card").innerText();
      expect(text).not.toMatch(
        /Votre premier|Votre première|Continuer|poissons entiers/,
      );
      events.push(text);
      await button("Continue").click();
    }
  };
  const step = () => press(page.getByTestId("task-action"));
  await step();
  await step();
  await press(button("Choose a plot"));
  await press(button("Choose: Rainbow trout · Les Saules"));
  await step();
  await step();
  await expect(page.getByTestId("day")).toHaveAttribute("data-day", "17");
  await step();
  await step();
  await step();
  await press(button("Order 100 kg"));
  await step();
  await step();
  await press(button(/Order 1,000 juveniles/));
  await step();
  await step();
  let iterations = 0;
  while ((await current()).development.paid === 0 && iterations++ < 90) {
    const g = await current(),
      title = await page
        .getByTestId("next-task")
        .getByRole("heading")
        .innerText();
    if (g.development.batches.length) await press(button(/^Dispatch batch/));
    else if (title.includes("Prevent a feed shortage")) {
      await step();
      await press(button("Order 100 kg"));
    } else if (title.includes("Find a customer")) {
      await step();
      await press(button("Reserve Les Saules · Regional cooperative"));
    } else if (title.includes("ready to harvest")) {
      await step();
      await press(button("Harvest Les Saules"));
    } else await step();
  }
  const g = await current();
  expect(g.development.paid).toBe(1);
  expect(g.stats.soldKg).toBeGreaterThanOrEqual(450);
  expect(g.stats.mortality).toBe(0);
  await page.keyboard.press("Alt+j");
  const journal = await page.locator(".management-panel").innerText();
  expect(journal).toContain("Regional cooperative");
  expect(journal).not.toMatch(
    /Trésorerie|Bilan hebdomadaire|règlement reçu|poissons entiers/,
  );
  await info.attach("english-cycle", {
    contentType: "application/json",
    body: JSON.stringify({
      day: g.day,
      paid: g.development.paid,
      soldKg: g.stats.soldKg,
      iterations,
      events,
    }),
  });
});
