import type { Game } from "../game";
/** Read-only series: include purchases made since the engine's last daily sample. */
export function cashHistory(game: Game) {
  return [
    ...game.history.filter((h) => h.day < game.day),
    { day: game.day, money: game.money },
  ].slice(-90);
}
export function cashDomain(values: readonly number[]) {
  const low = Math.min(...values),
    high = Math.max(...values);
  const padding = Math.max(1, (high - low) * 0.12);
  return { low: Math.floor(low - padding), high: Math.ceil(high + padding) };
}
