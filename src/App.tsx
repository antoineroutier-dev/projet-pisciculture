import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  CloudSun,
  Coins,
  Droplets,
  Fish,
  Heart,
  Leaf,
  LockKeyhole,
  Map,
  Minus,
  Package,
  Pause,
  Play,
  Plus,
  Settings2,
  ShoppingBasket,
  SkipForward,
  Sprout,
  Sun,
  TrendingUp,
  Waves,
  Wind,
  X,
  AlertTriangle,
  Upload,
  RotateCcw,
} from "lucide-react";
import { FishArt } from "./FishArt";
import { lazy, Suspense } from "react";
const FarmScene = lazy(() => import("./FarmScene"));
import WaterPanel from "./WaterPanel";
import ProjectPanel, { Journey, LogisticsPanel } from "./ProjectPanel";
import {
  STOCK_FREIGHT,
  FEED_FREIGHT,
  feedCapacity,
  reservedFood,
  type Task,
} from "./development";
import Guide from "./RealismGuide";
import {
  act,
  biomass,
  CONSTRUCTION_COST,
  CONSTRUCTION_DAYS,
  LEGACY_STORAGE_KEY,
  V2_STORAGE_KEY,
  advanceGuided,
  cleaningCost,
  compatible,
  facilityName,
  simDate,
  costBreakdown,
  dailyCost,
  euro,
  feedNeeded,
  FOOD_PACKS,
  harvestReady,
  initialGame,
  level,
  marketPrice,
  nextDay,
  number,
  OBJECTIVES,
  parseSave,
  pondStatus,
  population,
  SPECIES,
  STORAGE_KEY,
  UPGRADE_COST,
  weather,
  type Action,
  type Game,
  type Pond,
  type SpeciesId,
  type View,
} from "./game";

type ModalKind =
  | "stock"
  | "build"
  | "harvest"
  | "upgrade"
  | "objectives"
  | "settings"
  | null;
function load() {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(V2_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY);
    return {
      game: raw ? parseSave(raw) : initialGame(),
      blocked: false,
      error: "",
    };
  } catch {
    return {
      game: initialGame(),
      blocked: true,
      error:
        "La sauvegarde ne peut pas être lue. Elle est conservée. Importez une copie ou choisissez « Nouvelle partie » dans les paramètres.",
    };
  }
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const elements = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select, a[href], [tabindex="0"]',
          ) || []),
        ];
        const first = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = scroll;
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [close]);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-heading">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Fermer la fenêtre"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
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
          <button
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
                  : `${euro(s.seedPrice)} / alevin · ${s.temperature.join("–")} °C`}
              </small>
            </span>
            {!compatible(pond, s.id) ? (
              <LockKeyhole size={16} />
            ) : species === s.id ? (
              <Check size={17} />
            ) : null}
          </button>
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
      <button
        className="button primary full"
        disabled={
          cost > game.money ||
          count < 1 ||
          count > pond.capacity ||
          pond.fallowDays > 0
        }
      >
        Commander {number(count)} juvéniles <ArrowRight size={17} />
      </button>
      {cost > game.money && (
        <p className="inline-error">Trésorerie insuffisante.</p>
      )}
    </form>
  );
}
export default function App() {
  const [boot] = useState(load);
  const [game, setGame] = useState<Game>(boot.game);
  const [storageBlocked, setStorageBlocked] = useState(boot.blocked);
  const [storageError, setStorageError] = useState(boot.error);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<View>("project");
  const [selected, setSelected] = useState(1);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [visible, setVisible] = useState(!document.hidden);
  const [modal, setModal] = useState<ModalKind>(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(
    null,
  );
  const [journalFilter, setJournalFilter] = useState("all");
  const fileInput = useRef<HTMLInputElement>(null);
  const pond = game.ponds.find((p) => p.id === selected)!;
  const today = weather(game.day);
  const nextObjective = OBJECTIVES.find((o) => !game.claimed.includes(o.id));
  const activePonds = game.ponds.filter((p) => p.count);
  const averageHealth = activePonds.length
    ? activePonds.reduce((s, p) => s + p.health, 0) / activePonds.length
    : 100;
  const totalBiomass = game.ponds.reduce((s, p) => s + biomass(p), 0);
  const close = useCallback(() => {
    setModal(null);
    setResetConfirm(false);
  }, []);
  useEffect(() => {
    if (storageBlocked) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
      setSaved(true);
      setStorageError("");
    } catch {
      setSaved(false);
      setStorageError(
        "La sauvegarde automatique est indisponible. Exportez votre partie depuis les paramètres pour la conserver.",
      );
    }
  }, [game, storageBlocked]);
  useEffect(() => {
    const fn = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);
  useEffect(() => {
    if (!running || modal || !visible) return;
    const timer = setInterval(
      () =>
        setGame((g) => {
          if (g.mode === "expert") return nextDay(g);
          const result = advanceGuided(g, 1);
          if (result.reason) {
            setRunning(false);
            setNotice({ text: result.reason, ok: true });
          }
          return result.game;
        }),
      12000 / speed,
    );
    return () => clearInterval(timer);
  }, [running, speed, modal, visible]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  function navigate(next: View) {
    setView(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function selectPond(id: number) {
    setSelected(id);
    if (window.innerWidth <= 680)
      requestAnimationFrame(() =>
        document.querySelector(".pond-panel")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
          block: "start",
        }),
      );
  }
  function perform(action: Action, dismiss = false) {
    const result = act(game, action);
    if (result.ok) {
      setGame(result.game);
      if (dismiss) close();
    }
    setNotice({ text: result.message, ok: result.ok });
  }
  function openStock(pondId: number) {
    setSelected(pondId);
    setModal("stock");
  }
  function followTask(task: Task) {
    if (task.action) perform(task.action);
    else if (task.stock) openStock(task.stock);
    else if (task.wait) {
      setRunning(false);
      const result = advanceGuided(game, task.wait);
      setGame(result.game);
      setNotice({
        text: `${result.elapsed} jour(s) écoulé(s). ${result.reason || "Vérifiez votre prochaine étape."}`,
        ok: true,
      });
    } else if (task.target) {
      if (task.pondId) setSelected(task.pondId);
      if (task.urgent && task.target === "ponds")
        requestAnimationFrame(() => {
          const detail =
            document.querySelector<HTMLDetailsElement>(".water-details");
          if (detail) detail.open = true;
        });
      navigate(task.target);
      if (task.target === "project")
        requestAnimationFrame(() =>
          document
            .getElementById("project-plots")
            ?.scrollIntoView({ block: "start" }),
        );
    }
  }
  function exportSave() {
    const blob = new Blob([JSON.stringify(game, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `les-etangs-jour-${game.day}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice({ text: "Votre copie de sauvegarde a été exportée.", ok: true });
  }
  async function importSave(file?: File) {
    if (!file) return;
    try {
      if (file.size > 300_000)
        throw new Error("Ce fichier est trop volumineux.");
      const restored = parseSave(await file.text());
      setGame(restored);
      setStorageBlocked(false);
      setRunning(false);
      setSelected(1);
      close();
      setNotice({
        text: `Partie restaurée au jour ${restored.day}.`,
        ok: true,
      });
    } catch (error) {
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
  const viewNames: Record<View, string> = {
    project: "Mon projet",
    logistics: "Chaîne logistique",
    ponds: "Mes bassins",
    market: "Le marché",
    journal: "Le journal de bord",
    guide: "Le guide des Étangs",
  };
  const nav = [
    { id: "project" as View, label: "Mon projet", icon: <Sprout size={19} /> },
    {
      id: "logistics" as View,
      label: "Logistique",
      icon: <Package size={19} />,
    },
    { id: "ponds" as View, label: "Mes bassins", icon: <Map size={19} /> },
    {
      id: "market" as View,
      label: "Marché",
      icon: <ShoppingBasket size={19} />,
    },
    { id: "journal" as View, label: "Journal", icon: <BookOpen size={19} /> },
    { id: "guide" as View, label: "Guide", icon: <CircleHelp size={19} /> },
  ];
  return (
    <>
      <div className="app-shell" inert={modal ? true : undefined}>
        <aside className="sidebar">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("project");
            }}
            aria-label="Les Étangs, accueil"
          >
            <span className="brand-mark">
              <Fish size={25} />
              <Waves size={25} />
            </span>
            <span>
              Les Étangs<small>LA VIE AU FIL DE L’EAU</small>
            </span>
          </a>
          <div className="sidebar-rule" />
          <span className="nav-caption">VOTRE EXPLOITATION</span>
          <nav aria-label="Navigation principale">
            {nav.map((item) => (
              <button
                key={item.id}
                aria-label={item.label}
                className={`nav-item ${view === item.id ? "active" : ""}`}
                aria-current={view === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.id === "ponds" && (
                  <span className="nav-count">
                    {game.ponds.filter((p) => p.built).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="level-card">
              <div>
                <span className="level-icon">
                  <Sprout size={20} />
                </span>
                <span>
                  <strong>
                    {
                      [
                        "",
                        "Apprenti pisciculteur",
                        "Éleveur attentionné",
                        "Gardien des eaux",
                        "Artisan pisciculteur",
                        "Maître des Étangs",
                      ][level(game)]
                    }
                  </strong>
                  <small>Niveau {level(game)}</small>
                </span>
              </div>
              <div className="level-track">
                <span
                  style={{
                    width: `${level(game) === 5 ? 100 : game.xp % 100}%`,
                  }}
                />
              </div>
              <p>
                {level(game) === 5
                  ? "Vous avez trouvé votre rythme."
                  : `${100 - (game.xp % 100)} XP avant le prochain niveau`}
              </p>
            </div>
            <button
              className="settings-button"
              onClick={() => setModal("settings")}
            >
              <Settings2 size={18} />
              <span>Paramètres & sauvegarde</span>
            </button>
            <div className="sidebar-footer">
              <span className="online-dot" /> Une petite ferme, de grandes
              idées.
            </div>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb">
              Mon exploitation <ChevronRight size={13} />
              <span>{viewNames[view]}</span>
            </div>
            <div className="save-indicator">
              {saved && !storageError ? (
                <CheckCheck size={15} />
              ) : (
                <AlertTriangle size={15} />
              )}
              <span>
                {saved && !storageError
                  ? "Partie sauvegardée"
                  : "Sauvegarde à vérifier"}
              </span>
            </div>
            <button
              className="mobile-settings icon-button"
              aria-label="Paramètres & sauvegarde"
              onClick={() => setModal("settings")}
            >
              <Settings2 size={19} />
            </button>
          </header>
          <main>
            {storageError && (
              <div className="storage-banner" role="alert">
                <AlertTriangle size={18} />
                <span>{storageError}</span>
                <button onClick={() => setModal("settings")}>Paramètres</button>
              </div>
            )}
            <section className="page-heading">
              <div>
                <span className="eyebrow">
                  {view === "ponds"
                    ? "SIMULATION DE TERRAIN · ÉDITION V3"
                    : "LA VIE DE VOTRE EXPLOITATION"}
                </span>
                <h1>
                  {viewNames[view]}
                  <span className="title-dot">.</span>
                </h1>
                <p>
                  {view === "project"
                    ? "De la première analyse à la première livraison. Une décision à la fois."
                    : view === "logistics"
                      ? "Des fournisseurs aux clients : chaque livraison compte."
                      : view === "ponds"
                        ? "Observer, comprendre, élever. Au rythme du vivant."
                        : view === "market"
                          ? "De belles récoltes font les projets de demain."
                          : view === "journal"
                            ? "Chaque petit geste écrit l’histoire de votre ferme."
                            : "Les bons gestes pour une ferme florissante."}
                </p>
              </div>
              <div className="time-widget">
                <div className="day-weather">
                  <span>
                    <Sun size={16} /> {today.season} <b>·</b>{" "}
                    <strong data-testid="day">Jour {game.day}</strong>
                    <span className="simulation-date">{simDate(game.day)}</span>
                  </span>
                  <small>
                    <CloudSun size={15} />
                    {today.label} · air {today.temperature} °C
                  </small>
                </div>
                <div className="time-controls">
                  <button
                    className={`icon-button play-button ${running ? "is-running" : ""}`}
                    title={running ? "Mettre en pause" : "Lancer la simulation"}
                    aria-label={
                      running ? "Mettre en pause" : "Lancer la simulation"
                    }
                    onClick={() => setRunning(!running)}
                  >
                    {running ? <Pause size={15} /> : <Play size={15} />}
                  </button>
                  <button
                    className="speed-button"
                    aria-label={`Vitesse ${speed}, passer à ${[1, 3, 12, 60][([1, 3, 12, 60].indexOf(speed) + 1) % 4]}`}
                    onClick={() =>
                      setSpeed(
                        [1, 3, 12, 60][([1, 3, 12, 60].indexOf(speed) + 1) % 4],
                      )
                    }
                  >
                    ×{speed}
                  </button>
                  <span className="control-divider" />
                  <button
                    className="next-day"
                    onClick={() => setGame((g) => nextDay(g))}
                  >
                    Jour suivant <SkipForward size={14} />
                  </button>
                </div>
              </div>
            </section>
            {(view === "project" ||
              view === "ponds" ||
              view === "logistics") && (
              <Journey game={game} follow={followTask} />
            )}
            <section className="stats-grid" aria-label="État de l’exploitation">
              <div className="stat-card">
                <span className="stat-icon money">
                  <Coins size={21} />
                </span>
                <div>
                  <span>Trésorerie</span>
                  <strong data-testid="money">{euro(game.money)}</strong>
                  <small>
                    <span className="small-dot" /> −{euro(dailyCost(game))} de
                    charges / jour
                  </small>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon blue">
                  <Fish size={21} />
                </span>
                <div>
                  <span>Poissons en élevage</span>
                  <strong>
                    {number(population(game))}
                    <em>poissons</em>
                  </strong>
                  <small>{number(totalBiomass, 1)} kg de biomasse totale</small>
                </div>
              </div>
              <button
                className="stat-card stat-clickable"
                onClick={() => navigate("logistics")}
              >
                <span className="stat-icon sand">
                  <Package size={21} />
                </span>
                <div>
                  <span>Réserve d’aliments</span>
                  <strong>
                    {number(game.food, 1)}
                    <em>kg</em>
                  </strong>
                  <small>
                    {game.food < 10
                      ? "Commandes et livraisons"
                      : "Suivre les approvisionnements"}{" "}
                    <ArrowUpRight size={11} />
                  </small>
                </div>
              </button>
              <div className="stat-card">
                <span
                  className={`stat-icon ${averageHealth < 45 ? "pink" : "green"}`}
                >
                  <Heart size={21} />
                </span>
                <div>
                  <span>Santé des poissons</span>
                  <strong>
                    {activePonds.length ? number(averageHealth) : "—"}
                    <em>{activePonds.length ? "%" : ""}</em>
                  </strong>
                  <small>
                    <span
                      className={`small-dot ${averageHealth < 45 ? "warning" : "green"}`}
                    />
                    {!activePonds.length
                      ? "Aucun lot en élevage"
                      : averageHealth >= 80
                        ? "Tout le monde se porte bien"
                        : averageHealth >= 45
                          ? "Quelques soins feront du bien"
                          : "Vos poissons ont besoin de soins"}
                  </small>
                </div>
              </div>
            </section>
            {view === "project" && (
              <ProjectPanel game={game} perform={perform} stock={openStock} />
            )}
            {view === "logistics" && (
              <LogisticsPanel game={game} perform={perform} stock={openStock} />
            )}
            {view === "ponds" && (
              <div className="dashboard-grid">
                <div className="farm-column">
                  <section className="farm-card">
                    <div className="section-heading">
                      <div>
                        <span className="section-kicker">VUE D’ENSEMBLE</span>
                        <h2>Le domaine prend vie</h2>
                      </div>
                      <span className="live-label">
                        <span className="small-dot green" />
                        {running ? "Au fil des jours" : "À votre rythme"}
                      </span>
                    </div>
                    <Suspense
                      fallback={
                        <div className="scene-placeholder">
                          Préparation de la visite 3D…
                        </div>
                      }
                    >
                      <FarmScene
                        ponds={game.ponds}
                        selected={selected}
                        select={selectPond}
                        day={game.day}
                      />
                    </Suspense>
                  </section>
                  <div className="pond-tabs" aria-label="Choisir un bassin">
                    {game.ponds.map((p) => (
                      <button
                        key={p.id}
                        className={`pond-tab ${p.id === selected ? "selected" : ""}`}
                        onClick={() => selectPond(p.id)}
                        aria-pressed={p.id === selected}
                      >
                        <span
                          className={`pond-tab-icon ${!p.built ? "unbuilt" : ""}`}
                        >
                          {p.built ? <Waves size={20} /> : <Plus size={20} />}
                        </span>
                        <span>
                          <strong>{p.name}</strong>
                          <small>
                            {!p.built
                              ? `Aménager · ${euro(CONSTRUCTION_COST[p.id - 1])}`
                              : p.species
                                ? SPECIES[p.species].name
                                : "Bassin disponible"}
                          </small>
                        </span>
                        <ChevronRight size={15} />
                      </button>
                    ))}
                  </div>
                  <section className="objective-banner">
                    <div className="objective-icon">
                      <Award size={26} />
                    </div>
                    <div>
                      <span className="section-kicker">
                        {nextObjective
                          ? "LE PROCHAIN PETIT PAS"
                          : "BELLE RÉUSSITE !"}
                      </span>
                      <h3>
                        {nextObjective?.title || "La ferme a trouvé son rythme"}
                      </h3>
                      <p>
                        {nextObjective?.description ||
                          "Tous les objectifs sont accomplis. L’aventure continue."}
                      </p>
                    </div>
                    <button
                      className="button light"
                      onClick={() => setModal("objectives")}
                    >
                      {nextObjective &&
                      nextObjective.progress(game) >= nextObjective.target
                        ? "Réclamer la récompense"
                        : "Voir les objectifs"}
                      <ArrowRight size={16} />
                    </button>
                  </section>
                  <div className="nature-note">
                    <Leaf size={16} />
                    <span>
                      Une bonne eau, des poissons heureux. Pensez à surveiller
                      vos bassins chaque jour.
                    </span>
                    <button onClick={() => navigate("guide")}>
                      Le guide <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>
                <aside
                  className="pond-panel"
                  aria-label="Gestion du bassin sélectionné"
                >
                  <div className="pond-panel-heading">
                    <span className="section-kicker">
                      BASSIN {String(pond.id).padStart(2, "0")}
                    </span>
                    <span className={`status-badge ${pondStatus(pond).tone}`}>
                      <span />
                      {pondStatus(pond).label}
                    </span>
                    <h2>{pond.name}</h2>
                    <p>
                      {pond.volume} m³ <span>·</span> {facilityName(pond)}
                      <br />
                      {pond.upgrade === 0
                        ? "Sans aération mécanique"
                        : pond.upgrade === 1
                          ? "Aération installée"
                          : "Aération & filtration"}
                    </p>
                  </div>
                  {!pond.built ? (
                    <div className="empty-pond">
                      <span className="empty-pond-icon">
                        <Sprout size={42} />
                      </span>
                      <h3>De la place pour vos idées.</h3>
                      <p>
                        Aménagez ce terrain pour accueillir jusqu’à{" "}
                        {pond.capacity} poissons et faire grandir votre
                        exploitation.
                      </p>
                      <div className="build-cost">
                        <span>Aménagement</span>
                        <strong>{euro(CONSTRUCTION_COST[pond.id - 1])}</strong>
                      </div>
                      <button
                        className="button primary full"
                        onClick={() =>
                          pond.plannedSpecies
                            ? setModal("build")
                            : navigate("project")
                        }
                        disabled={pond.constructionDays > 0}
                      >
                        {pond.constructionDays
                          ? `Chantier · encore ${pond.constructionDays} jours`
                          : pond.plannedSpecies
                            ? "Aménager le bassin"
                            : "Choisir une filière"}{" "}
                        <Plus size={17} />
                      </button>
                      <small>
                        Travaux et mise en service :{" "}
                        {CONSTRUCTION_DAYS[pond.id - 1]} jours
                      </small>
                    </div>
                  ) : (
                    <>
                      {pond.species ? (
                        <>
                          <div className="fish-profile">
                            <div className="fish-illustration">
                              <FishArt color={SPECIES[pond.species].color} />
                            </div>
                            <h3>{SPECIES[pond.species].name}</h3>
                            <p>{SPECIES[pond.species].latin}</p>
                          </div>
                          <div className="pond-numbers">
                            <div>
                              <strong>{pond.count}</strong>
                              <span>poissons</span>
                            </div>
                            <div>
                              <strong>
                                {number(pond.weight * 1000)}
                                <small>g</small>
                              </strong>
                              <span>poids moyen</span>
                            </div>
                            <div>
                              <strong>
                                {number(biomass(pond), 1)}
                                <small>kg</small>
                              </strong>
                              <span>biomasse</span>
                            </div>
                          </div>
                          <div className="growth-section">
                            <div>
                              <span>
                                <Sprout size={15} /> Calibre commercial
                              </span>
                              <strong>
                                {Math.min(
                                  100,
                                  Math.floor(
                                    (pond.weight /
                                      SPECIES[pond.species].harvestWeight) *
                                      100,
                                  ),
                                )}{" "}
                                %
                              </strong>
                            </div>
                            <div className="growth-track">
                              <span
                                style={{
                                  width: `${Math.min(100, (pond.weight / SPECIES[pond.species].harvestWeight) * 100)}%`,
                                }}
                              />
                            </div>
                            <p>
                              {harvestReady(pond)
                                ? "Calibre atteint : préparez le client et le transport."
                                : `Vente à ${number(SPECIES[pond.species].harvestWeight * 1000)} g · hier +${number(pond.lastGrowth * 1000, 1)} g/poisson`}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="empty-stock">
                          <Fish size={36} />
                          <h3>Un nouveau départ</h3>
                          <p>Ce bassin attend ses prochains habitants.</p>
                          <button
                            className="button primary full"
                            onClick={() => setModal("stock")}
                            disabled={
                              pond.fallowDays > 0 ||
                              game.development.orders.some(
                                (o) => o.pondId === pond.id,
                              )
                            }
                          >
                            <Plus size={17} />{" "}
                            {pond.fallowDays
                              ? `Vide sanitaire · ${pond.fallowDays} jours`
                              : game.development.orders.some(
                                    (o) => o.pondId === pond.id,
                                  )
                                ? "Juvéniles en livraison"
                                : "Commander des juvéniles"}
                          </button>
                        </div>
                      )}
                      <details className="water-details">
                        <summary>Mesures de l’eau & réglages d’élevage</summary>
                        <WaterPanel pond={pond} perform={perform} />
                      </details>
                      <div className="pond-actions">
                        {pond.count > 0 && (
                          <button
                            className="button primary full"
                            onClick={() =>
                              perform({ type: "feed", pondId: pond.id })
                            }
                            disabled={pond.feedToday > 0}
                          >
                            <Package size={16} />
                            {pond.feedToday > 0
                              ? "Ration programmée"
                              : "Programmer la ration"}
                            <small>{number(feedNeeded(pond), 1)} kg</small>
                          </button>
                        )}
                        <button
                          className="button outline full"
                          onClick={() =>
                            perform({ type: "clean", pondId: pond.id })
                          }
                        >
                          <Droplets size={16} />
                          Entretenir & renouveler{" "}
                          <small>{euro(cleaningCost(pond))}</small>
                        </button>
                        {pond.count > 0 && (
                          <button
                            className={`button full ${harvestReady(pond) ? "harvest-button" : "muted-button"}`}
                            onClick={() => navigate("logistics")}
                            disabled={!harvestReady(pond)}
                          >
                            <ShoppingBasket size={16} />
                            {harvestReady(pond)
                              ? "Préparer la vente"
                              : "Laissons-les grandir"}
                            {harvestReady(pond) && (
                              <small>{number(biomass(pond), 1)} kg</small>
                            )}
                          </button>
                        )}
                      </div>
                      <button
                        className="upgrade-link"
                        onClick={() => setModal("upgrade")}
                        disabled={pond.upgrade >= 2}
                      >
                        {pond.upgrade >= 2 ? (
                          <Check size={15} />
                        ) : (
                          <Settings2 size={15} />
                        )}{" "}
                        {pond.upgrade >= 2
                          ? "Bassin entièrement équipé"
                          : "Améliorer ce bassin"}
                        {pond.upgrade < 2 && <ArrowUpRight size={14} />}
                      </button>
                    </>
                  )}
                </aside>
              </div>
            )}
            {view === "market" && (
              <div className="market-layout">
                <section className="market-main">
                  <div className="section-heading">
                    <div>
                      <span className="section-kicker">
                        PRIX DU SCÉNARIO · JOUR {game.day}
                      </span>
                      <h2>De l’étang à l’étal</h2>
                    </div>
                    <span className="pill">
                      <TrendingUp size={14} /> Prix indicatifs
                    </span>
                  </div>
                  <div className="market-species">
                    {Object.values(SPECIES).map((s) => (
                      <article className="market-species-card" key={s.id}>
                        <div className={`species-art ${s.id}`}>
                          <FishArt color={s.color} />
                          {level(game) < s.level && (
                            <span>
                              <LockKeyhole size={12} /> Niveau {s.level}
                            </span>
                          )}
                        </div>
                        <h3>{s.name}</h3>
                        <p>{s.description}</p>
                        <div className="market-price">
                          <strong>
                            {euro(marketPrice(s.id, game.day))}
                            <small>/ kg</small>
                          </strong>
                          <span
                            className={
                              marketPrice(s.id, game.day) >= s.price
                                ? "positive"
                                : "negative"
                            }
                          >
                            {marketPrice(s.id, game.day) >= s.price ? "+" : ""}
                            {number(
                              (marketPrice(s.id, game.day) / s.price - 1) * 100,
                              1,
                            )}{" "}
                            %
                          </span>
                        </div>
                        <div className="species-facts">
                          <span>
                            Alevin <b>{euro(s.seedPrice)}</b>
                          </span>
                          <span>
                            Poids de vente <b>{s.harvestWeight * 1000} g</b>
                          </span>
                          <span>
                            Eau préférée <b>{s.temperature.join("–")} °C</b>
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="market-callout">
                    <Fish size={19} />
                    <p>
                      Réservez un client, récoltez au calibre commercial, puis
                      organisez le transport dans la chaîne logistique.
                    </p>
                    <button onClick={() => navigate("logistics")}>
                      Logistique <ArrowRight size={15} />
                    </button>
                  </div>
                  <section className="food-shop">
                    <div className="section-heading">
                      <div>
                        <span className="section-kicker">LE GARDE-MANGER</span>
                        <h2>À chaque jour, son festin.</h2>
                      </div>
                      <Package size={23} />
                    </div>
                    <p>
                      Aliments adaptés à l’espèce, livraison sous 2 jours. Stock
                      actuel : <strong>{number(game.food, 1)} kg</strong>.
                    </p>
                    <div className="food-packs">
                      {FOOD_PACKS.map((pack, i) => (
                        <button
                          key={pack.kg}
                          className="food-pack"
                          onClick={() => perform({ type: "food", pack: i })}
                          disabled={
                            !game.development.surveyed ||
                            game.money < pack.cost + FEED_FREIGHT ||
                            reservedFood(game) + pack.kg > feedCapacity(game)
                          }
                        >
                          <Package size={27} />
                          <strong>{pack.kg} kg</strong>
                          <span>
                            {i === 0
                              ? "Le petit sac"
                              : i === 1
                                ? "La bonne réserve"
                                : "Le grand format"}
                          </span>
                          <small>{euro(pack.cost / pack.kg)} / kg</small>
                          <b>
                            Commander · {euro(pack.cost + FEED_FREIGHT)}{" "}
                            <Plus size={14} />
                          </b>
                        </button>
                      ))}
                    </div>
                  </section>
                </section>
                <aside className="finance-card">
                  <span className="section-kicker">LE CARNET DE COMPTES</span>
                  <h2>Une ferme qui dure</h2>
                  <div className="finance-balance">
                    <span>Votre trésorerie</span>
                    <strong>{euro(game.money)}</strong>
                  </div>
                  <svg
                    className="finance-chart"
                    viewBox="0 0 280 95"
                    role="img"
                    aria-label={`Évolution de la trésorerie sur ${game.history.length} journées`}
                  >
                    <path
                      d="M0 80H280M0 40H280"
                      stroke="#dce5d4"
                      strokeDasharray="3 5"
                    />
                    {(() => {
                      const max = Math.max(
                        1,
                        ...game.history.map((h) => h.money),
                      );
                      const points = game.history.map(
                        (h, i) =>
                          `${(i / Math.max(1, game.history.length - 1)) * 275 + 2},${85 - (h.money / max) * 72}`,
                      );
                      if (points.length === 1)
                        points.push(
                          `277,${85 - (game.history[0].money / max) * 72}`,
                        );
                      return (
                        <polyline
                          points={points.join(" ")}
                          stroke="#427d5c"
                          strokeWidth="2.5"
                          fill="none"
                        />
                      );
                    })()}
                  </svg>
                  <div className="finance-row">
                    <span>Revenus des récoltes</span>
                    <strong className="positive">
                      +{euro(game.stats.income)}
                    </strong>
                  </div>
                  <div className="finance-row">
                    <span>Dépenses cumulées</span>
                    <strong>−{euro(game.stats.expenses)}</strong>
                  </div>
                  <div className="finance-row">
                    <span>Volume vendu</span>
                    <strong>{number(game.stats.soldKg, 1)} kg</strong>
                  </div>
                  <div className="finance-row">
                    <span>Charges quotidiennes</span>
                    <strong>{euro(dailyCost(game))}</strong>
                  </div>
                  <div className="finance-row">
                    <span>Travail / jour</span>
                    <strong>{euro(costBreakdown(game).labour)}</strong>
                  </div>
                  <div className="finance-row">
                    <span>Électricité / jour</span>
                    <strong>{euro(costBreakdown(game).electricity)}</strong>
                  </div>
                  <div className="finance-row">
                    <span>Eau / jour</span>
                    <strong>{euro(costBreakdown(game).water)}</strong>
                  </div>
                  <p className="hint">
                    Montants de scénario, hors foncier, financement et
                    fiscalité. Le chauffage est compris dans l’électricité.
                  </p>
                  <p className="hint">
                    Les primes d’objectifs et aides s’ajoutent à votre
                    trésorerie, séparément des revenus de récolte.
                  </p>
                  <div className="aid-card">
                    <Heart size={18} />
                    <h3>Un coup de pouce ?</h3>
                    <p>
                      Aide pédagogique fictive : 5 000 € et jusqu’à 100 kg
                      d’aliments sous 1 000 € de trésorerie, une fois tous les
                      90 jours. Désactivée en mode expert.
                    </p>
                    <button
                      className="button outline full"
                      onClick={() => perform({ type: "aid" })}
                      disabled={
                        game.mode === "expert" ||
                        game.money >= 1000 ||
                        game.day - game.lastAidDay < 90
                      }
                    >
                      Demander l’aide
                    </button>
                    {game.day - game.lastAidDay < 90 && (
                      <small>
                        Prochaine aide à partir du jour {game.lastAidDay + 90}
                      </small>
                    )}
                  </div>
                </aside>
              </div>
            )}
            {view === "journal" && (
              <section className="journal-card">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">
                      LES PETITES ET GRANDES ÉTAPES
                    </span>
                    <h2>La mémoire des Étangs</h2>
                  </div>
                  <span className="pill">{game.logs.length} événements</span>
                </div>
                <div
                  className="journal-filters"
                  aria-label="Filtrer les événements"
                >
                  {[
                    ["all", "Tout"],
                    ["sale", "Récoltes & objectifs"],
                    ["purchase", "Achats"],
                    ["warning", "À surveiller"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      className={journalFilter === id ? "active" : ""}
                      aria-pressed={journalFilter === id}
                      onClick={() => setJournalFilter(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="journal-entries">
                  {game.logs
                    .filter(
                      (l) =>
                        journalFilter === "all" || l.kind === journalFilter,
                    )
                    .map((l, i) => (
                      <article
                        className="journal-entry"
                        key={`${game.logs.length}-${i}`}
                      >
                        <span className={`event-icon ${l.kind}`}>
                          {l.kind === "sale" ? (
                            <TrendingUp size={18} />
                          ) : l.kind === "warning" ? (
                            <AlertTriangle size={18} />
                          ) : l.kind === "purchase" ? (
                            <ShoppingBasket size={18} />
                          ) : (
                            <Leaf size={18} />
                          )}
                        </span>
                        <div>
                          <small>JOUR {l.day}</small>
                          <p>{l.text}</p>
                        </div>
                      </article>
                    ))}
                  {!game.logs.some(
                    (l) => journalFilter === "all" || l.kind === journalFilter,
                  ) && (
                    <div className="empty-journal">
                      <BookOpen size={32} />
                      <h3>Une page encore blanche.</h3>
                      <p>Les événements de cette catégorie apparaîtront ici.</p>
                    </div>
                  )}
                </div>
                <p className="journal-limit">
                  Les 120 événements les plus récents sont conservés.
                </p>
              </section>
            )}
            {view === "guide" && <Guide />}
            <footer className="main-footer">
              <span>
                <Waves size={15} /> Les Étangs
              </span>
              <span>Faites grandir quelque chose de beau.</span>
              <span>DE LA SOURCE AU CLIENT · V3.0</span>
            </footer>
          </main>
        </div>
      </div>
      {notice && (
        <div className={`toast ${notice.ok ? "" : "error"}`} role="status">
          {notice.ok ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{notice.text}</span>
          <button
            aria-label="Fermer la notification"
            onClick={() => setNotice(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          close={close}
          title={
            modal === "stock"
              ? "De nouveaux habitants"
              : modal === "build"
                ? "Faire grandir les Étangs"
                : modal === "harvest"
                  ? "Le temps de la récolte"
                  : modal === "upgrade"
                    ? "Un bassin encore plus heureux"
                    : modal === "objectives"
                      ? "Les petits pas font les grandes fermes"
                      : "Votre partie, bien au chaud"
          }
        >
          {modal === "stock" && (
            <StockForm
              pond={pond}
              game={game}
              submit={(a) => perform(a, true)}
            />
          )}
          {modal === "build" && (
            <>
              <div className="modal-hero">
                <Sprout size={46} />
              </div>
              <p className="modal-intro">
                {pond.name} : {facilityName(pond).toLowerCase()},{" "}
                <strong>{pond.volume} m³</strong>. Durée des travaux et de mise
                en service : {CONSTRUCTION_DAYS[pond.id - 1]} jours.
              </p>
              <div className="checkout-line">
                <span>Aménagement du terrain</span>
                <strong>{euro(CONSTRUCTION_COST[pond.id - 1])}</strong>
              </div>
              <p className="hint">
                Prévoyez les juvéniles, les aliments, l’eau et l’énergie. Le
                chauffage et la filtration de la serre augmentent les charges.
              </p>
              <button
                className="button primary full"
                disabled={
                  game.money < CONSTRUCTION_COST[pond.id - 1] ||
                  !pond.plannedSpecies ||
                  !game.development.surveyed
                }
                onClick={() =>
                  perform({ type: "build", pondId: pond.id }, true)
                }
              >
                Aménager pour {euro(CONSTRUCTION_COST[pond.id - 1])}
                <ArrowRight size={17} />
              </button>
              {game.money < CONSTRUCTION_COST[pond.id - 1] && (
                <p className="inline-error">Trésorerie insuffisante.</p>
              )}
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
              <button
                className="button primary full"
                disabled={
                  pond.upgrade >= 2 || game.money < UPGRADE_COST[pond.upgrade]
                }
                onClick={() =>
                  perform({ type: "upgrade", pondId: pond.id }, true)
                }
              >
                Installer l’équipement <ArrowRight size={17} />
              </button>
              {game.money < UPGRADE_COST[pond.upgrade] && (
                <p className="inline-error">Trésorerie insuffisante.</p>
              )}
            </>
          )}
          {modal === "objectives" && (
            <>
              <p className="modal-intro">
                Chaque étape compte. Récoltez vos récompenses et prenez le temps
                de progresser.
              </p>
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
                        <small>
                          {game.mode === "guided"
                            ? `${euro(o.reward)} d’aide pédagogique · `
                            : ""}
                          {o.xp} XP
                        </small>
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
                  Les deux modes utilisent les mêmes lois biologiques. Les aides
                  monétaires sont désactivées en mode expert.
                </p>
              </div>
              <div className="settings-summary">
                <span>
                  <Sprout size={18} /> Jour {game.day} · Niveau {level(game)}
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
                          setGame(initialGame(game.mode));
                          setStorageBlocked(false);
                          setRunning(false);
                          setSelected(1);
                          setView("project");
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
            </>
          )}
        </Modal>
      )}
    </>
  );
}
