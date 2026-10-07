import { useState } from "react";
import {
  BookOpen,
  AlertTriangle,
  Leaf,
  ShoppingBasket,
  TrendingUp,
} from "lucide-react";
import type { Game } from "../game";
import {
  journalMonths,
  journalSummary,
  type JournalType,
} from "../state/journalSelectors";
import { formatDate, formatEngineText, plural } from "../ui/format";
import { Sparkline } from "../ui/Primitives";
export function JournalPanel({ game }: { game: Game }) {
  const [type, setType] = useState<JournalType>("all"),
    [pond, setPond] = useState("all");
  const months = journalMonths(game, type, pond),
    count = months.reduce((n, m) => n + m.entries.length, 0);
  return (
    <div className="journal-panel">
      <div className="journal-controls">
        <div>
          <label htmlFor="journal-type">Type d’événement</label>
          <select
            id="journal-type"
            value={type}
            onChange={(e) => setType(e.target.value as JournalType)}
          >
            <option value="all">Tous les événements</option>
            <option value="purchase">Achats et travaux</option>
            <option value="sale">Ventes et objectifs</option>
            <option value="warning">À surveiller</option>
            <option value="info">Informations</option>
            <option value="weekly">Bilans hebdomadaires</option>
          </select>
        </div>
        <div>
          <label htmlFor="journal-pond">Bassin du journal</label>
          <select
            id="journal-pond"
            value={pond}
            onChange={(e) => setPond(e.target.value)}
          >
            <option value="all">Toute l’exploitation</option>
            {game.ponds.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
            <option value="farm">Sans bassin identifié</option>
          </select>
        </div>
      </div>
      <small>
        {count} {plural(count, "événement")} · les 120 plus récents sont
        conservés.
      </small>
      {months.map((month) => (
        <section
          key={month.key}
          className="journal-month"
          aria-label={month.label}
        >
          <h3>{month.label}</h3>
          {month.entries.map(({ id, log, pondIds, weekly, history }) => {
            const Icon =
              log.kind === "warning"
                ? AlertTriangle
                : log.kind === "purchase"
                  ? ShoppingBasket
                  : log.kind === "sale"
                    ? TrendingUp
                    : Leaf;
            return (
              <details
                key={id}
                className={`journal-entry journal-event ${weekly ? "weekly-entry" : ""}`}
                data-ponds={pondIds.join(",")}
              >
                <summary>
                  <Icon size={18} aria-hidden="true" />
                  <span>
                    <time
                      dateTime={new Date(Date.UTC(2026, 3, log.day))
                        .toISOString()
                        .slice(0, 10)}
                    >
                      {formatDate(log.day)}
                    </time>
                    <strong>
                      {weekly
                        ? "Bilan de la semaine"
                        : journalSummary(formatEngineText(log.text))}
                    </strong>
                  </span>
                  {weekly && history.length > 0 && (
                    <Sparkline
                      values={history.map((h) => h.money)}
                      label={`Trésorerie : ${history.length} ${plural(history.length, "relevé")}`}
                    />
                  )}
                </summary>
                <p>{formatEngineText(log.text)}</p>
                {weekly && (
                  <small>
                    {history.length
                      ? `${history.length} ${plural(history.length, "relevé")} de trésorerie sur cette semaine.`
                      : "Les relevés de trésorerie de cette semaine ne sont plus disponibles."}
                  </small>
                )}
              </details>
            );
          })}
        </section>
      ))}
      {!count && (
        <div className="journal-empty">
          <BookOpen size={28} />
          <p>Aucun événement pour ces filtres.</p>
        </div>
      )}
    </div>
  );
}
