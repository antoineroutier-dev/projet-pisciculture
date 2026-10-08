import { t, displayText, localeTag } from "../i18n";
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
    <section className="world-context" aria-label={t("m_76e9c5e57a")}>
      <header>
        {asset ? <Warehouse size={20} /> : <Truck size={20} />}
        <strong>
          {displayText(
            asset
              ? ASSETS[asset].name
              : target.kind === "truck"
                ? target.cargo === "cold"
                  ? t("m_16b6ed9c8e")
                  : target.cargo === "living"
                    ? t("m_79032f1395")
                    : t("m_cc6bdaa0ce")
                : "",
          )}
        </strong>
        <IconButton label={t("m_65119490ac")} onClick={close}>
          <X size={16} />
        </IconButton>
      </header>
      <p>
        {displayText(
          asset
            ? game.development.assets[asset]
              ? t("m_22134a6ad3")
              : work
                ? t("m_0afaf5c1a9", Math.max(0, work.due - game.day))
                : t("m_883db3c943")
            : target.kind === "truck"
              ? `${target.amount.toLocaleString(localeTag(), { maximumFractionDigits: 1 })} ${target.cargo === "living" ? t("m_45abdf76b9") : target.cargo === "feed" ? t("m_0156549a0f") : t("m_1fda7d74aa")}`
              : "",
        )}
      </p>
    </section>
  );
}
