import { CONSTRUCTION_DAYS, type Game, type Pond } from "../game";
import { ASSETS, type Asset } from "../development";
export type FarmState = Pick<Game, "ponds" | "development" | "food" | "day">;
export const assetIds = Object.keys(ASSETS) as Asset[];
/** Structure only: water, weight, progress and inventory update the existing objects. */
export function pondStructure(p: Pond) {
  return [
    p.built,
    p.facility,
    p.constructionDays > 0,
    p.upgrade,
    p.species,
    Math.min(8, p.count),
  ].join(":");
}
export function pondProgress(p: Pond) {
  return p.built
    ? 1
    : p.constructionDays
      ? Math.max(
          0,
          Math.min(1, 1 - p.constructionDays / CONSTRUCTION_DAYS[p.id - 1]),
        )
      : 0;
}
export function assetState(game: FarmState, id: Asset) {
  const works = game.development.works.find((w) => w.asset === id);
  return {
    built: game.development.assets[id],
    working: !!works,
    progress: game.development.assets[id]
      ? 1
      : works
        ? Math.max(0, Math.min(1, 1 - (works.due - game.day) / ASSETS[id].days))
        : 0,
  };
}
export const pondSize = (p: Pond): [number, number] =>
  p.facility === "earth" ? [13, 8] : [12, 5.8];
