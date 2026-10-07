import { Sparkline } from "../ui/Primitives";
import { Button } from "../ui/Button";
import { useState } from "react";
import {
  ShoppingBasket,
  Heart,
  TrendingUp,
  AlertTriangle,
  Leaf,
  BookOpen,
} from "lucide-react";
import { FishArt } from "../FishArt";
import {
  formatMoney as euro,
  formatUnitPrice,
  formatEngineText,
} from "../ui/format";
import {
  SPECIES,
  number,
  marketPrice,
  dailyCost,
  costBreakdown,
  type Game,
  type Action,
} from "../game";
type Props = { game: Game; perform: (action: Action) => void };

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
