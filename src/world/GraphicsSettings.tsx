import { t, displayText } from "../i18n";
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
        {t("m_90f7272b4b")}
        <select
          aria-label={t("m_90f7272b4b")}
          value={value.quality}
          onChange={(e) =>
            change({ ...value, quality: e.target.value as Quality | "auto" })
          }
        >
          <option value="auto">
            {t("m_89bd8db002")}
            {displayText(actual ? ` · ${QUALITY[actual].label}` : "")}
          </option>
          {Object.entries(QUALITY).map(([id, q]) => (
            <option key={id} value={id}>
              {displayText(q.label)}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">{t("m_ca62d6006c")}</p>
      <Toggle
        label={t("m_3c88d23226")}
        checked={value.labels}
        onChange={(labels) => change({ ...value, labels })}
      />
    </>
  );
}
