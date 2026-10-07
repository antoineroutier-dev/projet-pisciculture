import { expect, type Page } from "@playwright/test";

/** Explicit fallback in DOM/a11y matrices; real WebGL is covered separately. */
export async function withoutWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (["webgl", "webgl2", "experimental-webgl"].includes(type)) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
}

/** Explicitly acknowledge the actual event UI; no state injection or pointer shortcuts. */
export async function settleEvents(page: Page) {
  await expect(page.locator(".hud-clock")).toHaveAttribute(
    "data-seeking",
    "false",
    { timeout: 20000 },
  );
  for (let i = 0; i < 8 && (await page.getByTestId("event-card").count()); i++)
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
}
