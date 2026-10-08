import type { GameEvent } from "../state/gameEvents";
/** Presentation policy only. Every event still exists in the engine journal. */
export function interruptingEvents(
  events: GameEvent[],
  autoPause: boolean,
  seeking: boolean,
) {
  return events.filter(
    (e) => autoPause || seeking || e.kind !== "event" || !!e.report,
  );
}
