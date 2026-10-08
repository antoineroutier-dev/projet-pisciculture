import type { Dispatch, SetStateAction } from "react";
import type { Preferences } from "./preferences";
import type { Graphics, Quality } from "../world/quality";
import type { useAudio } from "../audio/useAudio";
export type Runtime = {
  preferences: Preferences;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  graphics: Graphics;
  setGraphics: Dispatch<SetStateAction<Graphics>>;
  actual: Quality | null;
  audio: ReturnType<typeof useAudio>;
};
