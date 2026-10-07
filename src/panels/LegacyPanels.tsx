import { Badge, Sparkline, Gauge } from "../ui/Primitives";
import { Button } from "../ui/Button";
import { useState } from "react";
import {
  ArrowUpRight,
  Settings2,
  Sprout,
  Plus,
  Fish,
  Package,
  Droplets,
  ShoppingBasket,
  Check,
  Heart,
  TrendingUp,
  AlertTriangle,
  Leaf,
  BookOpen,
} from "lucide-react";
import { FishArt } from "../FishArt";
import WaterPanel from "../WaterPanel";
import {
  formatMoney as euro,
  formatUnitPrice,
  formatEngineText,
} from "../ui/format";
import {
  biomass,
  CONSTRUCTION_COST,
  CONSTRUCTION_DAYS,
  facilityName,
  SPECIES,
  number,
  harvestReady,
  feedNeeded,
  cleaningCost,
  pondStatus,
  marketPrice,
  dailyCost,
  costBreakdown,
  type Game,
  type Pond,
  type Action,
} from "../game";
import type { PanelId } from "../state/navigation";
type Props = { game: Game; perform: (action: Action) => void };

// Transitional bodies: the dedicated inspectors and tabs follow in lots 2a/2b.
export function PondPanel({
  game,
  pond,
  perform,
  setModal,
  navigate,
  select,
  waterOpen,
  setWaterOpen,
}: Props & {
  pond: Pond;
  setModal: (kind: "stock" | "build" | "upgrade") => void;
  navigate: (panel: PanelId) => void;
  select: (id: number) => void;
  waterOpen: boolean;
  setWaterOpen: (open: boolean) => void;
}) {
  return (
    <aside className="pond-panel" aria-label="Gestion du bassin sélectionné">
      <label className="pond-selector">
        Bassin sélectionné
        <select
          aria-label="Bassin sélectionné"
          value={pond.id}
          onChange={(e) => select(Number(e.target.value))}
        >
          {game.ponds.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {pondStatus(p).label}
            </option>
          ))}
        </select>
      </label>
      <div className="pond-panel-heading">
        <span className="section-kicker">
          BASSIN {String(pond.id).padStart(2, "0")}
        </span>
        <Badge
          tone={
            pondStatus(pond).tone === "danger"
              ? "danger"
              : pondStatus(pond).tone === "good"
                ? "success"
                : "neutral"
          }
        >
          {pondStatus(pond).label}
        </Badge>
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
            Aménagez ce terrain pour accueillir jusqu’à {pond.capacity} poissons
            et faire grandir votre exploitation.
          </p>
          <div className="build-cost">
            <span>Aménagement</span>
            <strong>{euro(CONSTRUCTION_COST[pond.id - 1])}</strong>
          </div>
          <Button
            tone="primary"
            disabledReason={
              "Le chantier doit être terminé avant la mise en service."
            }
            className="button primary full"
            onClick={() =>
              pond.plannedSpecies ? setModal("build") : navigate("project")
            }
            disabled={pond.constructionDays > 0}
          >
            {pond.constructionDays
              ? `Chantier · encore ${pond.constructionDays} jours`
              : pond.plannedSpecies
                ? "Aménager le bassin"
                : "Choisir une filière"}{" "}
            <Plus size={17} />
          </Button>
          <small>
            Travaux et mise en service : {CONSTRUCTION_DAYS[pond.id - 1]} jours
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
                        (pond.weight / SPECIES[pond.species].harvestWeight) *
                          100,
                      ),
                    )}{" "}
                    %
                  </strong>
                </div>
                <Gauge
                  circular
                  label="Calibre commercial"
                  value={pond.weight}
                  max={SPECIES[pond.species].harvestWeight}
                  caption={
                    harvestReady(pond) ? "Calibre atteint" : "En croissance"
                  }
                  tone={harvestReady(pond) ? "success" : "warning"}
                />
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
              <Button
                tone="primary"
                disabledReason={
                  pond.fallowDays > 0
                    ? "Attendez la fin du vide sanitaire."
                    : "Une commande de juvéniles est déjà en livraison."
                }
                className="button primary full"
                onClick={() => setModal("stock")}
                disabled={
                  pond.fallowDays > 0 ||
                  game.development.orders.some((o) => o.pondId === pond.id)
                }
              >
                <Plus size={17} />{" "}
                {pond.fallowDays
                  ? `Vide sanitaire · ${pond.fallowDays} jours`
                  : game.development.orders.some((o) => o.pondId === pond.id)
                    ? "Juvéniles en livraison"
                    : "Commander des juvéniles"}
              </Button>
            </div>
          )}
          <details
            className="water-details"
            open={waterOpen}
            onToggle={(e) => setWaterOpen(e.currentTarget.open)}
          >
            <summary>Mesures de l’eau & réglages d’élevage</summary>
            <WaterPanel pond={pond} perform={perform} />
          </details>
          <div className="pond-actions">
            {pond.count > 0 && (
              <Button
                tone="primary"
                disabledReason={
                  "La ration des prochaines 24 heures est déjà réservée."
                }
                className="button primary full"
                onClick={() => perform({ type: "feed", pondId: pond.id })}
                disabled={pond.feedToday > 0}
              >
                <Package size={16} />
                {pond.feedToday > 0
                  ? "Ration programmée"
                  : "Programmer la ration"}
                <small>{number(feedNeeded(pond), 1)} kg</small>
              </Button>
            )}
            <button
              className="button outline full"
              onClick={() => perform({ type: "clean", pondId: pond.id })}
            >
              <Droplets size={16} />
              Entretenir & renouveler <small>{euro(cleaningCost(pond))}</small>
            </button>
            {pond.count > 0 && (
              <Button
                tone="primary"
                disabledReason={
                  "Attendez le calibre commercial et la fin de l’observation avant la récolte."
                }
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
              </Button>
            )}
          </div>
          <Button
            tone="secondary"
            disabledReason={"Le bassin possède déjà tous les équipements."}
            className="upgrade-link"
            onClick={() => setModal("upgrade")}
            disabled={pond.upgrade >= 2}
          >
            {pond.upgrade >= 2 ? <Check size={15} /> : <Settings2 size={15} />}{" "}
            {pond.upgrade >= 2
              ? "Bassin entièrement équipé"
              : "Améliorer ce bassin"}
            {pond.upgrade < 2 && <ArrowUpRight size={14} />}
          </Button>
        </>
      )}
    </aside>
  );
}
export function FinancePanel({ game, perform }: Props) {
  return (
    <aside className="finance-card">
      <span className="section-kicker">LE CARNET DE COMPTES</span>
      <h2>Une ferme qui dure</h2>
      <div className="finance-balance">
        <span>Votre trésorerie</span>
        <strong>{euro(game.money)}</strong>
      </div>
      <Sparkline
        values={game.history.map((h) => h.money)}
        label={`Évolution de la trésorerie sur ${game.history.length} journées`}
      />
      <div className="finance-row">
        <span>Revenus des récoltes</span>
        <strong className="positive">+{euro(game.stats.income)}</strong>
      </div>
      <div className="finance-row">
        <span>Dépenses cumulées</span>
        <strong>{euro(-game.stats.expenses)}</strong>
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
        Montants de scénario, hors foncier, financement et fiscalité. Le
        chauffage est compris dans l’électricité.
      </p>
      <p className="hint">
        Les primes d’objectifs et aides s’ajoutent à votre trésorerie,
        séparément des revenus de récolte.
      </p>
      <div className="aid-card">
        <Heart size={18} />
        <h3>Un coup de pouce ?</h3>
        <p>
          Aide pédagogique fictive : 5 000 € et jusqu’à 100 kg d’aliments sous 1
          000 € de trésorerie, une fois tous les 90 jours. Désactivée en mode
          expert.
        </p>
        <Button
          tone="secondary"
          disabledReason={
            game.mode === "expert"
              ? "Les aides pédagogiques sont désactivées en mode expert."
              : game.money >= 1000
                ? "L’aide est réservée aux trésoreries inférieures à 1 000 €."
                : "Une aide ne peut être demandée que tous les 90 jours."
          }
          className="button outline full"
          onClick={() => perform({ type: "aid" })}
          disabled={
            game.mode === "expert" ||
            game.money >= 1000 ||
            game.day - game.lastAidDay < 90
          }
        >
          Demander l’aide
        </Button>
        {game.day - game.lastAidDay < 90 && (
          <small>Prochaine aide à partir du jour {game.lastAidDay + 90}</small>
        )}
      </div>
    </aside>
  );
}
export function MarketPrices({ game }: { game: Game }) {
  return (
    <details className="market-prices">
      <summary>Prix et espèces</summary>{" "}
      <div className="market-species">
        {Object.values(SPECIES).map((s) => (
          <article className="market-species-card" key={s.id}>
            <div className={`species-art ${s.id}`}>
              <FishArt color={s.color} />
            </div>
            <h3>{s.name}</h3>
            <p>{s.description}</p>
            <div className="market-price">
              <strong>
                {formatUnitPrice(marketPrice(s.id, game.day))}
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
                {number((marketPrice(s.id, game.day) / s.price - 1) * 100, 1)} %
              </span>
            </div>
            <div className="species-facts">
              <span>
                Alevin <b>{formatUnitPrice(s.seedPrice)}</b>
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
    </details>
  );
}
export function JournalPanel({ game }: { game: Game }) {
  const [journalFilter, setJournalFilter] = useState("all");
  return (
    <section className="journal-card">
      <div className="section-heading">
        <div>
          <span className="section-kicker">LES PETITES ET GRANDES ÉTAPES</span>
          <h2>La mémoire des Étangs</h2>
        </div>
        <span className="pill">{game.logs.length} événements</span>
      </div>
      <div className="journal-filters" aria-label="Filtrer les événements">
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
          .filter((l) => journalFilter === "all" || l.kind === journalFilter)
          .map((l, i) => (
            <article className="journal-entry" key={`${game.logs.length}-${i}`}>
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
                <p>{formatEngineText(l.text)}</p>
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
  );
}
