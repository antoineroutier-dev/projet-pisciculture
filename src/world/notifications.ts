import { t } from "../i18n";
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
      text: t("m_8219352f7c", p.name),
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
      text: t("m_ad57513631", rest.length),
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
          ? t("m_42724496de", event.amount)
          : event.cargo === "living"
            ? t("m_ff82e1824b", event.amount)
            : t("m_8f60152775", Math.round(event.amount)),
      kind: "truck",
      target: { ...event, kind: "truck" },
      until: now + 16000,
    };
  return {
    id: `ready:${event.pondId || event.asset}`,
    kind: "work",
    text: event.pondId
      ? t("m_3fe3c477ee", event.pondId)
      : t("m_40d9fc39eb", ASSETS[event.asset!].name),
    target: event.pondId
      ? { kind: "pond", id: event.pondId }
      : { kind: "asset", id: event.asset! },
    until: now + 16000,
  };
}
