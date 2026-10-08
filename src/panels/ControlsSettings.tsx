import { useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Slider, Toggle } from "../ui/Primitives";
import {
  CONTROL_ACTIONS,
  DEFAULT_BINDINGS,
  bindingError,
  bindingFromEvent,
  bindingLabel,
  type ControlAction,
} from "../controls/bindings";
import type { Runtime } from "../state/runtime";
export function ControlsSettings({ runtime }: { runtime: Runtime }) {
  const { preferences: p, setPreferences: change, gamepad } = runtime;
  const [recording, setRecording] = useState<ControlAction | null>(null),
    [error, setError] = useState("");
  const opener = useRef<HTMLButtonElement | null>(null);
  const finish = () => {
    setRecording(null);
    queueMicrotask(() => opener.current?.focus());
  };
  return (
    <div className="controls-settings">
      <Toggle
        label="Manette"
        checked={p.controller}
        onChange={(controller) => change((p) => ({ ...p, controller }))}
        description="A : activer · B : retour · Start : pause. Croix : naviguer ou régler · LB/RB : changer de zone."
      />
      <p role="status">
        {gamepad.connected
          ? `Manette connectée : ${gamepad.name}`
          : "Aucune manette standard détectée. Appuyez sur un bouton de votre manette pour la connecter."}
      </p>
      <p className="hint">
        Stick gauche : déplacer la caméra · stick droit : tourner · gâchettes :
        zoomer. Le son et le plein écran peuvent demander un premier clic ou une
        touche du clavier, selon le navigateur.
      </p>
      <Slider
        label="Sensibilité de caméra"
        value={p.sensitivity}
        min={25}
        max={200}
        step={5}
        unit=" %"
        onChange={(sensitivity) => change((p) => ({ ...p, sensitivity }))}
      />
      <h3>Raccourcis clavier</h3>
      <p className="hint">
        Échap ferme un panneau ou ouvre le menu pause. Tab et les flèches
        conservent leur rôle dans les menus. Les raccourcis sont suspendus
        pendant la saisie.
      </p>
      {recording && (
        <div
          className="binding-record"
          tabIndex={0}
          ref={(e) => e?.focus()}
          role="group"
          aria-label="Enregistrer un raccourci"
          onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.key === "Escape") {
              setError("");
              finish();
              return;
            }
            const key = bindingFromEvent(e.nativeEvent),
              message = bindingError(p.bindings, recording, key || "");
            if (message) {
              setError(message);
              return;
            }
            change((p) => ({
              ...p,
              bindings: { ...p.bindings, [recording]: key! },
            }));
            setError("");
            finish();
          }}
        >
          <strong>
            {CONTROL_ACTIONS.find((a) => a.id === recording)!.label}
          </strong>
          <p>Appuyez sur le nouveau raccourci. Échap annule.</p>
          <Button
            tone="secondary"
            onClick={() => {
              setError("");
              finish();
            }}
          >
            Annuler la réassignation
          </Button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="binding-list">
        {CONTROL_ACTIONS.map((a) => (
          <div key={a.id}>
            <span>{a.label}</span>
            <Button
              size="small"
              tone="secondary"
              aria-label={`Réassigner : ${a.label}`}
              onClick={(e) => {
                opener.current = e.currentTarget;
                setError("");
                setRecording(a.id);
              }}
            >
              <kbd>{bindingLabel(p.bindings[a.id])}</kbd>
            </Button>
          </div>
        ))}
      </div>
      <Button
        tone="secondary"
        onClick={() => {
          change((p) => ({ ...p, bindings: { ...DEFAULT_BINDINGS } }));
          setError("");
          setRecording(null);
        }}
      >
        Rétablir les raccourcis
      </Button>
    </div>
  );
}
