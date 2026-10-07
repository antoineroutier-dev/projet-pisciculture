import { CountdownChip } from "./ui/Primitives";
import { Button } from "./ui/Button";
import { formatMoney as euro, formatUnitPrice, plural } from "./ui/format";
import {
  ArrowRight,
  Fish,
  Package,
  Truck,
  Warehouse,
  Snowflake,
  Scissors,
} from "lucide-react";
import {
  FOOD_PACKS,
  harvestReady,
  number,
  SPECIES,
  type Action,
  type Game,
} from "./game";
import {
  ASSETS,
  BUYERS,
  coldStock,
  dailyFeed,
  FEED_FREIGHT,
  feedCapacity,
  reservedFood,
  transportCost,
  type Asset,
  type Buyer,
} from "./development";

type Props = {
  game: Game;
  perform: (a: Action) => void;
  stock: (pondId: number) => void;
};
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
