import { number } from "../ui/format";
import { t, displayText } from "../i18n";
import { Droplets, Fish, FlaskConical, Hammer, Sprout } from "lucide-react";
import {
  CONSTRUCTION_COST,
  CONSTRUCTION_DAYS,
  facilityName,
  pondStatus,
  SPECIES,
  type Game,
  type Action,
  type Pond,
} from "../game";
import { SOURCE_FLOW, waterUsed } from "../development";
import { SpeciesPortrait } from "../world/SpeciesPortrait";
import { Button } from "../ui/Button";
import { ScientificHelp } from "../ui/ScientificHelp";
import { Badge, Card, CountdownChip } from "../ui/Primitives";
import { formatMoney, formatEngineText } from "../ui/format";
import { availability } from "../state/pondSelectors";
export function WaterSurvey({ game }: { game: Game }) {
  return (
    <div className="survey-results">
      <svg viewBox="0 0 320 100" role="img" aria-label={t("m_b8008be285")}>
        <path
          d="M0 60Q50 5 96 55T190 52T320 38V100H0Z"
          fill="var(--surface-muted)"
        />
        <path
          d="M0 66Q90 58 156 77T320 67"
          fill="none"
          stroke="var(--water)"
          strokeWidth="8"
        />
        <path
          d="M102 64V28H158V68M218 70V40H274V70"
          fill="var(--surface-raised)"
          stroke="var(--primary)"
          strokeWidth="3"
        />
      </svg>
      <h3>{t("m_b95bec6256")}</h3>
      <dl>
        <div>
          <dt>
            <Droplets size={16} />
            {" " + t("m_0e570ca6fa")}
          </dt>
          <dd>{t("m_eb575fcc97")}</dd>
        </div>
        <div>
          <dt>{t("m_e00a5e9577")}</dt>
          <dd>
            {displayText(number(waterUsed(game), 2))} / {number(SOURCE_FLOW, 2)}
            {" " + t("m_86016704db")}
          </dd>
        </div>
        <div>
          <dt>
            <Sprout size={16} />
            {" " + t("m_19cec84bfd")}
          </dt>
          <dd>{t("m_92b7261c62")}</dd>
        </div>
      </dl>
      <p>{t("m_3010fab362")}</p>
    </div>
  );
}
export function ConstructionCard({
  game,
  pond,
  perform,
  inspect,
}: {
  game: Game;
  pond: Pond;
  perform: (a: Action) => void;
  inspect: () => void;
}) {
  const species =
      pond.facility === "earth"
        ? "carp"
        : pond.facility === "ras"
          ? "tilapia"
          : "trout",
    s = SPECIES[species];
  const action: Action = pond.plannedSpecies
    ? { type: "build", pondId: pond.id }
    : { type: "plan", pondId: pond.id, species };
  const guard = availability(game, action);
  const status = pondStatus(pond);
  return (
    <Card className="construction-card" data-testid="construction-card">
      <div className="construction-portrait">
        <SpeciesPortrait species={species} />
        <Badge
          tone={
            status.tone === "danger"
              ? "danger"
              : status.tone === "warning"
                ? "warning"
                : ["good", "harvest"].includes(status.tone)
                  ? "success"
                  : "neutral"
          }
        >
          {displayText(status.label)}
        </Badge>
      </div>
      <h3>{displayText(pond.name)}</h3>
      <strong>{displayText(s.name)}</strong>
      <p>
        {displayText(
          pond.facility === "earth"
            ? t("m_d36d5270c0")
            : pond.facility === "ras"
              ? t("m_5e2786cc56")
              : t("m_f3db32b2e6"),
        )}
      </p>
      <dl>
        <div>
          <dt>{t("m_c3fc54aa53")}</dt>
          <dd>
            {displayText(facilityName(pond))} · {number(pond.volume, 2)}
            {" " + t("m_c7db57c856")}
          </dd>
        </div>
        <div>
          <dt>{t("m_8186a81875")}</dt>
          <dd>
            {displayText(formatMoney(CONSTRUCTION_COST[pond.id - 1]))} ·
            {displayText(" ")}
            {number(CONSTRUCTION_DAYS[pond.id - 1], 2)}
            {" " + t("m_5cd11d34bc")}
          </dd>
        </div>
        <div>
          <dt className="field-help">
            {t("m_48cfb628f6") + " "}
            <ScientificHelp term="flow" pond={pond} />
          </dt>
          <dd>
            {displayText(number(pond.flow, 2))}
            {" " + t("m_728f66214d")}
            {displayText(" ")}
            {displayText(
              pond.facility === "earth"
                ? t("m_6b81942f59")
                : t("m_03936b39fe", number(SOURCE_FLOW - waterUsed(game), 2)),
            )}
          </dd>
        </div>
        <div>
          <dt>{t("m_d2c6e49d64")}</dt>
          <dd>
            {displayText(s.temperature.join("–"))}
            {" " + t("m_11c4350690")}
          </dd>
        </div>
      </dl>
      {pond.built ? (
        <Button tone="secondary" onClick={inspect}>
          {t("m_4dbc1035c8")}
        </Button>
      ) : pond.constructionDays ? (
        <CountdownChip label={t("m_935d079b6d")} days={pond.constructionDays} />
      ) : (
        <Button
          disabled={guard.disabled}
          disabledReason={displayText(formatEngineText(guard.reason))}
          onClick={() => perform(action)}
        >
          <Hammer size={17} />
          {displayText(
            pond.plannedSpecies
              ? t("m_c3557f0a83", pond.name)
              : t("m_98f7262244", s.name, pond.name),
          )}
        </Button>
      )}
      <small>{t("m_e7d80cea50")}</small>
    </Card>
  );
}
export default function ConstructionPanel({
  game,
  selected,
  select,
  perform,
  inspect,
}: {
  game: Game;
  selected: number;
  select: (id: number) => void;
  perform: (a: Action) => void;
  inspect: () => void;
}) {
  const d = game.development,
    p = game.ponds.find((p) => p.id === selected)!;
  const guard = availability(game, { type: "survey" });
  return (
    <div className="construction-panel">
      {d.migrated && <p className="migration-note">{t("m_38e361d992")}</p>}
      {!d.surveyed ? (
        <Card>
          <FlaskConical size={32} />
          <h3>{t("m_f5aee6fef2")}</h3>
          <p>{t("m_7b60619468")}</p>
          {d.surveyDue !== null ? (
            <CountdownChip
              label={t("m_cfa1aac2a5")}
              days={d.surveyDue - game.day}
            />
          ) : (
            <Button
              disabled={guard.disabled}
              disabledReason={displayText(formatEngineText(guard.reason))}
              onClick={() => perform({ type: "survey" })}
            >
              {t("m_e2c053ebd5")}
            </Button>
          )}
        </Card>
      ) : (
        <>
          <details className="survey-summary">
            <summary>
              <Droplets size={16} />
              {" " + t("m_53349fab59")}
            </summary>
            <WaterSurvey game={game} />
          </details>
          <p className="hint">
            <Fish size={16} />
            {" " + t("m_999f8f8487")}
          </p>
          <label className="pond-selector">
            {t("m_cbe647c59d")}
            <select
              aria-label={t("m_cbe647c59d")}
              value={selected}
              onChange={(e) => select(Number(e.target.value))}
            >
              {game.ponds.map((p) => (
                <option key={p.id} value={p.id}>
                  {displayText(p.name)} · {displayText(facilityName(p))}
                </option>
              ))}
            </select>
          </label>
          <ConstructionCard
            game={game}
            pond={p}
            perform={perform}
            inspect={inspect}
          />
        </>
      )}
    </div>
  );
}
