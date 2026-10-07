import { Droplets, Package, Wind, Check, AlertTriangle } from "lucide-react";
import {
  biomass,
  cleaningCost,
  feedNeeded,
  harvestReady,
  number,
  pondStatus,
  SPECIES,
  UPGRADE_COST,
  type Game,
  type Pond,
  type Action,
} from "../game";
import { BUYERS } from "../development";
import {SpeciesPortrait} from "../world/SpeciesPortrait";
import { Button } from "../ui/Button";
import { ScientificHelp } from "../ui/ScientificHelp";
import { Tooltip } from "../ui/Tooltip";
import {
  Badge,
  Card,
  CountdownChip,
  Gauge,
  Sparkline,
  Tabs,
  Toggle,
} from "../ui/Primitives";
import { formatEngineText, formatMoney, plural } from "../ui/format";
import {
  availability,
  expectedHarvestDays,
  pondVitals,
  type PondReading,
} from "../state/pondSelectors";
import type { PanelId } from "../state/navigation";
import { ConstructionCard } from "./ConstructionPanel";
export function VitalSummary({ pond }: { pond: Pond }) {
  return (
    <div
      className="vital-summary"
      aria-label="Mesures vitales toujours visibles"
    >
      {pondVitals(pond).map((v) => (
        <Tooltip
          key={v.key}
          text={`${v.label} : ${v.state}. ${v.threshold}. ${v.help}`}
        >
          {(id) => (
            <button
              data-vital={v.key}
              className={`tone-${v.tone}`}
              aria-label={`${v.label} : ${number(v.value, v.digits)} ${v.unit} · ${v.state}`}
              aria-describedby={id}
            >
              <span>
                {
                  {
                    temperature: "Temp.",
                    oxygen: "O₂",
                    ammonia: "NH₃-N",
                    density: "Densité",
                  }[v.key]
                }
              </span>
              <strong>{number(v.value, v.digits)}</strong>
              <small>{v.unit}</small>
              <span className="vital-state">
                {v.tone === "success" ? (
                  <Check size={12} />
                ) : (
                  <AlertTriangle size={12} />
                )}{" "}
                {v.tone === "warning" ? "À suivre" : v.state}
              </span>
            </button>
          )}
        </Tooltip>
      ))}
    </div>
  );
}
export type PondTab = "water" | "feed" | "equipment" | "history";
export function PondInspector({
  game,
  pond: p,
  perform,
  stock,
  upgrade,
  navigate,
  select,
  tab,
  setTab,
  readings,
}: {
  game: Game;
  pond: Pond;
  perform: (a: Action) => void;
  stock: () => void;
  upgrade: () => void;
  navigate: (id: PanelId) => void;
  select: (id: number) => void;
  tab: PondTab;
  setTab: (tab: PondTab) => void;
  readings: PondReading[];
}) {
  const s = p.species ? SPECIES[p.species] : null,
    status = pondStatus(p),
    days = expectedHarvestDays(p);
  const contract = game.development.contracts.find((c) => c.pondId === p.id);
  const batch =
    contract &&
    game.development.batches.find((b) => b.contractId === contract.id);
  const incoming = game.development.orders.find((o) => o.pondId === p.id);
  let primary: { label: string; action?: Action; open?: () => void } | null =
    null;
  if (p.built) {
    if (batch)
      primary = {
        label:
          BUYERS[contract!.buyer].processed && !batch.processed
            ? "Préparer le lot"
            : "Expédier le lot",
        action: {
          type:
            BUYERS[contract!.buyer].processed && !batch.processed
              ? "process"
              : "dispatch",
          id: batch.id,
        },
      };
    else if (!p.count && !incoming && !p.fallowDays)
      primary = { label: "Commander des juvéniles", open: stock };
    else if (p.count && !p.autoFeed)
      primary = {
        label: "Activer la distribution",
        action: { type: "autoFeed", pondId: p.id, enabled: true },
      };
    else if (contract && harvestReady(p))
      primary = {
        label: `Récolter ${p.name}`,
        action: { type: "harvest", pondId: p.id },
      };
    else if (s && !contract && p.weight >= s.harvestWeight * 0.8)
      primary = {
        label: "Réserver un client",
        open: () => navigate("logistics"),
      };
  }
  const guard = primary?.action
    ? availability(game, primary.action)
    : { disabled: false, reason: "" };
  return (
    <section
      className="pond-inspector"
      aria-label="Gestion du bassin sélectionné"
    >
      <label className="pond-selector">
        Bassin sélectionné
        <select
          aria-label="Bassin sélectionné"
          value={p.id}
          onChange={(e) => select(Number(e.target.value))}
        >
          {game.ponds.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {pondStatus(p).label}
            </option>
          ))}
        </select>
      </label>
      {!p.built ? (
        <ConstructionCard
          game={game}
          pond={p}
          perform={perform}
          inspect={() => navigate("ponds")}
        />
      ) : (
        <>
          <header className="inspector-title">
            <div>
              <h3>{p.name}</h3>
              <Badge
                tone={
                  status.tone === "danger"
                    ? "danger"
                    : status.tone === "warning"
                      ? "warning"
                      : status.tone === "good" || status.tone === "harvest"
                        ? "success"
                        : "neutral"
                }
              >
                {status.label}
              </Badge>
            </div>
            {s && <SpeciesPortrait species={s.id} />}
          </header>
          {s && (
            <>
              <p className="inspector-species">{s.name}</p>
              <div className="pond-numbers">
                <div>
                  <strong>{number(p.count)}</strong>
                  <span>poissons</span>
                </div>
                <div>
                  <strong>
                    {number(p.weight * 1000)} <small>g</small>
                  </strong>
                  <span>poids moyen</span>
                </div>
                <div>
                  <strong>
                    {number(biomass(p), 1)} <small>kg</small>
                  </strong>
                  <span>biomasse</span>
                </div>
              </div>
            </>
          )}
          <div
            className="water-grid inspector-vitals"
            aria-label="Mesures vitales du bassin"
          >
            {pondVitals(p).map((v) => (
              <div key={v.key} data-vital-detail={v.key}>
                <div className="vital-label">
                  <strong>{v.label}</strong>
                  <Tooltip text={v.help}>
                    {(id) => (
                      <button
                        className="vital-help"
                        aria-label={`Comprendre : ${v.label}`}
                        aria-describedby={id}
                      >
                        ?
                      </button>
                    )}
                  </Tooltip>
                </div>
                <Gauge
                  value={v.value}
                  max={v.max}
                  label={v.label}
                  tone={v.tone}
                  caption={v.state}
                />
                <small>{v.threshold}</small>
                <Sparkline
                  values={readings.map((r) => r[v.key])}
                  positions={readings.map((r) => r.day)}
                  domain={[Math.max(1, game.day - 13), game.day]}
                  label={`${v.label} : ${readings.length} ${plural(readings.length, "relevé")} ${plural(readings.length, "observé")} sur les 14 derniers jours`}
                />
              </div>
            ))}
          </div>
          <small className="readings-note">
            {readings.length} relevé{readings.length > 1 ? "s" : ""} en mémoire
            · 14 derniers jours · réinitialisés au chargement.
          </small>
          {primary && (
            <Button
              className="full inspector-primary"
              data-testid="pond-action"
              disabled={guard.disabled}
              disabledReason={formatEngineText(guard.reason)}
              onClick={() =>
                primary.action ? perform(primary.action) : primary.open?.()
              }
            >
              {primary.label}
            </Button>
          )}
          {incoming && (
            <CountdownChip
              label="Juvéniles attendus"
              days={incoming.due - game.day}
            />
          )}
          {p.fallowDays > 0 && (
            <CountdownChip label="Fin du vide sanitaire" days={p.fallowDays} />
          )}
          {s && (
            <Gauge
              circular
              label="Calibre commercial"
              value={p.weight}
              max={s.harvestWeight}
              caption={`${Math.min(100, Math.floor((p.weight / s.harvestWeight) * 100))} % · ${days === null ? "estimation indisponible" : days === 0 ? "calibre atteint" : `environ ${days} jours au rythme d’hier`}`}
              tone={harvestReady(p) ? "success" : "warning"}
            />
          )}
          <Tabs
            label="Détails du bassin"
            items={[
              { id: "water", label: "Eau" },
              { id: "feed", label: "Alimentation" },
              { id: "equipment", label: "Équipement" },
              { id: "history", label: "Historique" },
            ]}
            value={tab}
            onChange={setTab}
          >
            {tab === "water" && (
              <WaterSettings pond={p} perform={perform} game={game} />
            )}
            {tab === "feed" && (
              <FeedingSettings pond={p} perform={perform} game={game} />
            )}
            {tab === "equipment" && (
              <div className="equipment-cards">
                {[0, 1].map((level) => {
                  const done = p.upgrade > level;
                  return (
                    <Card key={level}>
                      <h3>
                        {level === 0 ? (
                          <Wind size={18} />
                        ) : (
                          <Droplets size={18} />
                        )}{" "}
                        {level === 0
                          ? "Aération mécanique"
                          : "Filtration biologique"}
                      </h3>
                      <p>
                        {level === 0
                          ? "Augmente les échanges d’oxygène avec l’air."
                          : "Transforme l’azote ammoniacal ; maturation sur 30 jours."}
                      </p>
                      <p>
                        {formatMoney(UPGRADE_COST[level])} · +3,6 kWh/j ·{" "}
                        {formatMoney(3.6 * 0.22, true)}/j
                      </p>
                      {done ? (
                        <Badge tone="success">En service</Badge>
                      ) : p.upgrade === level ? (
                        <Button tone="secondary" onClick={upgrade}>
                          Améliorer ce bassin
                        </Button>
                      ) : (
                        <Badge>Installez d’abord l’aération</Badge>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
            {tab === "history" && (
              <div className="pond-history">
                <p>Historique du bassin · événements du journal</p>
                {game.logs
                  .filter((l) => l.text.includes(p.name))
                  .map((l, i) => (
                    <article key={`${l.day}-${i}`}>
                      <small>Jour {l.day}</small>
                      <p>{formatEngineText(l.text)}</p>
                    </article>
                  ))}
                {!game.logs.some((l) => l.text.includes(p.name)) && (
                  <p>Aucun événement conservé pour ce bassin.</p>
                )}
              </div>
            )}
          </Tabs>
        </>
      )}
    </section>
  );
}
function WaterSettings({
  pond: p,
  perform,
  game,
}: {
  pond: Pond;
  perform: (a: Action) => void;
  game: Game;
}) {
  const ranges =
    p.facility === "earth"
      ? [0, 0.05, 0.08, 0.1, 0.25, 0.5]
      : p.facility === "ras"
        ? [0, 0.01, 0.03, 0.05, 0.1, 0.2, 0.3]
        : [0, 1, 3, 5, 8, 10, 12];
  const guard = availability(game, { type: "clean", pondId: p.id });
  return (
    <div className="water-settings">
      <p className="hint">
        pH {number(p.pH, 1)} · azote ammoniacal total (TAN) {number(p.tan, 3)}{" "}
        mg N/L <ScientificHelp term="tan" pond={p} />
      </p>
      <div className="field-help">
        <label htmlFor={`flow-${p.id}`}>Débit d’eau neuve</label>
        <ScientificHelp term="flow" pond={p} />
      </div>
      <select
        id={`flow-${p.id}`}
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
      <Button
        tone="secondary"
        disabled={guard.disabled}
        disabledReason={formatEngineText(guard.reason)}
        onClick={() => perform({ type: "clean", pondId: p.id })}
      >
        <Droplets size={16} />
        Entretenir & renouveler · {formatMoney(cleaningCost(p))}
      </Button>
      <p className="hint">
        Retire les boues et renouvelle 30 % de l’eau. Vérifiez ensuite oxygène
        et NH₃-N.
      </p>
      {p.upgrade >= 2 && p.filterAge < 30 && (
        <CountdownChip
          label="Maturation du biofiltre"
          days={30 - p.filterAge}
        />
      )}
    </div>
  );
}
function FeedingSettings({
  pond: p,
  perform,
  game,
}: {
  pond: Pond;
  perform: (a: Action) => void;
  game: Game;
}) {
  const guard = availability(game, { type: "feed", pondId: p.id });
  return (
    <div className="feeding-settings">
      <Toggle
        label="Distribution automatique"
        checked={p.autoFeed}
        description={`${number(feedNeeded(p), 2)} kg prévus par jour`}
        onChange={(enabled) =>
          perform({ type: "autoFeed", pondId: p.id, enabled })
        }
      />
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
      {!p.autoFeed && p.count > 0 && (
        <Button
          disabled={guard.disabled}
          disabledReason={formatEngineText(guard.reason)}
          onClick={() => perform({ type: "feed", pondId: p.id })}
        >
          <Package size={16} />
          {p.feedToday > 0 ? "Ration programmée" : "Programmer la ration"}
        </Button>
      )}
      <p className="hint">
        Hier : {number(p.lastFeed, 2)} kg distribués · FCR du lot{" "}
        {p.totalGain > 0.001
          ? number(p.totalFeed / p.totalGain, 2)
          : "indisponible"}
        . <ScientificHelp term="fcr" pond={p} />
      </p>
      {p.quarantineDays > 0 && (
        <CountdownChip label="Fin de l’observation" days={p.quarantineDays} />
      )}
    </div>
  );
}
