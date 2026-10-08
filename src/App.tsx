import { useGamepad } from "./controls/gamepad";
import { useCallback, useState } from "react";
import GameSession from "./GameSession";
import { TitleScreen } from "./panels/TitleScreen";
import { PreferencesContext, usePreferences } from "./state/preferences";
import { useGraphics } from "./state/useGraphics";
import { useAudio } from "./audio/useAudio";
import type { Save } from "./state/saves";
export default function App() {
  const [boot, setBoot] = useState<Save | null>(null);
  const [day, setDay] = useState(1);
  const preferences = usePreferences(),
    graphics = useGraphics(),
    audio = useAudio(day);
  const gamepad = useGamepad(preferences.preferences.controller);
  const runtime = { ...preferences, ...graphics, audio, gamepad };
  const title = useCallback(() => setBoot(null), []);
  return (
    <PreferencesContext value={preferences.preferences}>
      {boot ? (
        <GameSession
          boot={boot}
          runtime={runtime}
          onDay={setDay}
          onTitle={title}
        />
      ) : (
        <TitleScreen runtime={runtime} start={setBoot} />
      )}
    </PreferencesContext>
  );
}
