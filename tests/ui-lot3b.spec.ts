import { SAVE_KEY } from "../src/state/saves";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { act, advanceGuided, parseSave, type Game } from "../src/game";
import { withoutWebGL } from "./ui-helpers";
import { typography, noOverlap } from "./ui-measures";
for (const [width, height] of [
  [1440, 900],
  [390, 844],
])
  test(`3b : horloge, événements et interruption à ${width}×${height}`, async ({
    page,
  }, info) => {
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.goto("/");
    await page.clock.pauseAt(new Date("2026-01-01T00:01:00Z"));
    await page.keyboard.press("5");
    await expect(
      page.getByRole("button", { name: "Vitesse ×8", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.clock.runFor(260);
    expect(
      Number(
        await page
          .getByRole("progressbar", { name: "Progression de la journée" })
          .getAttribute("aria-valuenow"),
      ),
    ).toBeGreaterThan(0);
    await page.clock.runFor(240);
    await expect(page.getByTestId("day")).toHaveAttribute("data-day", "2");
    await page.keyboard.press("Space");
    await page.clock.runFor(4000);
    await expect(page.getByTestId("day")).toHaveAttribute("data-day", "2");
    await page.keyboard.press("2");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.clock.runFor(4000);
    await expect(page.getByTestId("day")).toHaveAttribute("data-day", "2");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.clock.runFor(3990);
    await expect(page.getByTestId("day")).toHaveAttribute("data-day", "2");
    await page.clock.runFor(10);
    await expect(page.getByTestId("day")).toHaveAttribute("data-day", "3");
    await page.keyboard.press("1");
    await page
      .getByRole("button", { name: "Jusqu’au prochain événement", exact: true })
      .click();
    await page.clock.runFor(250);
    await expect(page.getByRole("dialog")).toContainText(
      "Préparez votre prochaine étape",
    );
    await page
      .getByTestId("event-card")
      .getByRole("button", { name: /Analyser l’eau/ })
      .click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByTestId("day")).toHaveAttribute("data-day", "3");
    expect(
      await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).game.money,
        SAVE_KEY,
      ),
    ).toBe(59760);
    await page
      .getByRole("button", { name: "Jusqu’au prochain événement", exact: true })
      .click();
    await page.clock.runFor(250);
    await page
      .getByRole("button", { name: "Interrompre l’avance", exact: true })
      .click();
    await page.clock.runFor(2000);
    await expect(page.getByTestId("day")).toHaveAttribute("data-day", "4");
    await page
      .getByRole("button", { name: "Jusqu’au prochain événement", exact: true })
      .click();
    await page.clock.runFor(250);
    await expect(page.getByRole("dialog")).toContainText(
      "Votre analyse de l’eau",
    );
    await page
      .getByRole("button", { name: "Choisir une parcelle", exact: true })
      .click();
    const importFixture = async (name: string, state?: Game) => {
      await page
        .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
        .click();
      await page.getByRole("tab", { name: "Partie", exact: true }).click();
      await page.getByLabel("Fichier de sauvegarde").setInputFiles({
        name: `${name}.json`,
        mimeType: "application/json",
        buffer: state
          ? Buffer.from(JSON.stringify(state))
          : readFileSync(`docs/ui/fixtures/${name}.json`),
      });
      await expect(page.getByRole("dialog")).toBeHidden();
    };
    const observed = [];
    for (const [fixture, kind] of [
      ["chantier", "first-build"],
      ["expedition", "first-paid"],
    ]) {
      await importFixture(fixture);
      const before = parseSave(
        readFileSync(`docs/ui/fixtures/${fixture}.json`, "utf8"),
      );
      // Repeated one-day advances use the exact same engine stops as the UI clock.
      let expected = before;
      await page
        .getByRole("button", {
          name: "Jusqu’au prochain événement",
          exact: true,
        })
        .click();
      for (let i = 0; i < 30; i++) {
        const step = advanceGuided(expected, 1);
        expected = step.game;
        await page.clock.runFor(250);
        if (step.reason) break;
      }
      if (!(await page.locator(`[data-event$="${kind}"]`).count())) {
        while (await page.getByTestId("event-card").count())
          await page
            .getByRole("button", { name: "Continuer", exact: true })
            .click();
        await page
          .getByRole("button", {
            name: "Jusqu’au prochain événement",
            exact: true,
          })
          .click();
        for (let i = 0; i < 30; i++) {
          const step = advanceGuided(expected, 1);
          expected = step.game;
          await page.clock.runFor(250);
          if (step.reason) break;
        }
      }
      await expect(page.locator(`[data-event$="${kind}"]`)).toBeVisible();
      const state: Game = await page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).game,
        SAVE_KEY,
      );
      expect(state).toEqual(expected);
      expect((await typography(page)).tooSmall).toEqual([]);
      await page.clock.resume();
      const axe = (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations;
      expect(axe).toEqual([]);
      await page.clock.pauseAt(
        new Date((await page.evaluate(() => Date.now())) + 60000),
      );
      observed.push({
        fixture,
        day: state.day,
        kind,
        axeViolations: axe.length,
      });
      await page.clock.runFor(10000);
      expect(
        await page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)!).game.day,
          SAVE_KEY,
        ),
      ).toBe(state.day);
      while (await page.getByTestId("event-card").count())
        await page
          .getByRole("button", { name: "Continuer", exact: true })
          .click();
    }
    let urgent = act(
      parseSave(readFileSync("docs/ui/fixtures/contrat-client.json", "utf8")),
      { type: "flow", pondId: 1, value: 0 },
    ).game;
    let expectedUrgent = urgent;
    for (let i = 0; i < 30; i++) {
      const result = advanceGuided(urgent, 1);
      if (result.reason.includes("conditions d’élevage")) {
        expectedUrgent = result.game;
        break;
      }
      urgent = result.game;
    }
    expect(expectedUrgent.day).toBeGreaterThan(urgent.day);
    await importFixture("urgent", urgent);
    await page
      .getByRole("button", { name: "Jour suivant", exact: true })
      .click();
    await expect(page.getByTestId("event-card")).toContainText(
      /O₂|oxygène|NH₃/,
    );
    await expect(page.locator(".event-leaf")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Voir le bassin", exact: true }),
    ).toHaveCount(0);
    await page.clock.resume();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.clock.pauseAt(
      new Date((await page.evaluate(() => Date.now())) + 60000),
    );
    await expect(
      page.getByRole("button", { name: "Fermer la fenêtre", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page
        .getByTestId("event-card")
        .getByRole("button", { name: "Contrôler ce bassin", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("tab", { name: "Eau", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.clock.runFor(4000);
    await expect(page.getByTestId("day")).toHaveAttribute(
      "data-day",
      String(expectedUrgent.day),
    );
    observed.push({
      fixture: "urgent",
      day: expectedUrgent.day,
      kind: "alert",
      axeViolations: 0,
    });
    await noOverlap(page, [
      ".game-hud",
      ".goal-hud",
      ".game-dock",
      ".management-panel",
    ]);
    await info.attach("clock-events", {
      body: JSON.stringify({
        width,
        height,
        observed,
        durationsMs: [null, 4000, 2000, 1000, 500],
        seekMs: 250,
      }),
      contentType: "application/json",
    });
  });
