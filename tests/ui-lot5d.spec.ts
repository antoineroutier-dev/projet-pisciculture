import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { withoutWebGL } from "./ui-helpers";
import { typography, noOverlap } from "./ui-measures";
import { SAVE_KEY } from "../src/state/saves";
import fr from "../src/i18n/fr.json" with { type: "json" };
import en from "../src/i18n/en.json" with { type: "json" };
const keyFor = (text: string) =>
  Object.keys(fr).find(
    (k) => fr[k as keyof typeof fr] === text,
  ) as keyof typeof fr;
const label = (locale: "fr" | "en", text: string) =>
  (locale === "en" ? en : fr)[keyFor(text)] || text;
const axe = async (page: Page) => {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(r.violations).toEqual([]);
  return r.violations.length;
};
for (const [width, height, locale] of [
  [1440, 900, "fr"],
  [390, 844, "en"],
] as const)
  test(`5d : tutoriel réel passable et rejouable, ${locale} à ${width}×${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    await page.addInitScript(
      (loc) =>
        localStorage.setItem(
          "les-etangs-ui-v3",
          JSON.stringify({ version: 3, locale: loc }),
        ),
      locale,
    );
    await page.goto("/");
    const button = (text: string) =>
      page.getByRole("button", { name: label(locale, text), exact: true });
    await button("Nouvelle partie").click();
    await button("Commencer avec les aides pédagogiques").click();
    await expect(page.getByTestId("intro")).toBeVisible();
    const introStart = Date.now();
    await axe(page);
    await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 10000 });
    const introObservedMs = Date.now() - introStart;
    const read = () =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
    expect(
      (await read()).game.ponds.every(
        (p: { built: boolean; count: number }) => !p.built && !p.count,
      ),
    ).toBe(true);
    await expect(page.getByTestId("tutorial")).toHaveAttribute(
      "data-step",
      "water",
    );
    await expect(page.locator("[data-world-source]")).toHaveAttribute(
      "data-tutorial-target",
      "true",
    );
    await page.locator("[data-world-source]").click();
    await page.getByTestId("task-action").click();
    await page
      .getByRole("dialog")
      .getByRole("button", {
        name: label(locale, "Choisir une parcelle"),
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name:
          locale === "en"
            ? "Choose: Rainbow trout · Les Saules"
            : "Choisir : Truite arc-en-ciel · Les Saules",
        exact: true,
      })
      .click();
    await expect(page.getByTestId("tutorial")).toHaveAttribute(
      "data-step",
      "build",
    );
    await page.getByTestId("task-action").click();
    await expect(page.getByTestId("tutorial")).toHaveAttribute(
      "data-step",
      "works",
    );
    const step = async () => {
      await page.getByTestId("task-action").click();
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
        await button("Continuer").click();
    };
    await step();
    await step();
    await step();
    await step();
    await page
      .getByRole("button", {
        name: locale === "en" ? "Order 100 kg" : "Commander 100 kg",
        exact: true,
      })
      .click();
    await step();
    await step();
    await page
      .getByRole("button", {
        name:
          locale === "en"
            ? /Order 1,000 juveniles/
            : /Commander 1.?000 juvéniles/,
      })
      .click();
    await step();
    await step();
    await expect(page.getByTestId("tutorial")).toHaveAttribute(
      "data-step",
      "ponds",
    );
    const checks = [];
    for (const [id, name] of [
      ["ponds", "Bassins"],
      ["logistics", "Logistique"],
      ["finance", "Finances"],
    ]) {
      await page
        .locator(".game-dock")
        .getByRole("button", { name: label(locale, name), exact: true })
        .click();
      await expect(page.getByTestId("tutorial")).toHaveAttribute(
        "data-step",
        id,
      );
      await expect(
        page.locator(`.game-dock [data-panel="${id}"]`),
      ).toHaveAttribute("data-tutorial-target", "true");
      await expect(page.locator(`.game-dock [data-panel="${id}"]`)).toHaveCSS(
        "outline-width",
        "3px",
      );
      await noOverlap(page, [
        ".tutorial-instruction",
        ".goal-action",
        ".tutorial-controls",
      ]);
      checks.push({ id, axe: await axe(page), ...(await typography(page)) });
      await noOverlap(page, [
        ".game-hud",
        ".goal-hud",
        ".game-dock",
        ".management-panel",
      ]);
      await button("J’ai compris").click();
    }
    const state = await read();
    await button("Terminer le tutoriel").click();
    expect((await read()).profile.tutorial).toBe("completed");
    await page.keyboard.press("Alt+g");
    await button("Rejouer le tutoriel").click();
    await expect(page.getByTestId("tutorial")).toHaveAttribute(
      "data-step",
      "ponds",
    );
    expect((await read()).game).toEqual(state.game);
    expect((await read()).ledger).toEqual(state.ledger);
    await button("Passer le tutoriel").click();
    expect((await read()).profile.tutorial).toBe("dismissed");
    await page.reload();
    await button("Continuer").click();
    await expect(page.getByTestId("intro")).toHaveCount(0);
    await expect(page.getByTestId("tutorial")).toHaveCount(0);
    await page.keyboard.press("Alt+g");
    await button("Succès de cette ferme").click();
    await expect(page.locator("[data-achievement]")).toHaveCount(12);
    await axe(page);
    await page.locator("[data-achievement=water] summary").click();
    await axe(page);
    const file = await read();
    expect(file.version).toBe(6);
    expect(
      file.profile.earned.some((e: { id: string }) => e.id === "fish"),
    ).toBe(true);
    await info.attach("tutorial-measures", {
      contentType: "application/json",
      body: JSON.stringify({
        width,
        height,
        locale,
        introObservedMs,
        checks,
        day: file.game.day,
        earned: file.profile.earned,
      }),
    });
  });
test("5d : survol passable, repère source réel et caméra conservée", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Nouvelle partie", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Commencer avec les aides pédagogiques",
      exact: true,
    })
    .click();
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveCount(1);
  await canvas.evaluate((e) => e.setAttribute("data-identity", "intro-world"));
  await page
    .getByRole("button", { name: "Passer le survol", exact: true })
    .click();
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  await expect(canvas).toHaveAttribute("data-presentation", "false");
  const before = await canvas.getAttribute("data-camera");
  await page.keyboard.press("q");
  await expect.poll(() => canvas.getAttribute("data-camera")).not.toBe(before);
  await expect(page.locator("[data-world-source]")).toBeVisible();
  await page.locator("[data-world-source]").click();
  await expect(page.getByTestId("tutorial")).toHaveAttribute(
    "data-step",
    "results",
  );
  await expect(canvas).toHaveAttribute("data-identity", "intro-world");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  expect(saved.game.development.surveyDue).toBe(3);
  expect(saved.profile.introSeen).toBe(true);
  await info.attach("intro-world", {
    contentType: "application/json",
    body: JSON.stringify({
      persistentCanvas: true,
      sourceDue: saved.game.development.surveyDue,
      cameraRestored: true,
    }),
  });
});
test("5d : portable hors ligne, polices et partie persistée ; diagnostic file://", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  await context.setOffline(true);
  const requests: string[] = [],
    errors: string[] = [];
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  let fileAccess = "verified";
  try {
    await page.goto(pathToFileURL(resolve("portable/Les-Etangs.html")).href);
  } catch (error) {
    if (!String(error).includes("ERR_BLOCKED_BY_ADMINISTRATOR")) throw error;
    // Respect the managed browser policy. Serve only the already-built document
    // from test memory; all its subresources and gameplay still run offline.
    fileAccess = "blocked-by-browser-policy";
    await page.route("http://portable.local/game", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: readFileSync("portable/Les-Etangs.html"),
      }),
    );
    await page.goto("http://portable.local/game");
  }
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByTestId("title-screen")).toBeVisible();
  const fonts = await page.evaluate(() =>
    [...document.fonts]
      .filter((f) => f.status === "loaded")
      .map((f) => f.family),
  );
  expect(fonts.join()).toContain("Inter");
  expect(fonts.join()).toContain("Fraunces");
  await page
    .getByRole("button", { name: "Nouvelle partie", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Commencer avec les aides pédagogiques",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 90000 });
  await page
    .getByRole("button", { name: "Passer le tutoriel", exact: true })
    .click();
  await page.getByTestId("task-action").click();
  await page.getByTestId("task-action").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Choisir une parcelle", exact: true })
    .click();
  await expect(page.locator("img.species-photo")).toHaveCount(1);
  await expect
    .poll(() =>
      page
        .locator("img.species-photo")
        .evaluate((i) => (i as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  const game = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(game.development.surveyed).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    ),
  ).toEqual(game);
  expect(requests.filter((u) => u !== "http://portable.local/game")).toEqual(
    [],
  );
  expect(errors).toEqual([]);
  expect(statSync("portable/Les-Etangs.html").size).toBeLessThanOrEqual(15e6);
  await info.attach("file-offline", {
    contentType: "application/json",
    body: JSON.stringify({
      fileAccess,
      documentUrl: page.url(),
      fonts,
      requests,
      errors,
      day: game.day,
      bytes: statSync("portable/Les-Etangs.html").size,
    }),
  });
});
for (const locale of ["fr", "en"] as const)
  test(`5d : réception ${locale} aux cinq tailles, succès et Guide`, async ({
    page,
  }, info) => {
    test.setTimeout(300000);
    await withoutWebGL(page);
    await page.addInitScript(
      ({ raw, locale, key }) => {
        localStorage.setItem(key, raw);
        localStorage.setItem(
          "les-etangs-ui-v3",
          JSON.stringify({ version: 3, locale }),
        );
      },
      {
        raw: readFileSync("docs/ui/fixtures/cycle-paye.json", "utf8"),
        locale,
        key: SAVE_KEY,
      },
    );
    await page.goto("/");
    await page
      .getByRole("button", { name: label(locale, "Continuer"), exact: true })
      .click();
    const records = [];
    for (const [width, height] of [
      [1920, 1080],
      [1440, 900],
      [1280, 800],
      [1280, 720],
      [390, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page.keyboard.press("Escape");
      if (await page.getByRole("dialog").count())
        await page.keyboard.press("Escape");
      await noOverlap(page, [
        ".game-hud",
        ".goal-hud",
        ".game-dock",
        ".world-controls",
      ]);
      for (const view of [
        "Succès de cette ferme",
        "Guide",
        "Voir les objectifs",
      ]) {
        if (view === "Succès de cette ferme") {
          await page.keyboard.press("Alt+g");
          await page
            .getByRole("button", {
              name: label(locale, "Succès de cette ferme"),
              exact: true,
            })
            .click();
        } else if (view === "Guide") await page.keyboard.press("Alt+g");
        else {
          await page
            .getByRole("button", { name: label(locale, view), exact: true })
            .click();
          const bars = page.getByRole("dialog").getByRole("progressbar");
          await expect(bars).toHaveCount(4);
          for (const bar of await bars.all()) {
            const rect = await bar.boundingBox();
            expect(rect?.height).toBeGreaterThanOrEqual(6);
            expect(rect?.width).toBeGreaterThan(80);
          }
        }
        const fonts = await typography(page);
        expect(fonts.tooSmall).toEqual([]);
        expect(fonts.width).toBeLessThanOrEqual(width);
        records.push({ height, view, ...fonts, axe: await axe(page) });
        await page.keyboard.press("Escape");
        if (await page.locator(".management-panel").count())
          await page.keyboard.press("Escape");
      }
    }
    await info.attach("final-language-measures", {
      contentType: "application/json",
      body: JSON.stringify(records),
    });
  });

test("5d : survol animé de trois secondes et récompenses purement visuelles", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    localStorage.setItem(
      "les-etangs-graphics-v1",
      JSON.stringify({ version: 1, quality: "low", labels: true }),
    );
    const rows: { time: number; camera: string }[] = [];
    Object.assign(window, { introFrames: rows });
    new MutationObserver(() => {
      const canvas = document.querySelector<HTMLCanvasElement>(
        'canvas[data-engine="three-webgl"]',
      );
      if (
        !document.querySelector('[data-testid="intro"]') ||
        canvas?.dataset.presentation !== "true" ||
        !canvas.dataset.camera
      )
        return;
      if (rows.at(-1)?.camera !== canvas.dataset.camera)
        rows.push({ time: performance.now(), camera: canvas.dataset.camera });
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-camera"],
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Nouvelle partie", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Commencer avec les aides pédagogiques",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("intro")).toBeVisible();
  await expect(page.getByTestId("intro")).toHaveCount(0, { timeout: 60000 });
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-presentation", "false", {
    timeout: 60000,
  });
  const frames = await page.evaluate(
    () =>
      (window as unknown as { introFrames: { time: number; camera: string }[] })
        .introFrames,
  );
  expect(frames.length).toBeGreaterThanOrEqual(2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  await expect(canvas).toHaveAttribute("data-rewards", "");
  await canvas.evaluate((e) =>
    e.setAttribute("data-identity", "rewards-world"),
  );
  await page
    .getByRole("button", { name: "Passer le tutoriel", exact: true })
    .click();
  const fixture = readFileSync("docs/ui/fixtures/cycle-paye.json", "utf8");
  await page
    .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
    .click();
  await page.getByRole("tab", { name: "Partie", exact: true }).click();
  await page.getByLabel("Fichier de sauvegarde").setInputFiles({
    name: "farm.json",
    mimeType: "application/json",
    buffer: Buffer.from(fixture),
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(canvas).toHaveAttribute("data-rewards", "paid", {
    timeout: 60000,
  });
  await expect(canvas).toHaveAttribute("data-identity", "rewards-world");
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    SAVE_KEY,
  );
  const { parseSave } = await import("../src/game");
  expect(saved.game).toEqual(parseSave(fixture));
  expect(
    saved.profile.earned.some((e: { id: string }) => e.id === "cold"),
  ).toBe(false);
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  const beforeGuide = Number(await canvas.getAttribute("data-render-count"));
  await page.keyboard.press("Alt+g");
  await expect
    .poll(async () => Number(await canvas.getAttribute("data-render-count")), {
      timeout: 60000,
    })
    .toBeGreaterThan(beforeGuide);
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 60000,
  });
  // Periodic thumbnails and label layout may legitimately render another frame.
  // A modal must not resend an unchanged farm state to the 3D model.
  const restingStateUpdates = await canvas.getAttribute("data-state-updates");
  await page
    .getByRole("button", { name: "Succès de cette ferme", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(canvas).toHaveAttribute(
    "data-state-updates",
    restingStateUpdates!,
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1500);
  await expect(canvas).toHaveAttribute(
    "data-state-updates",
    restingStateUpdates!,
  );
  await info.attach("intro-animation-rewards", {
    contentType: "application/json",
    body: JSON.stringify({
      frames,
      garden: true,
      benchOnIncompleteImport: false,
      persistentCanvas: true,
      restingStateUpdates,
      modalDoesNotUpdateFarm: true,
    }),
  });
});
