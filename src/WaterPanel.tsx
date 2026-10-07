import {
  Activity,
  Droplets,
  Thermometer,
  Wind,
  SlidersHorizontal,
  Info,
  Check,
  TriangleAlert,
} from "lucide-react";
import {
  density,
  feedNeeded,
  number,
  pondAmmonia,
  SPECIES,
  facilityName,
  type Pond,
  type Action,
} from "./game";
export default function WaterPanel({
  pond: p,
  perform,
}: {
  pond: Pond;
  perform: (a: Action) => void;
}) {
  const s = p.species ? SPECIES[p.species] : null;
  const nh3 = pondAmmonia(p);
  const ranges =
    p.facility === "earth"
      ? [0, 0.05, 0.08, 0.1, 0.25, 0.5]
      : p.facility === "ras"
        ? [0, 0.01, 0.03, 0.05, 0.1, 0.2, 0.3]
        : [0, 1, 3, 5, 8, 10, 12];
  return (
    <div className="water-panel">
      <div className="technical-heading">
        <SlidersHorizontal size={14} />
        <span>LA CONDUITE DU BASSIN</span>
      </div>
      <dl className="water-grid">
        <div>
          <dt>
            <Thermometer size={14} /> Eau
          </dt>
          <dd>
            {number(p.temperature, 1)} <small>°C</small>
          </dd>
          <dd className="metric-hint">
            {s ? `${s.temperature.join("–")} °C préférés` : facilityName(p)}
          </dd>
        </div>
        <div className={s && p.oxygen < s.minOxygen ? "water-alert" : ""}>
          <dt>
            <Wind size={14} /> Oxygène
          </dt>
          <dd>
            {number(p.oxygen, 1)} <small>mg/L</small>
          </dd>
          <dd className="metric-hint">
            {s ? `Repère ≥ ${s.minOxygen} mg/L` : "Concentration dissoute"}
          </dd>
        </div>
        <div className={s && nh3 > s.ammoniaLimit ? "water-alert" : ""}>
          <dt>
            <Droplets size={14} /> NH₃-N
          </dt>
          <dd>
            {number(nh3, 4)} <small>mg/L</small>
          </dd>
          <dd className="metric-hint">
            {s ? `Alerte > ${s.ammoniaLimit} mg/L` : "Ammoniac non ionisé"}
          </dd>
        </div>
        <div>
          <dt>
            <Activity size={14} /> pH
          </dt>
          <dd>{number(p.pH, 1)}</dd>
          <dd className="metric-hint">TAN : {number(p.tan, 3)} mg N/L</dd>
        </div>
      </dl>
      <div className="density-line">
        <span>Densité d’élevage</span>
        <strong>
          {number(density(p), 2)} / {p.maxDensity} kg/m³
        </strong>
      </div>
      <div className="technical-track">
        <span
          style={{
            width: `${Math.min(100, (density(p) / p.maxDensity) * 100)}%`,
          }}
        />
      </div>
      <div className="husbandry-fields">
        <label>
          Débit d’eau neuve
          <select
            aria-label="Débit d’eau neuve"
            value={p.flow}
            onChange={(e) =>
              perform({
                type: "flow",
                pondId: p.id,
                value: Number(e.target.value),
              })
            }
          >
            {[...new Set([...ranges, p.flow])]
              .sort((a, b) => a - b)
              .map((v) => (
                <option key={v} value={v}>
                  {number(v, 2)} L/s
                </option>
              ))}
          </select>
        </label>
        <label>
          Ration cible
          <select
            aria-label="Ration cible"
            value={p.rationMultiplier}
            onChange={(e) =>
              perform({
                type: "ration",
                pondId: p.id,
                value: Number(e.target.value),
              })
            }
          >
            {[0.5, 0.75, 1, 1.25, 1.5].map((v) => (
              <option key={v} value={v}>
                {v * 100} % {v === 1 ? "· recommandée" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      {p.count > 0 && (
        <>
          <div className="feeder-control">
            <span>
              <strong>Distribution automatique</strong>
              <small>
                {number(feedNeeded(p), 2)} kg prévus / jour, selon l’eau
              </small>
            </span>
            <button
              role="switch"
              aria-label="Distribution automatique"
              aria-checked={p.autoFeed}
              onClick={() =>
                perform({
                  type: "autoFeed",
                  pondId: p.id,
                  enabled: !p.autoFeed,
                })
              }
            >
              <span />
            </button>
          </div>
          <div className="husbandry-summary">
            <span>
              Lot suivi depuis <b>{p.age} jours</b>
            </span>
            <span>
              Indice de santé <b>{number(p.health)} / 100</b>
            </span>
            <span>
              Aliment hier <b>{number(p.lastFeed, 2)} kg</b>
            </span>
            <span>
              FCR constaté{" "}
              <b>
                {p.totalGain > 0.001
                  ? number(p.totalFeed / p.totalGain, 2)
                  : "—"}
              </b>
            </span>
          </div>
        </>
      )}
      {p.upgrade >= 2 && p.filterAge < 30 && (
        <p className="technical-notice">
          <Info size={14} /> Biofiltre en maturation : {p.filterAge}/30 jours.
          Montez la charge progressivement.
        </p>
      )}
      {p.quarantineDays > 0 && (
        <p className="technical-notice">
          <Info size={14} /> Lot en observation : encore {p.quarantineDays}{" "}
          jours avant commercialisation.
        </p>
      )}
      {p.fallowDays > 0 && (
        <p className="technical-notice">
          <Info size={14} /> Nettoyage et vide sanitaire : encore {p.fallowDays}{" "}
          jours avant réempoissonnement.
        </p>
      )}
      {s && (p.oxygen < s.minOxygen || nh3 > s.ammoniaLimit) && (
        <p className="technical-notice urgent">
          <TriangleAlert size={15} /> Réduisez la ration, vérifiez le débit et
          l’aération. Une exposition prolongée peut provoquer des pertes.
        </p>
      )}
      {p.feedToday > 0 && (
        <p className="technical-notice">
          <Check size={14} /> {number(p.feedToday, 2)} kg réservés dans le
          distributeur pour les prochaines 24 h.
        </p>
      )}
    </div>
  );
}
