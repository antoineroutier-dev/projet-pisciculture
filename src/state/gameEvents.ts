import { number } from "../ui/format";
import { t } from "../i18n";
import {
  OBJECTIVES,
  SPECIES,
  pondAmmonia,
  type Action,
  type Game,
} from "../game";
import { ASSETS, nextTask, type Asset, type Task } from "../development";
import { formatEngineText } from "../ui/format";
import type { ReportData } from "./ledger";
export type GameEvent = {
  report?: ReportData;
  id: string;
  kind: "alert" | "celebration" | "event";
  title: string;
  text: string;
  illustration: "build" | "fish" | "harvest" | "payment" | "award" | "water";
  pondId?: number;
  task?: Task;
  action?: Action;
  actionLabel?: string;
};
export function hasUpcomingEvent(game: Game) {
  const d = game.development;
  return (
    d.surveyDue !== null ||
    d.works.length > 0 ||
    d.orders.length > 0 ||
    d.shipments.length > 0 ||
    d.batches.length > 0 ||
    game.ponds.some((p) => p.count > 0 || p.constructionDays > 0)
  );
}
/** Transition selectors only. Imported games never replay earlier milestones. */
export function gameEvents(
  before: Game,
  after: Game,
  reason = "",
): GameEvent[] {
  const events: GameEvent[] = [];
  const add = (
    kind: GameEvent["kind"],
    title: string,
    text: string,
    illustration: GameEvent["illustration"],
    key: string,
    rest: Partial<GameEvent> = {},
  ) =>
    events.push({
      id: `${after.day}:${key}`,
      kind,
      title,
      text,
      illustration,
      ...rest,
    });
  const task = nextTask(after);
  const built = after.ponds.find((p, i) => p.built && !before.ponds[i].built);
  const received = after.ponds.find(
    (p, i) => p.count > 0 && !before.ponds[i].count,
  );
  const completedAsset = (Object.keys(ASSETS) as Asset[]).find(
    (id) => after.development.assets[id] && !before.development.assets[id],
  );
  const firstWork =
    !before.ponds.some((p) => p.built) &&
    !Object.values(before.development.assets).some(Boolean) &&
    !before.development.migrated;
  if (completedAsset && !built && firstWork)
    add(
      "celebration",
      t("m_6a2b81f9ba"),
      t("m_b1530ef40d", ASSETS[completedAsset].name),
      "build",
      "first-build",
    );
  if (built && firstWork)
    add(
      "celebration",
      t("m_fa2a1b3c5d"),
      t("m_3deeb936ae", built.name),
      "build",
      "first-build",
      { pondId: built.id },
    );
  if (
    received &&
    !before.development.harvestedKg &&
    !before.ponds.some(
      (p) => p.count || p.age || p.mortality || p.totalFeed || p.totalGain,
    ) &&
    !before.development.migrated
  )
    add(
      "celebration",
      t("m_15c31e5444"),
      t("m_d37c5d8a21", received.name),
      "fish",
      "first-fish",
      { pondId: received.id },
    );
  if (
    !before.development.migrated &&
    !before.development.harvestedKg &&
    after.development.harvestedKg > 0
  )
    add(
      "celebration",
      t("m_51ed9fbc92"),
      t("m_6227c62fe2"),
      "harvest",
      "first-harvest",
    );
  if (
    !before.development.migrated &&
    !before.development.paid &&
    after.development.paid > 0
  )
    add(
      "celebration",
      t("m_6ae234f578"),
      t("m_36318507c9"),
      "payment",
      "first-paid",
    );
  for (const o of OBJECTIVES)
    if (
      o.progress(before) < o.target &&
      o.progress(after) >= o.target &&
      !after.claimed.includes(o.id)
    )
      add(
        "celebration",
        t("m_8e11f9ae38"),
        o.title,
        "award",
        `objective-${o.id}`,
        {
          action: { type: "claim", id: o.id },
          actionLabel: t("m_722720b03f"),
        },
      );
  // The illustrated analysis result is already shown by WaterSurvey.
  if (reason && !(after.development.surveyed && !before.development.surveyed)) {
    const redundant = events.some(
      (e) =>
        (e.id.endsWith("first-build") && reason.includes("chantier")) ||
        (e.id.endsWith("first-fish") && reason.includes("livraison")) ||
        (e.id.endsWith("first-paid") && reason.includes("règlement")),
    );
    const pond = task.pondId
      ? after.ponds.find((p) => p.id === task.pondId)
      : undefined;
    const detail =
      task.urgent && pond?.species
        ? t(
            "m_e5152c9fd2",
            pond.name,
            number(pond.oxygen, 1),
            number(SPECIES[pond.species].minOxygen, 1),
            number(pondAmmonia(pond), 3),
            number(SPECIES[pond.species].ammoniaLimit, 3),
            number(pond.health),
          )
        : task.text;
    if (!redundant || task.urgent)
      add(
        task.urgent ? "alert" : "event",
        task.urgent ? t("m_e5c81b0a95") : t("m_c9c2ac308e"),
        formatEngineText(reason) +
          (task.urgent ? ` ${formatEngineText(detail)}` : ""),
        "water",
        "stop",
        { task, pondId: task.pondId },
      );
  }
  return events.sort(
    (a, b) => Number(b.kind === "alert") - Number(a.kind === "alert"),
  );
}
