import { number } from "../ui/format";
import { t, displayText } from "../i18n";
import { Droplets, Package, Wind, Check, AlertTriangle } from "lucide-react";
import {
  biomass,
  cleaningCost,
  feedNeeded,
  harvestReady,
  pondStatus,
  SPECIES,
  UPGRADE_COST,
  type Game,
  type Pond,
  type Action,
} from "../game";
import { BUYERS } from "../development";
import { SpeciesPortrait } from "../world/SpeciesPortrait";
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
    <div className="vital-summary" aria-label={t("m_12d8a6b454")}>
      {pondVitals(pond).map((v) => (
        <Tooltip
          key={v.key}
          text={displayText(
            `${v.label} : ${v.state}. ${v.threshold}. ${v.help}`,
          )}
        >
          {(id) => (
            <button
              data-vital={v.key}
              className={`tone-${v.tone}`}
              aria-label={displayText(
                `${v.label} : ${number(v.value, v.digits)} ${v.unit} · ${v.state}`,
              )}
              aria-describedby={id}
            >
              <span>
                {displayText(
                  {
                    temperature: t("m_007955c071"),
                    oxygen: "O₂",
                    ammonia: t("m_209a5a0f11"),
                    density: t("m_8bb667816b"),
                  }[v.key],
                )}
              </span>
              <strong>{displayText(number(v.value, v.digits))}</strong>
              <small>{displayText(v.unit)}</small>
              <span className="vital-state">
                {v.tone === "success" ? (
                  <Check size={12} />
                ) : (
                  <AlertTriangle size={12} />
                )}
                {displayText(" ")}
                {displayText(
                  v.tone === "warning" ? t("m_7e898e80c3") : v.state,
                )}
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
  let primary: {
    label: string;
    action?: Action;
    open?: () => void;
  } | null = null;
  if (p.built) {
    if (batch)
      primary = {
        label:
          BUYERS[contract!.buyer].processed && !batch.processed
            ? t("m_30462743f1")
            : t("m_6e77c9a8d9"),
        action: {
          type:
            BUYERS[contract!.buyer].processed && !batch.processed
              ? "process"
              : "dispatch",
          id: batch.id,
        },
      };
    else if (!p.count && !incoming && !p.fallowDays)
      primary = { label: t("m_df22c1f8f7"), open: stock };
    else if (p.count && !p.autoFeed)
      primary = {
        label: t("m_08c1248403"),
        action: { type: "autoFeed", pondId: p.id, enabled: true },
      };
    else if (contract && harvestReady(p))
      primary = {
        label: t("m_3a5f4050e3", p.name),
        action: { type: "harvest", pondId: p.id },
      };
    else if (s && !contract && p.weight >= s.harvestWeight * 0.8)
      primary = {
        label: t("m_4c3f90b546"),
        open: () => navigate("logistics"),
      };
  }
  const guard = primary?.action
    ? availability(game, primary.action)
    : { disabled: false, reason: "" };
  return (
    <section className="pond-inspector" aria-label={t("m_8a273bda81")}>
      <label className="pond-selector">
        {t("m_fe893f1ecd")}
        <select
          aria-label={t("m_fe893f1ecd")}
          value={p.id}
          onChange={(e) => select(Number(e.target.value))}
        >
          {game.ponds.map((p) => (
            <option key={p.id} value={p.id}>
              {displayText(p.name)} · {displayText(pondStatus(p).label)}
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
              <h3>{displayText(p.name)}</h3>
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
                {displayText(status.label)}
              </Badge>
            </div>
            {s && <SpeciesPortrait species={s.id} />}
          </header>
          {s && (
            <>
              <p className="inspector-species">{displayText(s.name)}</p>
              <div className="pond-numbers">
                <div>
                  <strong>{displayText(number(p.count))}</strong>
                  <span>{t("m_b466bdc0f0")}</span>
                </div>
                <div>
                  <strong>
                    {displayText(number(p.weight * 1000))}{" "}
                    <small>{t("m_cd0aa98561")}</small>
                  </strong>
                  <span>{t("m_599d1411de")}</span>
                </div>
                <div>
                  <strong>
                    {displayText(number(biomass(p), 1))}{" "}
                    <small>{t("m_131ed73429")}</small>
                  </strong>
                  <span>{t("m_613f9e96e0")}</span>
                </div>
              </div>
            </>
          )}
          <div
            className="water-grid inspector-vitals"
            aria-label={t("m_e57f3fb8a7")}
          >
            {pondVitals(p).map((v) => (
              <div key={v.key} data-vital-detail={v.key}>
                <div className="vital-label">
                  <strong>{displayText(v.label)}</strong>
                  <Tooltip text={displayText(v.help)}>
                    {(id) => (
                      <button
                        className="vital-help"
                        aria-label={displayText(t("m_0b51688308", v.label))}
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
                  label={displayText(v.label)}
                  tone={v.tone}
                  caption={displayText(v.state)}
                />
                <small>{displayText(v.threshold)}</small>
                <Sparkline
                  values={readings.map((r) => r[v.key])}
                  positions={readings.map((r) => r.day)}
                  domain={[Math.max(1, game.day - 13), game.day]}
                  label={displayText(
                    t(
                      "m_3dc55fb04c",
                      v.label,
                      readings.length,
                      plural(
                        readings.length,
                        t("m_2327660f4e"),
                        t("m_ad322cd874"),
                      ),
                      plural(
                        readings.length,
                        t("m_009ad8b977"),
                        t("m_b35a16c22e"),
                      ),
                    ),
                  )}
                />
              </div>
            ))}
          </div>
          <small className="readings-note">
            {readings.length}
            {" " + t("m_2327660f4e")}
            {displayText(readings.length > 1 ? "s" : "")}
            {" " + t("m_8f74fb72bd")}
          </small>
          {primary && (
            <Button
              className="full inspector-primary"
              data-testid="pond-action"
              disabled={guard.disabled}
              disabledReason={displayText(formatEngineText(guard.reason))}
              onClick={() =>
                primary.action ? perform(primary.action) : primary.open?.()
              }
            >
              {displayText(primary.label)}
            </Button>
          )}
          {incoming && (
            <CountdownChip
              label={t("m_49f0688d64")}
              days={incoming.due - game.day}
            />
          )}
          {p.fallowDays > 0 && (
            <CountdownChip label={t("m_b4b1512942")} days={p.fallowDays} />
          )}
          {s && (
            <Gauge
              circular
              label={t("m_d547b57028")}
              value={p.weight}
              max={s.harvestWeight}
              caption={displayText(
                `${Math.min(100, Math.floor((p.weight / s.harvestWeight) * 100))} % · ${days === null ? t("m_a7ca60a23d") : days === 0 ? t("m_55dbf28739") : t("m_59ebd35bfe", days)}`,
              )}
              tone={harvestReady(p) ? "success" : "warning"}
            />
          )}
          <Tabs
            label={t("m_0ddd948734")}
            items={[
              { id: "water", label: t("m_4fde2b7a7c") },
              { id: "feed", label: t("m_2690c742f6") },
              { id: "equipment", label: t("m_885e3d11a2") },
              { id: "history", label: t("m_865df3324a") },
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
                        )}
                        {displayText(" ")}
                        {displayText(
                          level === 0 ? t("m_a3f695f9e1") : t("m_a257960721"),
                        )}
                      </h3>
                      <p>
                        {displayText(
                          level === 0 ? t("m_48ede68764") : t("m_f989384acd"),
                        )}
                      </p>
                      <p>
                        {displayText(formatMoney(UPGRADE_COST[level]))}
                        {" " + t("m_74ed284761")}
                        {displayText(" ")}
                        {displayText(formatMoney(3.6 * 0.22, true))}
                        {t("m_d1597015c9")}
                      </p>
                      {done ? (
                        <Badge tone="success">{t("m_22134a6ad3")}</Badge>
                      ) : p.upgrade === level ? (
                        <Button tone="secondary" onClick={upgrade}>
                          {t("m_c652a7394f")}
                        </Button>
                      ) : (
                        <Badge>{t("m_e784fd5451")}</Badge>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
            {tab === "history" && (
              <div className="pond-history">
                <p>{t("m_af7f5b4521")}</p>
                {game.logs
                  .filter((l) => l.text.includes(p.name))
                  .map((l, i) => (
                    <article key={`${l.day}-${i}`}>
                      <small>
                        {t("m_3eb0f64015") + " "}
                        {l.day}
                      </small>
                      <p>{displayText(formatEngineText(l.text))}</p>
                    </article>
                  ))}
                {!game.logs.some((l) => l.text.includes(p.name)) && (
                  <p>{t("m_505fd22529")}</p>
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
        {t("m_d18eae6d1e") + " "}
        {displayText(number(p.pH, 1))}
        {" " + t("m_44078ecf14") + " "}
        {displayText(number(p.tan, 3))}
        {displayText(" ")}
        {t("m_64997fc9bc") + " "}
        <ScientificHelp term="tan" pond={p} />
      </p>
      <div className="field-help">
        <label htmlFor={`flow-${p.id}`}>{t("m_e7231673c9")}</label>
        <ScientificHelp term="flow" pond={p} />
      </div>
      <select
        id={`flow-${p.id}`}
        aria-label={t("m_e7231673c9")}
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
              {displayText(number(v, 2))}
              {" " + t("m_728f66214d")}
            </option>
          ))}
      </select>
      <Button
        tone="secondary"
        disabled={guard.disabled}
        disabledReason={displayText(formatEngineText(guard.reason))}
        onClick={() => perform({ type: "clean", pondId: p.id })}
      >
        <Droplets size={16} />
        {t("m_89bd0bb586") + " "}
        {displayText(formatMoney(cleaningCost(p)))}
      </Button>
      <p className="hint">{t("m_9edd497734")}</p>
      {p.upgrade >= 2 && p.filterAge < 30 && (
        <CountdownChip label={t("m_283c696552")} days={30 - p.filterAge} />
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
        label={t("m_97dcab4f48")}
        checked={p.autoFeed}
        description={displayText(t("m_e8ebe00646", number(feedNeeded(p), 2)))}
        onChange={(enabled) =>
          perform({ type: "autoFeed", pondId: p.id, enabled })
        }
      />
      <label>
        {t("m_71e480363e")}
        <select
          aria-label={t("m_71e480363e")}
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
              {v * 100} % {displayText(v === 1 ? t("m_3d7016f2c5") : "")}
            </option>
          ))}
        </select>
      </label>
      {!p.autoFeed && p.count > 0 && (
        <Button
          disabled={guard.disabled}
          disabledReason={displayText(formatEngineText(guard.reason))}
          onClick={() => perform({ type: "feed", pondId: p.id })}
        >
          <Package size={16} />
          {displayText(p.feedToday > 0 ? t("m_65c0c8742f") : t("m_50d09e5470"))}
        </Button>
      )}
      <p className="hint">
        {t("m_28eebb4e06") + " "}
        {displayText(number(p.lastFeed, 2))}
        {" " + t("m_4af95b5bde")}
        {displayText(" ")}
        {displayText(
          p.totalGain > 0.001
            ? number(p.totalFeed / p.totalGain, 2)
            : t("status.unavailable"),
        )}
        . <ScientificHelp term="fcr" pond={p} />
      </p>
      {p.quarantineDays > 0 && (
        <CountdownChip label={t("m_e1bee53914")} days={p.quarantineDays} />
      )}
    </div>
  );
}
