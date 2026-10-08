import { displayText } from "../i18n";
import { useEffect, useRef, useState } from "react";
export function AnimatedNumber({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const [shown, setShown] = useState(value),
    [pulse, setPulse] = useState(false),
    current = useRef(value);
  useEffect(() => {
    if (current.current === value) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const reduce = () =>
      document.documentElement.dataset.motion === "reduce" || media.matches;
    const finish = () => {
      cancelAnimationFrame(frame);
      current.current = value;
      setShown(value);
    };
    const changed = () => {
      if (reduce()) finish();
    };
    setPulse(true);
    const timeout = setTimeout(() => setPulse(false), 320);
    if (reduce()) finish();
    else {
      const from = current.current,
        start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 320);
        current.current = from + (value - from) * (1 - Math.pow(1 - t, 3));
        setShown(current.current);
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }
    media.addEventListener("change", changed);
    window.addEventListener("etangs-preferences", changed);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
      media.removeEventListener("change", changed);
      window.removeEventListener("etangs-preferences", changed);
    };
  }, [value]);
  return (
    <span className={pulse ? "resource-pulse" : ""}>
      <span aria-hidden="true">{displayText(format(shown))}</span>
      <span className="sr-only">{displayText(format(value))}</span>
    </span>
  );
}
