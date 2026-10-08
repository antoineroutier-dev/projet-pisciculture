import { t, displayText } from "../i18n";
import { matchControl, bindingLabel } from "../controls/bindings";
import { useControlPreferences } from "../state/preferences";
import { toggleFullscreen } from "../controls/fullscreen";
import { moveCamera } from "./cameraBus";
import { Button } from "../ui/Button";
import { IconButton } from "../ui/Primitives";
import { useEffect, useState } from "react";
import {
  RotateCcw,
  Maximize2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";
import { SPECIES, type SpeciesId } from "../game";
import { SpeciesPortrait } from "./SpeciesPortrait";
import type { SceneMode } from "./types";
export function WorldControls({
  mode,
  changeMode,
  reset,
  clearWater,
  underwater,
  canObserve,
  hiddenOnMobile,
}: {
  mode: SceneMode;
  changeMode: (mode: SceneMode) => void;
  reset: () => void;
  clearWater: boolean;
  underwater: () => void;
  canObserve: boolean;
  hiddenOnMobile: boolean;
}) {
  const { bindings } = useControlPreferences();
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;
      const action = matchControl(e, bindings);
      if (action === "left" || action === "right") {
        e.preventDefault();
        moveCamera({
          kind: "rotate",
          amount: ((action === "left" ? -1 : 1) * Math.PI) / 8,
        });
      }
      if (action === "zoomIn" || action === "zoomOut") {
        e.preventDefault();
        moveCamera({
          kind: "zoom",
          amount: action === "zoomOut" ? 0.18 : -0.18,
        });
      }
      if (action === "reset") {
        e.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [reset, bindings]);
  const [notice, setNotice] = useState("");
  async function fullscreen() {
    try {
      await toggleFullscreen();
    } catch {
      setNotice(t("m_5ffcd5062e"));
    }
  }
  return (
    <div
      className="world-controls"
      data-mobile-hidden={hiddenOnMobile}
      aria-label={t("m_fc919992c4")}
    >
      <label>
        <span className="sr-only">{t("m_e4fb2be1e8")}</span>
        <select
          aria-label={t("m_e4fb2be1e8")}
          value={mode}
          onChange={(e) => changeMode(e.target.value as SceneMode)}
        >
          <option value="farm">{t("m_1dab9f8d3c")}</option>
          <option value="pond">{t("m_f6b5a49866")}</option>
          <option value="fish">{t("m_2c600db9a0")}</option>
          <option value="buildings">{t("m_df2e10f983")}</option>
        </select>
      </label>
      <IconButton
        label={t("m_9a48e810aa")}
        onClick={reset}
        title={t("m_9a48e810aa")}
      >
        <RotateCcw size={18} />
      </IconButton>
      <IconButton
        label={t("m_e6fe3dfd8d")}
        onClick={() => void fullscreen()}
        title={t("m_dee312b012")}
      >
        <Maximize2 size={18} />
      </IconButton>
      <Button
        tone="secondary"
        size="small"
        disabledReason={t("m_5c19809d2d")}
        aria-label={t("m_5f0de0e6ed")}
        aria-pressed={clearWater}
        disabled={!canObserve}
        onClick={underwater}
        title={displayText(canObserve ? t("m_5f0de0e6ed") : t("m_575c6ce138"))}
      >
        <Eye size={18} />
      </Button>
      <details className="camera-tools">
        <summary
          title={displayText(
            t(
              "m_91164e0ab5",
              bindingLabel(bindings.left),
              bindingLabel(bindings.right),
              bindingLabel(bindings.zoomIn),
              bindingLabel(bindings.zoomOut),
              bindingLabel(bindings.reset),
            ),
          )}
        >
          {t("m_fc919992c4")}
        </summary>
        <div className="camera-more">
          <IconButton
            label={displayText(t("m_ffe86eafec", bindingLabel(bindings.left)))}
            onClick={() => moveCamera({ kind: "rotate", amount: -Math.PI / 8 })}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton
            label={displayText(t("m_fc540b8adc", bindingLabel(bindings.right)))}
            onClick={() => moveCamera({ kind: "rotate", amount: Math.PI / 8 })}
          >
            <ChevronRight size={18} />
          </IconButton>
          <IconButton
            label={displayText(
              t("m_1ec706277c", bindingLabel(bindings.zoomIn)),
            )}
            onClick={() => moveCamera({ kind: "zoom", amount: -0.18 })}
          >
            <Plus size={18} />
          </IconButton>
          <IconButton
            label={displayText(
              t("m_84cf07a043", bindingLabel(bindings.zoomOut)),
            )}
            onClick={() => moveCamera({ kind: "zoom", amount: 0.18 })}
          >
            <Minus size={18} />
          </IconButton>
        </div>
      </details>
      {displayText(notice && <p role="status">{displayText(notice)}</p>)}
    </div>
  );
}
export function FishObservation({
  species,
  setSpecies,
}: {
  species: SpeciesId;
  setSpecies: (species: SpeciesId) => void;
}) {
  return (
    <section className="fish-inspector" aria-label={t("m_77c49d814a")}>
      <label>
        {t("m_1a8bddb6f1")}
        <select
          value={species}
          aria-label={t("m_1a8bddb6f1")}
          onChange={(e) => setSpecies(e.target.value as SpeciesId)}
        >
          {Object.values(SPECIES).map((s) => (
            <option key={s.id} value={s.id}>
              {displayText(s.name)}
            </option>
          ))}
        </select>
      </label>
      <h2>{displayText(SPECIES[species].name)}</h2>
      <em>{displayText(SPECIES[species].latin)}</em>
      <p>{displayText(SPECIES[species].identification)}</p>
      <details>
        <summary>{t("m_30e2626121")}</summary>
        <SpeciesPortrait species={species} />
      </details>
    </section>
  );
}
