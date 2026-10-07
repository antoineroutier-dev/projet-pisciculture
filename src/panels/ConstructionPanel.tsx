import { Droplets, Fish, FlaskConical, Hammer, Sprout } from "lucide-react";
import {
  CONSTRUCTION_COST,
  CONSTRUCTION_DAYS,
  facilityName,
  number,
  pondStatus,
  SPECIES,
  type Game,
  type Action,
  type Pond,
} from "../game";
import { SOURCE_FLOW, waterUsed } from "../development";
import { FishArt } from "../FishArt";
import { Button } from "../ui/Button";
import { ScientificHelp } from "../ui/ScientificHelp";
import { Badge, Card, CountdownChip } from "../ui/Primitives";
import { formatMoney, formatEngineText } from "../ui/format";
import { availability } from "../state/pondSelectors";
export function WaterSurvey({ game }: { game: Game }) {
  return (
    <div className="survey-results">
      <svg
        viewBox="0 0 320 100"
        role="img"
        aria-label="La source alimente les bassins ; l’étang suit les saisons"
      >
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
      <h3>Une source fraîche, un étang saisonnier</h3>
      <dl>
        <div>
          <dt>
            <Droplets size={16} /> Source
          </dt>
          <dd>11,8–15,2 °C · pH 7,2</dd>
        </div>
        <div>
          <dt>Débit partagé</dt>
          <dd>
            {number(waterUsed(game), 2)} / {SOURCE_FLOW} L/s engagés
          </dd>
        </div>
        <div>
          <dt>
            <Sprout size={16} /> Étang
          </dt>
          <dd>pH 7,6 · température saisonnière</dd>
        </div>
      </dl>
      <p>
        La truite convient à la source ; la carpe à l’étang. Le tilapia demande
        un circuit chauffé et filtré.
      </p>
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
  return (
    <Card className="construction-card" data-testid="construction-card">
      <div className="construction-portrait">
        <FishArt species={species} />
        <Badge tone={pond.built ? "success" : "neutral"}>
          {pondStatus(pond).label}
        </Badge>
      </div>
      <h3>{pond.name}</h3>
      <strong>{s.name}</strong>
      <p>
        {pond.facility === "earth"
          ? "Eau saisonnière, croissance ralentie en hiver."
          : pond.facility === "ras"
            ? "Source réchauffée à 27 °C, filtration et aération incluses."
            : "Source fraîche, courant continu et oxygène à surveiller."}
      </p>
      <dl>
        <div>
          <dt>Installation</dt>
          <dd>
            {facilityName(pond)} · {pond.volume} m³
          </dd>
        </div>
        <div>
          <dt>Chantier</dt>
          <dd>
            {formatMoney(CONSTRUCTION_COST[pond.id - 1])} ·{" "}
            {CONSTRUCTION_DAYS[pond.id - 1]} jours
          </dd>
        </div>
        <div>
          <dt className="field-help">
            Eau neuve <ScientificHelp term="flow" pond={pond} />
          </dt>
          <dd>
            {number(pond.flow, 2)} L/s{" "}
            {pond.facility === "earth"
              ? "· eau de surface"
              : `· ${number(SOURCE_FLOW - waterUsed(game), 2)} L/s encore disponibles`}
          </dd>
        </div>
        <div>
          <dt>Eau préférée</dt>
          <dd>{s.temperature.join("–")} °C</dd>
        </div>
      </dl>
      {pond.built ? (
        <Button tone="secondary" onClick={inspect}>
          Gérer ce bassin
        </Button>
      ) : pond.constructionDays ? (
        <CountdownChip label="Mise en service" days={pond.constructionDays} />
      ) : (
        <Button
          disabled={guard.disabled}
          disabledReason={formatEngineText(guard.reason)}
          onClick={() => perform(action)}
        >
          <Hammer size={17} />
          {pond.plannedSpecies
            ? `Construire ${pond.name}`
            : `Choisir : ${s.name} · ${pond.name}`}
        </Button>
      )}
      <small>
        Gardez une réserve pour les juvéniles, les aliments et les charges du
        cycle.
      </small>
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
      {d.migrated && (
        <p className="migration-note">
          Votre ancienne exploitation est conservée. Nouvelle partie permet de
          découvrir le terrain vide.
        </p>
      )}
      {!d.surveyed ? (
        <Card>
          <FlaskConical size={32} />
          <h3>Commencez par connaître l’eau</h3>
          <p>
            L’analyse identifie les ressources avant le choix de la filière.
          </p>
          {d.surveyDue !== null ? (
            <CountdownChip
              label="Analyse attendue"
              days={d.surveyDue - game.day}
            />
          ) : (
            <Button
              disabled={guard.disabled}
              disabledReason={formatEngineText(guard.reason)}
              onClick={() => perform({ type: "survey" })}
            >
              Analyser l’eau · 240 €
            </Button>
          )}
        </Card>
      ) : (
        <>
          <details className="survey-summary">
            <summary>
              <Droplets size={16} /> Résultats de l’analyse
            </summary>
            <WaterSurvey game={game} />
          </details>
          <p className="hint">
            <Fish size={16} /> Sélectionnez une parcelle dans le monde ou avec
            ce sélecteur.
          </p>
          <label className="pond-selector">
            Parcelle sélectionnée
            <select
              aria-label="Parcelle sélectionnée"
              value={selected}
              onChange={(e) => select(Number(e.target.value))}
            >
              {game.ponds.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {facilityName(p)}
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
