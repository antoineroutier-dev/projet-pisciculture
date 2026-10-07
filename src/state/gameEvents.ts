import {
  OBJECTIVES,
  SPECIES,
  number,
  pondAmmonia,
  type Action,
  type Game,
} from "../game";
import { ASSETS, nextTask, type Asset, type Task } from "../development";
import { formatEngineText } from "../ui/format";
export type GameEvent = {
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
      "Votre premier bâtiment est prêt",
      `Mise en service : ${ASSETS[completedAsset].name}.`,
      "build",
      "first-build",
    );
  if (built && firstWork)
    add(
      "celebration",
      "Votre premier bassin est prêt",
      `Le bassin ${built.name} est en service. Préparez les aliments avant de commander vos poissons.`,
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
      "Votre premier lot est arrivé",
      `Les premiers poissons sont arrivés dans le bassin ${received.name}. Leur période d’observation commence.`,
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
      "Votre première récolte",
      "Le lot est au froid. Respectez sa date limite et préparez son départ vers le client.",
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
      "Votre premier règlement",
      "Le client a réglé sa facture. Retrouvez les recettes et charges dans Finances.",
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
        "Objectif atteint",
        o.title,
        "award",
        `objective-${o.id}`,
        {
          action: { type: "claim", id: o.id },
          actionLabel: "Recevoir la récompense",
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
        ? `${pond.name} : O₂ ${number(pond.oxygen, 1)} mg/L (minimum ${number(SPECIES[pond.species].minOxygen, 1)}) ; NH₃-N ${number(pondAmmonia(pond), 3)} mg/L (limite ${number(SPECIES[pond.species].ammoniaLimit, 3)}) ; santé ${number(pond.health)} %.`
        : task.text;
    if (!redundant || task.urgent)
      add(
        task.urgent ? "alert" : "event",
        task.urgent
          ? "Votre attention est nécessaire"
          : "Une étape à prendre en main",
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
