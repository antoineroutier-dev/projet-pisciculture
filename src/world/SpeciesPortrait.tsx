import type { SpeciesId } from "../game";
import trout from "../assets/portraits/trout.webp";
import carp from "../assets/portraits/carp.webp";
import tilapia from "../assets/portraits/tilapia.webp";
const portraits = { trout, carp, tilapia };
/** Original model, also used by the world; the surrounding name supplies the accessible label. */
export function SpeciesPortrait({
  species,
  className = "",
}: {
  species: SpeciesId;
  className?: string;
}) {
  return (
    <img
      aria-hidden="true"
      alt=""
      className={`species-photo ${className}`}
      data-species={species}
      src={portraits[species]}
      width={640}
      height={300}
    />
  );
}
