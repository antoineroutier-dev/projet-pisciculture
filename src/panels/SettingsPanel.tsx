import { t, displayText } from "../i18n";
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
      label={t("m_01923df7a4")}
      items={[
        ...(children ? [{ id: "save", label: t("m_ca372574e6") }] : []),
        { id: "display", label: t("m_18b23488e9") },
        { id: "audio", label: t("m_bc1b88907d") },
        { id: "game", label: t("m_01f23a6765") },
        { id: "controls", label: t("m_1c077a3908") },
        { id: "language", label: t("m_5f6baab4db") },
      ]}
      value={tab}
      onChange={setTab}
    >
      {displayText(
        tab === "save" ? (
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
            {t("m_5f6baab4db")}
            <select
              aria-label={t("m_5f6baab4db")}
              value={preferences.locale}
              onChange={(e) =>
                setPreferences((p) => ({
                  ...p,
                  locale: e.target.value === "en" ? "en" : "fr",
                }))
              }
            >
              <option value="fr">{t("m_e495d53b96")}</option>
              <option value="en">{t("language.english")}</option>
            </select>
          </label>
        ) : tab === "game" ? (
          <div className="game-settings">
            <label className="field-label">
              {displayText(changeMode ? t("m_ef6de78a04") : t("m_2d025b7ccc"))}
              <select
                aria-label={displayText(
                  changeMode ? t("m_ef6de78a04") : t("m_2d025b7ccc"),
                )}
                value={mode || preferences.defaultMode}
                onChange={(e) => {
                  const m = e.target.value as "guided" | "expert";
                  changeMode?.(m);
                  setPreferences((p) => ({ ...p, defaultMode: m }));
                }}
              >
                <option value="guided">{t("m_ae6b977817")}</option>
                <option value="expert">{t("m_afd4ff946d")}</option>
              </select>
            </label>
            <p className="hint">{t("m_ba504900d8")}</p>
            <Toggle
              label={t("m_92172a86d0")}
              checked={preferences.autoPause}
              onChange={(autoPause) =>
                setPreferences((p) => ({ ...p, autoPause }))
              }
              description={t("m_a898071035")}
            />
            <Toggle
              label={t("m_2aff043335")}
              checked={preferences.aids}
              onChange={(aids) => setPreferences((p) => ({ ...p, aids }))}
              description={t("m_f96c24fc66")}
            />
            <label className="field-label">
              {t("m_d1033457cf")}
              <select
                aria-label={t("m_d1033457cf")}
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
                    {t("m_8db71ed28b")}
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <p className="hint">{t("m_56adb232a3")}</p>
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
              label={t("m_6423d38457")}
              value={preferences.scale}
              min={80}
              max={150}
              step={5}
              unit=" %"
              onChange={(scale) => setPreferences((p) => ({ ...p, scale }))}
            />
            <SegmentedControl
              label={t("m_b00eb07649")}
              value={preferences.motion}
              options={[
                { value: "system", label: t("m_adcb2233fa") },
                { value: "reduce", label: t("m_52b52f10d1") },
              ]}
              onChange={(motion) => setPreferences((p) => ({ ...p, motion }))}
            />
            <Toggle
              label={t("m_dc176a7fd4")}
              checked={preferences.patterns}
              onChange={(patterns) =>
                setPreferences((p) => ({ ...p, patterns }))
              }
              description={t("m_d0d3ac1540")}
            />
            <p>{t("m_1c4f19b824")}</p>
          </div>
        ),
      )}
    </Tabs>
  );
}
