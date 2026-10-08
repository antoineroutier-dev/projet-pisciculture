import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_BINDINGS,
  parseBindings,
  type Bindings,
} from "../controls/bindings";
export const PREFERENCES_KEY = "les-etangs-ui-v2";
export const V1_PREFERENCES_KEY = "les-etangs-ui-v1";
export type Preferences = {
  version: 2;
  scale: number;
  motion: "system" | "reduce";
  patterns: boolean;
  autoPause: boolean;
  aids: boolean;
  defaultMode: "guided" | "expert";
  defaultSpeed: 1 | 2 | 4 | 8;
  sensitivity: number;
  controller: boolean;
  bindings: Bindings;
};
export const DEFAULT_PREFERENCES: Preferences = {
  version: 2,
  scale: 100,
  motion: "system",
  patterns: false,
  autoPause: true,
  aids: true,
  defaultMode: "guided",
  defaultSpeed: 1,
  sensitivity: 100,
  controller: true,
  bindings: DEFAULT_BINDINGS,
};
const bounded = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v)
    ? Math.min(max, Math.max(min, v))
    : fallback;
export function parsePreferences(raw: string | null): Preferences {
  try {
    const v = JSON.parse(raw || "{}");
    return {
      version: 2,
      scale: bounded(v?.scale, 80, 150, 100),
      motion: v?.motion === "reduce" ? "reduce" : "system",
      patterns: v?.patterns === true,
      autoPause: v?.autoPause !== false,
      aids: v?.aids !== false,
      defaultMode: v?.defaultMode === "expert" ? "expert" : "guided",
      defaultSpeed: [1, 2, 4, 8].includes(v?.defaultSpeed) ? v.defaultSpeed : 1,
      sensitivity: bounded(v?.sensitivity, 25, 200, 100),
      controller: v?.controller !== false,
      bindings: parseBindings(v?.bindings),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES, bindings: { ...DEFAULT_BINDINGS } };
  }
}
export const PreferencesContext =
  createContext<Preferences>(DEFAULT_PREFERENCES);
export const useControlPreferences = () => useContext(PreferencesContext);
export function usePreferences() {
  const [preferences, setPreferences] = useState(() => {
    try {
      return parsePreferences(
        localStorage.getItem(PREFERENCES_KEY) ??
          localStorage.getItem(V1_PREFERENCES_KEY),
      );
    } catch {
      return parsePreferences(null);
    }
  });
  useEffect(() => {
    document.documentElement.style.fontSize = `${preferences.scale}%`;
    document.documentElement.dataset.motion = preferences.motion;
    document.documentElement.dataset.scale = String(preferences.scale);
    document.documentElement.dataset.patterns = String(preferences.patterns);
    document.documentElement.dataset.cameraSensitivity = String(
      preferences.sensitivity / 100,
    );
    window.dispatchEvent(new Event("etangs-preferences"));
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch {
      /* Session preferences remain usable if storage is unavailable. */
    }
  }, [preferences]);
  return { preferences, setPreferences };
}
