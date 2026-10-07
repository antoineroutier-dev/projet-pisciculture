import { QUALITY, type Graphics, type Quality } from "./quality";
import { Toggle } from "../ui/Primitives";
export function GraphicsSettings({
  value,
  change,
  actual,
}: {
  actual: Quality | null;
  value: Graphics;
  change: (v: Graphics) => void;
}) {
  return (
    <>
      <label className="field-label">
        Qualité graphique
        <select
          aria-label="Qualité graphique"
          value={value.quality}
          onChange={(e) =>
            change({ ...value, quality: e.target.value as Quality | "auto" })
          }
        >
          <option value="auto">
            Automatique{actual ? ` · ${QUALITY[actual].label}` : ""}
          </option>
          {Object.entries(QUALITY).map(([id, q]) => (
            <option key={id} value={id}>
              {q.label}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">
        Bas réduit les ombres et la végétation. Élevé et Ultra ajoutent le
        lissage de l’image ; Ultra affine aussi ses bords et sa lumière.
      </p>
      <Toggle
        label="Étiquettes dans le monde"
        checked={value.labels}
        onChange={(labels) => change({ ...value, labels })}
      />
    </>
  );
}
