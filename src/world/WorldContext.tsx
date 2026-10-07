import { X, Warehouse, Truck } from "lucide-react";
import { ASSETS } from "../development";
import type { Game } from "../game";
import type { WorldTarget } from "./selection";
import { IconButton } from "../ui/Primitives";
export function WorldContext({
  target,
  game,
  close,
}: {
  target: WorldTarget;
  game: Game;
  close: () => void;
}) {
  if (target.kind === "pond") return null;
  const asset = target.kind === "asset" ? target.id : null;
  const work = asset
    ? game.development.works.find((w) => w.asset === asset)
    : null;
  return (
    <section className="world-context" aria-label="Élément sélectionné">
      <header>
        {asset ? <Warehouse size={20} /> : <Truck size={20} />}
        <strong>
          {asset
            ? ASSETS[asset].name
            : target.kind === "truck"
              ? target.cargo === "cold"
                ? "Transport frigorifique"
                : target.cargo === "living"
                  ? "Transport de poissons vivants"
                  : "Livraison d’aliments"
              : ""}
        </strong>
        <IconButton label="Fermer le détail de l’élément" onClick={close}>
          <X size={16} />
        </IconButton>
      </header>
      <p>
        {asset
          ? game.development.assets[asset]
            ? "En service"
            : work
              ? `Travaux · ${Math.max(0, work.due - game.day)} j restants`
              : "À construire"
          : target.kind === "truck"
            ? `${target.amount.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${target.cargo === "living" ? "poissons reçus" : target.cargo === "feed" ? "kg reçus" : "kg confiés au transporteur"}`
            : ""}
      </p>
    </section>
  );
}
