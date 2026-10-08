import { enterGame } from "./ui-helpers";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { withoutWebGL } from "./ui-helpers";
const panels = [
  "Construire",
  "Bassins",
  "Logistique",
  "Finances",
  "Journal",
  "Guide",
];
for (const [width, height] of [
  [1440, 900],
  [390, 844],
]) {
  test(`1c : échelle 80–150 %, onglets et composants à ${width}×${height}`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    await withoutWebGL(page);
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(
      (raw) => localStorage.setItem("les-etangs-save-v3", raw),
      readFileSync("docs/ui/fixtures/contrat-client.json", "utf8"),
    );
    await page.reload();
    await enterGame(page);
    const measures = [];
    for (const scale of [80, 100, 150]) {
      await page
        .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
        .click();
      const tab = page.getByRole("tab", { name: "Partie", exact: true });
      await tab.focus();
      await page.keyboard.press("ArrowRight");
      await expect(
        page.getByRole("tab", { name: "Affichage", exact: true }),
      ).toBeFocused();
      await page
        .getByRole("slider", { name: "Échelle de l’interface" })
        .fill(String(scale));
      await page.getByRole("radio", { name: "Réduit", exact: true }).check();
      await expect(page.locator("html")).toHaveAttribute(
        "data-scale",
        String(scale),
      );
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.getByRole("tab", { name: "Partie", exact: true }).click();
      await page.keyboard.press("Escape");
      for (const name of panels) {
        await page
          .getByRole("navigation")
          .getByRole("button", { name, exact: true })
          .click();
        const result = await page.evaluate(() => {
          const visible = [
            ...document.querySelectorAll<HTMLElement>("body *"),
          ].filter(
            (e) =>
              e.getClientRects().length &&
              !e.closest("[inert]") &&
              getComputedStyle(e).visibility !== "hidden" &&
              ([...e.childNodes].some(
                (n) => n.nodeType === 3 && n.textContent?.trim(),
              ) ||
                e.matches("input,select,textarea")),
          );
          const sizes = visible.map((e) =>
            parseFloat(getComputedStyle(e).fontSize),
          );
          const keys = [
            ".game-hud",
            ".goal-hud",
            ".management-panel",
            ".game-dock",
          ];
          const boxes = keys.map((s) => ({
            s,
            r: document.querySelector(s)!.getBoundingClientRect(),
          }));
          const overlaps = [];
          for (let i = 0; i < boxes.length; i++)
            for (let j = i + 1; j < boxes.length; j++) {
              const a = boxes[i],
                b = boxes[j];
              if (
                a.r.x < b.r.right &&
                a.r.right > b.r.x &&
                a.r.y < b.r.bottom &&
                a.r.bottom > b.r.y
              )
                overlaps.push([a.s, b.s]);
            }
          const clipped = [
            ...document.querySelectorAll<HTMLElement>(
              ".game-dock button,.hud-clock button",
            ),
          ].flatMap((button) => {
            const box = button.getBoundingClientRect();
            return [...button.querySelectorAll("span,kbd")]
              .filter((e) => e.getClientRects().length)
              .filter((e) => {
                const range = document.createRange();
                range.selectNodeContents(e);
                const r = range.getBoundingClientRect();
                return (
                  r.x < box.x - 1 ||
                  r.right > box.right + 1 ||
                  r.bottom > box.bottom + 1
                );
              })
              .map((e) => e.textContent);
          });
          return {
            clipped,
            min: Math.min(...sizes),
            overlaps,
            outside: boxes
              .filter(
                (b) =>
                  b.r.y < 0 ||
                  b.r.bottom > innerHeight ||
                  b.r.x < 0 ||
                  b.r.right > innerWidth,
              )
              .map((b) => b.s),
            scroll: document.documentElement.scrollWidth,
            disabled: [
              ...document.querySelectorAll<HTMLButtonElement>(
                "button:disabled",
              ),
            ]
              .filter(
                (b) =>
                  b.getClientRects().length &&
                  !b.closest("[role=group][aria-label]"),
              )
              .map((b) => b.textContent),
          };
        });
        expect(result.min).toBeGreaterThanOrEqual(12);
        expect(result.scroll).toBe(width);
        expect(result.clipped).toEqual([]);
        expect(result.overlaps).toEqual([]);
        expect(result.outside).toEqual([]);
        expect(result.disabled).toEqual([]);
        if (scale === 150)
          expect(
            (
              await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
                .analyze()
            ).violations,
            name,
          ).toEqual([]);
        measures.push({ scale, name, ...result });
        await page.keyboard.press("Escape");
      }
    }
    await page.reload();
    await enterGame(page);
    await expect(page.locator("html")).toHaveAttribute("data-scale", "150");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
    await info.attach("scale-measures", {
      body: JSON.stringify(measures),
      contentType: "application/json",
    });
  });
}
