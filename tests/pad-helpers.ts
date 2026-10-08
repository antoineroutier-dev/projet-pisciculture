import { expect, type Locator, type Page } from "@playwright/test";
export async function installPad(page: Page) {
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    const NativeAudio = window.AudioContext;
    if (NativeAudio)
      window.AudioContext = class extends NativeAudio {
        constructor(options?: AudioContextOptions) {
          super(options);
          contexts.push(this);
        }
      };
    Object.assign(window, { __padAudio: contexts });
    const pad = {
      connected: true,
      id: "Manette standard simulée",
      index: 0,
      mapping: "standard",
      timestamp: 0,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({
        pressed: false,
        touched: false,
        value: 0,
      })),
    };
    const input: { index: number; pressed: boolean }[] = [],
      camera: unknown[] = [],
      browserInputs: string[] = [];
    Object.assign(window, {
      __pad: pad,
      __padInputs: input,
      __padCamera: camera,
      __browserInputs: browserInputs,
    });
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => [pad],
    });
    window.addEventListener("etangs-gamepad-input", (e) =>
      input.push((e as CustomEvent).detail),
    );
    window.addEventListener("etangs-camera-command", (e) =>
      camera.push((e as CustomEvent).detail),
    );
    for (const kind of ["pointerdown", "keydown"])
      document.addEventListener(kind, (e) => {
        if (e.isTrusted) browserInputs.push(kind);
      });
  });
}
export async function padPress(page: Page, index: number) {
  for (const pressed of [true, false]) {
    await page.evaluate(
      ({ index, pressed }) => {
        const w = window as typeof window & {
          __pad: {
            timestamp: number;
            buttons: { pressed: boolean; touched: boolean; value: number }[];
          };
          __padInputs: { index: number; pressed: boolean }[];
        };
        w.__pad.buttons[index] = {
          pressed,
          touched: pressed,
          value: Number(pressed),
        };
        w.__pad.timestamp++;
      },
      { index, pressed },
    );
    await page.waitForFunction(
      ({ index, pressed }) => {
        const last = (
          window as typeof window & {
            __padInputs: { index: number; pressed: boolean }[];
          }
        ).__padInputs.at(-1);
        return last?.index === index && last?.pressed === pressed;
      },
      { index, pressed },
    );
  }
}
export async function padTo(page: Page, target: Locator) {
  await expect(target).toBeAttached();
  for (let i = 0; i < 180; i++) {
    if (await target.evaluate((e) => e === document.activeElement)) break;
    const direction = await target.evaluate((target) => {
      const scope = document.querySelector('[role="dialog"]') || document;
      const es = Array.from(
        scope.querySelectorAll<HTMLElement>(
          'button,input:not([type="hidden"]):not([type="file"]),select,textarea,summary,a[href],[tabindex="0"]',
        ),
      ).filter((e) => {
        const closed = e.closest("details:not([open])");
        return (
          !e.matches(":disabled") &&
          !e.closest('[inert],[aria-hidden="true"]') &&
          e.getClientRects().length &&
          getComputedStyle(e).visibility !== "hidden" &&
          (!closed || e === closed.querySelector(":scope > summary"))
        );
      });
      const current = es.indexOf(document.activeElement as HTMLElement),
        end = es.indexOf(target as HTMLElement);
      if (end < 0)
        throw Error("Cible manette absente des commandes disponibles");
      return current < 0 ||
        (end - current + es.length) % es.length <=
          (current - end + es.length) % es.length
        ? 13
        : 12;
    });
    await padPress(page, direction);
  }
  await expect(target).toBeFocused();
  await expect(target).toBeInViewport();
}
export async function padActivate(page: Page, target: Locator) {
  await padTo(page, target);
  await padPress(page, 0);
}
