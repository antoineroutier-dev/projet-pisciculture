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
      setNotice("Le plein écran est indisponible dans ce navigateur.");
    }
  }
  return (
    <div
      className="world-controls"
      data-mobile-hidden={hiddenOnMobile}
      aria-label="Caméra"
    >
      <label>
        <span className="sr-only">Vue du terrain</span>
        <select
          aria-label="Vue du terrain"
          value={mode}
          onChange={(e) => changeMode(e.target.value as SceneMode)}
        >
          <option value="farm">La ferme</option>
          <option value="pond">Le bassin</option>
          <option value="fish">Les poissons</option>
          <option value="buildings">Bâtiments</option>
        </select>
      </label>
      <IconButton
        label="Réinitialiser la caméra"
        onClick={reset}
        title="Réinitialiser la caméra"
      >
        <RotateCcw size={18} />
      </IconButton>
      <IconButton
        label="Vue plein écran"
        onClick={() => void fullscreen()}
        title="Plein écran"
      >
        <Maximize2 size={18} />
      </IconButton>
      <Button
        tone="secondary"
        size="small"
        disabledReason="Introduisez un lot pour observer sous l’eau."
        aria-label="Observer sous l’eau"
        aria-pressed={clearWater}
        disabled={!canObserve}
        onClick={underwater}
        title={
          canObserve
            ? "Observer sous l’eau"
            : "Introduisez un lot pour observer sous l’eau"
        }
      >
        <Eye size={18} />
      </Button>
      <details className="camera-tools">
        <summary
          title={`Rotation ${bindingLabel(bindings.left)}/${bindingLabel(bindings.right)} · Zoom ${bindingLabel(bindings.zoomIn)}/${bindingLabel(bindings.zoomOut)} · Recentrer ${bindingLabel(bindings.reset)}`}
        >
          Caméra
        </summary>
        <div className="camera-more">
          <IconButton
            label={`Tourner à gauche · ${bindingLabel(bindings.left)}`}
            onClick={() => moveCamera({ kind: "rotate", amount: -Math.PI / 8 })}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton
            label={`Tourner à droite · ${bindingLabel(bindings.right)}`}
            onClick={() => moveCamera({ kind: "rotate", amount: Math.PI / 8 })}
          >
            <ChevronRight size={18} />
          </IconButton>
          <IconButton
            label={`Rapprocher · ${bindingLabel(bindings.zoomIn)}`}
            onClick={() => moveCamera({ kind: "zoom", amount: -0.18 })}
          >
            <Plus size={18} />
          </IconButton>
          <IconButton
            label={`Éloigner · ${bindingLabel(bindings.zoomOut)}`}
            onClick={() => moveCamera({ kind: "zoom", amount: 0.18 })}
          >
            <Minus size={18} />
          </IconButton>
        </div>
      </details>
      {notice && <p role="status">{notice}</p>}
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
    <section className="fish-inspector" aria-label="Observer les poissons">
      <label>
        Espèce à observer
        <select
          value={species}
          aria-label="Espèce à observer"
          onChange={(e) => setSpecies(e.target.value as SpeciesId)}
        >
          {Object.values(SPECIES).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <h2>{SPECIES[species].name}</h2>
      <em>{SPECIES[species].latin}</em>
      <p>{SPECIES[species].identification}</p>
      <details>
        <summary>Planche d’identification</summary>
        <SpeciesPortrait species={species} />
      </details>
    </section>
  );
}
