import { flushSync } from "react-dom";
import { nextTask } from "../development";
import type { Action, Game } from "../game";
import type { Sound } from "../audio/mixer";
export type Feedback = {
  id: number;
  pending: boolean;
  started: number;
  action: string;
  ok: boolean;
  sound: Sound;
  message: string;
  pondId?: number;
  money: number;
  food: number;
  point: { x: number; y: number };
};
let serial = 0,
  events: Feedback[] = [];
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let project: ((pondId: number) => { x: number; y: number } | null) | undefined;
export function registerFeedbackProjector(fn: NonNullable<typeof project>) {
  project = fn;
  return () => {
    if (project === fn) project = undefined;
  };
}
export function feedbackSound(action: string, ok: boolean): Sound {
  if (!ok) return "error";
  if (action === "feed") return "feed";
  if (["build", "asset", "upgrade", "clean"].includes(action)) return "build";
  if (["stock", "food", "dispatch"].includes(action)) return "truck";
  if (["harvest", "claim", "aid", "payment"].includes(action)) return "cash";
  return "confirm";
}
export function transitionSound(
  before: Game,
  after: Game,
  action: string,
  ok: boolean,
): Sound {
  if (!ok) return "error";
  if (after.development.paid > before.development.paid) return "cash";
  if (nextTask(after).urgent) return "alert";
  if (after.development.orders.length < before.development.orders.length)
    return "truck";
  if (
    after.ponds.some((p, i) => p.built && !before.ponds[i].built) ||
    after.development.works.length < before.development.works.length
  )
    return "build";
  return feedbackSound(action, ok);
}
export function feedbackPhase(
  event: Pick<Feedback, "id" | "started" | "action">,
  phase: "requested" | "audio" | "visual" | "completed" | "result-visual",
  extra: Record<string, unknown> = {},
) {
  window.dispatchEvent(
    new CustomEvent("etangs-feedback", {
      detail: {
        id: event.id,
        action: event.action,
        phase,
        elapsed: performance.now() - event.started,
        ...extra,
      },
    }),
  );
}
export function requestFeedback(
  before: Game,
  after: Game,
  action: Action | { type: "day" | "advance" },
  ok: boolean,
  message: string,
  play: (s: Sound) => boolean,
  started = performance.now(),
  previous?: Feedback,
  pending = false,
) {
  const id = previous?.id ?? ++serial;
  const sound = pending
    ? "click"
    : transitionSound(before, after, action.type, ok);
  const timing = { id, started, action: action.type };
  if (pending) feedbackPhase(timing, "requested");
  const scheduled = play(sound);
  if (pending) feedbackPhase(timing, "audio", { scheduled });
  const pondId = "pondId" in action ? action.pondId : undefined;
  // Do not force browser layout on the acknowledgement's critical path.
  // The completed delta is still projected from its actual world/resource source.
  const projected = pending
    ? events.find((e) => e.pondId === pondId)?.point
    : pondId
      ? project?.(pondId)
      : null;
  const fallback = pending
    ? undefined
    : pondId
      ? document
          .querySelector(`[data-pond-id="${pondId}"]`)
          ?.getBoundingClientRect()
      : document.querySelector(".hud-resources")?.getBoundingClientRect();
  const point = projected || {
    x: fallback ? fallback.x + fallback.width / 2 : innerWidth / 2,
    y: fallback ? fallback.bottom + 36 : innerHeight / 2,
  };
  const event: Feedback = {
    id,
    pending,
    started,
    action: action.type,
    ok,
    sound,
    message,
    pondId,
    money: after.money - before.money,
    food: after.food - before.food,
    point: {
      x: Math.max(85, Math.min(innerWidth - 85, point.x)),
      y: Math.max(50, Math.min(innerHeight - 80, point.y)),
    },
  };
  if (!pending) feedbackPhase(event, "completed", { scheduled, ok });
  // Replace the previous delta from the same source instead of drawing labels on top of each other.
  events = [...events.filter((e) => e.pondId !== pondId).slice(-2), event];
  for (const [id, timer] of timers)
    if (!events.some((e) => e.id === id)) {
      clearTimeout(timer);
      timers.delete(id);
    }
  clearTimeout(timers.get(event.id));
  timers.set(
    event.id,
    setTimeout(() => dismissFeedback(event.id), 2400),
  );
  // Commit the small acknowledgement before re-rendering the management panel.
  flushSync(() => listeners.forEach((fn) => fn()));
  return event;
}
export const feedbackStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  getSnapshot: () => events,
};
export function dismissFeedback(id: number) {
  clearTimeout(timers.get(id));
  timers.delete(id);
  events = events.filter((e) => e.id !== id);
  listeners.forEach((fn) => fn());
}

export function clearFeedback() {
  timers.forEach(clearTimeout);
  timers.clear();
  events = [];
  listeners.forEach((fn) => fn());
}

export function beginFeedback(
  game: Game,
  action: Action | { type: "day" | "advance" },
  play: (s: Sound) => boolean,
  started = performance.now(),
) {
  return requestFeedback(
    game,
    game,
    action,
    true,
    "Action en cours…",
    play,
    started,
    undefined,
    true,
  );
}
