import type { Game } from "../game";
import type { Profile } from "../state/profile";
import type { PanelId } from "../state/navigation";
export const TOUR_PANELS = ["ponds", "logistics", "finance"] as const;
export type TourPanel = (typeof TOUR_PANELS)[number];
export type TutorialStep =
  | "water"
  | "results"
  | "plot"
  | "build"
  | "works"
  | "supplies"
  | "stock"
  | "feed"
  | TourPanel
  | "finish";
/** The guided actions still come exclusively from the existing nextTask/act engine. */
export function tutorialStep(
  game: Game,
  visited: readonly TourPanel[],
): TutorialStep {
  const d = game.development;
  if (!d.surveyed) return d.surveyDue === null ? "water" : "results";
  if (!game.ponds.some((p) => p.built)) {
    if (game.ponds.some((p) => p.constructionDays > 0)) return "works";
    return game.ponds.some((p) => p.plannedSpecies) ? "build" : "plot";
  }
  const live = game.ponds.find((p) => p.count > 0);
  if (!live && !d.paid && !game.stats.soldKg) {
    if (!d.assets.warehouse || !game.food) return "supplies";
    return "stock";
  }
  if (live && !live.autoFeed) return "feed";
  return TOUR_PANELS.find((p) => !visited.includes(p)) ?? "finish";
}
export function isTourPanel(panel: PanelId | null): panel is TourPanel {
  return TOUR_PANELS.includes(panel as TourPanel);
}
export function tutorialActive(profile: Profile) {
  return profile.tutorial === "active";
}
