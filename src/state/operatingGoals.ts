import { nextTask, type Task } from "../development";
import type { Game } from "../game";
export function operatingGoals(game: Game) {
  const species = new Set(
    game.ponds.filter((p) => p.built).map((p) => p.facility),
  );
  return [
    {
      id: "diversify",
      title: "Deux filières en service",
      text: "Ouvrez une deuxième filière adaptée à son eau.",
      progress: species.size,
      target: 2,
      unit: "filières",
      done: species.size >= 2,
    },
    {
      id: "volume",
      title: "Commercialiser 5 tonnes",
      text: "Développez les ventes tout en surveillant les charges et les pertes.",
      progress: game.stats.soldKg,
      target: 5000,
      unit: "kg",
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
      title: "Diversifiez votre exploitation",
      text: `${diversify.progress} filière en service sur 2 visées. Choisissez une autre eau, puis une autre espèce.`,
      label: "Choisir une autre filière",
      target: "project",
      pondId: parcel.id,
    };
  if (!volume.done)
    return {
      stage: 8,
      title: "Cap sur 5 tonnes vendues",
      text: `${Math.round(game.stats.soldKg)} kg commercialisés. Préparez les prochains lots et leurs débouchés.`,
      label: "Gérer les lots",
      target: "ponds",
      pondId:
        game.ponds.find((p) => p.count)?.id ??
        game.ponds.find((p) => p.built)?.id ??
        1,
    };
  return {
    stage: 8,
    title: "Un domaine bien établi",
    text: "Poursuivez les cycles en maîtrisant les coûts et les pertes au froid.",
    label: "Gérer les lots",
    target: "ponds",
    pondId: game.ponds.find((p) => p.count)?.id ?? 1,
  };
}
