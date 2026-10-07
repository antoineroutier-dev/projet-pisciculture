import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { withoutWebGL } from "./ui-helpers";
import { act, parseSave, STORAGE_KEY } from "../src/game";

const screens = ["Construire", "Bassins", "Logistique", "Finances", "Journal", "Guide"];
const states = ["terrain-vide", "chantier", "elevage", "contrat-client", "lot-au-froid", "expedition", "cycle-paye"];
async function seed(page: Page, name: string) {
  if (page.url() === "about:blank") await page.goto("/");
  await page.evaluate(({ raw, key }) => { localStorage.clear(); localStorage.setItem(key, raw); }, {
    raw: readFileSync(`docs/ui/fixtures/${name}.json`, "utf8"), key: STORAGE_KEY,
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
}
async function typography(page: Page) {
  return page.evaluate(() => {
    const texts = [...document.querySelectorAll<HTMLElement>("body *")].filter(e =>
      e.getClientRects().length && !e.closest("[inert]") && getComputedStyle(e).visibility !== "hidden" &&
      ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent?.trim()) || e.matches("input,select,textarea")),
    );
    const entries = texts.map(e => ({ text: e.textContent?.trim().slice(0, 60), size: parseFloat(getComputedStyle(e).fontSize) }));
    return { min: Math.min(...entries.map(e => e.size)), tooSmall: entries.filter(e => e.size < 12), width: document.documentElement.scrollWidth };
  });
}
async function noOverlap(page: Page, selectors: string[]) {
  // ResizeObserver positions overlays after a viewport change; assert the settled layout.
  await expect.poll(async () => {
    const boxes = await page.locator(selectors.join(",")).evaluateAll(es => es
      .filter(e => e.getClientRects().length)
      .map(e => { const r = e.getBoundingClientRect(); return { label: e.className || e.textContent, x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
    const overlaps = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y) overlaps.push([a.label, b.label]);
    }
    return overlaps;
  }).toEqual([]);
}

for (const [width, height] of [[1920,1080], [1440,900], [1280,800], [1280,720], [390,844]]) {
  test(`1a : typographie des sept étapes et six vues en ${width}×${height}`, async ({ page }, info) => {
    test.setTimeout(180000);
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    const measures = [];
    for (const state of states) {
      await seed(page, state);
      await noOverlap(page, [".hud-resources", ".hud-date", ".hud-clock", ".hud-utilities"]);
      await noOverlap(page, [".game-dock button"]);
      for (const name of screens) {
        await page.getByRole("navigation").getByRole("button", { name, exact: true }).click();
        if (name === "Bassins") {
          await noOverlap(page, [".game-hud", ".goal-hud", ".management-panel", ".game-dock"]);
          if (state === "elevage" || state === "contrat-client") await page.getByRole("tab",{name:"Eau",exact:true}).click();
          const clipped = await page.locator("[data-vital]").evaluateAll(cells => cells.filter(cell => cell.getClientRects().length).filter(cell =>
            [...cell.querySelectorAll("strong, small")].some(dd => {
              const range = document.createRange(); range.selectNodeContents(dd);
              return range.getBoundingClientRect().right > cell.getBoundingClientRect().right + 1;
            }),
          ).map(cell => cell.textContent));
          expect(clipped, `Unités des mesures : ${state}`).toEqual([]);
        }
        const result = await typography(page);
        expect(result.tooSmall, `${state} / ${name}`).toEqual([]);
        expect(result.width, `${state} / ${name}`).toBe(width);
        measures.push({ state, screen: name, ...result });
      }
    }
    await info.attach("font-measures", { body: JSON.stringify(measures), contentType: "application/json" });
  });
}

for (const [width,height] of [[1440,900], [390,844]]) {
  test(`1a : axe, fontes et libellés de carte à ${width}×${height}`, async ({ page }, info) => {
    test.setTimeout(120000);
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    await seed(page, "contrat-client");
    const fonts = await page.evaluate(() => ["Inter", "Fraunces"].map(family => ({ family,
      loaded: [...document.fonts].some(f => f.family === family && f.status === "loaded"),
      checked: document.fonts.check(`${family === "Fraunces" ? 600 : 400} 16px "${family}"`),
    })));
    expect(fonts.every(f => f.loaded && f.checked)).toBe(true);
    for (const name of screens) {
      await page.getByRole("navigation").getByRole("button", { name, exact: true }).click();
      if (name === "Bassins") {
        const labels = page.locator(".world-fallback .map-name");
        await expect(labels).toHaveCount(4);
        const sizes = await labels.evaluateAll(es => es.map(e => parseFloat(getComputedStyle(e).fontSize)));
        expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
        // Labels are in screen space: no SVG transform can reduce the font.
        expect(await labels.first().evaluate(e => e.namespaceURI)).toBe("http://www.w3.org/1999/xhtml");
        const boxes = await labels.evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
        for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          expect(a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y).toBe(false);
        }
        await page.getByRole("tab",{name:"Eau",exact:true}).click();
      }
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(axe.violations, name).toEqual([]);
    }
    await page.getByRole("button", { name: "Paramètres & sauvegarde", exact: true }).click();
    expect((await typography(page)).tooSmall).toEqual([]);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await info.attach("font-loading", { body: JSON.stringify(fonts), contentType: "application/json" });
  });
}

test("1a : focus du dialogue et explication de désactivation au clavier", async ({ page }) => {
  await withoutWebGL(page);
  await seed(page, "chantier");
  const settings = page.getByRole("button", { name: "Paramètres & sauvegarde", exact: true });
  await settings.focus(); await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Fermer la fenêtre" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate(e => e.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Fermer la fenêtre" })).toBeFocused();
  await page.keyboard.press("Escape"); await expect(settings).toBeFocused();
  await page.getByRole("navigation").getByRole("button", { name: "Logistique", exact: true }).click();
  const disabled = page.getByRole("button", { name: "Aménager l’atelier de préparation", exact: true });
  await expect(disabled).toBeDisabled();
  await page.getByRole("group", { name: "Aménagez d’abord la chambre froide." }).focus();
  await expect(page.getByRole("tooltip")).toHaveText("Aménagez d’abord la chambre froide.");
  const before = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
  await page.keyboard.press("Enter");
  expect(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY)).toBe(before);
  await page.keyboard.press("Escape"); await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test("1a : les fenêtres de gestion respectent le plancher de texte et axe", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  await withoutWebGL(page);
  await seed(page, "cycle-paye");
  await page.getByRole("navigation").getByRole("button", { name: "Bassins", exact: true }).click();
  const verify = async () => {
    await expect(page.getByRole("dialog")).toBeVisible();
    expect((await typography(page)).tooSmall).toEqual([]);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
  };
  await page.getByRole("button", { name: "Commander des juvéniles", exact: true }).click(); await verify();
  await page.getByRole("tab",{name:"Équipement",exact:true}).click();
  await page.getByRole("button", { name: "Améliorer ce bassin", exact: true }).click(); await verify();
  await page.getByRole("button", { name: "Voir les objectifs", exact: true }).click(); await verify();
  const planned = act(parseSave(readFileSync("docs/ui/fixtures/chantier.json", "utf8")), { type: "plan", pondId: 3, species: "trout" });
  expect(planned.ok).toBe(true);
  await page.getByRole("button", { name: "Paramètres & sauvegarde", exact: true }).click();
  await page.getByLabel("Fichier de sauvegarde").setInputFiles({ name: "planned.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(planned.game)) });
  await page.getByLabel("Bassin sélectionné", {exact:true}).selectOption("3");
  await page.getByRole("button", { name: "Construire Le Pré neuf", exact: true }).click();
  await expect(page.getByTestId("construction-card")).toContainText("Mise en service");
  await page.getByRole("button", { name: "Paramètres & sauvegarde", exact: true }).click();
  await page.getByRole("button", { name: "Nouvelle partie", exact: false }).click(); await verify();
});

test("1a : la réduction de mouvement et le plancher typographique résistent à 80 %", async ({ page }) => {
  await withoutWebGL(page);
  await seed(page, "terrain-vide");
  await page.evaluate(() => { document.documentElement.style.fontSize = "80%"; });
  expect((await typography(page)).tooSmall).toEqual([]);
  await page.getByRole("navigation").getByRole("button", { name: "Logistique", exact: true }).click();
  expect((await typography(page)).tooSmall).toEqual([]);
  expect(await page.locator(".ui-button").first().evaluate(e => getComputedStyle(e).transitionDuration.split(",").every(duration => parseFloat(duration) === 0))).toBe(true);
});

test("1a : textes et superpositions des vues 3D sur PC et mobile", async ({ page }) => {
  test.setTimeout(180000);
  await seed(page, "contrat-client");
  await expect(page.locator('canvas[data-engine="three-webgl"]')).toHaveAttribute("data-frame", "rendered", { timeout: 60000 });
  for (const [width,height] of [[1440,900], [390,844]]) {
    await page.setViewportSize({ width, height });
    for (const name of ["La ferme", "Le bassin", "Bâtiments", "Les poissons"]) {
      await page.getByLabel("Vue du terrain", {exact:true}).selectOption({label:name});
      expect((await typography(page)).tooSmall).toEqual([]);
      await noOverlap(page, [".game-hud", ".goal-hud", ".game-dock", ".world-controls", ".fish-inspector"]);
    }
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations).toEqual([]);
  }
});
