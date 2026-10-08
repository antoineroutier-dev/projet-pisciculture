import { useCallback, useEffect, useRef, useState } from "react";
import { weather } from "../game";
import {
  AudioMixer,
  AUDIO_KEY,
  parseVolumes,
  type Sound,
  type Volumes,
} from "./mixer";
export function useAudio(day: number) {
  const [volumes, setVolumes] = useState(() => {
    try {
      return parseVolumes(localStorage.getItem(AUDIO_KEY));
    } catch {
      return parseVolumes(null);
    }
  });
  const mixer = useRef<AudioMixer | null>(null),
    settings = useRef(volumes),
    today = useRef(day);
  settings.current = volumes;
  today.current = day;
  useEffect(() => {
    const audio = new AudioMixer(settings.current);
    mixer.current = audio;
    const updateWeather = () => {
      const w = weather(today.current);
      audio.setWeather(
        w.season,
        w.rainy ? 1 : 0,
        w.season === "Automne" ? 2 : 1,
      );
    };
    const gesture = () => {
      if (audio.state === "locked" || audio.state === "suspended") {
        updateWeather();
        void audio.unlock().catch(() => {});
      }
    };
    const click = (event: MouseEvent) => {
      if ((event.target as Element)?.closest("button,summary,select,input"))
        audio.play("click");
    };
    const visibility = () => audio.visibility(document.hidden);
    window.addEventListener("etangs-gamepad-gesture", gesture);
    document.addEventListener("pointerdown", gesture, { capture: true });
    document.addEventListener("keydown", gesture, { capture: true });
    document.addEventListener("click", click, { capture: true });
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("etangs-gamepad-gesture", gesture);
      document.removeEventListener("pointerdown", gesture, true);
      document.removeEventListener("keydown", gesture, true);
      document.removeEventListener("click", click, true);
      document.removeEventListener("visibilitychange", visibility);
      audio.dispose();
      mixer.current = null;
    };
  }, []);
  useEffect(() => {
    mixer.current?.setVolumes(volumes);
    try {
      localStorage.setItem(AUDIO_KEY, JSON.stringify({ version: 1, volumes }));
    } catch {
      /* session settings still apply */
    }
  }, [volumes]);
  useEffect(() => {
    const w = weather(day);
    mixer.current?.setWeather(
      w.season,
      w.rainy ? 1 : 0,
      w.season === "Automne" ? 2 : 1,
    );
  }, [day]);
  const play = useCallback(
    (sound: Sound) => mixer.current?.play(sound) || false,
    [],
  );
  const change = useCallback(
    (bus: keyof Volumes, value: number) =>
      setVolumes((v) => ({ ...v, [bus]: value })),
    [],
  );
  return { volumes, change, play };
}
