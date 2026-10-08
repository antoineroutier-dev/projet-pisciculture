import { useOnboarding } from "./onboarding/useOnboarding";
import "./onboarding/onboarding.css";
import { initialProfile, observeProfile } from "./state/profile";
import { platform } from "./platform";
import { Achievements } from "./panels/Achievements";
import { number } from "./ui/format";
import { t, displayText } from "./i18n";
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
  useMemo,
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
  | "achievements"
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
        {t("m_bf9b2fedcd") + " "}
        {displayText(pond.name)}
        {t("m_724e777807")}
      </p>
      <div className="species-options">
        {Object.values(SPECIES).map((s) => (
          <Button
            tone="secondary"
            disabledReason={displayText(t("m_aa36d93053"))}
            key={s.id}
            type="button"
            className={`species-option ${s.id === species ? "active" : ""}`}
            disabled={!compatible(pond, s.id)}
            aria-pressed={s.id === species}
            onClick={() => setSpecies(s.id)}
          >
            <SpeciesPortrait species={s.id} />
            <span>
              <strong>{displayText(s.name)}</strong>
              <small>
                {displayText(
                  !compatible(pond, s.id)
                    ? t("m_d390553a96")
                    : t(
                        "m_be0fc52023",
                        formatUnitPrice(s.seedPrice),
                        s.temperature.join("–"),
                      ),
                )}
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
        {t("m_ef31f61cf8")}
        {displayText(" ")}
        <span>
          {t("m_a742ad9a02") + " "}
          {number(pond.capacity, 2)}
        </span>
      </label>
      <div className="quantity-input">
        <button
          type="button"
          aria-label={t("m_36d152b93f")}
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
          aria-label={t("m_fd13e98b61")}
          onClick={() => setCount(Math.min(pond.capacity, count + 10))}
        >
          <Plus size={16} />
        </button>
      </div>
      <p className="hint">
        {t("m_244cd2a189") + " "}
        {number(pond.volume, 2)}
        {" " + t("m_26d7364bf2")}
        {displayText(" ")}
        {displayText(facilityName(pond))}
        {t("m_62903a1ccb")}
      </p>
      <div className="checkout-line">
        <span>
          {t("m_86541fbd1a")}
          {displayText(euro(STOCK_FREIGHT))})
        </span>
        <strong>{displayText(euro(cost))}</strong>
      </div>
      <Button
        tone="primary"
        disabledReason={displayText(formatEngineText(stockAvailability.reason))}
        type="submit"
        className="button primary full"
        disabled={stockAvailability.disabled}
      >
        {t("m_16af7be312") + " "}
        {displayText(number(count))}
        {" " + t("m_0f9f22aa5a") + " "}
        <ArrowRight size={17} />
      </Button>
      {cost > game.money && <p className="inline-error">{t("m_906113fb44")}</p>}
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
  const [profile, setProfile] = useState(boot.profile);
  const rewards = useMemo(
    () => profile.earned.map((e) => e.id),
    [profile.earned],
  );
  const currentProfile = useRef(profile);
  currentProfile.current = profile;
  const currentLedger = useRef(ledger);
  currentLedger.current = ledger;
  const currentGame = useRef(game);
  currentGame.current = game;
  const [session, setSession] = useState(0);
  const readings = usePondReadings(game, session);
  const surveyed = useRef(boot.game.development.surveyed);
  const saves = useSessionSaves(game, ledger, boot.metadata, profile);
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
  const onboarding = useOnboarding(
    game,
    profile,
    setProfile,
    panel,
    !!modal || !!activeEvent,
    session,
  );
  const clock = useGameClock(
    tickDay,
    !!modal || events.length > 0 || saves.busy || onboarding.intro,
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
    action:
      | Action
      | {
          type: "day";
        } = { type: "day" },
    seeking = false,
  ) {
    const updated = recordLedger(currentLedger.current, before, after, action);
    currentLedger.current = updated;
    setLedger(updated);
    const progress = observeProfile(currentProfile.current, after, updated);
    for (const earned of progress.earned)
      if (!currentProfile.current.earned.some((e) => e.id === earned.id)) {
        void platform.unlockAchievement(earned.id).catch(() => {});
      }
    currentProfile.current = progress;
    setProfile(progress);
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
        title: paid ? t("m_a747213ca3") : t("m_f9193a0081"),
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
          title: t("m_848161ae5e"),
          text: t("m_7f236585e2"),
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
      result.reason || t("m_6b8e168000"),
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
      serializeSave(
        value.game,
        value.ledger,
        true,
        value.metadata,
        value.profile,
      ),
      `les-etangs-jour-${value.game.day}.json`,
    );
    audio.play("confirm");
    setNotice({ text: t("m_98dcd1bdad"), ok: true });
  }
  function restore(restoredSave: Save) {
    const restored = restoredSave.game;
    currentLedger.current = restoredSave.ledger;
    setLedger(restoredSave.ledger);
    currentProfile.current = restoredSave.profile;
    setProfile(restoredSave.profile);
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
    setNotice({ text: t("m_7a030163b5", restored.day), ok: true });
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
      if (file.size > 2000000) throw new Error(t("m_bf4a999543"));
      const restoredSave = parseSavedGame(await file.text());
      restore(restoredSave);
    } catch (error) {
      audio.play("error");
      setNotice({
        text:
          error instanceof SyntaxError
            ? t("m_6c8da3bdea")
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
        <h1 className="sr-only">{t("m_cb387b669a")}</h1>
        <main className="game-world" aria-label={t("m_9fd6579f5e")}>
          <Suspense
            fallback={
              <div className="world-loading" role="status">
                {t("m_55ae92620d")}
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
              presentation={onboarding.intro}
              introFlight={onboarding.intro}
              rewards={rewards}
              source={
                onboarding.active &&
                !onboarding.intro &&
                !game.development.surveyed &&
                game.development.surveyDue === null
                  ? () => perform({ type: "survey" })
                  : undefined
              }
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
          onboarding={onboarding}
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
            {panel === "guide" && (
              <Guide
                replayTutorial={() => {
                  onboarding.replay();
                  closePanel();
                  clock.pause();
                }}
                achievements={() => setModal("achievements")}
              />
            )}
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
          text={displayText(formatEngineText(notice.text))}
          ok={notice.ok}
          close={() => setNotice(null)}
        />
      )}
      {modal && (
        <Modal
          key={modal}
          className={modal === "save" || modal === "load" ? "save-dialog" : ""}
          close={close}
          title={displayText(
            modal === "stock"
              ? t("m_df22c1f8f7")
              : modal === "survey"
                ? t("m_0265afabb4")
                : modal === "upgrade"
                  ? t("m_3dc218e77e")
                  : modal === "achievements"
                    ? t("achievements.title")
                    : modal === "objectives"
                      ? t("m_c435e6a608")
                      : modal === "pause"
                        ? t("m_066abc0005")
                        : modal === "save"
                          ? t("m_73195e944d")
                          : modal === "load"
                            ? t("m_3e961df87c")
                            : modal === "leave"
                              ? t("m_bd3034cf05")
                              : t("m_89ec71f965"),
          )}
        >
          <DialogFeedback />
          {notice && (
            <Toast
              inline
              feedbackId={notice.feedbackId}
              text={displayText(formatEngineText(notice.text))}
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
                {t("m_733c097b01")}
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
                {displayText(
                  pond.upgrade === 0 ? t("m_fb0fe7875e") : t("m_743a02b8e0"),
                )}
              </h3>
              <p className="modal-intro">
                {displayText(
                  pond.upgrade === 0 ? t("m_0169562881") : t("m_0119a8888f"),
                )}
              </p>
              <div className="checkout-line">
                <span>{t("m_c3fc54aa53")}</span>
                <strong>
                  {displayText(euro(UPGRADE_COST[pond.upgrade] || 0))}
                </strong>
              </div>
              <p className="hint">{t("m_e403385ce2")}</p>
              <Button
                tone="primary"
                disabledReason={displayText(
                  pond.upgrade >= 2 ? t("m_86fbc44b28") : t("m_a693b2f061"),
                )}
                className="button primary full"
                disabled={
                  pond.upgrade >= 2 || game.money < UPGRADE_COST[pond.upgrade]
                }
                onClick={() =>
                  perform({ type: "upgrade", pondId: pond.id }, true)
                }
              >
                {t("m_418c218915") + " "}
                <ArrowRight size={17} />
              </Button>
              {game.money < UPGRADE_COST[pond.upgrade] && (
                <p className="inline-error">{t("m_906113fb44")}</p>
              )}
            </>
          )}
          {modal === "achievements" && <Achievements profile={profile} />}
          {modal === "objectives" && (
            <>
              {game.development.paid > 0 && (
                <OperatingGoals game={game} ledger={ledger} profile={profile} />
              )}
              <Button tone="secondary" onClick={() => setModal("achievements")}>
                {t("achievements.title")}
              </Button>
              <h3>{t("m_feb531085c")}</h3>
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
                        <h3>{displayText(o.title)}</h3>
                        <p>{displayText(o.description)}</p>
                        {game.mode === "guided" && (
                          <small>
                            {displayText(euro(o.reward))}
                            {" " + t("m_fc66840d23")}
                          </small>
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
                        <span className="claimed-label">
                          {t("m_4fae8e572e")}
                        </span>
                      ) : ready ? (
                        <button
                          className="button primary"
                          onClick={() => perform({ type: "claim", id: o.id })}
                        >
                          {t("m_7b2692b661")}
                        </button>
                      ) : (
                        <span className="objective-count">
                          {displayText(
                            number(Math.min(o.target, o.progress(game)), 1),
                          )}{" "}
                          /{displayText(" ")}
                          {number(o.target, 2)}
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
              <p>{t("m_4f3178878c")}</p>
              <Button onClick={exportSave}>{t("m_6e634f953d")}</Button>
              <Button onClick={close}>{t("m_db787a0d33")}</Button>
              <Button tone="danger" onClick={onTitle}>
                {t("m_163a80644a")}
              </Button>
            </div>
          )}
          {modal === "settings" && (
            <SettingsPanel
              runtime={runtime}
              mode={game.mode}
              changeMode={(mode) => perform({ type: "mode", mode })}
            >
              <p className="modal-intro">{t("m_cb7677e5f6")}</p>
              <div className="settings-summary">
                <span>
                  <Sprout size={18} />
                  {" " + t("m_3eb0f64015") + " "}
                  {number(game.day, 2)}
                </span>
                <strong>{displayText(euro(game.money))}</strong>
              </div>
              <Button onClick={() => setModal("save")}>
                {t("m_492380fb67")}
              </Button>
              <button className="settings-action" onClick={exportSave}>
                <ArrowDownToLine size={20} />
                <span>
                  <strong>{t("m_6e634f953d")}</strong>
                  <small>{t("m_bb4cab3894")}</small>
                </span>
                <ArrowUpRight size={17} />
              </button>
              <button
                className="settings-action"
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={20} />
                <span>
                  <strong>{t("m_da243ce47e")}</strong>
                  <small>{t("m_7fdf4c4fb2")}</small>
                </span>
                <ArrowUpRight size={17} />
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                hidden
                aria-label={t("m_00dde4de80")}
                onChange={(e) => void importSave(e.target.files?.[0])}
              />
              <div className="settings-danger">
                {resetConfirm ? (
                  <>
                    <p>{t("m_40b1b7b11e")}</p>
                    <div className="button-row">
                      <button
                        className="button outline"
                        onClick={() => setResetConfirm(false)}
                      >
                        <ArrowLeft size={15} />
                        {t("m_46ad3916f6")}
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
                          currentProfile.current = initialProfile();
                          setProfile(currentProfile.current);
                          saves.reset(initialMetadata());
                          clock.pause();
                          setSelected(1);
                          closePanel();
                          setWorldMode("farm");
                          close();
                          setNotice({
                            text: t("m_47bb8fc3e5"),
                            ok: true,
                          });
                        }}
                      >
                        {t("m_d5fc234353")}
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
                      <strong>{t("m_c1f44907f3")}</strong>
                      <small>{t("m_c6f93394db")}</small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                )}
              </div>
              <p className="settings-note">
                <LockKeyhole size={13} />
                {" " + t("m_066480abf3")}
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
