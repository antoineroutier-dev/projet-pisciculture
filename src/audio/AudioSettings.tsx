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
      <p>
        Le son démarre à votre premier geste et se suspend quand cet onglet est
        masqué.
      </p>
      {(
        [
          ["master", "Volume général"],
          ["music", "Musique"],
          ["ambience", "Ambiance"],
          ["effects", "Effets"],
          ["ui", "Interface"],
        ] as const
      ).map(([bus, label]) => (
        <Slider
          key={bus}
          label={label}
          value={volumes[bus]}
          min={0}
          max={100}
          step={5}
          unit=" %"
          onChange={(value) => change(bus, value)}
        />
      ))}
      <Button tone="secondary" onClick={() => play("celebrate")}>
        Écouter un exemple
      </Button>
      {typeof AudioContext === "undefined" && (
        <p role="status">Le son n’est pas disponible dans ce navigateur.</p>
      )}
    </div>
  );
}
