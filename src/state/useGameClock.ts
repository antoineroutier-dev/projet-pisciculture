import { useCallback, useEffect, useRef, useState } from "react";

export const CLOCK_SPEEDS = [0, 1, 2, 4, 8] as const;
export type ClockSpeed = (typeof CLOCK_SPEEDS)[number];
// Pause has no duration. The fifth duration in the specification belongs to seeking.
export const dayDuration = (speed: ClockSpeed, seeking = false) =>
  seeking ? 250 : speed ? 4000 / speed : Infinity;
export function isClockShortcut(
  event: Pick<
    KeyboardEvent,
    | "target"
    | "altKey"
    | "ctrlKey"
    | "metaKey"
    | "isComposing"
    | "defaultPrevented"
  >,
) {
  return (
    !event.defaultPrevented &&
    !event.isComposing &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !(
      event.target instanceof Element &&
      event.target.closest(
        'input,select,textarea,[contenteditable="true"],[role="slider"]',
      )
    )
  );
}
export function useGameClock(
  tick: (guided: boolean) => boolean,
  blocked: boolean,
) {
  const [speed, setSpeed] = useState<ClockSpeed>(0);
  const [remaining, setRemaining] = useState(0);
  const [revision, setRevision] = useState(0);
  const [phase, setPhase] = useState({ started: 0, duration: Infinity });
  const [visible, setVisible] = useState(!document.hidden);
  const latest = useRef(tick);
  latest.current = tick;
  const remembered = useRef<ClockSpeed>(1);
  const pause = useCallback(() => {
    setSpeed(0);
    setRemaining(0);
  }, []);
  const choose = useCallback((value: ClockSpeed) => {
    if (value) remembered.current = value;
    setRemaining(0);
    setSpeed(value);
  }, []);
  const seek = useCallback((days = Infinity) => {
    setSpeed(0);
    setRemaining(days);
  }, []);
  const toggle = useCallback(() => {
    if (speed || remaining) pause();
    else choose(remembered.current);
  }, [speed, remaining, pause, choose]);
  useEffect(() => {
    const fn = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);
  const active = !blocked && visible && (speed > 0 || remaining > 0);
  useEffect(() => {
    if (!active) {
      setPhase({ started: 0, duration: Infinity });
      return;
    }
    const duration = dayDuration(speed, remaining > 0);
    setPhase({ started: performance.now(), duration });
    const timer = setTimeout(() => {
      if (latest.current(remaining > 0)) pause();
      else setRemaining((n) => Math.max(0, n - 1));
      setRevision((v) => v + 1);
    }, duration);
    return () => clearTimeout(timer);
  }, [active, speed, remaining, revision, pause]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (blocked || e.repeat || !isClockShortcut(e)) return;
      if (
        e.code === "Space" &&
        !(e.target instanceof Element && e.target.closest("button,summary"))
      ) {
        e.preventDefault();
        toggle();
      }
      if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        choose(CLOCK_SPEEDS[Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [blocked, toggle, choose]);
  return {
    speed,
    seeking: remaining > 0,
    active,
    phase,
    choose,
    toggle,
    seek,
    pause,
    step: () => {
      pause();
      latest.current(false);
    },
  };
}
export type GameClock = ReturnType<typeof useGameClock>;
