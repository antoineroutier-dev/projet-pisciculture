import { t, displayText } from "../i18n";
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
      aria-label={t("m_1a7144746f")}
      data-seeking={clock.seeking}
      data-active={clock.active}
    >
      <div className="time-speeds" role="group" aria-label={t("m_a7f0b5adde")}>
        {CLOCK_SPEEDS.map((speed, i) => (
          <button
            key={speed}
            aria-label={displayText(
              speed ? t("m_578f5f381a", speed) : t("m_42dd586c06"),
            )}
            aria-pressed={!clock.seeking && clock.speed === speed}
            title={displayText(
              `${speed ? t("m_578f5f381a", speed) : t("m_858e4ba7a2")} · ${bindingLabel(shortcuts[i])}`,
            )}
            aria-keyshortcuts={shortcuts[i]}
            onClick={() => clock.choose(speed)}
          >
            {displayText(speed ? `×${speed}` : <Pause size={16} />)}
          </button>
        ))}
      </div>
      <button
        onClick={() => (clock.seeking ? clock.pause() : clock.seek())}
        aria-label={displayText(
          clock.seeking ? t("m_58e9c55625") : t("m_c4b9af66ba"),
        )}
        title={displayText(
          clock.seeking ? t("m_58e9c55625") : t("m_c4b9af66ba"),
        )}
        aria-pressed={clock.seeking}
      >
        {clock.seeking ? <Square size={16} /> : <FastForward size={16} />}
      </button>
      <button
        className="next-day-control"
        onClick={clock.step}
        aria-label={t("m_b683efc4f9")}
        title={t("m_b683efc4f9")}
      >
        <svg
          className="day-progress"
          viewBox="0 0 28 28"
          role="progressbar"
          aria-label={t("m_dce635c705")}
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
        {displayText(
          clock.seeking
            ? t("m_0342fea919")
            : clock.active
              ? t("m_6f6135b588", clock.speed)
              : t("m_40536d87c8"),
        )}
      </span>
    </div>
  );
}
