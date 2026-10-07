import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Coins,
  Fish,
  Package,
  Scissors,
  Snowflake,
  Store,
  Truck,
  Warehouse,
} from "lucide-react";
import {
  type Action,
  type Game,
  FOOD_PACKS,
  number,
  SPECIES,
  marketPrice,
  biomass,
} from "../game";
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
} from "../development";
import { Button } from "../ui/Button";
import { Badge, Card, CountdownChip, Tabs } from "../ui/Primitives";
import {
  formatMoney,
  formatUnitPrice,
  formatKg,
  formatDate,
  formatEngineText,
  plural,
} from "../ui/format";
import { availability } from "../state/pondSelectors";
import { FishArt } from "../FishArt";
export type LogisticsTab = "supply" | "assets" | "clients" | "shipments";
type Props = {
  game: Game;
  perform: (a: Action) => void;
  stock: (id: number) => void;
  tab: LogisticsTab;
  onTab: (tab: LogisticsTab) => void;
  inspect: (id: number) => void;
};
type Commands = Pick<Props, "game" | "perform">;
export function LogisticsPanel({
  game,
  perform,
  stock,
  tab,
  onTab,
  inspect,
}: Props) {
  const d = game.development;
  const [chainOpen, setChainOpen] = useState(() => window.innerWidth > 680);
  const stages = [
    {
      name: "Fournisseur",
      Icon: Package,
      value: `${d.orders.length} ${plural(d.orders.length, "commande")}`,
      tab: "supply",
    },
    {
      name: "Magasin",
      Icon: Warehouse,
      value: formatKg(game.food),
      tab: "assets",
    },
    {
      name: "Bassin",
      Icon: Fish,
      value: `${game.ponds.filter((p) => p.count).length} en élevage`,
      tab: null,
    },
    {
      name: "Froid",
      Icon: Snowflake,
      value: formatKg(coldStock(game)),
      tab: "shipments",
    },
    {
      name: "Camion",
      Icon: Truck,
      value: `${d.shipments.filter((s) => !s.delivered).length} en route`,
      tab: "shipments",
    },
    {
      name: "Client",
      Icon: Store,
      value: `${d.contracts.length} ${plural(d.contracts.length, "contrat")}`,
      tab: "clients",
    },
    {
      name: "Paiement",
      Icon: Coins,
      value: `${d.paid} ${plural(d.paid, "cycle")} ${plural(d.paid, "réglé")}`,
      tab: "shipments",
    },
  ] as const;
  return (
    <div className="logistics-panel">
      <details
        className="production-flow"
        open={chainOpen}
        onToggle={(e) => setChainOpen(e.currentTarget.open)}
      >
        <summary>Du fournisseur au paiement</summary>
        <ol className="production-chain" aria-label="Chaîne de production">
          {stages.map(({ name, Icon, value, tab: target }, i) => (
            <li key={name}>
              <button
                onClick={() =>
                  target
                    ? onTab(target)
                    : inspect(
                        game.ponds.find((p) => p.count || p.built)?.id ?? 1,
                      )
                }
                aria-label={`${name} : ${value}`}
              >
                <Icon size={20} />
                <span>
                  {i + 1} · {name}
                </span>
                <small>{value}</small>
              </button>
              {i < stages.length - 1 && (
                <ArrowRight size={12} aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </details>
      <Tabs
        label="Chaîne logistique"
        value={tab}
        onChange={onTab}
        items={[
          { id: "supply", label: "Approvisionnement" },
          { id: "assets", label: "Bâtiments" },
          { id: "clients", label: "Clients" },
          { id: "shipments", label: "Expéditions" },
        ]}
      >
        {tab === "supply" && (
          <Supply game={game} perform={perform} stock={stock} />
        )}
        {tab === "assets" && <Buildings game={game} perform={perform} />}
        {tab === "clients" && <Clients game={game} perform={perform} />}
        {tab === "shipments" && <Shipments game={game} perform={perform} />}
      </Tabs>
    </div>
  );
}
function EngineButton({
  game,
  action,
  perform,
  children,
}: Commands & { action: Action; children: ReactNode }) {
  const guard = availability(game, action);
  return (
    <Button
      className="full"
      disabled={guard.disabled}
      disabledReason={formatEngineText(guard.reason)}
      onClick={() => perform(action)}
    >
      {children}
    </Button>
  );
}
function Supply({ game, perform, stock }: Commands & Pick<Props, "stock">) {
  const ration = dailyFeed(game),
    d = game.development;
  return (
    <div className="logistics-cards">
      <dl className="logistics-totals">
        <div>
          <dt>Aliments disponibles</dt>
          <dd>{formatKg(game.food)}</dd>
        </div>
        <div>
          <dt>Autonomie au rythme actuel</dt>
          <dd>
            {ration
              ? `${number(game.food / ration, 1)} jours`
              : "Aucun lot à nourrir"}
          </dd>
        </div>
        <div>
          <dt>Stock, rations réservées et commandes</dt>
          <dd>
            {number(reservedFood(game), 1)} / {feedCapacity(game)} kg
          </dd>
        </div>
      </dl>
      <h3>Fabricant d’aliments</h3>
      <p>
        Livraison en 2 jours. Transport de {formatMoney(FEED_FREIGHT)} inclus
        dans chaque prix ci-dessous.
      </p>
      <div className="feed-shop">
        {FOOD_PACKS.map((pack, i) => (
          <Card key={pack.kg}>
            <strong>{pack.kg} kg</strong>
            <span>{formatMoney(pack.cost + FEED_FREIGHT)} livré</span>
            <EngineButton
              game={game}
              perform={perform}
              action={{ type: "food", pack: i }}
            >
              Commander {pack.kg} kg
            </EngineButton>
          </Card>
        ))}
      </div>
      {d.orders.length > 0 && (
        <section className="logistics-cards" aria-label="Livraisons attendues">
          <h3>Livraisons attendues</h3>
          {d.orders.map((o) => (
            <Card key={o.id} className="delivery-card">
              <Badge>
                <Truck size={16} /> Commande #{o.id}
              </Badge>
              <strong>
                {o.kind === "feed"
                  ? `${o.amount} kg d’aliments`
                  : `${number(o.amount)} ${SPECIES[o.species!].name}`}
              </strong>
              {o.pondId && (
                <span>{game.ponds.find((p) => p.id === o.pondId)?.name}</span>
              )}
              <CountdownChip label="Livraison" days={o.due - game.day} />
              <small>{formatDate(o.due)} · déjà réglée</small>
            </Card>
          ))}
        </section>
      )}
      <h3>Écloserie · transport vivant en 4 jours</h3>
      {game.ponds
        .filter((p) => p.built)
        .map((p) => {
          const incoming = d.orders.some((o) => o.pondId === p.id);
          return (
            <Card key={p.id}>
              <strong>{p.name}</strong>
              {p.count ? (
                <span>{number(p.count)} poissons en élevage</span>
              ) : incoming ? (
                <span>Commande en route · voir les livraisons</span>
              ) : p.fallowDays ? (
                <CountdownChip label="Vide sanitaire" days={p.fallowDays} />
              ) : (
                <>
                  <span>
                    Bassin disponible · prévoyez les aliments avant l’arrivée.
                  </span>
                  <Button tone="secondary" onClick={() => stock(p.id)}>
                    Commander des juvéniles
                  </Button>
                </>
              )}
            </Card>
          );
        })}
      {!game.ponds.some((p) => p.built) && (
        <p>
          Les juvéniles pourront arriver après la mise en service du premier
          bassin.
        </p>
      )}
    </div>
  );
}
function Buildings({ game, perform }: Commands) {
  const d = game.development;
  return (
    <div className="logistics-cards">
      {(Object.entries(ASSETS) as [Asset, (typeof ASSETS)[Asset]][]).map(
        ([key, a]) => {
          const work = d.works.find((w) => w.asset === key),
            Icon =
              key === "warehouse"
                ? Warehouse
                : key === "coldstore"
                  ? Snowflake
                  : Scissors;
          return (
            <Card key={key}>
              <h3>
                <Icon size={22} /> {a.name}
              </h3>
              <p>{a.description}</p>
              {d.assets[key] ? (
                <Badge tone="success">✓ En service</Badge>
              ) : work ? (
                <CountdownChip
                  label="Mise en service"
                  days={work.due - game.day}
                />
              ) : (
                <>
                  <strong>
                    {formatMoney(a.cost)} · {a.days} jours
                  </strong>
                  <EngineButton
                    game={game}
                    perform={perform}
                    action={{ type: "asset", asset: key }}
                  >
                    Aménager{" "}
                    {
                      {
                        warehouse: "le magasin d’aliments",
                        coldstore: "la chambre froide",
                        workshop: "l’atelier de préparation",
                      }[key]
                    }
                  </EngineButton>
                </>
              )}
            </Card>
          );
        },
      )}
    </div>
  );
}
function Clients({ game, perform }: Commands) {
  const d = game.development;
  return (
    <div className="logistics-cards">
      {d.contracts.length > 0 && (
        <section className="logistics-cards" aria-label="Réservations clients">
          <h3>Vos réservations</h3>
          {d.contracts.map((c) => {
            const p = game.ponds.find((p) => p.id === c.pondId)!,
              batch = d.batches.find((b) => b.contractId === c.id);
            return (
              <Card key={c.id}>
                <h3>
                  {p.name} → {BUYERS[c.buyer].name}
                </h3>
                <strong>
                  {formatUnitPrice(c.price)}/kg · {c.maxKg} kg maximum
                </strong>
                <CountdownChip
                  label="Livrer sous"
                  days={c.deadline - game.day}
                />
                <small>Date limite : {formatDate(c.deadline)}</small>
                {batch ? (
                  <p>
                    Lot #{batch.id} au froid. Préparez son transport dans
                    Expéditions.
                  </p>
                ) : (
                  <>
                    <p>
                      {formatKg(biomass(p))} en élevage ; collecte limitée par
                      le froid et le contrat. Paiement après livraison.
                    </p>
                    <EngineButton
                      game={game}
                      perform={perform}
                      action={{ type: "harvest", pondId: p.id }}
                    >
                      Récolter {p.name}
                    </EngineButton>
                    <Button
                      tone="quiet"
                      onClick={() =>
                        perform({ type: "cancelContract", id: c.id })
                      }
                    >
                      Annuler la réservation
                    </Button>
                  </>
                )}
              </Card>
            );
          })}
        </section>
      )}
      <p>
        Prospectez dès 80 % du calibre commercial. Chaque réservation fixe le
        prix pour une livraison sous 30 jours.
      </p>
      {(Object.entries(BUYERS) as [Buyer, (typeof BUYERS)[Buyer]][]).map(
        ([key, b]) => (
          <Card key={key}>
            <Badge>{b.product}</Badge>
            <h3>{b.name}</h3>
            <p>
              Jusqu’à {b.maxKg} kg vendables · prix du marché
              {b.factor !== 1 ? ` × ${number(b.factor, 1)}` : ""}.
            </p>
            <dl className="logistics-totals">
              <div>
                <dt>Transport frigorifique</dt>
                <dd>
                  {formatMoney(b.freight)} + {formatUnitPrice(b.perKg)}/kg
                </dd>
              </div>
              <div>
                <dt>Livraison / règlement</dt>
                <dd>1 jour / {b.payment} jours après réception</dd>
              </div>
            </dl>
            {b.processed && (
              <p>Atelier requis · 1 jour · 0,55 €/kg brut · rendement 85 %.</p>
            )}
            {game.ponds
              .filter(
                (p) =>
                  p.count &&
                  p.species &&
                  !d.contracts.some((c) => c.pondId === p.id),
              )
              .map((p) => (
                <div key={p.id} className="client-offer">
                  <strong>
                    {p.name} ·{" "}
                    {formatUnitPrice(
                      marketPrice(p.species!, game.day) * b.factor,
                    )}
                    /kg
                  </strong>
                  <EngineButton
                    game={game}
                    perform={perform}
                    action={{ type: "contract", pondId: p.id, buyer: key }}
                  >
                    Réserver {p.name} · {b.name}
                  </EngineButton>
                </div>
              ))}
          </Card>
        ),
      )}
      <details className="market-prices">
        <summary>Prix et espèces</summary>
        <div className="market-species">
          {Object.values(SPECIES).map((s) => (
            <article className="market-species-card" key={s.id}>
              <div className={`species-art ${s.id}`}>
                <FishArt species={s.id} />
              </div>
              <h3>{s.name}</h3>
              <div className="market-price">
                <strong>
                  {formatUnitPrice(marketPrice(s.id, game.day))}
                  <small>/ kg</small>
                </strong>
                <span>
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
                  Juvénile <b>{formatUnitPrice(s.seedPrice)}</b>
                </span>
                <span>
                  Calibre de vente <b>{s.harvestWeight * 1000} g</b>
                </span>
                <span>
                  Eau préférée <b>{s.temperature.join("–")} °C</b>
                </span>
              </div>
            </article>
          ))}
        </div>
      </details>
    </div>
  );
}
function Shipments({ game, perform }: Commands) {
  const d = game.development;
  return (
    <div className="logistics-cards">
      <dl className="logistics-totals">
        <div>
          <dt>Au froid</dt>
          <dd>{number(coldStock(game), 1)} / 1 500 kg</dd>
        </div>
        <div>
          <dt>Livré depuis le départ</dt>
          <dd>{formatKg(d.deliveredKg)}</dd>
        </div>
        <div>
          <dt>Factures à encaisser</dt>
          <dd>{formatMoney(d.shipments.reduce((n, s) => n + s.value, 0))}</dd>
        </div>
      </dl>
      {d.batches.map((b) => {
        const c = d.contracts.find((c) => c.id === b.contractId)!;
        const prepare = BUYERS[c.buyer].processed && !b.processed;
        return (
          <Card key={b.id} className="cold-batch-card">
            <Badge>
              <Snowflake size={16} /> Lot #{b.id} ·{" "}
              {b.processed ? "Éviscéré" : "Entier"}
            </Badge>
            <h3>
              {formatKg(b.kg)} · {SPECIES[b.species].name}
            </h3>
            <span>{BUYERS[c.buyer].name}</span>
            <CountdownChip label="Péremption" days={b.expires - game.day} />
            <small>Récolté le {formatDate(b.harvested)}</small>
            {b.processingDue !== null ? (
              <CountdownChip
                label="Fin de préparation"
                days={b.processingDue - game.day}
              />
            ) : (
              <>
                <p>
                  {prepare
                    ? `Préparation : ${formatMoney(b.kg * 0.55)}, une journée.`
                    : `Transport frigorifique : ${formatMoney(transportCost(b, c.buyer))}.`}
                </p>
                <EngineButton
                  game={game}
                  perform={perform}
                  action={{ type: prepare ? "process" : "dispatch", id: b.id }}
                >
                  {prepare
                    ? `Préparer le lot #${b.id}`
                    : `Expédier le lot #${b.id}`}
                </EngineButton>
              </>
            )}
          </Card>
        );
      })}
      {d.shipments.map((s) => (
        <Card key={s.id} className="shipment-card">
          <Badge tone={s.delivered ? "success" : "neutral"}>
            <Truck size={16} />
            {s.delivered ? "Livraison acceptée" : "En transport"}
          </Badge>
          <h3>
            {BUYERS[s.buyer].name} · {formatKg(s.kg)}
          </h3>
          {!s.delivered && (
            <CountdownChip label="Réception" days={s.arrival - game.day} />
          )}
          <CountdownChip label="Règlement" days={s.payment - game.day} />
          <strong>{formatMoney(s.value)}</strong>
          <small>Paiement le {formatDate(s.payment)}</small>
        </Card>
      ))}
      {!d.batches.length && !d.shipments.length && (
        <p>
          Aucun lot au froid ni facture en attente. Vos prochaines collectes
          apparaîtront ici.
        </p>
      )}
      <small>Pertes pour péremption : {formatKg(d.wasteKg)}.</small>
    </div>
  );
}
