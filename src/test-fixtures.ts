import { initialGame, type Game } from "./game";
import { initialDevelopment } from "./development";
/** An operating V2-style farm, kept explicit so physics tests do not depend on the tutorial. */
export function operatingGame(mode: Game["mode"] = "guided"): Game {
  const g = initialGame(mode);
  g.money = 48000;
  g.food = 500;
  g.history = [{ day: 1, money: 48000 }];
  g.development = initialDevelopment(true);
  Object.assign(g.ponds[0], {
    built: true,
    species: "trout",
    plannedSpecies: "trout",
    count: 1200,
    weight: 0.38,
    age: 180,
  });
  Object.assign(g.ponds[1], {
    built: true,
    species: "carp",
    plannedSpecies: "carp",
    count: 300,
    weight: 0.78,
    age: 180,
  });
  g.ponds[2].plannedSpecies = "trout";
  return g;
}
