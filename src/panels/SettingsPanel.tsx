import { useState, type ReactNode } from "react";
import { AudioSettings } from "../audio/AudioSettings";
import { GraphicsSettings } from "../world/GraphicsSettings";
import { Slider, SegmentedControl, Tabs } from "../ui/Primitives";
import type { Runtime } from "../state/runtime";
export function SettingsPanel({
  runtime,
  children,
}: {
  runtime: Runtime;
  children?: ReactNode;
}) {
  const { audio, preferences, setPreferences, graphics, setGraphics, actual } =
    runtime;
  const [tab, setTab] = useState(children ? "save" : "display");
  return (
    <Tabs
      label="Paramètres"
      items={[
        ...(children ? [{ id: "save", label: "Partie" }] : []),
        { id: "display", label: "Affichage" },
        { id: "audio", label: "Audio" },
      ]}
      value={tab}
      onChange={setTab}
    >
      {tab === "save" ? (
        children
      ) : tab === "audio" ? (
        <AudioSettings
          volumes={audio.volumes}
          change={audio.change}
          play={audio.play}
        />
      ) : (
        <div className="display-settings">
          <GraphicsSettings
            value={graphics}
            change={setGraphics}
            actual={actual}
          />
          <Slider
            label="Échelle de l’interface"
            value={preferences.scale}
            min={80}
            max={150}
            step={5}
            unit=" %"
            onChange={(scale) => setPreferences((p) => ({ ...p, scale }))}
          />
          <SegmentedControl
            label="Mouvement"
            value={preferences.motion}
            options={[
              { value: "system", label: "Selon le système" },
              { value: "reduce", label: "Réduit" },
            ]}
            onChange={(motion) => setPreferences((p) => ({ ...p, motion }))}
          />
          <p>
            Les légendes restent à 12 px minimum. Le mouvement réduit fige les
            animations décoratives ; la simulation continue au rythme choisi.
          </p>
        </div>
      )}
    </Tabs>
  );
}
