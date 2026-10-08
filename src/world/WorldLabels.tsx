import { t, displayText } from "../i18n";
import { Check, AlertTriangle, Construction } from "lucide-react";
import { pondStatus, SPECIES, type Pond } from "../game";
export function WorldLabels({
  ponds,
  select,
  selected,
  source,
}: {
  source?: () => void;
  selected: number | null;
  ponds: Pond[];
  select: (id: number) => void;
}) {
  return (
    <div className="world-labels" role="group" aria-label={t("m_02236fe79f")}>
      {source && (
        <button
          className="world-label"
          data-world-pond="0"
          data-world-source="true"
          style={{ visibility: "hidden" }}
          tabIndex={-1}
          aria-hidden="true"
          onClick={source}
          aria-label={t("source.action")}
        >
          <strong>{t("source.name")}</strong>
          <span>{t("m_e2c053ebd5")}</span>
        </button>
      )}
      {ponds.map((p) => {
        const status = pondStatus(p),
          ratio = p.species
            ? Math.min(1, p.weight / SPECIES[p.species].harvestWeight)
            : 0;
        const label = p.constructionDays
          ? t("m_e08b150453", p.constructionDays)
          : !p.built
            ? t("m_33c8c5c24c")
            : status.label;
        return (
          <button
            key={p.id}
            className="world-label"
            data-world-pond={p.id}
            aria-pressed={p.id === selected}
            data-tone={status.tone}
            style={{ visibility: "hidden" }}
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => select(p.id)}
            aria-label={displayText(
              `${p.name} · ${label}${p.count ? " " + t("m_5426c68842", Math.round(ratio * 100)) : ""}`,
            )}
          >
            <span className="world-label-heading">
              {!p.built ? (
                <Construction size={16} />
              ) : status.tone === "danger" || status.tone === "warning" ? (
                <AlertTriangle size={16} />
              ) : (
                <Check size={16} />
              )}
              <strong>{displayText(p.name)}</strong>
            </span>
            <span>{displayText(label)}</span>
            {p.count > 0 && (
              <span className="world-calibre">
                <svg
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" className="ring-track" />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    pathLength="100"
                    strokeDasharray={`${ratio * 100} 100`}
                    transform="rotate(-90 12 12)"
                  />
                </svg>
                {t("m_1aef9304a8") + " "}
                {Math.round(ratio * 100)} %
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
