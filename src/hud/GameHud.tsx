import { Stepper, ResourcePill } from "../ui/Primitives";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCheck,
  Settings2,
  Pause,
  Play,
  SkipForward,
  Hammer,
  Waves,
  Package,
  Coins,
  BookOpen,
  CircleHelp,
  ArrowRight,
  Award,
  CloudSun,
} from "lucide-react";
import { dailyFeed, nextTask, STAGES, type Task } from "../development";
import { number, simDate, weather, pondStatus, type Game } from "../game";
import { formatMoney, formatEngineText, plural } from "../ui/format";
import { presentationTask } from "../state/operatingGoals";
import { PANELS, type PanelId } from "../state/navigation";

export function GameHud({
  game,
  saved,
  storageError,
  running,
  speed,
  toggleRunning,
  changeSpeed,
  nextDay,
  settings,
  alerts,
}: {
  game: Game;
  saved: boolean;
  storageError: string;
  running: boolean;
  speed: number;
  toggleRunning: () => void;
  changeSpeed: () => void;
  nextDay: () => void;
  settings: () => void;
  alerts: () => void;
}) {
  const today = weather(game.day);
  const feed = dailyFeed(game);
  const days = feed > 0 ? Math.floor(game.food / feed) : null;
  const last = game.history.at(-2);
  const trend = last ? game.money - last.money : 0;
  const pondWarnings = game.ponds.filter(
    (p) => pondStatus(p).tone === "danger",
  ).length;
  const warnings =
    pondWarnings +
    (nextTask(game).urgent && !pondWarnings ? 1 : 0) +
    (storageError ? 1 : 0);
  return (
    <header className="game-hud" aria-label="Ressources et temps">
      <div className="hud-date" title={`Jour ${game.day}`}>
        <strong data-testid="day" data-day={game.day}>
          {simDate(game.day)}
        </strong>
        <span>
          <CloudSun size={15} />
          {today.season} · {today.label} · {number(today.temperature, 1)} °C
        </span>
      </div>
      <div className="hud-resources" aria-label="Ressources">
        <ResourcePill
          label="Trésorerie"
          value={formatMoney(game.money)}
          testId="money"
          detail={
            <span title="Variation depuis le dernier relevé quotidien">
              {trend > 0 ? "+" : ""}
              {formatMoney(trend)} / jour
            </span>
          }
        />
        <ResourcePill
          label={
            <>
              Aliments{" "}
              {days !== null && (
                <meter
                  aria-label="Autonomie des aliments, réserve cible de 7 jours"
                  min={0}
                  max={7}
                  value={Math.min(7, days)}
                />
              )}
            </>
          }
          value={`${number(game.food, 1)} kg`}
          detail={
            days === null
              ? "Aucun lot à nourrir"
              : `${days} j d’autonomie${days < 3 ? " · à commander" : ""}`
          }
        />
      </div>
      <div className="hud-clock" aria-label="Contrôle du temps">
        <button
          aria-label={running ? "Mettre en pause" : "Lancer la simulation"}
          onClick={toggleRunning}
          title={running ? "En marche" : "En pause"}
        >
          {running ? <Pause size={18} /> : <Play size={18} />}
          <span>{running ? "Pause" : "Jouer"}</span>
        </button>
        <button
          aria-label={`Vitesse ${speed}, passer à ${[1, 3, 12, 60][([1, 3, 12, 60].indexOf(speed) + 1) % 4]}`}
          onClick={changeSpeed}
        >
          ×{speed}
        </button>
        <button onClick={nextDay} aria-label="Jour suivant">
          <SkipForward size={18} />
          <span>Jour suivant</span>
        </button>
      </div>
      <div className="hud-utilities">
        <button
          onClick={alerts}
          aria-label={`${warnings} alerte${warnings === 1 ? "" : "s"} · ouvrir le journal`}
          title="Ouvrir le journal"
        >
          <AlertTriangle size={18} />
          <span>{warnings}</span>
        </button>
        <button
          className="hud-save"
          onClick={settings}
          aria-label={
            saved && !storageError
              ? "Partie sauvegardée · sauvegardes"
              : "Sauvegarde à vérifier"
          }
          title={storageError || "Partie sauvegardée"}
        >
          {saved && !storageError ? (
            <CheckCheck size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
        </button>
        <button
          onClick={settings}
          aria-label="Paramètres & sauvegarde"
          title="Paramètres · Échap"
        >
          <Settings2 size={20} />
        </button>
      </div>
      {storageError && (
        <div className="hud-storage-error" role="alert">
          {storageError}
        </div>
      )}
    </header>
  );
}

export function GoalHud({
  game,
  follow,
  objectives,
}: {
  game: Game;
  follow: (task: Task) => void;
  objectives: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const task = presentationTask(game);
  const text = formatEngineText(task.text);
  // A short explanation; the full operational guidance remains expandable.
  const firstSentence = text.split(/(?<=[.!?])\s/)[0];
  const description =
    text.length <= 140
      ? text
      : firstSentence.length <= 140
        ? firstSentence
        : `${text.slice(0, 137).replace(/\s+\S*$/, "")}…`;
  return (
    <section
      className={`goal-hud ${task.urgent ? "goal-urgent" : ""}`}
      aria-label="Votre prochaine action"
      data-testid="next-task"
    >
      <div className="goal-heading">
        <span>
          {task.urgent
            ? "À traiter maintenant"
            : game.development.paid
              ? "Votre exploitation continue"
              : `Premier cycle · ${task.stage + 1}/9`}
        </span>
        <button
          aria-label="Voir les objectifs"
          onClick={objectives}
          title="Objectifs et récompenses"
        >
          <Award size={18} />
        </button>
      </div>
      <h2>{task.title}</h2>
      <span className="goal-description">{description}</span>
      <button
        className="button primary goal-action"
        data-testid="task-action"
        onClick={() => follow(task)}
      >
        {formatEngineText(task.label)}
        <ArrowRight size={16} />
      </button>
      <button
        className="goal-details-toggle"
        aria-expanded={expanded}
        aria-controls="goal-details"
        onClick={() => setExpanded((v) => !v)}
      >
        {game.development.paid
          ? expanded
            ? "Masquer les conseils"
            : "Conseils d’exploitation"
          : expanded
            ? "Masquer le parcours"
            : "Parcours et conseils"}
      </button>
      {expanded && (
        <div
          className="goal-details"
          id="goal-details"
          tabIndex={0}
          role="region"
          aria-label="Parcours et conseils"
        >
          <p>{text}</p>
          {game.development.paid > 0 ? (
            <p>
              {game.development.paid} {plural(game.development.paid, "cycle")}{" "}
              {plural(game.development.paid, "réglé")} ·{" "}
              {number(game.stats.soldKg, 1)} kg commercialisés.
            </p>
          ) : (
            <Stepper
              label="Parcours du premier cycle"
              steps={STAGES}
              current={task.stage}
            />
          )}
        </div>
      )}
    </section>
  );
}
const icons = [Hammer, Waves, Package, Coins, BookOpen, CircleHelp];
export function Dock({
  active,
  open,
}: {
  active: PanelId | null;
  open: (id: PanelId) => void;
}) {
  return (
    <nav className="game-dock" aria-label="Gestion de l’exploitation">
      {PANELS.map((p, i) => {
        const Icon = icons[i];
        return (
          <button
            key={p.id}
            data-panel={p.id}
            aria-label={p.label}
            aria-expanded={active === p.id}
            aria-controls={active === p.id ? "management-panel" : undefined}
            aria-keyshortcuts={`Alt+${p.key}`}
            onClick={() => open(p.id)}
          >
            <Icon size={20} />
            <span>{p.label}</span>
            <kbd>Alt+{p.key}</kbd>
          </button>
        );
      })}
    </nav>
  );
}
