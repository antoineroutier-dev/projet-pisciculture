import { t, displayText } from "../i18n";
import type { Game } from "../game";
import { cashHistory, cashDomain } from "../state/financeSelectors";
import { formatMoney, formatDate, plural } from "./format";
export function CashChart({
  game,
  projection,
}: {
  game: Game;
  projection?: {
    day: number;
    money: number;
  }[];
}) {
  const series = projection || cashHistory(game),
    { low, high } = cashDomain(series.map((h) => h.money));
  const first = series[0],
    last = series.at(-1)!;
  const points = series.map((h) => ({
    ...h,
    x: 4 + ((h.day - first.day) / Math.max(1, last.day - first.day)) * 292,
    y: 6 + ((high - h.money) / (high - low)) * 148,
  }));
  return (
    <div className="cash-chart-block">
      <figure
        className="cash-chart"
        aria-label={displayText(
          t(
            "m_27d5d0661b",
            formatMoney(first.money),
            formatDate(first.day),
            formatMoney(last.money),
            formatDate(last.day),
          ),
        )}
      >
        <figcaption>
          {displayText(projection ? t("m_f710c8a343") : t("m_d935c349d3"))}
        </figcaption>
        <div className="cash-plot">
          <div className="cash-y" aria-hidden="true">
            {[high, (low + high) / 2, low].map((v) => (
              <span key={v}>{displayText(formatMoney(v))}</span>
            ))}
          </div>
          <svg
            viewBox="0 0 300 160"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {[6, 80, 154].map((y) => (
              <path className="chart-grid" key={y} d={`M0 ${y}H300`} />
            ))}
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              vectorEffect="non-scaling-stroke"
            />
            {points.map((p) => (
              <circle key={p.day} cx={p.x} cy={p.y} r="2" />
            ))}
          </svg>
          <div className="cash-x" aria-hidden="true">
            <span>{displayText(formatDate(first.day))}</span>
            {last.day !== first.day && (
              <span>{displayText(formatDate(last.day))}</span>
            )}
          </div>
        </div>
      </figure>
      <details className="chart-data">
        <summary>
          {t("m_e687f8e807") + " "}
          {series.length}{" "}
          {displayText(
            plural(series.length, t("m_2327660f4e"), t("m_ad322cd874")),
          )}
        </summary>
        <table>
          <caption>
            {displayText(projection ? t("m_62f4c9ae4e") : t("m_54b40481c4"))}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t("m_99c40ab405")}</th>
              <th scope="col">{t("m_5a430676b9")}</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((h) => (
              <tr key={h.day}>
                <th scope="row">{displayText(formatDate(h.day))}</th>
                <td>{displayText(formatMoney(h.money))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
