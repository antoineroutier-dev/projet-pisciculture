import { lifeEvents, type LifeEvent } from "./lifeSelectors";
import type { Game } from "../game";
export type LifeMessage =
  | { type: "events"; events: LifeEvent[] }
  | { type: "reset" };
const listeners = new Set<(message: LifeMessage) => void>();
export function subscribeLife(fn: (message: LifeMessage) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
export function publishLife(before: Game, after: Game) {
  const events = lifeEvents(before, after);
  if (events.length) for (const fn of listeners) fn({ type: "events", events });
}
export function clearLife() {
  for (const fn of listeners) fn({ type: "reset" });
}
