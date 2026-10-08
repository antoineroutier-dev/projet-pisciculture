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

/** Traverse the real title with Tab/Enter, including the keyboard-only cycle. */
export async function enterGame(page: Page) {
  await page.getByTestId("title-screen").waitFor();
  const activate = async (name: string) => {
    const target = page.getByRole("button", { name, exact: true });
    await expect(target).toBeVisible();
    await expect(target).toBeEnabled();
    for (
      let i = 0;
      i < 60 && !(await target.evaluate((e) => e === document.activeElement));
      i++
    )
      await page.keyboard.press("Tab");
    await expect(target).toBeFocused();
    await page.keyboard.press("Enter");
  };
  if (
    await page
      .getByRole("button", { name: "Continuer", exact: true })
      .isEnabled()
  )
    await activate("Continuer");
  else {
    await activate("Nouvelle partie");
    await activate("Commencer avec les aides pédagogiques");
  }
  await page.getByTestId("day").waitFor();
}
