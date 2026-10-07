import { SPECIES, type SpeciesId } from "./game";
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
  return (
    <span
      aria-hidden="true"
      className={`species-photo ${className}`}
      style={{
        backgroundPosition: `center ${id === "trout" ? "0%" : id === "carp" ? "50%" : "100%"}`,
      }}
    />
  );
}
