import { t, displayText } from "../i18n";
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
          <label htmlFor="journal-type">{t("m_32769cddb4")}</label>
          <select
            id="journal-type"
            value={type}
            onChange={(e) => setType(e.target.value as JournalType)}
          >
            <option value="all">{t("m_3a2305cd01")}</option>
            <option value="purchase">{t("m_5e373397fe")}</option>
            <option value="sale">{t("m_297c3eb2cf")}</option>
            <option value="warning">{t("m_1a9a292c78")}</option>
            <option value="info">{t("m_412be0b9cd")}</option>
            <option value="weekly">{t("m_29524fdb4f")}</option>
          </select>
        </div>
        <div>
          <label htmlFor="journal-pond">{t("m_677213497f")}</label>
          <select
            id="journal-pond"
            value={pond}
            onChange={(e) => setPond(e.target.value)}
          >
            <option value="all">{t("m_4e449b80eb")}</option>
            {game.ponds.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {displayText(p.name)}
              </option>
            ))}
            <option value="farm">{t("m_f3177afc4d")}</option>
          </select>
        </div>
      </div>
      <small>
        {count}{" "}
        {displayText(plural(count, t("m_f5c40e7d9e"), t("m_a0374a88dd")))}
        {" " + t("m_8a61427beb")}
      </small>
      {months.map((month) => (
        <section
          key={month.key}
          className="journal-month"
          aria-label={displayText(month.label)}
        >
          <h3>{displayText(month.label)}</h3>
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
                      {displayText(formatDate(log.day))}
                    </time>
                    <strong>
                      {displayText(
                        weekly
                          ? t("m_f6d1df4f88")
                          : journalSummary(formatEngineText(log.text)),
                      )}
                    </strong>
                  </span>
                  {weekly && history.length > 0 && (
                    <Sparkline
                      values={history.map((h) => h.money)}
                      label={displayText(
                        t(
                          "m_fa6721881b",
                          history.length,
                          plural(
                            history.length,
                            t("m_2327660f4e"),
                            t("m_ad322cd874"),
                          ),
                        ),
                      )}
                    />
                  )}
                </summary>
                <p>{displayText(formatEngineText(log.text))}</p>
                {weekly && (
                  <small>
                    {displayText(
                      history.length
                        ? t(
                            "m_125f7a7303",
                            history.length,
                            plural(
                              history.length,
                              t("m_2327660f4e"),
                              t("m_ad322cd874"),
                            ),
                          )
                        : t("m_5b23bcc95b"),
                    )}
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
          <p>{t("m_8cb5bb92de")}</p>
        </div>
      )}
    </div>
  );
}
