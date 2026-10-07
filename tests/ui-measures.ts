import { expect, type Page } from "@playwright/test";
export async function typography(page: Page) {
  return page.evaluate(() => {
    const texts = [...document.querySelectorAll<HTMLElement>("body *")].filter(
      (e) =>
        e.getClientRects().length &&
        !e.closest("[inert]") &&
        getComputedStyle(e).visibility !== "hidden" &&
        ([...e.childNodes].some(
          (n) => n.nodeType === 3 && n.textContent?.trim(),
        ) ||
          e.matches("input,select,textarea")),
    );
    const entries = texts.map((e) => ({
      text: e.textContent?.trim().slice(0, 60),
      size: parseFloat(getComputedStyle(e).fontSize),
    }));
    return {
      min: Math.min(...entries.map((e) => e.size)),
      tooSmall: entries.filter((e) => e.size < 12),
      width: document.documentElement.scrollWidth,
    };
  });
}
export async function noOverlap(page: Page, selectors: string[]) {
  // ResizeObserver positions overlays after a viewport change; assert the settled layout.
  await expect
    .poll(async () => {
      const boxes = await page.locator(selectors.join(",")).evaluateAll((es) =>
        es
          .filter((e) => e.getClientRects().length)
          .map((e) => {
            const r = e.getBoundingClientRect();
            return {
              label: e.className || e.textContent,
              x: r.x,
              y: r.y,
              right: r.right,
              bottom: r.bottom,
            };
          }),
      );
      const overlaps = [];
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i],
            b = boxes[j];
          if (
            a.x < b.right &&
            a.right > b.x &&
            a.y < b.bottom &&
            a.bottom > b.y
          )
            overlaps.push([a.label, b.label]);
        }
      return overlaps;
    })
    .toEqual([]);
}
