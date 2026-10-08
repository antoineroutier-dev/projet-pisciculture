import { enterGame } from "./ui-helpers";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { withoutWebGL } from "./ui-helpers";
for (const [width, height] of [
  [1440, 900],
  [390, 844],
])
  test(`3a : audio, cinq volumes, geste, visibilité et retours à ${width}×${height}`, async ({
    page,
  }, info) => {
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      const Original = window.AudioContext;
      const contexts: AudioContext[] = [];
      const feedback: Record<string, unknown>[] = [];
      Object.assign(window, {
        __audioContexts: contexts,
        __feedback: feedback,
      });
      window.AudioContext = class extends Original {
        gains: GainNode[] = [];
        constructor(options?: AudioContextOptions) {
          super(options);
          contexts.push(this);
        }
        override createGain() {
          const node = super.createGain();
          this.gains.push(node);
          return node;
        }
      };
      window.addEventListener("etangs-feedback", (event) =>
        feedback.push((event as CustomEvent).detail),
      );
    });
    await page.goto("/");
    expect(
      await page.evaluate(() => (window as any).__audioContexts.length),
    ).toBe(0);
    await enterGame(page);
    await page.getByTestId("task-action").click();
    await expect
      .poll(() =>
        page.evaluate(() => (window as any).__audioContexts.at(-1)?.state),
      )
      .toBe("running");
    await expect(page.locator(".world-feedback")).toContainText("240");
    if (width === 390)
      expect((await page.locator(".toast").boundingBox())!.height).toBeLessThan(
        140,
      );
    expect(
      await page
        .locator(".world-feedback")
        .evaluate((e) => getComputedStyle(e).animationName),
    ).toBe("none");
    await page
      .getByRole("button", { name: "Jour suivant", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
    await page.getByRole("tab", { name: "Audio", exact: true }).click();
    await expect(page.getByRole("slider")).toHaveCount(5);
    const values = [80, 15, 35, 60, 25];
    let i = 0;
    for (const name of [
      "Volume général",
      "Musique",
      "Ambiance",
      "Effets",
      "Interface",
    ]) {
      const input = page.getByRole("slider", { name: new RegExp(`^${name}`) });
      await input.focus();
      await input.press("Home");
      for (let n = 0; n < values[i] / 5; n++) await input.press("ArrowRight");
      i++;
    }
    await page.evaluate(() => {
      const ctx = (window as any).__audioContexts.at(-1);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.gains[0].connect(analyser);
      Object.assign(window, { __audioAnalyser: analyser });
    });
    await page
      .getByRole("button", { name: "Écouter un exemple", exact: true })
      .click();
    let peak = 0;
    await expect
      .poll(
        async () => {
          peak = await page.evaluate(() => {
            const analyser = (window as any).__audioAnalyser as AnalyserNode;
            const samples = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(samples);
            return Math.max(...samples.map(Math.abs));
          });
          return peak;
        },
        { timeout: 2000, intervals: [10, 25, 50] },
      )
      .toBeGreaterThan(0.00001);
    expect(peak).toBeLessThan(1);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    const minimum = await page
      .getByRole("dialog")
      .locator("*")
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
    expect(minimum).toBeGreaterThanOrEqual(12);
    await page.getByRole("tab", { name: "Partie", exact: true }).click();
    await page
      .getByLabel("Mode de gestion", { exact: true })
      .selectOption("expert");
    await expect(page.locator(".toast-inline")).toBeVisible();
    await expect(page.locator(".toast-inline")).toContainText(/expert/i);
    await page.getByLabel("Fichier de sauvegarde").setInputFiles({
      name: "contrat.json",
      mimeType: "application/json",
      buffer: readFileSync("docs/ui/fixtures/contrat-client.json"),
    });
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Bassins", exact: true })
      .click();
    await page
      .getByRole("button", { name: /^Entretenir & renouveler/ })
      .click();
    if (width === 390) {
      const delta = page.locator(".inline-feedback");
      await expect(delta).toBeVisible();
      const box = (await delta.boundingBox())!,
        title = (await page.locator(".management-heading h2").boundingBox())!,
        close = (await page
          .getByRole("button", { name: "Fermer le panneau", exact: true })
          .boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(title.x + title.width);
      expect(box.x + box.width).toBeLessThanOrEqual(close.x);
      await expect(page.locator(".feedback-layer .world-feedback")).toHaveCount(
        0,
      );
    }
    const measured = await page.evaluate(
      () =>
        (window as any).__feedback as {
          id: number;
          action: string;
          phase: string;
          elapsed: number;
          scheduled?: boolean;
        }[],
    );
    for (const id of new Set(measured.map((e) => e.id))) {
      const events = measured.filter((e) => e.id === id);
      for (const phase of ["requested", "audio", "visual"]) {
        const e = events.find((e) => e.phase === phase);
        expect(e).toBeTruthy();
        expect(e!.elapsed).toBeLessThan(100);
        if (phase === "audio") expect(e!.scheduled).toBe(true);
      }
    }
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect
      .poll(() =>
        page.evaluate(() => (window as any).__audioContexts.at(-1).state),
      )
      .toBe("suspended");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect
      .poll(() =>
        page.evaluate(() => (window as any).__audioContexts.at(-1).state),
      )
      .toBe("running");
    await page.reload();
    expect(
      await page.evaluate(() => (window as any).__audioContexts.length),
    ).toBe(0);
    await enterGame(page);
    expect(
      await page.evaluate(() => (window as any).__audioContexts.length),
    ).toBe(1);
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
    await page.getByRole("tab", { name: "Audio", exact: true }).click();
    expect(
      await page
        .getByRole("slider")
        .evaluateAll((es) => es.map((e) => (e as HTMLInputElement).value)),
    ).toEqual(values.map(String));
    await info.attach("feedback-measures", {
      body: JSON.stringify({
        width,
        height,
        measured,
        peak,
        scope:
          "Rendu UI sans WebGL ; programmation Web Audio et insertion DOM, pas latence du haut-parleur ; visibilité simulée.",
      }),
      contentType: "application/json",
    });
  });
