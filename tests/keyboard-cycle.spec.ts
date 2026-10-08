import { enterGame } from "./ui-helpers";
import { SAVE_KEY } from "../src/state/saves";
import { withoutWebGL } from "./ui-helpers";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { type Game } from "../src/game";

// The DOM is read only to choose a shorter direction. Only real Tab key events
// move focus; neither locator.focus(), click(), fill() nor engine actions are used.
async function tabTo(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  await expect(target).toBeEnabled();
  const { backwards, limit } = await target.evaluate((element) => {
    const candidates = [
      ...document.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"], summary',
      ),
    ].filter(
      (e) =>
        e.getClientRects().length &&
        !e.closest("[inert]") &&
        getComputedStyle(e).visibility !== "hidden",
    );
    const a = candidates.indexOf(document.activeElement as HTMLElement),
      b = candidates.indexOf(element as HTMLElement);
    const forward = (b - a + candidates.length) % candidates.length;
    return {
      backwards: a >= 0 && forward > candidates.length / 2,
      limit: candidates.length + 2,
    };
  });
  for (let i = 0; i < limit; i++) {
    if (await target.evaluate((e) => e === document.activeElement)) break;
    await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
  }
  await expect(target).toBeFocused();
  await expect(target).toBeInViewport();
}

test("1a : du terrain vide au paiement, uniquement au clavier en 1280×800", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addInitScript(() => {
    const events: {
      id: number;
      phase: string;
      action: string;
      elapsed: number;
      scheduled?: boolean;
    }[] = [];
    Object.assign(window, { __cycleFeedback: events });
    window.addEventListener("etangs-feedback", (event) =>
      events.push((event as CustomEvent).detail),
    );
    document.addEventListener("pointerdown", () => {
      document.documentElement.dataset.pointerEvents = String(
        Number(document.documentElement.dataset.pointerEvents || 0) + 1,
      );
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const current = (): Promise<Game> =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
  const press = async (target: Locator) => {
    await tabTo(page, target);
    await page.keyboard.press("Enter");
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
      await tabTo(
        page,
        page.getByRole("button", { name: "Continuer", exact: true }),
      );
      await page.keyboard.press("Enter");
    }
  };
  const step = () => press(page.getByTestId("task-action"));
  const button = (name: string | RegExp) =>
    page.getByRole("button", { name, exact: typeof name === "string" });
  await withoutWebGL(page);
  await page.goto("/");
  await enterGame(page);
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
  await tabTo(page, page.getByLabel("Nombre d’alevins"));
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("1000");
  await press(button(/Commander 1.?000 juvéniles/));
  await step();
  await step();
  expect((await current()).ponds[0].autoFeed).toBe(true);
  let iterations = 0;
  while ((await current()).development.paid === 0 && iterations++ < 90) {
    const state = await current();
    const title = await page
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
  const state = await current();
  expect(state.development.paid).toBe(1);
  expect(state.stats.soldKg).toBeGreaterThanOrEqual(450);
  expect(state.stats.mortality).toBe(0);
  expect(state.day).toBeGreaterThan(130);
  expect(state.money).toBeGreaterThan(1000);
  const pointers = await page.evaluate(() =>
    Number(document.documentElement.dataset.pointerEvents || 0),
  );
  expect(pointers).toBe(0);
  const feedback = await page.evaluate(
    () =>
      (
        window as typeof window & {
          __cycleFeedback: {
            id: number;
            phase: string;
            action: string;
            elapsed: number;
            scheduled?: boolean;
          }[];
        }
      ).__cycleFeedback,
  );
  expect(feedback.length).toBeGreaterThan(30);
  for (const id of new Set(feedback.map((e) => e.id))) {
    const events = feedback.filter((e) => e.id === id);
    for (const phase of ["requested", "audio", "visual"]) {
      const event = events.find((e) => e.phase === phase);
      expect(event, `Retour ${id} / ${phase}`).toBeTruthy();
      expect(event!.elapsed, `${event!.action} / ${phase}`).toBeLessThan(100);
      if (phase === "audio") expect(event!.scheduled).toBe(true);
    }
  }
  await info.attach("cycle-feedback", {
    contentType: "application/json",
    body: JSON.stringify({
      events: feedback,
      scope:
        "Cycle au clavier sans WebGL ; programmation audio et insertion DOM.",
    }),
  });
  await page.reload();
  await enterGame(page);
  expect(await current()).toEqual(state);
  expect(errors).toEqual([]);
  await info.attach("keyboard-cycle", {
    contentType: "application/json",
    body: JSON.stringify({
      day: state.day,
      paid: state.development.paid,
      soldKg: state.stats.soldKg,
      mortality: state.stats.mortality,
      money: state.money,
      pointerEvents: pointers,
      iterations,
    }),
  });
});
