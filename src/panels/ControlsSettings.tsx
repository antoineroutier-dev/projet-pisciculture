import { t, displayText } from "../i18n";
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
        label={t("m_f55edac610")}
        checked={p.controller}
        onChange={(controller) => change((p) => ({ ...p, controller }))}
        description={t("m_85eef45967")}
      />
      <p role="status">
        {displayText(
          gamepad.connected
            ? t("m_6253fef7df", gamepad.name)
            : t("m_0220945ab0"),
        )}
      </p>
      <p className="hint">{t("m_8d145d223d")}</p>
      <Slider
        label={t("m_c943f8166b")}
        value={p.sensitivity}
        min={25}
        max={200}
        step={5}
        unit=" %"
        onChange={(sensitivity) => change((p) => ({ ...p, sensitivity }))}
      />
      <h3>{t("m_6d0857349d")}</h3>
      <p className="hint">{t("m_4799ebbb12")}</p>
      {recording && (
        <div
          className="binding-record"
          tabIndex={0}
          ref={(e) => e?.focus()}
          role="group"
          aria-label={t("m_17e51249a6")}
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
            {displayText(
              CONTROL_ACTIONS.find((a) => a.id === recording)!.label,
            )}
          </strong>
          <p>{t("m_5d7648bfa4")}</p>
          <Button
            tone="secondary"
            onClick={() => {
              setError("");
              finish();
            }}
          >
            {t("m_f0c5d9e4b0")}
          </Button>
        </div>
      )}
      {displayText(error && <p role="alert">{displayText(error)}</p>)}
      <div className="binding-list">
        {CONTROL_ACTIONS.map((a) => (
          <div key={a.id}>
            <span>{displayText(a.label)}</span>
            <Button
              size="small"
              tone="secondary"
              aria-label={displayText(t("m_93b926290a", a.label))}
              onClick={(e) => {
                opener.current = e.currentTarget;
                setError("");
                setRecording(a.id);
              }}
            >
              <kbd>{displayText(bindingLabel(p.bindings[a.id]))}</kbd>
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
        {t("m_fde7c9d66b")}
      </Button>
    </div>
  );
}
