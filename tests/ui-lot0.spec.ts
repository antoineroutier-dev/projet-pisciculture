import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { withoutWebGL } from "./ui-helpers";
import { STORAGE_KEY } from "../src/game";

const seed = readFileSync("docs/ui/fixtures/contrat-client.json", "utf8");
for (const [width, height] of [
  [1920, 1080],
  [1440, 900],
  [1280, 800],
  [1280, 720],
  [390, 844],
]) {
  test(`lot 0 : HUD, portraits, ration et clavier à ${width}×${height}`, async ({
    page,
  }, info) => {
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    const external: string[] = [];
    page.on("request", (r) => {
      if (/^https?:/.test(r.url()) && new URL(r.url()).hostname !== "127.0.0.1")
        external.push(r.url());
    });
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
      key: STORAGE_KEY,
      raw: seed,
    });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () =>
          document.fonts.check('400 16px "Inter"') &&
          [...document.fonts].some(
            (f) => f.family === "Inter" && f.status === "loaded",
          ),
      ),
    ).toBe(true);
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Logistique", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await page.getByRole("tab", { name: "Clients", exact: true }).click();
    await page.getByText("Prix et espèces", { exact: true }).click();
    await expect(page.locator(".market-species-card")).toHaveCount(3);
    for (const portrait of await page
      .locator(".market-species-card .species-photo")
      .all()) {
      const box = (await portrait.boundingBox())!;
      expect(box.width).toBeGreaterThan(70);
      expect(box.height).toBeGreaterThan(18);
      expect(
        await portrait.evaluate((e) => getComputedStyle(e).position),
      ).not.toBe("absolute");
    }
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    for (const selector of [
      ".hud-resources",
      ".hud-clock",
      '[data-testid="day"]',
    ]) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThan(height);
    }
    const money = page.getByTestId("money");
    expect(
      await money.evaluate((e) => {
        const r = document.createRange();
        r.selectNodeContents(e.querySelector('[aria-hidden="true"]') || e);
        return r.getClientRects().length;
      }),
    ).toBe(1);
    expect(
      await money.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    ).toBeGreaterThanOrEqual(18);
    const displayedNumbers = page.locator(
      '.hud-resources strong [aria-hidden="true"]',
    );
    await expect(displayedNumbers).toHaveCount(2);
    for (const value of await displayedNumbers.all())
      expect(
        await value.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
      ).toBeGreaterThanOrEqual(18);
    await page
      .getByRole("navigation")
      .getByRole("button", { name: "Bassins", exact: true })
      .click();
    await expect(page.locator(".scene-location")).toBeHidden();
    await expect(page.getByText("VOTRE PETIT COIN DE NATURE")).toHaveCount(0);
    await page.getByRole("tab", { name: "Alimentation", exact: true }).click();
    const ration = page.getByLabel("Ration cible");
    expect(
      await ration.evaluate((e) => {
        const select = e as HTMLSelectElement;
        const c = document.createElement("canvas").getContext("2d")!;
        const css = getComputedStyle(e);
        c.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
        return (
          e.clientWidth -
            parseFloat(css.paddingLeft) -
            parseFloat(css.paddingRight) -
            24 >=
          c.measureText(select.selectedOptions[0].text).width
        );
      }),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(axe.violations).toEqual([]);
    expect(external).toEqual([]);
    await info.attach("measurements", {
      body: JSON.stringify({
        width,
        height,
        axeViolations: axe.violations.length,
        externalRequests: external.length,
      }),
      contentType: "application/json",
    });
  });
}

test("lot 0 : portable autonome, polices et portraits hors ligne, budget 15 Mo", async ({
  page,
}) => {
  const html = readFileSync("portable/Les-Etangs.html");
  expect(html.byteLength).toBeLessThanOrEqual(15_000_000);
  const additional: string[] = [];
  await page.route("**/*", (route) => {
    if (route.request().url() === "http://portable.test/")
      return route.fulfill({ contentType: "text/html", body: html });
    additional.push(route.request().url());
    return route.abort();
  });
  await page.goto("http://portable.test/");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      [...document.fonts].some(
        (f) => f.family === "Inter" && f.status === "loaded",
      ),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () =>
        document.fonts.check('600 16px "Fraunces"') &&
        [...document.fonts].some(
          (f) => f.family === "Fraunces" && f.status === "loaded",
        ),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Logistique", exact: true }).click();
  await page.getByRole("tab", { name: "Clients", exact: true }).click();
  await page.getByText("Prix et espèces", { exact: true }).click();
  await expect(page.locator(".species-photo image").first()).toHaveAttribute(
    "href",
    /^data:image\/png;base64,/,
  );
  await page.getByRole("button", { name: "Jour suivant", exact: true }).click();
  await expect(page.getByTestId("day")).toHaveAttribute("data-day", "2");
  expect(additional).toEqual([]);
});
