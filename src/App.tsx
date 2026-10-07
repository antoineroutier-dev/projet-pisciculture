import { initialLedger, recordLedger, coldExpected } from "./state/ledger";
import { parseSavedGame, serializeSave, SAVE_KEY } from "./state/saves";
import { CycleReport } from "./panels/CycleReport";
import { useGameClock } from "./state/useGameClock";
import {
  gameEvents,
  hasUpcomingEvent,
  type GameEvent,
} from "./state/gameEvents";
import { EventCard } from "./panels/EventCard";
import { useAudio } from "./audio/useAudio";
import { AudioSettings } from "./audio/AudioSettings";
import {
  requestFeedback,
  beginFeedback,
  clearFeedback,
} from "./state/feedback";
import { FeedbackLayer, DialogFeedback } from "./world/FeedbackLayer";
import { Toast, Slider, SegmentedControl, Tabs } from "./ui/Primitives";
import { usePreferences } from "./state/preferences";
import { Button } from "./ui/Button";
import { GameHud, GoalHud, Dock } from "./hud/GameHud";
import { WorldControls, FishObservation } from "./world/WorldControls";
import type { SceneMode } from "./world/types";
import { ManagementPanel } from "./panels/ManagementPanel";
import { FinancePanel } from "./panels/FinancePanel";
import { JournalPanel } from "./panels/JournalPanel";
import { OperatingGoals } from "./panels/OperatingGoals";
import { PANELS, usePanelNavigation } from "./state/navigation";
import { Dialog as Modal } from "./ui/Dialog";
import {
  formatMoney as euro,
  formatUnitPrice,
  formatEngineText,
} from "./ui/format";
import {
  useCallback,
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  Check,
  ChevronRight,
  Droplets,
  LockKeyhole,
  Minus,
  Plus,
  Sprout,
  Wind,
  Upload,
  RotateCcw,
} from "lucide-react";
import { FishArt } from "./FishArt";
import { lazy, Suspense } from "react";
const FarmScene = lazy(() => import("./FarmScene"));
import { LogisticsPanel, type LogisticsTab } from "./panels/LogisticsPanel";
import ConstructionPanel, { WaterSurvey } from "./panels/ConstructionPanel";
import {
  PondInspector,
  VitalSummary,
  type PondTab,
} from "./panels/PondInspector";
import { availability } from "./state/pondSelectors";
import { usePondReadings } from "./state/usePondReadings";
import { STOCK_FREIGHT, nextTask, type Task } from "./development";
import Guide from "./RealismGuide";
import {
  act,
  LEGACY_STORAGE_KEY,
  V2_STORAGE_KEY,
  advanceGuided,
  compatible,
  facilityName,
  initialGame,
  nextDay,
  number,
  OBJECTIVES,
  SPECIES,
  STORAGE_KEY,
  UPGRADE_COST,
  type Action,
  type Game,
  type Pond,
  type SpeciesId,
} from "./game";

type ModalKind =
  | "stock"
  | "survey"
  | "upgrade"
  | "objectives"
  | "settings"
  | null;
function load() {
  try {
    const raw =
      localStorage.getItem(SAVE_KEY) ||
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(V2_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY);
    const restored = raw
      ? parseSavedGame(raw)
      : (() => {
          const game = initialGame();
          return { game, ledger: initialLedger(game) };
        })();
    return {
      ...restored,
      blocked: false,
      error: "",
    };
  } catch {
    const game = initialGame();
    return {
      game,
      ledger: initialLedger(game),
      blocked: true,
      error:
        "La sauvegarde ne peut pas être lue. Elle est conservée. Importez une copie ou choisissez « Nouvelle partie » dans les paramètres.",
    };
  }
}
function StockForm({
  pond,
  game,
  submit,
}: {
  pond: Pond;
  game: Game;
  submit: (a: Action) => void;
}) {
  const [species, setSpecies] = useState<SpeciesId>(
    pond.facility === "earth"
      ? "carp"
      : pond.facility === "ras"
        ? "tilapia"
        : "trout",
  );
  const [count, setCount] = useState(
    pond.facility === "earth" ? 100 : pond.facility === "ras" ? 600 : 1000,
  );
  const cost = count * SPECIES[species].seedPrice + STOCK_FREIGHT;
  const stockAvailability = availability(game, {
    type: "stock",
    pondId: pond.id,
    species,
    count,
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit({ type: "stock", pondId: pond.id, species, count });
      }}
    >
      <p className="modal-intro">
        Commandez un lot pour {pond.name}. Livraison et acclimatation dans 4
        jours, puis observation pendant 14 jours. Prévoyez les aliments avant
        l’arrivée.
      </p>
      <div className="species-options">
        {Object.values(SPECIES).map((s) => (
          <Button
            tone="secondary"
            disabledReason={
              "Cette espèce demande une autre installation. Consultez Construire pour choisir une filière compatible."
            }
            key={s.id}
            type="button"
            className={`species-option ${s.id === species ? "active" : ""}`}
            disabled={!compatible(pond, s.id)}
            aria-pressed={s.id === species}
            onClick={() => setSpecies(s.id)}
          >
            <FishArt color={s.color} />
            <span>
              <strong>{s.name}</strong>
              <small>
                {!compatible(pond, s.id)
                  ? "Installation incompatible"
                  : `${formatUnitPrice(s.seedPrice)} / alevin · ${s.temperature.join("–")} °C`}
              </small>
            </span>
            {!compatible(pond, s.id) ? (
              <LockKeyhole size={16} />
            ) : species === s.id ? (
              <Check size={17} />
            ) : null}
          </Button>
        ))}
      </div>
      <label className="field-label" htmlFor="fish-count">
        Nombre d’alevins{" "}
        <span>Limite au calibre de vente : {pond.capacity}</span>
      </label>
      <div className="quantity-input">
        <button
          type="button"
          aria-label="Retirer 10 alevins"
          onClick={() => setCount(Math.max(1, count - 10))}
        >
          <Minus size={16} />
        </button>
        <input
          id="fish-count"
          type="number"
          min="1"
          max={pond.capacity}
          required
          value={count}
          onChange={(e) => setCount(e.target.valueAsNumber || 0)}
        />
        <button
          type="button"
          aria-label="Ajouter 10 alevins"
          onClick={() => setCount(Math.min(pond.capacity, count + 10))}
        >
          <Plus size={16} />
        </button>
      </div>
      <p className="hint">
        La capacité est calculée à la biomasse de récolte. {pond.volume} m³ ·{" "}
        {facilityName(pond)}. Le nouveau lot est suivi en observation pendant 14
        jours.
      </p>
      <div className="checkout-line">
        <span>Coût du lot + transport vivant ({euro(STOCK_FREIGHT)})</span>
        <strong>{euro(cost)}</strong>
      </div>
      <Button
        tone="primary"
        disabledReason={formatEngineText(stockAvailability.reason)}
        type="submit"
        className="button primary full"
        disabled={stockAvailability.disabled}
      >
        Commander {number(count)} juvéniles <ArrowRight size={17} />
      </Button>
      {cost > game.money && (
        <p className="inline-error">Trésorerie insuffisante.</p>
      )}
    </form>
  );
}
export default function App() {
  const { preferences, setPreferences } = usePreferences();
  const [settingsTab, setSettingsTab] = useState<"display" | "save" | "audio">(
    "save",
  );
  const [boot] = useState(load);
  const [game, setGame] = useState<Game>(boot.game);
  const [ledger, setLedger] = useState(boot.ledger);
  const currentLedger = useRef(ledger);
  currentLedger.current = ledger;
  const audio = useAudio(game.day);
  const currentGame = useRef(game);
  currentGame.current = game;
  const [session, setSession] = useState(0);
  const readings = usePondReadings(game, session);
  const surveyed = useRef(boot.game.development.surveyed);
  const [storageBlocked, setStorageBlocked] = useState(boot.blocked);
  const [storageError, setStorageError] = useState(boot.error);
  const [saved, setSaved] = useState(false);
  const [saveRevision, setSaveRevision] = useState(0);
  const {
    panel,
    open: navigate,
    toggle: togglePanel,
    close: closePanel,
  } = usePanelNavigation();
  const [worldMode, setWorldMode] = useState<SceneMode>("farm");
  const [species, setSpecies] = useState<SpeciesId>("trout");
  const [clearWater, setClearWater] = useState(false);
  const [cameraReset, setCameraReset] = useState(0);
  const [logisticsTab, setLogisticsTab] = useState<LogisticsTab>("supply");
  const [pondTab, setPondTab] = useState<PondTab>("water");
  const [selected, setSelected] = useState(1);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [modal, setModal] = useState<ModalKind>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    ok: boolean;
    feedbackId?: number;
  } | null>(null);
  const activeEvent = modal ? undefined : events[0];
  const clock = useGameClock(tickDay, !!modal || events.length > 0);
  const dismissEvent = useCallback(
    () => setEvents((queue) => queue.slice(1)),
    [],
  );
  useEffect(() => {
    if (activeEvent)
      audio.play(
        activeEvent.kind === "celebration"
          ? "celebrate"
          : activeEvent.kind === "alert"
            ? "alert"
            : "open",
      );
  }, [activeEvent, audio.play]);
  function commit(
    before: Game,
    after: Game,
    reason = "",
    action: Action | { type: "day" } = { type: "day" },
  ) {
    const updated = recordLedger(currentLedger.current, before, after, action);
    currentLedger.current = updated;
    setLedger(updated);
    currentGame.current = after;
    setGame(after);
    const incoming = gameEvents(before, after, reason);
    const firstHarvest = incoming.some((e) => e.id.endsWith(":first-harvest"));
    const paid = after.development.paid > before.development.paid;
    if (firstHarvest || paid) {
      const period = paid ? updated.cycles.at(-1)! : updated.current;
      const milestone = incoming.findIndex((e) =>
        e.id.endsWith(paid ? ":first-paid" : ":first-harvest"),
      );
      incoming.splice(milestone + 1, 0, {
        id: `${after.day}:report-${paid ? "paid" : "harvest"}-${after.development.paid}`,
        kind: "event",
        title: paid ? "Bilan du cycle payé" : "Bilan provisoire",
        text: "",
        illustration: paid ? "payment" : "harvest",
        report: {
          period,
          previous: paid ? updated.cycles.at(-2) : updated.cycles.at(-1),
          provisional: !paid,
          pending: coldExpected(after),
        },
      });
    }
    if (incoming.length) {
      clock.pause();
      setNotice(null);
      setEvents((queue) =>
        [
          ...queue,
          ...incoming.filter((e) => !queue.some((old) => old.id === e.id)),
        ].sort(
          (a, b) => Number(b.kind === "alert") - Number(a.kind === "alert"),
        ),
      );
    }
    return (
      incoming.length > 0 ||
      !!reason ||
      (!before.development.surveyed && after.development.surveyed)
    );
  }
  function tickDay(seeking: boolean) {
    const before = currentGame.current,
      started = performance.now();
    if (seeking && !hasUpcomingEvent(before)) {
      setEvents([
        {
          id: `${before.day}:nothing-scheduled`,
          kind: "event",
          title: "Préparez votre prochaine étape",
          text: "Aucune livraison ni activité n’est en cours. Choisissez une action pour développer votre ferme.",
          illustration: "water",
          task: nextTask(before),
        },
      ]);
      return true;
    }
    const pending = beginFeedback(before, { type: "day" }, audio.play, started);
    const result =
      seeking || before.mode === "guided"
        ? advanceGuided(before, 1)
        : { game: nextDay(before), reason: "" };
    requestFeedback(
      before,
      result.game,
      { type: "day" },
      true,
      result.reason || "Une journée écoulée.",
      audio.play,
      started,
      pending,
    );
    return commit(before, result.game, result.reason);
  }
  useEffect(() => {
    if (panel || modal) audio.play("open");
  }, [panel, modal, audio.play]);
  useEffect(() => {
    if (!surveyed.current && game.development.surveyed) {
      clock.pause();
      setModal("survey");
    }
    surveyed.current = game.development.surveyed;
  }, [game.development.surveyed]);
  const fileInput = useRef<HTMLInputElement>(null);
  const pond = game.ponds.find((p) => p.id === selected)!;
  useLayoutEffect(() => {
    const shell = document.querySelector<HTMLElement>(".game-shell")!;
    const hud = shell.querySelector<HTMLElement>(".game-hud")!;
    const goal = shell.querySelector<HTMLElement>(".goal-hud")!;
    const dock = shell.querySelector<HTMLElement>(".game-dock")!;
    const measure = () => {
      shell.style.setProperty(
        "--dock-top",
        `${innerHeight - dock.getBoundingClientRect().top + 12}px`,
      );
      shell.style.setProperty(
        "--hud-bottom",
        `${hud.getBoundingClientRect().bottom + 12}px`,
      );
      shell.style.setProperty(
        "--goal-bottom",
        `${goal.getBoundingClientRect().bottom + 8}px`,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(hud);
    observer.observe(goal);
    observer.observe(dock);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  const close = useCallback(() => {
    setModal(null);
    setResetConfirm(false);
  }, []);
  useEffect(() => {
    if (storageBlocked) return;
    try {
      localStorage.setItem(SAVE_KEY, serializeSave(game, ledger));
      setSaved(true);
      setSaveRevision((v) => v + 1);
      setStorageError("");
    } catch {
      setSaved(false);
      setStorageError(
        "La sauvegarde automatique est indisponible. Exportez votre partie depuis les paramètres pour la conserver.",
      );
    }
  }, [game, ledger, storageBlocked]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const pondState = useRef(game.ponds);
  pondState.current = game.ponds;
  const selectPond = useCallback(
    (id: number) => {
      setSelected(id);
      setPondTab("water");
      navigate(
        pondState.current.find((p) => p.id === id)?.built ? "ponds" : "project",
      );
    },
    [navigate],
  );
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (modal || activeEvent || e.defaultPrevented || e.isComposing) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (panel) closePanel();
        else setModal("settings");
      }
      const match = PANELS.find(
        (p) => p.key.toLowerCase() === e.key.toLowerCase(),
      );
      if (e.altKey && !e.ctrlKey && !e.metaKey && match) {
        e.preventDefault();
        togglePanel(match.id);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [modal, activeEvent, panel, closePanel, togglePanel]);
  function perform(action: Action, dismiss = false) {
    const before = currentGame.current;
    const started = performance.now();
    const pending = beginFeedback(before, action, audio.play, started);
    const result = act(before, action);
    const feedback = requestFeedback(
      before,
      result.game,
      action,
      result.ok,
      result.message,
      audio.play,
      started,
      pending,
    );
    if (result.ok) {
      commit(before, result.game, "", action);
      if (action.type === "harvest") setLogisticsTab("shipments");
      if (dismiss) close();
    }
    setNotice({ text: result.message, ok: result.ok, feedbackId: feedback.id });
  }
  function openStock(pondId: number) {
    setSelected(pondId);
    setModal("stock");
  }
  function followTask(task: Task) {
    if (task.action) perform(task.action);
    else if (task.stock) openStock(task.stock);
    else if (task.wait) {
      clock.seek(task.wait);
    } else if (task.target) {
      if (task.target === "logistics")
        setLogisticsTab(
          task.stage === 7
            ? "shipments"
            : task.stage === 5 || task.stage === 6
              ? "clients"
              : "supply",
        );
      if (task.pondId) setSelected(task.pondId);
      if (task.urgent && task.target === "ponds") setPondTab("water");
      navigate(task.target);
    }
  }
  function exportSave() {
    const blob = new Blob([serializeSave(game, ledger, true)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `les-etangs-jour-${game.day}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    audio.play("confirm");
    setNotice({ text: "Votre copie de sauvegarde a été exportée.", ok: true });
  }
  async function importSave(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error("Ce fichier est trop volumineux.");
      const restoredSave = parseSavedGame(await file.text());
      const restored = restoredSave.game;
      currentLedger.current = restoredSave.ledger;
      setLedger(restoredSave.ledger);
      clearFeedback();
      setEvents([]);
      surveyed.current = restored.development.surveyed;
      setSession((s) => s + 1);
      currentGame.current = restored;
      setGame(restored);
      setStorageBlocked(false);
      clock.pause();
      setSelected(1);
      close();
      setNotice({
        text: `Partie restaurée au jour ${restored.day}.`,
        ok: true,
      });
    } catch (error) {
      audio.play("error");
      setNotice({
        text:
          error instanceof SyntaxError
            ? "Ce fichier n’est pas un JSON valide. La partie actuelle est conservée."
            : (error as Error).message,
        ok: false,
      });
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  return (
    <>
      <div
        className="game-shell"
        inert={modal || activeEvent ? true : undefined}
        data-panel={panel ?? "none"}
      >
        <h1 className="sr-only">Les Étangs — votre exploitation</h1>
        <main className="game-world" aria-label="Le terrain">
          <Suspense
            fallback={
              <div className="world-loading" role="status">
                Préparation du terrain…
              </div>
            }
          >
            <FarmScene
              ponds={game.ponds}
              selected={selected}
              select={selectPond}
              day={game.day}
              mode={worldMode}
              species={species}
              clearWater={clearWater}
              reset={cameraReset}
            />
          </Suspense>
        </main>
        <GameHud
          game={game}
          saved={saved}
          saveRevision={saveRevision}
          storageError={storageError}
          clock={clock}
          settings={() => setModal("settings")}
          alerts={() => navigate("journal")}
        />
        <GoalHud
          game={game}
          follow={followTask}
          objectives={() => setModal("objectives")}
        />
        <WorldControls
          mode={worldMode}
          changeMode={(mode) => {
            setWorldMode(mode);
            if (mode === "fish") {
              closePanel();
              if (pond.species) setSpecies(pond.species);
            }
          }}
          reset={() => setCameraReset((r) => r + 1)}
          clearWater={clearWater}
          underwater={() => {
            setWorldMode("pond");
            setClearWater((v) => !v);
          }}
          canObserve={pond.count > 0}
          hiddenOnMobile={!!panel}
        />
        {worldMode === "fish" && !panel && (
          <FishObservation species={species} setSpecies={setSpecies} />
        )}
        {panel && (
          <ManagementPanel
            id={panel}
            close={closePanel}
            summary={
              panel === "ponds" && pond.built ? (
                <VitalSummary pond={pond} />
              ) : undefined
            }
          >
            {panel === "project" && (
              <ConstructionPanel
                game={game}
                selected={selected}
                select={setSelected}
                perform={perform}
                inspect={() => navigate("ponds")}
              />
            )}
            {panel === "ponds" && (
              <PondInspector
                game={game}
                pond={pond}
                perform={perform}
                stock={() => openStock(pond.id)}
                upgrade={() => setModal("upgrade")}
                navigate={(id) => {
                  if (id === "logistics") setLogisticsTab("clients");
                  navigate(id);
                }}
                select={setSelected}
                tab={pondTab}
                setTab={setPondTab}
                readings={readings[pond.id] || []}
              />
            )}
            {panel === "logistics" && (
              <LogisticsPanel
                game={game}
                perform={perform}
                stock={openStock}
                tab={logisticsTab}
                onTab={setLogisticsTab}
                inspect={selectPond}
              />
            )}
            {panel === "finance" && (
              <FinancePanel game={game} ledger={ledger} perform={perform} />
            )}
            {panel === "journal" && <JournalPanel game={game} />}
            {panel === "guide" && <Guide />}
          </ManagementPanel>
        )}
        <FeedbackLayer panelOpen={!!panel} />
        <Dock active={panel} open={togglePanel} />
      </div>
      {notice && !modal && !activeEvent && (
        <Toast
          feedbackId={notice.feedbackId}
          text={formatEngineText(notice.text)}
          ok={notice.ok}
          close={() => setNotice(null)}
        />
      )}
      {modal && (
        <Modal
          close={close}
          title={
            modal === "stock"
              ? "Commander des juvéniles"
              : modal === "survey"
                ? "Votre analyse de l’eau"
                : modal === "upgrade"
                  ? "Équiper le bassin"
                  : modal === "objectives"
                    ? "Objectifs du domaine"
                    : "Votre partie, bien au chaud"
          }
        >
          <DialogFeedback />
          {notice && (
            <Toast
              inline
              feedbackId={notice.feedbackId}
              text={formatEngineText(notice.text)}
              ok={notice.ok}
              close={() => setNotice(null)}
            />
          )}
          {modal === "stock" && (
            <StockForm
              pond={pond}
              game={game}
              submit={(a) => perform(a, true)}
            />
          )}
          {modal === "survey" && (
            <>
              <WaterSurvey game={game} />
              <Button
                className="full"
                onClick={() => {
                  close();
                  navigate("project");
                }}
              >
                Choisir une parcelle
              </Button>
            </>
          )}
          {modal === "upgrade" && (
            <>
              <div className="modal-hero">
                {pond.upgrade === 0 ? (
                  <Wind size={46} />
                ) : (
                  <Droplets size={46} />
                )}
              </div>
              <h3 className="center">
                {pond.upgrade === 0
                  ? "Un aérateur pour mieux respirer"
                  : "Un filtre biologique pour une eau saine"}
              </h3>
              <p className="modal-intro">
                {pond.upgrade === 0
                  ? "L’aérateur augmente les échanges avec l’air. Son efficacité dépend de la saturation en oxygène, donc de la température et de la demande du lot."
                  : "La biofiltration convertit l’azote ammoniacal et consomme de l’oxygène. Le filtre monte progressivement en charge pendant 30 jours : ne suralimentez pas le lot."}
              </p>
              <div className="checkout-line">
                <span>Installation</span>
                <strong>{euro(UPGRADE_COST[pond.upgrade] || 0)}</strong>
              </div>
              <p className="hint">
                Ce niveau d’équipement consomme 3,6 kWh/jour supplémentaires,
                soit 0,79 €/jour au tarif du scénario.
              </p>
              <Button
                tone="primary"
                disabledReason={
                  pond.upgrade >= 2
                    ? "Le bassin possède déjà tous les équipements."
                    : "Trésorerie insuffisante pour cet équipement."
                }
                className="button primary full"
                disabled={
                  pond.upgrade >= 2 || game.money < UPGRADE_COST[pond.upgrade]
                }
                onClick={() =>
                  perform({ type: "upgrade", pondId: pond.id }, true)
                }
              >
                Installer l’équipement <ArrowRight size={17} />
              </Button>
              {game.money < UPGRADE_COST[pond.upgrade] && (
                <p className="inline-error">Trésorerie insuffisante.</p>
              )}
            </>
          )}
          {modal === "objectives" && (
            <>
              {game.development.paid > 0 && <OperatingGoals game={game} />}
              <h3>Étapes d’apprentissage</h3>
              <div className="objectives-list">
                {OBJECTIVES.map((o) => {
                  const claimed = game.claimed.includes(o.id);
                  const ready = o.progress(game) >= o.target;
                  return (
                    <article
                      className={`objective-item ${claimed ? "claimed" : ""}`}
                      key={o.id}
                    >
                      <span className="objective-check">
                        {claimed ? <Check size={20} /> : <Award size={20} />}
                      </span>
                      <div>
                        <h3>{o.title}</h3>
                        <p>{o.description}</p>
                        {game.mode === "guided" && (
                          <small>{euro(o.reward)} d’aide pédagogique</small>
                        )}
                        {!claimed && !ready && (
                          <div className="objective-progress">
                            <span
                              style={{
                                width: `${Math.min(100, (o.progress(game) / o.target) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {claimed ? (
                        <span className="claimed-label">Accompli</span>
                      ) : ready ? (
                        <button
                          className="button primary"
                          onClick={() => perform({ type: "claim", id: o.id })}
                        >
                          Réclamer
                        </button>
                      ) : (
                        <span className="objective-count">
                          {number(Math.min(o.target, o.progress(game)), 1)} /{" "}
                          {o.target}
                        </span>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
          {modal === "settings" && (
            <Tabs
              label="Paramètres"
              items={[
                { id: "save", label: "Partie" },
                { id: "display", label: "Affichage" },
                { id: "audio", label: "Audio" },
              ]}
              value={settingsTab}
              onChange={setSettingsTab}
            >
              {settingsTab === "audio" ? (
                <AudioSettings
                  volumes={audio.volumes}
                  change={audio.change}
                  play={audio.play}
                />
              ) : settingsTab === "display" ? (
                <div className="display-settings">
                  <Slider
                    label="Échelle de l’interface"
                    value={preferences.scale}
                    min={80}
                    max={150}
                    step={5}
                    unit=" %"
                    onChange={(scale) =>
                      setPreferences((p) => ({ ...p, scale }))
                    }
                  />
                  <SegmentedControl
                    label="Mouvement"
                    value={preferences.motion}
                    options={[
                      { value: "system", label: "Selon le système" },
                      { value: "reduce", label: "Réduit" },
                    ]}
                    onChange={(motion) =>
                      setPreferences((p) => ({ ...p, motion }))
                    }
                  />
                  <p>
                    Les légendes restent à 12 px minimum. Le mouvement réduit
                    fige les animations décoratives ; la simulation continue au
                    rythme choisi.
                  </p>
                </div>
              ) : (
                <>
                  <p className="modal-intro">
                    Votre partie est enregistrée dans ce navigateur. Gardez une
                    copie pour la retrouver sur un autre appareil.
                  </p>
                  <div className="mode-setting">
                    <label htmlFor="simulation-mode">Mode de gestion</label>
                    <select
                      id="simulation-mode"
                      value={game.mode}
                      onChange={(e) =>
                        perform({
                          type: "mode",
                          mode: e.target.value as Game["mode"],
                        })
                      }
                    >
                      <option value="guided">
                        Réaliste avec aides pédagogiques
                      </option>
                      <option value="expert">
                        Expert · sans aides économiques
                      </option>
                    </select>
                    <p>
                      Les deux modes utilisent les mêmes lois biologiques. Les
                      aides monétaires sont désactivées en mode expert.
                    </p>
                  </div>
                  <div className="settings-summary">
                    <span>
                      <Sprout size={18} /> Jour {game.day}
                    </span>
                    <strong>{euro(game.money)}</strong>
                  </div>
                  <button className="settings-action" onClick={exportSave}>
                    <ArrowDownToLine size={20} />
                    <span>
                      <strong>Exporter ma partie</strong>
                      <small>Télécharger une copie au format JSON</small>
                    </span>
                    <ArrowUpRight size={17} />
                  </button>
                  <button
                    className="settings-action"
                    onClick={() => fileInput.current?.click()}
                  >
                    <Upload size={20} />
                    <span>
                      <strong>Importer une sauvegarde</strong>
                      <small>
                        Remplace la partie actuelle après validation du fichier
                      </small>
                    </span>
                    <ArrowUpRight size={17} />
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".json,application/json"
                    hidden
                    aria-label="Fichier de sauvegarde"
                    onChange={(e) => void importSave(e.target.files?.[0])}
                  />
                  <div className="settings-danger">
                    {resetConfirm ? (
                      <>
                        <p>
                          Recommencer effacera la partie enregistrée dans ce
                          navigateur. Exportez-la d’abord si vous souhaitez la
                          garder.
                        </p>
                        <div className="button-row">
                          <button
                            className="button outline"
                            onClick={() => setResetConfirm(false)}
                          >
                            <ArrowLeft size={15} />
                            Annuler
                          </button>
                          <button
                            className="button danger"
                            onClick={() => {
                              clearFeedback();
                              setEvents([]);
                              surveyed.current = false;
                              setSession((s) => s + 1);
                              const fresh = initialGame(game.mode);
                              currentGame.current = fresh;
                              setGame(fresh);
                              currentLedger.current = initialLedger(fresh);
                              setLedger(currentLedger.current);
                              setStorageBlocked(false);
                              clock.pause();
                              setSelected(1);
                              closePanel();
                              setWorldMode("farm");
                              close();
                              setNotice({
                                text: "Une nouvelle aventure commence aux Étangs.",
                                ok: true,
                              });
                            }}
                          >
                            Recommencer maintenant
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className="settings-action"
                        onClick={() => setResetConfirm(true)}
                      >
                        <RotateCcw size={20} />
                        <span>
                          <strong>Nouvelle partie</strong>
                          <small>Repartir du terrain vide avec 60 000 €</small>
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    )}
                  </div>
                  <p className="settings-note">
                    <LockKeyhole size={13} /> Solo, sans compte. Vos données
                    restent sur votre appareil.
                  </p>
                </>
              )}
            </Tabs>
          )}
        </Modal>
      )}
      {activeEvent?.report ? (
        <CycleReport
          key={activeEvent.id}
          report={activeEvent.report}
          close={dismissEvent}
          finances={() => {
            dismissEvent();
            navigate("finance");
          }}
        />
      ) : (
        activeEvent && (
          <EventCard
            key={activeEvent.id}
            event={activeEvent}
            close={dismissEvent}
            act={() => {
              dismissEvent();
              if (activeEvent.action) perform(activeEvent.action);
              else if (activeEvent.task) followTask(activeEvent.task);
            }}
            inspect={() => {
              dismissEvent();
              if (activeEvent.pondId) {
                setSelected(activeEvent.pondId);
                setPondTab("water");
                navigate("ponds");
              }
            }}
          />
        )
      )}
    </>
  );
}
