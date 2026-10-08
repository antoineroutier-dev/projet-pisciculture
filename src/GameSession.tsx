import { matchControl } from "./controls/bindings";
import { interruptingEvents } from "./controls/interruptions";
import { SettingsPanel } from "./panels/SettingsPanel";
import { SaveSlots } from "./panels/SaveSlots";
import { PauseMenu } from "./panels/PauseMenu";
import { useSessionSaves } from "./state/useSessionSaves";
import { initialMetadata } from "./state/saveMetadata";
import { downloadSave } from "./state/saveSlots";
import type { Runtime } from "./state/runtime";
import { NotificationStack } from "./world/NotificationStack";
import { WorldContext } from "./world/WorldContext";
import type { WorldTarget } from "./world/selection";
import { publishLife, clearLife } from "./world/lifeBus";
import { initialLedger, recordLedger, coldExpected } from "./state/ledger";
import { parseSavedGame, serializeSave, type Save } from "./state/saves";
import { CycleReport } from "./panels/CycleReport";
import { useGameClock } from "./state/useGameClock";
import {
  gameEvents,
  hasUpcomingEvent,
  type GameEvent,
} from "./state/gameEvents";
import { EventCard } from "./panels/EventCard";
import {
  requestFeedback,
  beginFeedback,
  clearFeedback,
} from "./state/feedback";
import { FeedbackLayer, DialogFeedback } from "./world/FeedbackLayer";
import { Toast } from "./ui/Primitives";
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
import { SpeciesPortrait } from "./world/SpeciesPortrait";
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
  advanceGuided,
  compatible,
  facilityName,
  initialGame,
  number,
  OBJECTIVES,
  SPECIES,
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
  | "pause"
  | "save"
  | "load"
  | "leave"
  | null;
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
            <SpeciesPortrait species={s.id} />
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
export default function GameSession({
  boot,
  runtime,
  onDay,
  onTitle,
}: {
  boot: Save;
  runtime: Runtime;
  onDay: (day: number) => void;
  onTitle: () => void;
}) {
  const { audio, graphics } = runtime;
  const [game, setGame] = useState<Game>(boot.game);
  const [ledger, setLedger] = useState(boot.ledger);
  const currentLedger = useRef(ledger);
  currentLedger.current = ledger;
  const currentGame = useRef(game);
  currentGame.current = game;
  const [session, setSession] = useState(0);
  const readings = usePondReadings(game, session);
  const surveyed = useRef(boot.game.development.surveyed);
  const saves = useSessionSaves(game, ledger, boot.metadata);
  const saved = saves.saved,
    storageError = saves.error,
    saveRevision = saves.revision;
  useEffect(() => onDay(game.day), [game.day, onDay]);
  const {
    panel,
    open: navigate,
    toggle: togglePanel,
    close: closePanel,
  } = usePanelNavigation();
  const [worldTarget, setWorldTarget] = useState<WorldTarget | null>({
    kind: "pond",
    id: 1,
  });
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
  const clock = useGameClock(
    tickDay,
    !!modal || events.length > 0 || saves.busy,
  );
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
    seeking = false,
  ) {
    const updated = recordLedger(currentLedger.current, before, after, action);
    currentLedger.current = updated;
    setLedger(updated);
    currentGame.current = after;
    setGame(after);
    publishLife(before, after);
    const allEvents = gameEvents(before, after, reason);
    const incoming = interruptingEvents(
      allEvents,
      runtime.preferences.autoPause,
      seeking,
    );
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
    if (!incoming.length && allEvents.length)
      setNotice({ text: allEvents.map((e) => e.text).join(" "), ok: true });
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
      (!!reason && (runtime.preferences.autoPause || seeking)) ||
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
    const result = advanceGuided(before, 1);
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
    return commit(before, result.game, result.reason, { type: "day" }, seeking);
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
  const saveBusy = useRef(saves.busy);
  saveBusy.current = saves.busy;
  const close = useCallback(() => {
    if (saveBusy.current) return;
    setModal(null);
    setResetConfirm(false);
  }, []);
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
      setWorldTarget({ kind: "pond", id });
      setWorldMode("pond");
      setPondTab("water");
      navigate(
        pondState.current.find((p) => p.id === id)?.built ? "ponds" : "project",
      );
    },
    [navigate],
  );
  useEffect(() => {
    setWorldTarget((old) =>
      old?.kind === "pond" && old.id !== selected
        ? { kind: "pond", id: selected }
        : old,
    );
  }, [selected]);
  const inspectWorld = useCallback(
    (target: WorldTarget) => {
      setWorldTarget(target);
      if (target.kind === "pond") {
        selectPond(target.id);
        return;
      }
      setWorldMode("buildings");
      setLogisticsTab(
        target.kind === "asset"
          ? "assets"
          : target.cargo === "cold"
            ? "shipments"
            : "supply",
      );
      if (target.kind === "truck" && target.pondId) {
        setSelected(target.pondId);
        setWorldMode("pond");
      }
      navigate("logistics");
    },
    [selectPond, navigate],
  );
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (modal || activeEvent || e.defaultPrevented || e.isComposing) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (panel) closePanel();
        else setModal("pause");
      }
      const action = matchControl(e, runtime.preferences.bindings);
      const match = PANELS.find((p) => p.id === action);
      if (match) {
        e.preventDefault();
        togglePanel(match.id);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [
    modal,
    activeEvent,
    panel,
    closePanel,
    togglePanel,
    runtime.preferences.bindings,
  ]);
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
    const value = saves.snapshot();
    downloadSave(
      serializeSave(value.game, value.ledger, true, value.metadata),
      `les-etangs-jour-${value.game.day}.json`,
    );
    audio.play("confirm");
    setNotice({ text: "Votre copie de sauvegarde a été exportée.", ok: true });
  }
  function restore(restoredSave: Save) {
    const restored = restoredSave.game;
    currentLedger.current = restoredSave.ledger;
    setLedger(restoredSave.ledger);
    clearFeedback();
    clearLife();
    setWorldTarget({ kind: "pond", id: 1 });
    setEvents([]);
    surveyed.current = restored.development.surveyed;
    setSession((s) => s + 1);
    currentGame.current = restored;
    setGame(restored);
    saves.reset(restoredSave.metadata);
    clock.pause();
    setSelected(1);
    close();
    setNotice({ text: `Partie restaurée au jour ${restored.day}.`, ok: true });
  }
  async function leave() {
    clock.pause();
    try {
      await saves.saveNow();
      onTitle();
    } catch (error) {
      setNotice({ text: (error as Error).message, ok: false });
      setModal("leave");
    }
  }
  async function importSave(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error("Ce fichier est trop volumineux.");
      const restoredSave = parseSavedGame(await file.text());
      restore(restoredSave);
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
        inert={modal || activeEvent || saves.busy ? true : undefined}
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
              development={game.development}
              food={game.food}
              selected={selected}
              select={selectPond}
              day={game.day}
              mode={worldMode}
              species={species}
              clearWater={clearWater}
              reset={cameraReset}
              clock={clock}
              graphics={graphics}
              target={worldTarget}
              inspect={inspectWorld}
              panelOpen={!!panel}
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
          menu={() => setModal("pause")}
          alerts={() => navigate("journal")}
        />
        <GoalHud
          game={game}
          follow={followTask}
          objectives={() => setModal("objectives")}
        />
        <NotificationStack
          game={game}
          inspect={inspectWorld}
          journal={() => navigate("journal")}
        />
        <WorldControls
          mode={worldMode}
          changeMode={(mode) => {
            setWorldMode(mode);
            if (mode === "buildings") setWorldTarget(null);
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
              <>
                {worldTarget && worldTarget.kind !== "pond" && (
                  <WorldContext
                    target={worldTarget}
                    game={game}
                    close={() => setWorldTarget(null)}
                  />
                )}
                <LogisticsPanel
                  game={game}
                  perform={perform}
                  stock={openStock}
                  tab={logisticsTab}
                  onTab={setLogisticsTab}
                  inspect={selectPond}
                />
              </>
            )}
            {panel === "finance" && (
              <FinancePanel game={game} ledger={ledger} perform={perform} />
            )}
            {panel === "journal" && <JournalPanel game={game} />}
            {panel === "guide" && <Guide />}
          </ManagementPanel>
        )}
        <FeedbackLayer panelOpen={!!panel} />
        <Dock
          gamepad={runtime.gamepad.active}
          active={panel}
          open={togglePanel}
        />
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
          key={modal}
          className={modal === "save" || modal === "load" ? "save-dialog" : ""}
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
                    : modal === "pause"
                      ? "Partie en pause"
                      : modal === "save"
                        ? "Sauvegarder une partie"
                        : modal === "load"
                          ? "Charger une partie"
                          : modal === "leave"
                            ? "Conserver votre partie"
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
          {modal === "pause" && (
            <PauseMenu
              busy={saves.busy}
              resume={close}
              save={() => setModal("save")}
              load={() => setModal("load")}
              settings={() => setModal("settings")}
              guide={() => {
                close();
                navigate("guide");
              }}
              title={() => void leave()}
            />
          )}
          {(modal === "save" || modal === "load") && (
            <SaveSlots
              load={restore}
              save={modal === "save" ? saves.saveManual : undefined}
              current={saves.snapshot()}
              exportCurrent={exportSave}
            />
          )}
          {modal === "leave" && (
            <div className="pause-menu">
              <p>
                La partie reste ouverte tant que vous ne quittez pas ce menu.
              </p>
              <Button onClick={exportSave}>Exporter ma partie</Button>
              <Button onClick={close}>Revenir au jeu</Button>
              <Button tone="danger" onClick={onTitle}>
                Quitter sans enregistrer
              </Button>
            </div>
          )}
          {modal === "settings" && (
            <SettingsPanel
              runtime={runtime}
              mode={game.mode}
              changeMode={(mode) => perform({ type: "mode", mode })}
            >
              <p className="modal-intro">
                Votre partie est enregistrée dans ce navigateur. Gardez une
                copie pour la retrouver sur un autre appareil.
              </p>
              <div className="settings-summary">
                <span>
                  <Sprout size={18} /> Jour {game.day}
                </span>
                <strong>{euro(game.money)}</strong>
              </div>
              <Button onClick={() => setModal("save")}>
                Emplacements de sauvegarde
              </Button>
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
                          clearLife();
                          setWorldTarget({ kind: "pond", id: 1 });
                          setEvents([]);
                          surveyed.current = false;
                          setSession((s) => s + 1);
                          const fresh = initialGame(game.mode);
                          currentGame.current = fresh;
                          setGame(fresh);
                          currentLedger.current = initialLedger(fresh);
                          setLedger(currentLedger.current);
                          saves.reset(initialMetadata());
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
                <LockKeyhole size={13} /> Solo, sans compte. Vos données restent
                sur votre appareil.
              </p>
            </SettingsPanel>
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
