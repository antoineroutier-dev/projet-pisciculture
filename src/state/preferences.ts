import { useEffect, useState } from "react";
export const PREFERENCES_KEY = "les-etangs-ui-v1";
export type Preferences = {
  version: 1;
  scale: number;
  motion: "system" | "reduce";
};
export function parsePreferences(raw: string | null): Preferences {
  try {
    const v = JSON.parse(raw || "{}");
    return {
      version: 1,
      scale:
        typeof v.scale === "number" && Number.isFinite(v.scale)
          ? Math.min(150, Math.max(80, v.scale))
          : 100,
      motion: v.motion === "reduce" ? "reduce" : "system",
    };
  } catch {
    return { version: 1, scale: 100, motion: "system" };
  }
}
export function usePreferences() {
  const [preferences, setPreferences] = useState(() => {
    try {
      return parsePreferences(localStorage.getItem(PREFERENCES_KEY));
    } catch {
      return parsePreferences(null);
    }
  });
  useEffect(() => {
    document.documentElement.style.fontSize = `${preferences.scale}%`;
    document.documentElement.dataset.motion = preferences.motion;
    document.documentElement.dataset.scale = String(preferences.scale);
    window.dispatchEvent(new Event("etangs-preferences"));
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      /* Gameplay save warning is handled separately; display settings remain active this session. */
    }
  }, [preferences]);
  return { preferences, setPreferences };
}
