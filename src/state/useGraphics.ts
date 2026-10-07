import { useEffect, useState } from "react";
import { GRAPHICS_KEY, parseGraphics, type Quality } from "../world/quality";
export function useGraphics() {
  const [actual, setActual] = useState<Quality | null>(null);
  useEffect(() => {
    const fn = (e: Event) => setActual((e as CustomEvent<Quality>).detail);
    window.addEventListener("etangs-quality-changed", fn);
    return () => window.removeEventListener("etangs-quality-changed", fn);
  }, []);
  const [graphics, setGraphics] = useState(() => {
    try {
      return parseGraphics(localStorage.getItem(GRAPHICS_KEY));
    } catch {
      return parseGraphics(null);
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(GRAPHICS_KEY, JSON.stringify(graphics));
    } catch {
      /* Active in memory when browser storage is unavailable. */
    }
  }, [graphics]);
  return { graphics, setGraphics, actual };
}
