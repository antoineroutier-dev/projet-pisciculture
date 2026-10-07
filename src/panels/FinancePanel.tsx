import { useState } from "react";
import { CashChart } from "../ui/CashChart";
import { Button } from "../ui/Button";
import { Tabs } from "../ui/Primitives";
import { Heart } from "lucide-react";
import { formatMoney as euro, formatDate } from "../ui/format";
import {
  number,
  dailyCost,
  costBreakdown,
  type Game,
  type Action,
} from "../game";
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
  { id: "cash", label: "Trésorerie" },
  { id: "forecast", label: "Prévision" },
  { id: "months", label: "Mois" },
  { id: "cycles", label: "Cycles" },
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
      <Tabs label="Finances" items={tabs} value={tab} onChange={setTab}>
        {tab === "cash" && (
          <>
            <CashChart game={game} />
            <div className="finance-row">
              <span>Règlements clients reçus</span>
              <strong>+{euro(game.stats.income)}</strong>
            </div>
            <div className="finance-row">
              <span>Dépenses cumulées</span>
              <strong>{euro(-game.stats.expenses)}</strong>
            </div>
            <div className="finance-row">
              <span>Volume vendu</span>
              <strong>{number(game.stats.soldKg, 1)} kg</strong>
            </div>
            <details>
              <summary>Charges quotidiennes · {euro(dailyCost(game))}</summary>
              {Object.entries({
                Travail: costBreakdown(game).labour,
                Électricité: costBreakdown(game).electricity,
                Eau: costBreakdown(game).water,
                Entretien: costBreakdown(game).maintenance,
              }).map(([key, value]) => (
                <div className="finance-row" key={key}>
                  <span>{key} / jour</span>
                  <strong>{euro(value, true)}</strong>
                </div>
              ))}
              <p className="hint">
                Les primes d’objectifs et aides s’ajoutent séparément des
                ventes.
              </p>
            </details>
            <div className="aid-card">
              <Heart size={18} />
              <h3>Un coup de pouce ?</h3>
              <p>
                Aide pédagogique fictive : 5 000 € et jusqu’à 100 kg d’aliments
                sous 1 000 € de trésorerie, une fois tous les 90 jours.
                Désactivée en mode expert.
              </p>
              <Button
                tone="secondary"
                disabledReason={
                  game.mode === "expert"
                    ? "Les aides pédagogiques sont désactivées en mode expert."
                    : game.money >= 1000
                      ? "L’aide est réservée aux trésoreries inférieures à 1 000 €."
                      : "Une aide ne peut être demandée que tous les 90 jours."
                }
                className="button outline full"
                onClick={() => perform({ type: "aid" })}
                disabled={
                  game.mode === "expert" ||
                  game.money >= 1000 ||
                  game.day - game.lastAidDay < 90
                }
              >
                Demander l’aide
              </Button>
              {game.day - game.lastAidDay < 90 && (
                <small>
                  Prochaine aide à partir du jour {game.lastAidDay + 90}
                </small>
              )}
            </div>
          </>
        )}
        {tab === "forecast" && (
          <>
            <CashChart game={game} projection={cashProjection(game)} />
            <p className="hint">
              Charges actuelles constantes : {euro(dailyCost(game), true)} /
              jour. Seules les factures déjà expédiées sont encaissées à leur
              échéance. Commandes et chantiers ont déjà été payés ; ils ne sont
              pas débités à nouveau.
            </p>
            <details>
              <summary>Lire cette prévision</summary>
              <p>
                Les prochains achats, variations d’énergie, recettes de contrats
                non expédiés et aides ne sont pas prévus. Une valeur négative
                indique un besoin de financement théorique, pas un crédit
                accordé par le jeu.
              </p>
            </details>
          </>
        )}
        {tab === "months" && (
          <div className="monthly-result">
            <p className="hint">
              Résultats de trésorerie observés, hors aides. Les investissements
              sont distingués des charges d’exploitation.
            </p>
            {ledger.months.length === 0 ? (
              <p>Aucun mouvement observé depuis cette ouverture.</p>
            ) : (
              [...ledger.months].reverse().map((month) => (
                <details key={month.month}>
                  <summary>
                    {new Intl.DateTimeFormat("fr-FR", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(`${month.month}-01T00:00:00Z`))}{" "}
                    · {euro(periodBalance(month) / 100)}
                    {month.month === monthKey(game.day) ? " · en cours" : ""}
                  </summary>
                  {month.incomplete && (
                    <p className="report-callout">
                      Mois partiel : les mouvements antérieurs à l’import ne
                      sont pas détaillés.
                    </p>
                  )}
                  <table>
                    <caption>
                      Du {formatDate(month.startDay)} au{" "}
                      {formatDate(month.endDay)}
                    </caption>
                    <tbody>
                      {[
                        ["Recettes clients", month.income],
                        [
                          "Charges hors investissements",
                          sumCosts(month.costs) - month.costs.investment,
                        ],
                        [
                          "Résultat d’exploitation encaissé",
                          operatingBalance(month),
                        ],
                        ["Investissements", month.costs.investment],
                        ["Solde après investissements", periodBalance(month)],
                        ["Aides et primes séparées", month.aid],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <th scope="row">{label}</th>
                          <td>{euro(Number(value) / 100, true)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              ))
            )}
            <p className="hint">
              Historique conservé : 120 mois maximum. Les anciennes sauvegardes
              ne contiennent pas de résultat mensuel ; aucun mois manquant n’est
              reconstitué.
            </p>
          </div>
        )}
        {tab === "cycles" && (
          <>
            <details className="finance-cycle">
              <summary>Période en cours</summary>
              <CycleDetails
                report={{
                  period: ledger.current,
                  previous: ledger.cycles.at(-1),
                  provisional: true,
                  pending: coldExpected(game),
                }}
              />
            </details>
            {ledger.cycles.length === 0 && (
              <p>
                Aucun règlement observé depuis cette ouverture. Le premier bilan
                apparaîtra au paiement client.
              </p>
            )}
            {[...ledger.cycles].reverse().map((cycle, i) => (
              <details key={cycle.id} className="finance-cycle">
                <summary>
                  Règlement #{cycle.id} · {formatDate(cycle.endDay)} ·{" "}
                  {euro(periodBalance(cycle) / 100)}
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
            <p className="hint">
              Les 24 derniers bilans sont conservés. Plusieurs factures payées
              le même jour partagent un bilan, avec leurs montants séparés dans
              le détail.
            </p>
          </>
        )}
      </Tabs>
    </aside>
  );
}
