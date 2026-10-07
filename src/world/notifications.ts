import { pondStatus, type Game } from "../game";
import { nextTask, ASSETS } from "../development";
import type { LifeEvent } from "./lifeSelectors";
import type { WorldTarget } from "./selection";
export type WorldNotice = {
  id: string;
  text: string;
  kind: "critical" | "truck" | "work";
  target?: WorldTarget;
  until?: number;
};
export function criticalNotices(game: Game): WorldNotice[] {
  const list: WorldNotice[] = game.ponds
    .filter((p) => pondStatus(p).tone === "danger")
    .map((p) => ({
      id: `water:${p.id}`,
      text: `${p.name} · qualité d’eau critique`,
      kind: "critical",
      target: { kind: "pond", id: p.id },
    }));
  const task = nextTask(game);
  if (task.urgent && !list.length)
    list.push({
      id: `task:${task.stage}`,
      text: task.title,
      kind: "critical",
      target: task.pondId ? { kind: "pond", id: task.pondId } : undefined,
    });
  if (list.length > 3) {
    const rest = list.splice(2);
    list.push({
      id: "more-critical",
      kind: "critical",
      text: `${rest.length} autres bassins en alerte`,
      target: rest[0].target,
    });
  }
  return list;
}
export function lifeNotice(event: LifeEvent, now: number): WorldNotice | null {
  if (event.kind === "feed") return null;
  if (event.kind === "truck")
    return {
      id: `truck:${event.cargo}:${event.id}`,
      text:
        event.cargo === "feed"
          ? `Aliments reçus · ${event.amount} kg`
          : event.cargo === "living"
            ? `Poissons reçus · ${event.amount}`
            : `Transport au départ · ${Math.round(event.amount)} kg`,
      kind: "truck",
      target: { ...event, kind: "truck" },
      until: now + 16000,
    };
  return {
    id: `ready:${event.pondId || event.asset}`,
    kind: "work",
    text: event.pondId
      ? `Bassin ${event.pondId} · travaux terminés`
      : `${ASSETS[event.asset!].name} · prêt`,
    target: event.pondId
      ? { kind: "pond", id: event.pondId }
      : { kind: "asset", id: event.asset! },
    until: now + 16000,
  };
}
