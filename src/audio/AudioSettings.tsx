import { t, displayText } from "../i18n";
import { Slider } from "../ui/Primitives";
import { Button } from "../ui/Button";
import type { Volumes, Sound } from "./mixer";
export function AudioSettings({
  volumes,
  change,
  play,
}: {
  volumes: Volumes;
  change: (bus: keyof Volumes, value: number) => void;
  play: (sound: Sound) => boolean;
}) {
  return (
    <div className="audio-settings">
      <p>{t("m_1eb3cbc109")}</p>
      {(
        [
          ["master", t("m_14e7a11f9b")],
          ["music", t("m_5ef9328572")],
          ["ambience", t("m_fc1215b56a")],
          ["effects", t("m_e5b006b786")],
          ["ui", t("m_c26b3ed4ce")],
        ] as const
      ).map(([bus, label]) => (
        <Slider
          key={bus}
          label={displayText(label)}
          value={volumes[bus]}
          min={0}
          max={100}
          step={5}
          unit=" %"
          onChange={(value) => change(bus, value)}
        />
      ))}
      <Button tone="secondary" onClick={() => play("celebrate")}>
        {t("m_b4e9866006")}
      </Button>
      {typeof AudioContext === "undefined" && (
        <p role="status">{t("m_bc112b64f0")}</p>
      )}
    </div>
  );
}
