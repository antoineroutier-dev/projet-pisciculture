import { number, simDate } from "../ui/format";
import { t, displayText } from "../i18n";
import { useControlPreferences } from "../state/preferences";
import { bindingLabel } from "../controls/bindings";
import { TimeControls } from "./TimeControls";
import type { GameClock } from "../state/useGameClock";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { Stepper, ResourcePill } from "../ui/Primitives";
import { useState } from "react";
import {
  AlertTriangle,
  CheckCheck,
  Settings2,
  Menu,
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
import { weather, pondStatus, type Game } from "../game";
import { formatMoney, formatEngineText, plural } from "../ui/format";
import { presentationTask } from "../state/operatingGoals";
import { PANELS, type PanelId } from "../state/navigation";
export function GameHud({
  game,
  saved,
  saveRevision,
  storageError,
  clock,
  settings,
  menu,
  alerts,
}: {
  game: Game;
  saved: boolean;
  saveRevision: number;
  storageError: string;
  clock: GameClock;
  settings: () => void;
  menu: () => void;
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
    <header className="game-hud" aria-label={t("m_3e9656402b")}>
      <div
        className="hud-date"
        title={displayText(t("m_b7f2057e90", game.day))}
      >
        <strong data-testid="day" data-day={game.day}>
          {displayText(simDate(game.day))}
        </strong>
        <span>
          <CloudSun size={15} />
          {displayText(today.season)} · {displayText(today.label)} ·{" "}
          {displayText(number(today.temperature, 1))}
          {" " + t("m_11c4350690")}
        </span>
      </div>
      <div className="hud-resources" aria-label={t("m_f15c129752")}>
        <ResourcePill
          label={t("m_5a430676b9")}
          value={<AnimatedNumber value={game.money} format={formatMoney} />}
          testId="money"
          detail={
            <span title={t("m_1d69c4d15f")}>
              {displayText(trend > 0 ? "+" : "")}
              {displayText(formatMoney(trend))}
              {" " + t("m_94581a0c2d")}
            </span>
          }
        />
        <ResourcePill
          label={
            <>
              {t("m_4b5169ce38")}
              {displayText(" ")}
              {days !== null && (
                <meter
                  aria-label={t("m_52eba72114")}
                  min={0}
                  max={7}
                  value={Math.min(7, days)}
                />
              )}
            </>
          }
          value={
            <AnimatedNumber
              value={game.food}
              format={(v) => `${number(v, 1)} kg`}
            />
          }
          detail={displayText(
            days === null
              ? t("m_dbd5715c3a")
              : t(
                  "m_36c9097c36",
                  days,
                  days < 3 ? " " + t("m_f31ef1c21c") : "",
                ),
          )}
        />
      </div>
      <TimeControls clock={clock} />
      <div className="hud-utilities">
        <button
          onClick={alerts}
          aria-label={displayText(
            t("m_ea75113d04", warnings, warnings === 1 ? "" : "s"),
          )}
          title={t("m_d4835f3e66")}
        >
          <AlertTriangle size={18} />
          <span>{warnings}</span>
        </button>
        <button
          className="hud-save"
          onClick={settings}
          aria-label={displayText(
            saved && !storageError ? t("m_521c414b23") : t("m_7d8db4d5d0"),
          )}
          title={displayText(storageError || t("m_31fcec6516"))}
        >
          {saved && !storageError ? (
            <CheckCheck
              key={saveRevision}
              className="save-indicator"
              size={18}
            />
          ) : (
            <AlertTriangle size={18} />
          )}
        </button>
        <button
          onClick={settings}
          aria-label={t("m_422fef3b9b")}
          title={t("m_01923df7a4")}
        >
          <Settings2 size={20} />
        </button>
        <button
          data-command="pause-menu"
          onClick={menu}
          aria-label={t("m_df641fc301")}
          title={t("m_41622199a0")}
        >
          <Menu size={20} />
        </button>
      </div>
      {displayText(
        storageError && (
          <div className="hud-storage-error" role="alert">
            {displayText(storageError)}
          </div>
        ),
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
  const { aids } = useControlPreferences();
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
      aria-label={t("m_75fc18b1d1")}
      data-testid="next-task"
    >
      <div className="goal-heading">
        <span>
          {displayText(
            task.urgent
              ? t("m_954ebd41a5")
              : game.development.paid
                ? t("m_7ac2ddbdc7")
                : t("m_b79c180dfa", task.stage + 1),
          )}
        </span>
        <button
          aria-label={t("m_bd4e3ff34f")}
          onClick={objectives}
          title={t("m_3e7bd2801d")}
        >
          <Award size={18} />
        </button>
      </div>
      <h2>{displayText(task.title)}</h2>
      <span className="goal-description">{displayText(description)}</span>
      <button
        className="button primary goal-action"
        data-testid="task-action"
        onClick={() => follow(task)}
      >
        {displayText(formatEngineText(task.label))}
        <ArrowRight size={16} />
      </button>
      {aids && (
        <button
          className="goal-details-toggle"
          aria-expanded={expanded}
          aria-controls="goal-details"
          onClick={() => setExpanded((v) => !v)}
        >
          {displayText(
            game.development.paid
              ? expanded
                ? t("m_a846999d44")
                : t("m_5a0fe6efc6")
              : expanded
                ? t("m_a99b976cda")
                : t("m_c9ea7e6276"),
          )}
        </button>
      )}
      {aids && expanded && (
        <div
          className="goal-details"
          id="goal-details"
          tabIndex={0}
          role="region"
          aria-label={t("m_c9ea7e6276")}
        >
          <p>{displayText(text)}</p>
          {game.development.paid > 0 ? (
            <p>
              {game.development.paid}{" "}
              {displayText(
                plural(
                  game.development.paid,
                  t("m_c501935a6b"),
                  t("m_443ff9977e"),
                ),
              )}
              {displayText(" ")}
              {displayText(
                plural(
                  game.development.paid,
                  t("m_02d77164f0"),
                  t("m_97fb0d0819"),
                ),
              )}{" "}
              ·{displayText(" ")}
              {displayText(number(game.stats.soldKg, 1))}
              {" " + t("m_fa7d57ee76")}
            </p>
          ) : (
            <Stepper
              label={t("m_f5b5b74d68")}
              steps={displayText(STAGES)}
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
  gamepad,
  active,
  open,
}: {
  active: PanelId | null;
  gamepad: boolean;
  open: (id: PanelId) => void;
}) {
  const { bindings } = useControlPreferences();
  return (
    <nav className="game-dock" aria-label={t("m_9a4fc7b78c")}>
      {PANELS.map((p, i) => {
        const Icon = icons[i];
        return (
          <button
            key={p.id}
            data-panel={p.id}
            aria-label={displayText(p.label)}
            aria-expanded={active === p.id}
            aria-controls={active === p.id ? "management-panel" : undefined}
            aria-keyshortcuts={bindings[p.id]}
            onClick={() => open(p.id)}
          >
            <Icon size={20} />
            <span>{displayText(p.label)}</span>
            <kbd>{displayText(bindingLabel(bindings[p.id]))}</kbd>
          </button>
        );
      })}
      {gamepad && <span className="pad-hints">{t("m_1b18bfa095")}</span>}
    </nav>
  );
}
