import { number } from "../ui/format";
import { t, displayText } from "../i18n";
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
import { SpeciesPortrait } from "../world/SpeciesPortrait";
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
      name: t("m_08e6d9c4d8"),
      Icon: Package,
      value: `${d.orders.length} ${plural(d.orders.length, t("m_c393dc9abe"), t("m_9d0ff7c1b2"))}`,
      tab: "supply",
    },
    {
      name: t("m_20903d0030"),
      Icon: Warehouse,
      value: formatKg(game.food),
      tab: "assets",
    },
    {
      name: t("m_c0cd902ff5"),
      Icon: Fish,
      value: `${game.ponds.filter((p) => p.count).length} en élevage`,
      tab: null,
    },
    {
      name: t("m_7343b7c426"),
      Icon: Snowflake,
      value: formatKg(coldStock(game)),
      tab: "shipments",
    },
    {
      name: t("m_cdbcd670fe"),
      Icon: Truck,
      value: `${d.shipments.filter((s) => !s.delivered).length} en route`,
      tab: "shipments",
    },
    {
      name: t("m_0c77fe09ab"),
      Icon: Store,
      value: `${d.contracts.length} ${plural(d.contracts.length, t("m_54f605c03d"), t("m_c4644b46c2"))}`,
      tab: "clients",
    },
    {
      name: t("m_5d9e9e44e1"),
      Icon: Coins,
      value: `${d.paid} ${plural(d.paid, t("m_c501935a6b"), t("m_443ff9977e"))} ${plural(d.paid, t("m_02d77164f0"), t("m_97fb0d0819"))}`,
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
        <summary>{t("m_f0878c2849")}</summary>
        <ol className="production-chain" aria-label={t("m_de9257574d")}>
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
                aria-label={displayText(`${name} : ${value}`)}
              >
                <Icon size={20} />
                <span>
                  {i + 1} · {displayText(name)}
                </span>
                <small>{displayText(value)}</small>
              </button>
              {i < stages.length - 1 && (
                <ArrowRight size={12} aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </details>
      <Tabs
        label={t("m_d276454abd")}
        value={tab}
        onChange={onTab}
        items={[
          { id: "supply", label: t("m_28626d9e27") },
          { id: "assets", label: t("m_df2e10f983") },
          { id: "clients", label: t("m_65a7256542") },
          { id: "shipments", label: t("m_8085d1c3ae") },
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
}: Commands & {
  action: Action;
  children: ReactNode;
}) {
  const guard = availability(game, action);
  return (
    <Button
      className="full"
      disabled={guard.disabled}
      disabledReason={displayText(formatEngineText(guard.reason))}
      onClick={() => perform(action)}
    >
      {displayText(children)}
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
          <dt>{t("m_f9cef460e5")}</dt>
          <dd>{displayText(formatKg(game.food))}</dd>
        </div>
        <div>
          <dt>{t("m_e90d45d0dc")}</dt>
          <dd>
            {displayText(
              ration
                ? t("m_4f6facbdab", number(game.food / ration, 1))
                : t("m_dbd5715c3a"),
            )}
          </dd>
        </div>
        <div>
          <dt>{t("m_dfc8ecdd8e")}</dt>
          <dd>
            {displayText(number(reservedFood(game), 1))} / {number(feedCapacity(game), 2)}
            {" " + t("m_131ed73429")}
          </dd>
        </div>
      </dl>
      <h3>{t("m_262368d700")}</h3>
      <p>
        {t("m_168fff9041") + " "}
        {displayText(formatMoney(FEED_FREIGHT))}
        {" " + t("m_4150533674")}
      </p>
      <div className="feed-shop">
        {FOOD_PACKS.map((pack, i) => (
          <Card key={pack.kg}>
            <strong>
              {number(pack.kg, 2)}
              {" " + t("m_131ed73429")}
            </strong>
            <span>
              {displayText(formatMoney(pack.cost + FEED_FREIGHT))}
              {" " + t("m_0daba984dc")}
            </span>
            <EngineButton
              game={game}
              perform={perform}
              action={{ type: "food", pack: i }}
            >
              {t("m_16af7be312") + " "}
              {number(pack.kg, 2)}
              {" " + t("m_131ed73429")}
            </EngineButton>
          </Card>
        ))}
      </div>
      {d.orders.length > 0 && (
        <section className="logistics-cards" aria-label={t("m_b6310cb8b8")}>
          <h3>{t("m_b6310cb8b8")}</h3>
          {d.orders.map((o) => (
            <Card key={o.id} className="delivery-card">
              <Badge>
                <Truck size={16} />
                {" " + t("m_7d46ff4d9c")}
                {o.id}
              </Badge>
              <strong>
                {displayText(
                  o.kind === "feed"
                    ? t("m_f01d8aa0dc", o.amount)
                    : `${number(o.amount)} ${SPECIES[o.species!].name}`,
                )}
              </strong>
              {o.pondId && (
                <span>
                  {displayText(game.ponds.find((p) => p.id === o.pondId)?.name)}
                </span>
              )}
              <CountdownChip
                label={t("m_a8b3d250ac")}
                days={o.due - game.day}
              />
              <small>
                {displayText(formatDate(o.due))}
                {" " + t("m_24a5b52c9b")}
              </small>
            </Card>
          ))}
        </section>
      )}
      <h3>{t("m_c54d906b1d")}</h3>
      {game.ponds
        .filter((p) => p.built)
        .map((p) => {
          const incoming = d.orders.some((o) => o.pondId === p.id);
          return (
            <Card key={p.id}>
              <strong>{displayText(p.name)}</strong>
              {p.count ? (
                <span>
                  {displayText(number(p.count))}
                  {" " + t("m_bf8cb12c6a")}
                </span>
              ) : incoming ? (
                <span>{t("m_b8d9d75fd8")}</span>
              ) : p.fallowDays ? (
                <CountdownChip label={t("m_52cf616db6")} days={p.fallowDays} />
              ) : (
                <>
                  <span>{t("m_3d3a14085e")}</span>
                  <Button tone="secondary" onClick={() => stock(p.id)}>
                    {t("m_df22c1f8f7")}
                  </Button>
                </>
              )}
            </Card>
          );
        })}
      {!game.ponds.some((p) => p.built) && <p>{t("m_c660bdf256")}</p>}
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
                <Icon size={22} /> {displayText(a.name)}
              </h3>
              <p>{displayText(a.description)}</p>
              {d.assets[key] ? (
                <Badge tone="success">{t("m_22134a6ad3")}</Badge>
              ) : work ? (
                <CountdownChip
                  label={t("m_935d079b6d")}
                  days={work.due - game.day}
                />
              ) : (
                <>
                  <strong>
                    {displayText(formatMoney(a.cost))} · {a.days}
                    {" " + t("m_5cd11d34bc")}
                  </strong>
                  <EngineButton
                    game={game}
                    perform={perform}
                    action={{ type: "asset", asset: key }}
                  >
                    {t("m_4938ff87c5")}
                    {displayText(" ")}
                    {displayText(
                      {
                        warehouse: t("m_53580a1b87"),
                        coldstore: t("m_10c522b6aa"),
                        workshop: t("m_20a3008aa6"),
                      }[key],
                    )}
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
        <section className="logistics-cards" aria-label={t("m_5b95629ffd")}>
          <h3>{t("m_58ef03641b")}</h3>
          {d.contracts.map((c) => {
            const p = game.ponds.find((p) => p.id === c.pondId)!,
              batch = d.batches.find((b) => b.contractId === c.id);
            return (
              <Card key={c.id}>
                <h3>
                  {displayText(p.name)} → {displayText(BUYERS[c.buyer].name)}
                </h3>
                <strong>
                  {displayText(formatUnitPrice(c.price))}
                  {t("m_c8d6a671e5") + " "}
                  {number(c.maxKg, 2)}
                  {" " + t("m_a408c0d42d")}
                </strong>
                <CountdownChip
                  label={t("m_623cf7c496")}
                  days={c.deadline - game.day}
                />
                <small>
                  {t("m_946c27f0b2") + " "}
                  {displayText(formatDate(c.deadline))}
                </small>
                {batch ? (
                  <p>
                    {t("m_2a10cd48b3")}
                    {batch.id}
                    {" " + t("m_37ba66ce1a")}
                  </p>
                ) : (
                  <>
                    <p>
                      {displayText(formatKg(biomass(p)))}
                      {" " + t("m_db74b56574")}
                    </p>
                    <EngineButton
                      game={game}
                      perform={perform}
                      action={{ type: "harvest", pondId: p.id }}
                    >
                      {t("m_5e6223ada3") + " "}
                      {displayText(p.name)}
                    </EngineButton>
                    <Button
                      tone="quiet"
                      onClick={() =>
                        perform({ type: "cancelContract", id: c.id })
                      }
                    >
                      {t("m_de2d85c5cb")}
                    </Button>
                  </>
                )}
              </Card>
            );
          })}
        </section>
      )}
      <p>{t("m_efc8721aaf")}</p>
      {(Object.entries(BUYERS) as [Buyer, (typeof BUYERS)[Buyer]][]).map(
        ([key, b]) => (
          <Card key={key}>
            <Badge>{displayText(b.product)}</Badge>
            <h3>{displayText(b.name)}</h3>
            <p>
              {t("m_583c738bb4") + " "}
              {b.maxKg}
              {" " + t("m_6d6672e55e")}
              {displayText(b.factor !== 1 ? ` × ${number(b.factor, 1)}` : "")}.
            </p>
            <dl className="logistics-totals">
              <div>
                <dt>{t("m_16b6ed9c8e")}</dt>
                <dd>
                  {displayText(formatMoney(b.freight))} +{" "}
                  {displayText(formatUnitPrice(b.perKg))}
                  {t("m_69a7ab7cc9")}
                </dd>
              </div>
              <div>
                <dt>{t("m_0b58b918f1")}</dt>
                <dd>
                  {t("m_f7a3327307") + " "}
                  {b.payment}
                  {" " + t("m_c18a2e84ed")}
                </dd>
              </div>
            </dl>
            {b.processed && <p>{t("m_2725dd0144")}</p>}
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
                    {displayText(p.name)} ·{displayText(" ")}
                    {displayText(
                      formatUnitPrice(
                        marketPrice(p.species!, game.day) * b.factor,
                      ),
                    )}
                    {t("m_69a7ab7cc9")}
                  </strong>
                  <EngineButton
                    game={game}
                    perform={perform}
                    action={{ type: "contract", pondId: p.id, buyer: key }}
                  >
                    {t("m_c9f6b527c3") + " "}
                    {displayText(p.name)} · {displayText(b.name)}
                  </EngineButton>
                </div>
              ))}
          </Card>
        ),
      )}
      <details className="market-prices">
        <summary>{t("m_ea571d2230")}</summary>
        <div className="market-species">
          {Object.values(SPECIES).map((s) => (
            <article className="market-species-card" key={s.id}>
              <div className={`species-art ${s.id}`}>
                <SpeciesPortrait species={s.id} />
              </div>
              <h3>{displayText(s.name)}</h3>
              <div className="market-price">
                <strong>
                  {displayText(formatUnitPrice(marketPrice(s.id, game.day)))}
                  <small>{t("m_8558e58691")}</small>
                </strong>
                <span>
                  {displayText(
                    marketPrice(s.id, game.day) >= s.price ? "+" : "",
                  )}
                  {displayText(
                    number(
                      (marketPrice(s.id, game.day) / s.price - 1) * 100,
                      1,
                    ),
                  )}
                  {displayText(" ")}%
                </span>
              </div>
              <div className="species-facts">
                <span>
                  {t("m_ebfc733963") + " "}
                  <b>{displayText(formatUnitPrice(s.seedPrice))}</b>
                </span>
                <span>
                  {t("m_c31914e823") + " "}
                  <b>
                    {number(s.harvestWeight * 1000, 2)}
                    {" " + t("m_cd0aa98561")}
                  </b>
                </span>
                <span>
                  {t("m_d2c6e49d64") + " "}
                  <b>
                    {displayText(s.temperature.join("–"))}
                    {" " + t("m_11c4350690")}
                  </b>
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
          <dt>{t("m_78cbc092b4")}</dt>
          <dd>
            {displayText(number(coldStock(game), 1))}
            {" " + t("m_000068aa68")}
          </dd>
        </div>
        <div>
          <dt>{t("m_10bb236d87")}</dt>
          <dd>{displayText(formatKg(d.deliveredKg))}</dd>
        </div>
        <div>
          <dt>{t("m_413f11fdf0")}</dt>
          <dd>
            {displayText(
              formatMoney(d.shipments.reduce((n, s) => n + s.value, 0)),
            )}
          </dd>
        </div>
      </dl>
      {d.batches.map((b) => {
        const c = d.contracts.find((c) => c.id === b.contractId)!;
        const prepare = BUYERS[c.buyer].processed && !b.processed;
        return (
          <Card key={b.id} className="cold-batch-card">
            <Badge>
              <Snowflake size={16} />
              {" " + t("m_2a10cd48b3")}
              {b.id} ·{displayText(" ")}
              {displayText(b.processed ? t("m_44a615ae13") : t("m_69165b83f4"))}
            </Badge>
            <h3>
              {displayText(formatKg(b.kg))} ·{" "}
              {displayText(SPECIES[b.species].name)}
            </h3>
            <span>{displayText(BUYERS[c.buyer].name)}</span>
            <CountdownChip
              label={t("m_d5c01356c7")}
              days={b.expires - game.day}
            />
            <small>
              {t("m_31acc54cd6") + " "}
              {displayText(formatDate(b.harvested))}
            </small>
            {b.processingDue !== null ? (
              <CountdownChip
                label={t("m_47654cbe15")}
                days={b.processingDue - game.day}
              />
            ) : (
              <>
                <p>
                  {displayText(
                    prepare
                      ? t("m_5cd90d854c", formatMoney(b.kg * 0.55))
                      : t(
                          "m_38770ac1a0",
                          formatMoney(transportCost(b, c.buyer)),
                        ),
                  )}
                </p>
                <EngineButton
                  game={game}
                  perform={perform}
                  action={{ type: prepare ? "process" : "dispatch", id: b.id }}
                >
                  {displayText(
                    prepare ? t("m_671e81fb81", b.id) : t("m_67a8fde521", b.id),
                  )}
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
            {displayText(s.delivered ? t("m_d5f3d3021b") : t("m_9a4ee27e3b"))}
          </Badge>
          <h3>
            {displayText(BUYERS[s.buyer].name)} · {displayText(formatKg(s.kg))}
          </h3>
          {!s.delivered && (
            <CountdownChip
              label={t("m_9e3b845f94")}
              days={s.arrival - game.day}
            />
          )}
          <CountdownChip
            label={t("m_54d5138b57")}
            days={s.payment - game.day}
          />
          <strong>{displayText(formatMoney(s.value))}</strong>
          <small>
            {t("m_5d87336805") + " "}
            {displayText(formatDate(s.payment))}
          </small>
        </Card>
      ))}
      {!d.batches.length && !d.shipments.length && <p>{t("m_2d9ae0d133")}</p>}
      <small>
        {t("m_f9ebe1b778") + " "}
        {displayText(formatKg(d.wasteKg))}.
      </small>
    </div>
  );
}
