import { t } from "../i18n";
import { nextTask, type Task } from "../development";
import type { Game } from "../game";
export function operatingGoals(game: Game) {
  const species = new Set(
    game.ponds.filter((p) => p.built).map((p) => p.facility),
  );
  return [
    {
      id: "diversify",
      title: t("m_f4ca7b51cc"),
      text: t("m_bf891aef79"),
      progress: species.size,
      target: 2,
      unit: t("m_0be1da4ab4"),
      done: species.size >= 2,
    },
    {
      id: "volume",
      title: t("m_c20f7bc937"),
      text: t("m_17a5d3d44e"),
      progress: game.stats.soldKg,
      target: 5000,
      unit: t("m_131ed73429"),
      done: game.stats.soldKg >= 5000,
    },
  ];
}
/** UI objective only. Urgent operations always take priority; engine actions are untouched. */
export function presentationTask(game: Game): Task {
  const task = nextTask(game);
  if (!game.development.paid || task.urgent) return task;
  const [diversify, volume] = operatingGoals(game);
  const existing = new Set(
    game.ponds.filter((p) => p.built).map((p) => p.facility),
  );
  const parcel = game.ponds.find(
    (p) => !p.built && !p.constructionDays && !existing.has(p.facility),
  );
  if (!diversify.done && parcel)
    return {
      stage: 8,
      title: t("m_cf37d16c9b"),
      text: t("m_026cd509be", diversify.progress),
      label: t("m_6f6dff6cad"),
      target: "project",
      pondId: parcel.id,
    };
  if (!volume.done)
    return {
      stage: 8,
      title: t("m_f5d4e7f8c9"),
      text: t("m_59b927a6af", Math.round(game.stats.soldKg)),
      label: t("m_a1e269ecd9"),
      target: "ponds",
      pondId:
        game.ponds.find((p) => p.count)?.id ??
        game.ponds.find((p) => p.built)?.id ??
        1,
    };
  return {
    stage: 8,
    title: t("m_525fc6587c"),
    text: t("m_e17178c9ae"),
    label: t("m_a1e269ecd9"),
    target: "ponds",
    pondId: game.ponds.find((p) => p.count)?.id ?? 1,
  };
}
