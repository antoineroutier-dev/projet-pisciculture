import { number } from "../ui/format";
import { t, displayText, localeTag } from "../i18n";
import { useState } from "react";
import { CashChart } from "../ui/CashChart";
import { Button } from "../ui/Button";
import { Tabs } from "../ui/Primitives";
import { Heart } from "lucide-react";
import { formatMoney as euro, formatDate } from "../ui/format";
import { dailyCost, costBreakdown, type Game, type Action } from "../game";
import {
  cashProjection,
  monthKey,
  coldExpected,
  sumCosts,
  periodBalance,
  operatingBalance,
  type Ledger,
} from "../state/ledger";
import { CycleDetails } from "./CycleReport";
type Tab = "cash" | "forecast" | "months" | "cycles";
const tabs = [
  {
    id: "cash",
    get label() {
      return t("m_5a430676b9");
    },
  },
  {
    id: "forecast",
    get label() {
      return t("m_c21ca85318");
    },
  },
  {
    id: "months",
    get label() {
      return t("m_709ceef6d9");
    },
  },
  {
    id: "cycles",
    get label() {
      return t("m_864514a2f7");
    },
  },
] as const;
export function FinancePanel({
  game,
  ledger,
  perform,
}: {
  game: Game;
  ledger: Ledger;
  perform: (a: Action) => void;
}) {
  const [tab, setTab] = useState<Tab>("cash");
  return (
    <aside className="finance-card">
      <Tabs
        label={t("m_614e14f791")}
        items={tabs}
        value={tab}
        onChange={setTab}
      >
        {tab === "cash" && (
          <>
            <CashChart game={game} />
            <div className="finance-row">
              <span>{t("m_4a8e155721")}</span>
              <strong>+{displayText(euro(game.stats.income))}</strong>
            </div>
            <div className="finance-row">
              <span>{t("m_b38295dd1d")}</span>
              <strong>{displayText(euro(-game.stats.expenses))}</strong>
            </div>
            <div className="finance-row">
              <span>{t("m_47400a8458")}</span>
              <strong>
                {displayText(number(game.stats.soldKg, 1))}
                {" " + t("m_131ed73429")}
              </strong>
            </div>
            <details>
              <summary>
                {t("m_b222f79d9e") + " "}
                {displayText(euro(dailyCost(game)))}
              </summary>
              {Object.entries({
                Travail: costBreakdown(game).labour,
                Électricité: costBreakdown(game).electricity,
                Eau: costBreakdown(game).water,
                Entretien: costBreakdown(game).maintenance,
              }).map(([key, value]) => (
                <div className="finance-row" key={key}>
                  <span>
                    {displayText(key)}
                    {" " + t("m_94581a0c2d")}
                  </span>
                  <strong>{displayText(euro(value, true))}</strong>
                </div>
              ))}
              <p className="hint">{t("m_53bdc676fc")}</p>
            </details>
            <div className="aid-card">
              <Heart size={18} />
              <h3>{t("m_b844bcac31")}</h3>
              <p>{t("m_875bce04ad")}</p>
              <Button
                tone="secondary"
                disabledReason={displayText(
                  game.mode === "expert"
                    ? t("m_58757b68e2")
                    : game.money >= 1000
                      ? t("m_213899a677")
                      : t("m_60c126cfc1"),
                )}
                className="button outline full"
                onClick={() => perform({ type: "aid" })}
                disabled={
                  game.mode === "expert" ||
                  game.money >= 1000 ||
                  game.day - game.lastAidDay < 90
                }
              >
                {t("m_f9269dbac5")}
              </Button>
              {game.day - game.lastAidDay < 90 && (
                <small>
                  {t("m_abed1ac8d5") + " "}
                  {game.lastAidDay + 90}
                </small>
              )}
            </div>
          </>
        )}
        {tab === "forecast" && (
          <>
            <CashChart game={game} projection={cashProjection(game)} />
            <p className="hint">
              {t("m_f867d80721") + " "}
              {displayText(euro(dailyCost(game), true))}
              {" " + t("m_0da67256bf")}
            </p>
            <details>
              <summary>{t("m_5c4718ae51")}</summary>
              <p>{t("m_2e5e9e42de")}</p>
            </details>
          </>
        )}
        {tab === "months" && (
          <div className="monthly-result">
            <p className="hint">{t("m_4bcdcfa6eb")}</p>
            {ledger.months.length === 0 ? (
              <p>{t("m_cfbbf50b3a")}</p>
            ) : (
              [...ledger.months].reverse().map((month) => (
                <details key={month.month}>
                  <summary>
                    {displayText(
                      new Intl.DateTimeFormat(localeTag(), {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(new Date(`${month.month}-01T00:00:00Z`)),
                    )}
                    {displayText(" ")}·{" "}
                    {displayText(euro(periodBalance(month) / 100))}
                    {displayText(
                      month.month === monthKey(game.day)
                        ? " " + t("m_5b92e50fd4")
                        : "",
                    )}
                  </summary>
                  {month.incomplete && (
                    <p className="report-callout">{t("m_210930ef36")}</p>
                  )}
                  <table>
                    <caption>
                      {t("m_0b6722a8ad") + " "}
                      {displayText(formatDate(month.startDay))}
                      {" " + t("m_632cd2fea7")}
                      {displayText(" ")}
                      {displayText(formatDate(month.endDay))}
                    </caption>
                    <tbody>
                      {[
                        [t("m_e30da4f5b5"), month.income],
                        [
                          t("m_240223411f"),
                          sumCosts(month.costs) - month.costs.investment,
                        ],
                        [t("m_997bbe89bc"), operatingBalance(month)],
                        [t("m_42de4520dd"), month.costs.investment],
                        [t("m_9f7c9ce30f"), periodBalance(month)],
                        [t("m_12c85911e7"), month.aid],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <th scope="row">{displayText(label)}</th>
                          <td>
                            {displayText(euro(Number(value) / 100, true))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              ))
            )}
            <p className="hint">{t("m_08cb37ac19")}</p>
          </div>
        )}
        {tab === "cycles" && (
          <>
            <details className="finance-cycle">
              <summary>{t("m_79c19766d7")}</summary>
              <CycleDetails
                report={{
                  period: ledger.current,
                  previous: ledger.cycles.at(-1),
                  provisional: true,
                  pending: coldExpected(game),
                }}
              />
            </details>
            {ledger.cycles.length === 0 && <p>{t("m_15b3e4060a")}</p>}
            {[...ledger.cycles].reverse().map((cycle, i) => (
              <details key={cycle.id} className="finance-cycle">
                <summary>
                  {t("m_9358c94f58")}
                  {cycle.id} · {displayText(formatDate(cycle.endDay))} ·
                  {displayText(" ")}
                  {displayText(euro(periodBalance(cycle) / 100))}
                </summary>
                <CycleDetails
                  report={{
                    period: cycle,
                    previous: ledger.cycles[ledger.cycles.length - i - 2],
                    provisional: false,
                    pending: 0,
                  }}
                />
              </details>
            ))}
            <p className="hint">{t("m_9f7d9905e2")}</p>
          </>
        )}
      </Tabs>
    </aside>
  );
}
