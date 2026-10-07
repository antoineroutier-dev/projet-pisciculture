import { SPECIES, type SpeciesId } from "./game";
import { useId } from "react";

// The rows are not equal thirds. Curved boundaries separate the adjacent fins
// without stretching the artwork or showing another species at narrow widths.
const crops = {
  trout: { viewBox: "0 -12 1536 332", path: "M0 0H1536V310H1100L900 302L880 282L856 306L821 302L774 284L714 281L670 316H0Z" },
  carp: { viewBox: "0 284 1536 360", path: "M0 320H670L714 284L774 287L821 306L856 310L880 286L900 306L1100 313H1536V639H0Z" },
  tilapia: { viewBox: "0 638 1536 398", path: "M0 640H1536V1024H0Z" },
};
export function FishArt({
  color,
  className = "",
  species,
}: {
  color?: string;
  className?: string;
  species?: SpeciesId;
}) {
  const id =
    species ||
    Object.values(SPECIES).find((s) => s.color === color)?.id ||
    "trout";
  const clip = useId();
  return (
    <svg
      aria-hidden="true"
      className={`species-photo ${className}`}
      data-species={id}
      viewBox={crops[id].viewBox}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs><clipPath id={clip}><path d={crops[id].path} /></clipPath></defs>
      <image href={`${import.meta.env.BASE_URL}assets/species-atlas.png`} width="1536" height="1024" clipPath={`url(#${clip})`} />
    </svg>
  );
}
