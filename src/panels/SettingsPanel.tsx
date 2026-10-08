import { useState, type ReactNode } from "react";
import { AudioSettings } from "../audio/AudioSettings";
import { GraphicsSettings } from "../world/GraphicsSettings";
import { Slider, SegmentedControl, Tabs, Toggle } from "../ui/Primitives";
import { FullscreenSetting } from "../controls/fullscreen";
import { ControlsSettings } from "./ControlsSettings";
import type { Runtime } from "../state/runtime";
export function SettingsPanel({
  runtime,
  children,
  mode,
  changeMode,
}: {
  runtime: Runtime;
  children?: ReactNode;
  mode?: "guided" | "expert";
  changeMode?: (m: "guided" | "expert") => void;
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
        { id: "game", label: "Jeu" },
        { id: "controls", label: "Contrôles" },
        { id: "language", label: "Langue" },
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
      ) : tab === "controls" ? (
        <ControlsSettings runtime={runtime} />
      ) : tab === "language" ? (
        <label className="field-label">
          Langue
          <select aria-label="Langue" value="fr" onChange={() => {}}>
            <option value="fr">Français</option>
          </select>
        </label>
      ) : tab === "game" ? (
        <div className="game-settings">
          <label className="field-label">
            {changeMode ? "Mode de gestion" : "Mode des nouvelles parties"}
            <select
              aria-label={
                changeMode ? "Mode de gestion" : "Mode des nouvelles parties"
              }
              value={mode || preferences.defaultMode}
              onChange={(e) => {
                const m = e.target.value as "guided" | "expert";
                changeMode?.(m);
                setPreferences((p) => ({ ...p, defaultMode: m }));
              }}
            >
              <option value="guided">Réaliste avec aides pédagogiques</option>
              <option value="expert">Expert · sans aides économiques</option>
            </select>
          </label>
          <p className="hint">
            Les deux modes utilisent les mêmes lois biologiques. Les aides
            monétaires sont désactivées en mode expert.
          </p>
          <Toggle
            label="Pauses automatiques"
            checked={preferences.autoPause}
            onChange={(autoPause) =>
              setPreferences((p) => ({ ...p, autoPause }))
            }
            description="Arrêter le temps aux étapes courantes. Les urgences, l’analyse de l’eau, les premiers jalons, les bilans et l’avance jusqu’à un événement restent des arrêts obligatoires."
          />
          <Toggle
            label="Aides pédagogiques"
            checked={preferences.aids}
            onChange={(aids) => setPreferences((p) => ({ ...p, aids }))}
            description="Afficher les conseils détaillés du parcours. L’objectif, les alertes et les raisons d’indisponibilité restent visibles."
          />
          <label className="field-label">
            Vitesse de reprise
            <select
              aria-label="Vitesse de reprise"
              value={preferences.defaultSpeed}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  defaultSpeed: Number(e.target.value) as 1 | 2 | 4 | 8,
                }))
              }
            >
              {[1, 2, 4, 8].map((v) => (
                <option key={v} value={v}>
                  ×{v}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">
            Une nouvelle partie commence en pause. Ce réglage choisit la vitesse
            de reprise ; les boutons du HUD restent utilisables à tout moment.
          </p>
        </div>
      ) : (
        <div className="display-settings">
          <FullscreenSetting />
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
          <Toggle
            label="Motifs daltoniens"
            checked={preferences.patterns}
            onChange={(patterns) => setPreferences((p) => ({ ...p, patterns }))}
            description="Ajouter des motifs distincts aux jauges ; les valeurs, icônes et seuils écrits restent visibles."
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
