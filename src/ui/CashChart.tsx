import type { Game } from "../game";
import { cashHistory, cashDomain } from "../state/financeSelectors";
import { formatMoney, formatDate, plural } from "./format";
export function CashChart({ game }: { game: Game }) {
  const series = cashHistory(game),
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
        aria-label={`Trésorerie : ${formatMoney(first.money)} le ${formatDate(first.day)}, ${formatMoney(last.money)} le ${formatDate(last.day)}`}
      >
        <figcaption>Trésorerie · euros</figcaption>
        <div className="cash-plot">
          <div className="cash-y" aria-hidden="true">
            {[high, (low + high) / 2, low].map((v) => (
              <span key={v}>{formatMoney(v)}</span>
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
            <span>{formatDate(first.day)}</span>
            {last.day !== first.day && <span>{formatDate(last.day)}</span>}
          </div>
        </div>
      </figure>
      <details className="chart-data">
        <summary>
          Voir les {series.length} {plural(series.length, "relevé")}
        </summary>
        <table>
          <caption>
            Relevés disponibles · dernière valeur actualisée après vos actions
          </caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Trésorerie</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((h) => (
              <tr key={h.day}>
                <th scope="row">{formatDate(h.day)}</th>
                <td>{formatMoney(h.money)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
