import { ArrowRight, CircleHelp } from "lucide-react";
import { number } from "../game";
import { BUYERS, type Buyer } from "../development";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import {
  formatMoney as euro,
  formatDate,
  formatEngineText,
} from "../ui/format";
import {
  COST_LABELS,
  costKeys,
  periodBalance,
  operatingBalance,
  type ReportData,
  type Cycle,
} from "../state/ledger";
import { cycleAdvice, cycleComparison } from "../state/cycleAdvice";
export function CycleDetails({ report }: { report: ReportData }) {
  const { period: p, previous, provisional, pending } = report,
    balance = periodBalance(p),
    comparison = cycleComparison(p, previous);
  return (
    <div className="cycle-details" data-testid="cycle-details">
      <p className="report-scope">
        {formatDate(p.startDay)} → {formatDate(p.endDay)} · Dépenses de toute la
        ferme entre règlements.
      </p>
      {provisional && pending > 0 && (
        <p className="report-callout">
          Les recettes attendues des lots au froid ({euro(pending / 100)}) ne
          sont pas encore encaissées.
        </p>
      )}
      {p.incomplete && (
        <p className="report-callout">
          <CircleHelp size={18} />
          Historique partiel : seules les opérations observées depuis l’import
          sont détaillées. Ce solde ne représente pas la marge complète du
          cycle.
        </p>
      )}
      <dl className="report-totals">
        <div>
          <dt>Recettes encaissées</dt>
          <dd data-report="income">{euro(p.income / 100, true)}</dd>
        </div>
        <div>
          <dt>
            {p.incomplete ? "Solde observé" : "Solde après investissements"}
          </dt>
          <dd data-report="balance">{euro(balance / 100, true)}</dd>
        </div>
        <div>
          <dt>Marge de trésorerie / kg payé</dt>
          <dd data-report="per-kg">
            {p.kg > 0 && !p.incomplete
              ? euro(balance / 100 / p.kg, true)
              : "Indisponible"}
          </dd>
        </div>
      </dl>
      <p>
        {p.costs.investment > 0
          ? `Les investissements de ${euro(p.costs.investment / 100)} servent plusieurs cycles. `
          : ""}
        Hors investissements identifiés :{" "}
        <strong>{euro(operatingBalance(p) / 100, true)}</strong>.{" "}
        {balance < 0 ? "Le déficit reste inclus dans ce bilan." : ""}
      </p>
      <p className="hint">
        {comparison === null
          ? "Comparaison par kg indisponible : deux périodes complètes et payées sont nécessaires."
          : `${comparison >= 0 ? "+" : ""}${euro(comparison, true)}/kg par rapport à la période précédente.`}
      </p>
      <details className="report-breakdown">
        <summary>Coûts par poste et règlements</summary>
        <table>
          <caption>Dépenses effectivement débitées · euros</caption>
          <tbody>
            {costKeys.map((key) => (
              <tr key={key}>
                <th scope="row">{COST_LABELS[key]}</th>
                <td data-cost={key}>{euro(p.costs[key] / 100, true)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">Aides et primes, hors recettes</th>
              <td>{euro(p.aid / 100, true)}</td>
            </tr>
          </tbody>
        </table>
        {"payments" in p &&
          (p as Cycle).payments.map((payment) => (
            <p key={payment.id}>
              Facture #{payment.id} ·{" "}
              {BUYERS[payment.buyer as Buyer]?.name ?? payment.buyer} ·{" "}
              {number(payment.kg, 1)} kg · {euro(payment.value / 100, true)}
            </p>
          ))}
        <p className="hint">
          Trésorerie de jeu, sans valorisation des stocks ni amortissement. Les
          coûts concernent l’exploitation entière ; ils ne sont pas attribués
          artificiellement à un bassin. Les dépenses historiques ou partielles
          sans ventilation du moteur restent « Non ventilé ».
        </p>
      </details>
      <details className="report-advice">
        <summary>Trois pistes pour la suite</summary>
        <ol>
          {cycleAdvice(p).map((advice, i) => (
            <li key={i}>{formatEngineText(advice)}</li>
          ))}
        </ol>
        <p className="hint">
          Mesures de production observées depuis le{" "}
          {formatDate(p.metricsStartDay)}.
        </p>
      </details>
    </div>
  );
}
export function CycleReport({
  report,
  close,
  finances,
}: {
  report: ReportData;
  close: () => void;
  finances: () => void;
}) {
  return (
    <Dialog
      className="cycle-dialog"
      title={
        report.provisional
          ? "Votre première récolte · bilan provisoire"
          : "Bilan du cycle payé"
      }
      close={close}
    >
      <section
        data-testid="event-card"
        data-event={`report:${report.period.endDay}`}
      >
        <CycleDetails report={report} />
        <div className="event-actions">
          <Button tone="secondary" onClick={finances}>
            Voir les finances
            <ArrowRight size={16} />
          </Button>
          <Button tone="primary" onClick={close}>
            Continuer
          </Button>
        </div>
      </section>
    </Dialog>
  );
}
