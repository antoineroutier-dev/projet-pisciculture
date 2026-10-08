import { useEffect, useRef, useState } from "react";
import { moveCamera } from "../world/cameraBus";
export type PadStatus = { connected: boolean; active: boolean; name: string };
const selector =
  'button,input:not([type="hidden"]):not([type="file"]),select,textarea,summary,a[href],[tabindex="0"]';
export function padTargets(root: ParentNode = document) {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (e) => {
      if (
        e.matches(":disabled") ||
        e.closest('[inert],[aria-hidden="true"]') ||
        !e.getClientRects().length ||
        getComputedStyle(e).visibility === "hidden"
      )
        return false;
      const closed = e.closest("details:not([open])");
      return !closed || e === closed.querySelector(":scope > summary");
    },
  );
}
function scope() {
  return document.querySelector('[role="dialog"]') || document;
}
function focus(e?: HTMLElement) {
  if (!e) return;
  e.focus({ preventScroll: true });
  e.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior: "instant",
  });
}
function traverse(direction: number) {
  const targets = padTargets(scope()),
    current = targets.indexOf(document.activeElement as HTMLElement);
  focus(
    targets[
      current < 0
        ? direction > 0
          ? 0
          : targets.length - 1
        : (current + direction + targets.length) % targets.length
    ],
  );
}
function region(direction: number) {
  if (document.querySelector('[role="dialog"]')) {
    traverse(direction);
    return;
  }
  const regions = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".game-hud,.goal-hud,.world-controls,.game-dock,.management-panel,.title-actions",
    ),
  ).filter((r) => padTargets(r).length);
  const current = regions.findIndex((r) => r.contains(document.activeElement));
  const next = regions[(current + direction + regions.length) % regions.length];
  if (next) focus(padTargets(next)[0]);
}
function key(key: string) {
  (document.activeElement || document.body).dispatchEvent(
    new KeyboardEvent("keydown", {
      key,
      code: key,
      bubbles: true,
      cancelable: true,
    }),
  );
}
function adjust(direction: number) {
  const e = document.activeElement;
  if (e instanceof HTMLSelectElement) {
    const options = Array.from(e.options).filter((o) => !o.disabled),
      i = options.findIndex((o) => o.value === e.value);
    const option =
      options[Math.max(0, Math.min(options.length - 1, i + direction))];
    if (option)
      Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      )!.set!.call(e, option.value);
    e.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (
    e instanceof HTMLInputElement &&
    ["number", "range"].includes(e.type)
  ) {
    const step = e.step && e.step !== "any" ? Number(e.step) : 1;
    const min = e.min ? Number(e.min) : -Infinity,
      max = e.max ? Number(e.max) : Infinity;
    const value = Math.max(
      min,
      Math.min(max, (Number(e.value) || 0) + direction * step),
    );
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(e, String(value));
    e.dispatchEvent(new Event("input", { bubbles: true }));
    e.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (e instanceof HTMLInputElement && e.type === "radio") {
    const radios = padTargets(scope()).filter(
      (r): r is HTMLInputElement =>
        r instanceof HTMLInputElement &&
        r.type === "radio" &&
        r.name === e.name,
    );
    const target =
      radios[(radios.indexOf(e) + direction + radios.length) % radios.length];
    focus(target);
    target?.click();
  } else if (e instanceof Element && e.closest('[role="tablist"]'))
    key(direction > 0 ? "ArrowRight" : "ArrowLeft");
  else traverse(direction);
}
export const deadZone = (v: number, threshold = 0.2) =>
  Number.isFinite(v) && Math.abs(v) > threshold
    ? (Math.sign(v) * (Math.min(1, Math.abs(v)) - threshold)) / (1 - threshold)
    : 0;
/** The adapter activates actual focusable controls; it knows nothing about the engine. */
export function useGamepad(enabled: boolean) {
  const [status, setStatus] = useState<PadStatus>({
    connected: false,
    active: false,
    name: "",
  });
  const active = useRef(false);
  useEffect(() => {
    if (!enabled || !navigator.getGamepads) {
      active.current = false;
      document.documentElement.dataset.input = "keyboard";
      setStatus({ connected: false, active: false, name: "" });
      return;
    }
    let frame = 0,
      previousTime = 0,
      lastId = "",
      disposed = false;
    const down = new Set<number>(),
      repeat = new Map<number, number>();
    const fallback = (e: Event) => {
      if (!e.isTrusted || !active.current) return;
      active.current = false;
      document.documentElement.dataset.input = "keyboard";
      setStatus((s) => ({ ...s, active: false }));
    };
    const interact = () => {
      if (!active.current) {
        active.current = true;
        document.documentElement.dataset.input = "gamepad";
        setStatus((s) => ({ ...s, active: true }));
        window.dispatchEvent(new Event("etangs-gamepad-gesture"));
      }
    };
    const poll = (time: number) => {
      frame = 0;
      if (disposed || document.hidden) return;
      let pad: Gamepad | undefined;
      try {
        pad = Array.from(navigator.getGamepads()).find(
          (p): p is Gamepad => !!p?.connected && p.mapping === "standard",
        );
      } catch {
        return;
      }
      if (!pad) {
        if (lastId) setStatus({ connected: false, active: false, name: "" });
        lastId = "";
        active.current = false;
        document.documentElement.dataset.input = "keyboard";
        down.clear();
        repeat.clear();
        previousTime = 0;
        return;
      }
      if (lastId !== pad.id) {
        lastId = pad.id;
        down.clear();
        repeat.clear();
        setStatus({ connected: true, active: active.current, name: pad.id });
      }
      const dt = previousTime
        ? Math.min(0.05, (time - previousTime) / 1000)
        : 0;
      previousTime = time;
      for (const index of [0, 1, 4, 5, 9, 12, 13, 14, 15]) {
        const pressed = !!pad.buttons[index]?.pressed;
        if (pressed) {
          const first = !down.has(index),
            repeats = index >= 12;
          if (first || (repeats && time >= (repeat.get(index) || Infinity))) {
            interact();
            repeat.set(index, time + (first ? 420 : 140));
            if (index === 0) {
              if (
                !padTargets(scope()).includes(
                  document.activeElement as HTMLElement,
                )
              )
                traverse(1);
              (document.activeElement as HTMLElement | null)?.click();
            } else if (index === 1) key("Escape");
            else if (index === 4 || index === 5) region(index === 4 ? -1 : 1);
            else if (index === 9) {
              if (document.querySelector('[role="dialog"]')) key("Escape");
              else
                document
                  .querySelector<HTMLButtonElement>(
                    '[data-command="pause-menu"]',
                  )
                  ?.click();
            } else if (index === 12 || index === 13)
              traverse(index === 12 ? -1 : 1);
            else adjust(index === 14 ? -1 : 1);
          }
          if (!down.has(index))
            window.dispatchEvent(
              new CustomEvent("etangs-gamepad-input", {
                detail: { index, pressed: true },
              }),
            );
          down.add(index);
        } else {
          if (down.has(index))
            window.dispatchEvent(
              new CustomEvent("etangs-gamepad-input", {
                detail: { index, pressed: false },
              }),
            );
          down.delete(index);
          repeat.delete(index);
        }
      }
      const x = deadZone(pad.axes[0] || 0),
        z = deadZone(pad.axes[1] || 0),
        rotate = deadZone(pad.axes[2] || 0),
        zoom = deadZone(
          (pad.buttons[7]?.value || 0) - (pad.buttons[6]?.value || 0),
        );
      if (x || z || rotate || zoom) {
        interact();
        if (
          document.querySelector(".game-shell") &&
          !document.querySelector('[role="dialog"]')
        ) {
          if (x || z)
            moveCamera({ kind: "pan", x: x * dt * 14, z: z * dt * 14 });
          if (rotate) moveCamera({ kind: "rotate", amount: rotate * dt * 1.5 });
          if (zoom) moveCamera({ kind: "zoom", amount: -zoom * dt });
        }
      }
      frame = requestAnimationFrame(poll);
    };
    const start = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(poll);
    };
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        previousTime = 0;
        down.clear();
        repeat.clear();
      } else start();
    };
    window.addEventListener("gamepadconnected", start);
    window.addEventListener("gamepaddisconnected", start);
    document.addEventListener("visibilitychange", visibility);
    document.addEventListener("pointerdown", fallback);
    document.addEventListener("keydown", fallback);
    start();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("gamepadconnected", start);
      window.removeEventListener("gamepaddisconnected", start);
      document.removeEventListener("visibilitychange", visibility);
      document.removeEventListener("pointerdown", fallback);
      document.removeEventListener("keydown", fallback);
    };
  }, [enabled]);
  return status;
}
