import { useControlPreferences } from "../state/preferences";
import { bindingLabel } from "../controls/bindings";
import { useEffect, useState } from "react";
import { FastForward, Pause, SkipForward, Square } from "lucide-react";
import { CLOCK_SPEEDS, type GameClock } from "../state/useGameClock";
export function TimeControls({ clock }: { clock: GameClock }) {
  const { bindings } = useControlPreferences();
  const shortcuts = [
    bindings.pause,
    bindings.speed1,
    bindings.speed2,
    bindings.speed4,
    bindings.speed8,
  ];
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!clock.active) {
      setProgress(0);
      return;
    }
    const update = () =>
      setProgress(
        Math.min(
          1,
          (performance.now() - clock.phase.started) / clock.phase.duration,
        ),
      );
    update();
    const interval = setInterval(update, 80);
    return () => clearInterval(interval);
  }, [clock.active, clock.phase]);
  return (
    <div
      className="hud-clock"
      aria-label="Contrôle du temps"
      data-seeking={clock.seeking}
      data-active={clock.active}
    >
      <div
        className="time-speeds"
        role="group"
        aria-label="Vitesse de simulation"
      >
        {CLOCK_SPEEDS.map((speed, i) => (
          <button
            key={speed}
            aria-label={speed ? `Vitesse ×${speed}` : "Mettre en pause"}
            aria-pressed={!clock.seeking && clock.speed === speed}
            title={`${speed ? `Vitesse ×${speed}` : "Pause"} · ${bindingLabel(shortcuts[i])}`}
            aria-keyshortcuts={shortcuts[i]}
            onClick={() => clock.choose(speed)}
          >
            {speed ? `×${speed}` : <Pause size={16} />}
          </button>
        ))}
      </div>
      <button
        onClick={() => (clock.seeking ? clock.pause() : clock.seek())}
        aria-label={
          clock.seeking ? "Interrompre l’avance" : "Jusqu’au prochain événement"
        }
        title={
          clock.seeking ? "Interrompre l’avance" : "Jusqu’au prochain événement"
        }
        aria-pressed={clock.seeking}
      >
        {clock.seeking ? <Square size={16} /> : <FastForward size={16} />}
      </button>
      <button
        className="next-day-control"
        onClick={clock.step}
        aria-label="Jour suivant"
        title="Jour suivant"
      >
        <svg
          className="day-progress"
          viewBox="0 0 28 28"
          role="progressbar"
          aria-label="Progression de la journée"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <circle cx="14" cy="14" r="12" />
          <circle
            cx="14"
            cy="14"
            r="12"
            pathLength="100"
            strokeDasharray={`${progress * 100} 100`}
          />
        </svg>
        <SkipForward size={14} />
      </button>
      <span className="sr-only" role="status">
        {clock.seeking
          ? "Avance vers le prochain événement"
          : clock.active
            ? `Simulation à vitesse ×${clock.speed}`
            : "Simulation en pause"}
      </span>
    </div>
  );
}
