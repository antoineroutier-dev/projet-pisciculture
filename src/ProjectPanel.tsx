import { CountdownChip } from "./ui/Primitives";
import { Button } from "./ui/Button";
import { formatMoney as euro, formatUnitPrice, plural } from "./ui/format";
import {
  ArrowRight,
  Check,
  Clock3,
  Droplets,
  Fish,
  FlaskConical,
  Package,
  Sprout,
  Truck,
  Warehouse,
  Snowflake,
  CircleHelp,
  Scissors,
} from "lucide-react";
import { FishArt } from "./FishArt";
import {
  CONSTRUCTION_COST,
  CONSTRUCTION_DAYS,
  facilityName,
  FOOD_PACKS,
  harvestReady,
  number,
  SPECIES,
  type Action,
  type Game,
  type SpeciesId,
} from "./game";
import {
  ASSETS,
  BUYERS,
  coldStock,
  dailyFeed,
  FEED_FREIGHT,
  feedCapacity,
  reservedFood,
  SOURCE_FLOW,
  transportCost,
  waterUsed,
  type Asset,
  type Buyer,
} from "./development";

type Props = {
  game: Game;
  perform: (a: Action) => void;
  stock: (pondId: number) => void;
};
const ROUTES: Record<
  SpeciesId,
  { water: string; advice: string; duration: string; lot: number }
> = {
  trout: {
    water: "Source fraîche · 11,8–15,2 °C",
    advice:
      "Le choix le plus direct sur ce terrain. Eau fraîche et renouvelée, oxygène à surveiller quand la biomasse augmente.",
    duration: "Environ 5–8 mois à partir de 50 g",
    lot: 1000,
  },
  carp: {
    water: "Eau d’étang · environ 2–25 °C selon la saison",
    advice:
      "Faible renouvellement, grand volume et croissance saisonnière. La carpe ralentit fortement en hiver. Une aération peut devenir nécessaire.",
    duration: "Environ 12–24 mois à partir de 100 g",
    lot: 100,
  },
  tilapia: {
    water: "Source réchauffée et recyclée · cible 27 °C",
    advice:
      "L’eau naturelle est trop froide. Chauffage, aération et filtre biologique sont inclus dans la mise en service du circuit.",
    duration: "Environ 7–10 mois à partir de 30 g",
    lot: 600,
  },
};
export default function ProjectPanel({ game, perform }: Props) {
  const d = game.development;
  return (
    <div className="project-layout">
      {d.migrated && (
        <div className="migration-note">
          <CircleHelp size={20} />
          <p>
            <strong>Votre ancienne exploitation est conservée.</strong> Pour
            découvrir le démarrage sur terrain vide, exportez votre partie puis
            choisissez <b>Paramètres & sauvegarde → Nouvelle partie</b>.
          </p>
        </div>
      )}
      <section className="water-study">
        <div className="water-study-intro">
          <span className="project-icon">
            <Droplets size={29} />
          </span>
          <div>
            <span className="section-kicker">LE POINT DE DÉPART</span>
            <h2>L’eau dessine votre ferme</h2>
            <p>
              Une source, un terrain d’étang et quatre emplacements. Les
              bâtiments agricoles existent ; les équipements de production
              restent à aménager.
            </p>
          </div>
        </div>
        <div className="resource-grid">
          <article>
            <FlaskConical size={23} />
            <h3>La source</h3>
            <strong>{d.surveyed ? "11,8–15,2 °C" : "À analyser"}</strong>
            <p>
              {d.surveyed
                ? `pH 7,2 · eau oxygénée à l’arrivée. ${number(waterUsed(game), 2)} / ${SOURCE_FLOW} L/s réservés aux bassins en service et en chantier.`
                : "Le laboratoire vérifie la température, le pH et le débit disponible avant le choix des poissons."}
            </p>
          </article>
          <article>
            <Sprout size={23} />
            <h3>L’étang saisonnier</h3>
            <strong>
              {d.surveyed
                ? "Une eau qui suit les saisons"
                : "Un potentiel à étudier"}
            </strong>
            <p>
              {d.surveyed
                ? "pH 7,6 · faible apport d’eau de surface. Chaude en été, froide en hiver : la croissance ne sera pas régulière."
                : "L’eau de surface alimente la parcelle de la Roselière. Sa température varie beaucoup plus que celle de la source."}
            </p>
          </article>
          <article>
            <Fish size={23} />
            <h3>Le bon poisson, au bon endroit</h3>
            <strong>
              {d.surveyed
                ? "Trois filières possibles"
                : "Décider après les mesures"}
            </strong>
            <p>
              La plage de croissance optimale est de 12–18 °C pour la truite,
              20–26 °C pour la carpe et 26–30 °C pour le tilapia.
            </p>
          </article>
        </div>
        {!d.surveyed && (
          <p className="project-footnote">
            Les températures annuelles sont des hypothèses du site fictif.
            L’analyse prend 2 jours de jeu ; utilisez le bouton de l’étape en
            cours.
          </p>
        )}
      </section>
      {d.surveyed && (
        <section className="project-plots" id="project-plots">
          <div className="section-heading">
            <div>
              <span className="section-kicker">CHOISIR, PUIS CONSTRUIRE</span>
              <h2>Votre terrain, vos filières</h2>
            </div>
            <span className="pill">
              {game.ponds.filter((p) => p.built).length} / 4 aménagés
            </span>
          </div>
          <div className="route-grid">
            {game.ponds.map((p) => {
              const species =
                p.facility === "earth"
                  ? "carp"
                  : p.facility === "ras"
                    ? "tilapia"
                    : "trout";
              const s = SPECIES[species],
                route = ROUTES[species];
              return (
                <article
                  className={`route-card ${p.plannedSpecies ? "chosen" : ""}`}
                  key={p.id}
                >
                  <div className={`route-art ${species}`}>
                    <FishArt color={s.color} />
                    <span>
                      {p.id === 3
                        ? "Extension de la filière truite"
                        : p.id === 1
                          ? "Conseillé pour débuter"
                          : p.id === 2
                            ? "Cycle saisonnier"
                            : "Filière technique"}
                    </span>
                  </div>
                  <div className="route-content">
                    <span className="section-kicker">
                      PARCELLE {p.id} · {p.name}
                    </span>
                    <h3>{s.name}</h3>
                    <p className="route-water">
                      <Droplets size={14} />
                      {route.water}
                    </p>
                    <p>{route.advice}</p>
                    <dl>
                      <div>
                        <dt>Installation</dt>
                        <dd>
                          {facilityName(p)} · {p.volume} m³
                        </dd>
                      </div>
                      <div>
                        <dt>Travaux</dt>
                        <dd>
                          {euro(CONSTRUCTION_COST[p.id - 1])} ·{" "}
                          {CONSTRUCTION_DAYS[p.id - 1]} jours
                        </dd>
                      </div>
                      <div>
                        <dt>Premier cycle indicatif</dt>
                        <dd>{route.duration}</dd>
                      </div>
                      <div>
                        <dt>Lot de découverte</dt>
                        <dd>
                          {route.lot} poissons, à ajuster chez le fournisseur
                        </dd>
                      </div>
                    </dl>
                    {p.built ? (
                      <div className="project-done">
                        <Check size={17} />
                        Bassin en service
                      </div>
                    ) : p.constructionDays ? (
                      <div className="project-done">
                        <Clock3 size={17} />
                        Chantier · encore {p.constructionDays} jours
                      </div>
                    ) : (
                      <button
                        className={`button ${p.plannedSpecies ? "primary" : "outline"} full`}
                        onClick={() =>
                          perform(
                            p.plannedSpecies
                              ? { type: "build", pondId: p.id }
                              : { type: "plan", pondId: p.id, species },
                          )
                        }
                      >
                        {p.plannedSpecies
                          ? `Construire ${p.name}`
                          : `Choisir : ${s.name} · ${p.name}`}
                        <ArrowRight size={15} />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <p className="project-footnote">
            Le budget de construction ne couvre ni les poissons, ni leurs
            aliments, ni les charges pendant la croissance. Gardez une réserve
            de trésorerie pour plusieurs mois. Un petit lot d’apprentissage
            supporte des coûts fixes élevés par kilogramme.
          </p>
        </section>
      )}
    </div>
  );
}

export function LogisticsPanel({ game, perform, stock }: Props) {
  const d = game.development,
    ration = dailyFeed(game);
  return (
    <div className="logistics-layout">
      <div className="chain-strip" aria-label="Chaîne de production">
        <span>
          <Package size={19} />
          Fournisseurs
        </span>
        <ArrowRight size={16} />
        <span>
          <Fish size={19} />
          Élevage
        </span>
        <ArrowRight size={16} />
        <span>
          <Snowflake size={19} />
          Froid & préparation
        </span>
        <ArrowRight size={16} />
        <span>
          <Truck size={19} />
          Clients
        </span>
      </div>
      <section className="logistics-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">01 · EN AMONT</span>
            <h2>Prévoir avant de manquer</h2>
          </div>
          <Package size={24} />
        </div>
        <div className="supply-summary">
          <div>
            <span>Aliments disponibles</span>
            <strong>
              {number(game.food, 1)} <small>kg</small>
            </strong>
          </div>
          <div>
            <span>Autonomie indicative</span>
            <strong>
              {ration ? number(game.food / ration, 1) : "—"}{" "}
              <small>{ration ? "jours" : "aucun lot à nourrir"}</small>
            </strong>
          </div>
          <div>
            <span>Stock + commandes + rations réservées</span>
            <strong>
              {number(reservedFood(game), 1)}{" "}
              <small>/ {feedCapacity(game)} kg</small>
            </strong>
          </div>
        </div>
        <p>
          Fabricant d’aliments · livraison sous <b>2 jours</b> ·{" "}
          {euro(FEED_FREIGHT)} de transport par commande. L’autonomie diminue à
          mesure que les poissons grandissent. Aliment adapté à l’espèce ; les
          formulations et granulométries sont agrégées dans le scénario.
        </p>
        <div className="feed-order-grid">
          {FOOD_PACKS.map((pack, i) => {
            const full =
              reservedFood(game) + pack.kg > feedCapacity(game) + 0.001;
            return (
              <article key={pack.kg}>
                <strong>{pack.kg} kg</strong>
                <span>{euro(pack.cost + FEED_FREIGHT)} livré</span>
                <Button
                  tone="secondary"
                  disabledReason={
                    !d.surveyed
                      ? "Faites analyser l’eau."
                      : full
                        ? "Capacité insuffisante : aménagez le magasin ou consommez les aliments en stock."
                        : "Trésorerie insuffisante, transport compris."
                  }
                  className="button outline full"
                  disabled={
                    !d.surveyed || full || game.money < pack.cost + FEED_FREIGHT
                  }
                  onClick={() => perform({ type: "food", pack: i })}
                >
                  Commander {pack.kg} kg
                </Button>
                {full && (
                  <small>
                    Capacité insuffisante : aménagez le magasin ou attendez de
                    consommer.
                  </small>
                )}
                {!d.surveyed && <small>Analysez d’abord l’eau.</small>}
              </article>
            );
          })}
        </div>
        <h3>Écloserie · transport vivant en 4 jours</h3>
        <div className="supply-ponds">
          {game.ponds
            .filter((p) => p.built)
            .map((p) => {
              const incoming = d.orders.find((o) => o.pondId === p.id);
              return (
                <div key={p.id}>
                  <span>
                    <strong>{p.name}</strong>
                    <small>
                      {p.count
                        ? `${p.count} poissons en élevage`
                        : incoming
                          ? `${incoming.amount} juvéniles attendus au jour ${incoming.due}`
                          : p.fallowDays
                            ? `Vide sanitaire · ${p.fallowDays} jours`
                            : "Bassin disponible · préparer les aliments avant la commande"}
                    </small>
                  </span>
                  <Button
                    tone="secondary"
                    disabledReason={
                      p.count
                        ? "Le bassin contient déjà un lot."
                        : incoming
                          ? "Une commande de juvéniles est déjà en livraison."
                          : "Attendez la fin du vide sanitaire."
                    }
                    className="button outline"
                    disabled={!!p.count || !!incoming || !!p.fallowDays}
                    onClick={() => stock(p.id)}
                  >
                    Commander des juvéniles
                  </Button>
                </div>
              );
            })}
          {!game.ponds.some((p) => p.built) && (
            <p className="empty-logistics">
              Les commandes de poissons s’ouvrent après la mise en service du
              premier bassin.
            </p>
          )}
        </div>
        {d.orders.length > 0 && (
          <div className="delivery-list">
            <h3>Livraisons attendues</h3>
            {d.orders.map((o) => (
              <div key={o.id}>
                <Truck size={18} />
                <span>
                  Commande #{o.id} ·{" "}
                  {o.kind === "feed"
                    ? `${o.amount} kg d’aliments`
                    : `${o.amount} ${SPECIES[o.species!].name} · ${game.ponds[o.pondId! - 1].name}`}
                </span>
                <CountdownChip label="Livraison" days={o.due - game.day} />
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="logistics-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">
              02 · LES BÂTIMENTS DE SERVICE
            </span>
            <h2>Équiper la chaîne logistique</h2>
          </div>
          <Warehouse size={24} />
        </div>
        <div className="asset-grid">
          {(Object.entries(ASSETS) as [Asset, (typeof ASSETS)[Asset]][]).map(
            ([key, a]) => {
              const work = d.works.find((w) => w.asset === key);
              return (
                <article key={key}>
                  <span className={`asset-icon ${key}`}>
                    {key === "warehouse" ? (
                      <Warehouse size={30} />
                    ) : key === "coldstore" ? (
                      <Snowflake size={30} />
                    ) : (
                      <Scissors size={30} />
                    )}
                  </span>
                  <h3>{a.name}</h3>
                  <p>{a.description}</p>
                  <strong>
                    {euro(a.cost)} · {a.days} jours
                  </strong>
                  <Button
                    className="full"
                    tone="secondary"
                    disabled={
                      d.assets[key] ||
                      !!work ||
                      !d.surveyed ||
                      (key === "workshop" && !d.assets.coldstore) ||
                      game.money < a.cost
                    }
                    disabledReason={
                      d.assets[key]
                        ? "Ce bâtiment est déjà en service."
                        : work
                          ? `Le chantier se termine dans ${work.due - game.day} ${plural(work.due - game.day, "jour")}.`
                          : !d.surveyed
                            ? "Faites analyser l’eau avant d’aménager les bâtiments."
                            : key === "workshop" && !d.assets.coldstore
                              ? "Aménagez d’abord la chambre froide."
                              : `Il faut ${euro(a.cost)} de trésorerie pour ces travaux.`
                    }
                    onClick={() => perform({ type: "asset", asset: key })}
                  >
                    {d.assets[key]
                      ? "En service"
                      : work
                        ? `Travaux · ${work.due - game.day} j`
                        : `Aménager ${{ warehouse: "le magasin d’aliments", coldstore: "la chambre froide", workshop: "l’atelier de préparation" }[key]}`}
                  </Button>
                  {key === "workshop" && !d.assets.coldstore && (
                    <small>Chambre froide nécessaire au préalable.</small>
                  )}
                </article>
              );
            },
          )}
        </div>
      </section>
      <section className="logistics-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">03 · PRÉPARER LA VENTE</span>
            <h2>Un client avant la récolte</h2>
          </div>
          <Fish size={24} />
        </div>
        <p>
          Prospectez à partir de <b>80 % du calibre commercial</b>. La
          réservation fixe le prix pour une livraison sous 30 jours. Le lot doit
          atteindre son calibre et terminer l’observation avant récolte. Les
          grands lots sont récoltés en plusieurs collectes selon la capacité du
          froid et du client.
        </p>
        <div className="buyer-grid">
          {(Object.entries(BUYERS) as [Buyer, (typeof BUYERS)[Buyer]][]).map(
            ([key, b]) => (
              <article key={key}>
                <span className="section-kicker">{b.product}</span>
                <h3>{b.name}</h3>
                <p>
                  Jusqu’à {b.maxKg} kg vendables par lot · prix du marché{" "}
                  {b.factor === 1 ? "" : "× 1,5"}.
                </p>
                <p>
                  Transport : {euro(b.freight)} + {formatUnitPrice(b.perKg)}/kg.
                  Livraison en 1 jour ; paiement {b.payment} jours après
                  réception.
                </p>
                {b.processed && (
                  <p>
                    Atelier obligatoire · préparation 1 jour, 0,55 €/kg brut,
                    rendement 85 %.
                  </p>
                )}
                <div className="client-lots">
                  {game.ponds
                    .filter((p) => p.count && p.species)
                    .map((p) => {
                      const c = d.contracts.find((c) => c.pondId === p.id);
                      const tooSmall =
                        p.weight < SPECIES[p.species!].harvestWeight * 0.8;
                      return (
                        <div key={p.id}>
                          <Button
                            tone="secondary"
                            disabledReason={
                              c
                                ? "Ce bassin possède déjà une réservation client."
                                : tooSmall
                                  ? "Le lot doit atteindre 80 % du calibre commercial."
                                  : !d.assets.coldstore
                                    ? "Aménagez d’abord la chambre froide."
                                    : "Ce client demande un atelier de préparation."
                            }
                            className="button outline full"
                            disabled={
                              !!c ||
                              tooSmall ||
                              !d.assets.coldstore ||
                              (b.processed && !d.assets.workshop)
                            }
                            onClick={() =>
                              perform({
                                type: "contract",
                                pondId: p.id,
                                buyer: key,
                              })
                            }
                          >
                            Réserver {p.name} · {b.name}
                          </Button>
                          {tooSmall && (
                            <small>
                              {p.name} : prospection à{" "}
                              {SPECIES[p.species!].harvestWeight * 800}{" "}
                              g/poisson.
                            </small>
                          )}
                        </div>
                      );
                    })}
                </div>
                {!d.assets.coldstore && (
                  <small>Aménagez d’abord la chambre froide.</small>
                )}
              </article>
            ),
          )}
        </div>
        {d.contracts.length > 0 && (
          <div className="contract-list">
            <h3>Réservations clients</h3>
            {d.contracts.map((c) => {
              const p = game.ponds[c.pondId - 1],
                batch = d.batches.find((b) => b.contractId === c.id);
              const count = p.weight
                ? Math.max(
                    0,
                    Math.min(
                      p.count,
                      Math.floor((1500 - coldStock(game)) / p.weight),
                      Math.floor(
                        c.maxKg /
                          (p.weight * (BUYERS[c.buyer].processed ? 0.85 : 1)),
                      ),
                    ),
                  )
                : 0;
              const kg = count * p.weight;
              return (
                <article key={c.id}>
                  <div>
                    <strong>
                      {p.name} → {BUYERS[c.buyer].name}
                    </strong>
                    <p>
                      {formatUnitPrice(c.price)}/kg · livraison au plus tard le
                      jour {c.deadline} · {c.maxKg} kg maximum
                    </p>
                    <small>
                      {batch
                        ? "Lot récolté : organiser la préparation et le transport ci-dessous."
                        : `Cette collecte : ${count} poissons, ${number(kg, 1)} kg ; glaçage et caisses ${euro(kg * 0.25)}. ${p.count > count ? `${p.count - count} poissons resteront en élevage.` : "Le bassin sera ensuite au vide sanitaire."} Le paiement arrive après livraison.`}
                    </small>
                  </div>
                  {!batch && (
                    <div className="contract-actions">
                      <Button
                        tone="primary"
                        disabledReason={
                          p.health < 60
                            ? "Le lot doit retrouver une santé d’au moins 60 sur 100."
                            : "Attendez le calibre commercial et la fin de l’observation."
                        }
                        className="button primary"
                        disabled={!harvestReady(p) || p.health < 60}
                        onClick={() =>
                          perform({ type: "harvest", pondId: p.id })
                        }
                      >
                        Récolter {p.name}
                      </Button>
                      <button
                        className="text-button"
                        onClick={() =>
                          perform({ type: "cancelContract", id: c.id })
                        }
                      >
                        Annuler la réservation
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section className="logistics-section">
        <div className="section-heading">
          <div>
            <span className="section-kicker">04 · EN AVAL</span>
            <h2>Du froid au règlement</h2>
          </div>
          <Truck size={24} />
        </div>
        <div className="supply-summary">
          <div>
            <span>Au froid</span>
            <strong>
              {number(coldStock(game), 1)} <small>/ 1 500 kg</small>
            </strong>
          </div>
          <div>
            <span>Livré depuis le départ</span>
            <strong>
              {number(d.deliveredKg, 1)} <small>kg</small>
            </strong>
          </div>
          <div>
            <span>Factures à encaisser</span>
            <strong>
              {euro(d.shipments.reduce((n, s) => n + s.value, 0))}
            </strong>
          </div>
        </div>
        {!d.batches.length && !d.shipments.length && (
          <p className="empty-logistics">
            Vos lots récoltés, expéditions et factures apparaîtront ici.
            Récolter ne crédite pas immédiatement la trésorerie.
          </p>
        )}
        {d.batches.map((b) => {
          const c = d.contracts.find((c) => c.id === b.contractId)!;
          const prepare = BUYERS[c.buyer].processed && !b.processed;
          const tooLate =
            game.day + (prepare ? 2 : 1) >= b.expires ||
            game.day + (prepare ? 2 : 1) > c.deadline;
          return (
            <article className="cold-batch" key={b.id}>
              <div>
                <span className="pill">
                  Lot #{b.id} · {b.processed ? "Éviscéré" : "Entier"}
                </span>
                <h3>
                  {number(b.kg, 1)} kg · {SPECIES[b.species].name}
                </h3>
                <p>
                  Récolté au jour {b.harvested} · péremption au jour {b.expires}{" "}
                  · {BUYERS[c.buyer].name}
                </p>
                <strong>
                  {b.processingDue
                    ? `Préparation jusqu’au jour ${b.processingDue}`
                    : tooLate
                      ? "Délai insuffisant pour livrer ce lot frais."
                      : prepare
                        ? "Préparer aujourd’hui, expédier demain."
                        : `Transport frigorifique : ${euro(transportCost(b, c.buyer))}`}
                </strong>
              </div>
              <Button
                tone="primary"
                disabledReason={
                  b.processingDue !== null
                    ? "Attendez la fin de la préparation."
                    : "Le délai restant ne permet plus de livrer ce lot frais."
                }
                className="button primary"
                disabled={b.processingDue !== null || tooLate}
                onClick={() =>
                  perform({ type: prepare ? "process" : "dispatch", id: b.id })
                }
              >
                {prepare
                  ? `Préparer le lot #${b.id}`
                  : `Expédier le lot #${b.id}`}
              </Button>
            </article>
          );
        })}
        {d.shipments.map((s) => (
          <article className="shipment" key={s.id}>
            <Truck size={23} />
            <div>
              <h3>
                {BUYERS[s.buyer].name} · {number(s.kg, 1)} kg
              </h3>
              <p>
                {s.delivered
                  ? "Livraison acceptée"
                  : `En transport · réception au jour ${s.arrival}`}{" "}
                · règlement au jour {s.payment}
              </p>
            </div>
            <strong>{euro(s.value)}</strong>
          </article>
        ))}
        <p className="project-footnote">
          Pertes pour péremption : {number(d.wasteKg, 1)} kg.
        </p>
      </section>
    </div>
  );
}
