import { localeTag } from "../i18n";
import type { Game } from "../game";
import { cashHistory } from "./financeSelectors";
export type JournalType =
  | "all"
  | "info"
  | "purchase"
  | "sale"
  | "warning"
  | "weekly";
export function journalMonths(game: Game, type: JournalType, pond: string) {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      entries: {
        id: string;
        log: Game["logs"][number];
        pondIds: number[];
        weekly: boolean;
        history: ReturnType<typeof cashHistory>;
      }[];
    }
  >();
  game.logs.forEach((log, i) => {
    const pondIds = game.ponds
      .filter((p) => log.text.includes(p.name))
      .map((p) => p.id);
    const weekly = log.text.startsWith("Bilan hebdomadaire :");
    if (
      type !== "all" &&
      (type === "weekly" ? !weekly : log.kind !== type || weekly)
    )
      return;
    if (
      pond !== "all" &&
      (pond === "farm" ? pondIds.length !== 0 : !pondIds.includes(Number(pond)))
    )
      return;
    const date = new Date(Date.UTC(2026, 3, log.day)),
      key = date.toISOString().slice(0, 7);
    const group = groups.get(key) ?? {
      key,
      label: new Intl.DateTimeFormat(localeTag(), {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(date),
      entries: [],
    };
    group.entries.push({
      id: `${log.day}-${i}`,
      log,
      pondIds,
      weekly,
      history: weekly
        ? cashHistory(game).filter(
            (h) => h.day > log.day - 7 && h.day <= log.day,
          )
        : [],
    });
    groups.set(key, group);
  });
  return [...groups.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((g) => ({
      ...g,
      entries: g.entries.sort((a, b) => b.log.day - a.log.day),
    }));
}
export function journalSummary(text: string) {
  const first = text.split(/(?<=[.!?])\s/)[0];
  return first.length <= 86
    ? first
    : `${first.slice(0, 83).replace(/\s+\S*$/, "")}…`;
}
