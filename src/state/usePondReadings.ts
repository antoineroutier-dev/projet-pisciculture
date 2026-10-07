import { useMemo, useRef } from "react";
import type { Game } from "../game";
import { recordReadings, type PondReadings } from "./pondSelectors";
export function usePondReadings(game: Game, session: number) {
  const history = useRef<{ session: number; readings: PondReadings }>({
    session,
    readings: {},
  });
  return useMemo(() => {
    const readings = recordReadings(
      history.current.session === session ? history.current.readings : {},
      game,
    );
    history.current = { session, readings };
    return readings;
  }, [game, session]);
}
