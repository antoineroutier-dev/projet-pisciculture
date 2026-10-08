import { number } from "../ui/format";
import { t, displayText } from "../i18n";
import { ArrowRight, CircleHelp } from "lucide-react";
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
        {displayText(formatDate(p.startDay))} →{" "}
        {displayText(formatDate(p.endDay))}
        {" " + t("m_c29a033779")}
      </p>
      {provisional && pending > 0 && (
        <p className="report-callout">
          {t("m_f75725cd46")}
          {displayText(euro(pending / 100))}
          {t("m_4886d5a63e")}
        </p>
      )}
      {p.incomplete && (
        <p className="report-callout">
          <CircleHelp size={18} />
          {t("m_fdeabeee73")}
        </p>
      )}
      <dl className="report-totals">
        <div>
          <dt>{t("m_d8cee1b504")}</dt>
          <dd data-report="income">
            {displayText(euro(p.income / 100, true))}
          </dd>
        </div>
        <div>
          <dt>
            {displayText(p.incomplete ? t("m_2dd26bd79b") : t("m_9f7c9ce30f"))}
          </dt>
          <dd data-report="balance">
            {displayText(euro(balance / 100, true))}
          </dd>
        </div>
        <div>
          <dt>{t("m_8ce35ba03c")}</dt>
          <dd data-report="per-kg">
            {displayText(
              p.kg > 0 && !p.incomplete
                ? euro(balance / 100 / p.kg, true)
                : t("m_dae75cff3b"),
            )}
          </dd>
        </div>
      </dl>
      <p>
        {displayText(
          p.costs.investment > 0
            ? t("m_4c08fbae4d", euro(p.costs.investment / 100)) + " "
            : "",
        )}
        {t("m_3a32d30284")}
        {displayText(" ")}
        <strong>{displayText(euro(operatingBalance(p) / 100, true))}</strong>.
        {displayText(" ")}
        {displayText(balance < 0 ? t("m_f7ae495dda") : "")}
      </p>
      <p className="hint">
        {displayText(
          comparison === null
            ? t("m_5a83ff3432")
            : t(
                "m_6b0cac5cc9",
                comparison >= 0 ? "+" : "",
                euro(comparison, true),
              ),
        )}
      </p>
      <details className="report-breakdown">
        <summary>{t("m_d487a1283c")}</summary>
        <table>
          <caption>{t("m_fc710a4338")}</caption>
          <tbody>
            {costKeys.map((key) => (
              <tr key={key}>
                <th scope="row">{displayText(COST_LABELS[key])}</th>
                <td data-cost={key}>
                  {displayText(euro(p.costs[key] / 100, true))}
                </td>
              </tr>
            ))}
            <tr>
              <th scope="row">{t("m_9c74dedb36")}</th>
              <td>{displayText(euro(p.aid / 100, true))}</td>
            </tr>
          </tbody>
        </table>
        {"payments" in p &&
          (p as Cycle).payments.map((payment) => (
            <p key={payment.id}>
              {t("m_70203f0e71")}
              {payment.id} ·{displayText(" ")}
              {displayText(
                BUYERS[payment.buyer as Buyer]?.name ?? payment.buyer,
              )}{" "}
              ·{displayText(" ")}
              {displayText(number(payment.kg, 1))}
              {" " + t("m_3fb505e73c") + " "}
              {displayText(euro(payment.value / 100, true))}
            </p>
          ))}
        <p className="hint">{t("m_79d3f06a76")}</p>
      </details>
      <details className="report-advice">
        <summary>{t("m_734734d83a")}</summary>
        <ol>
          {cycleAdvice(p).map((advice, i) => (
            <li key={i}>{displayText(formatEngineText(advice))}</li>
          ))}
        </ol>
        <p className="hint">
          {t("m_cafe449a1a")}
          {displayText(" ")}
          {displayText(formatDate(p.metricsStartDay))}.
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
      title={displayText(
        report.provisional ? t("m_30cd044d38") : t("m_a747213ca3"),
      )}
      close={close}
    >
      <section
        data-testid="event-card"
        data-event={`report:${report.period.endDay}`}
      >
        <CycleDetails report={report} />
        <div className="event-actions">
          <Button tone="secondary" onClick={finances}>
            {t("m_2fc58c1af9")}
            <ArrowRight size={16} />
          </Button>
          <Button tone="primary" onClick={close}>
            {t("m_3bc3807f22")}
          </Button>
        </div>
      </section>
    </Dialog>
  );
}
