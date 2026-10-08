import type { Game } from "../game";
import { SPECIES } from "../game";
import { dailyFeed, type Task } from "../development";
import { t } from "../i18n";
import { number } from "../ui/format";
/** Concise presentation only. The original task, guards and actions remain intact. */
export function goalCopy(game: Game, task: Task) {
  const d = game.development;
  if (task.urgent)
    return {
      title: task.title,
      text: task.text.split(/(?<=[.!?])\s/)[0],
      label: task.label,
    };
  if (!d.surveyed)
    return d.surveyDue === null
      ? {
          title: t("goal.water.title"),
          text: t("goal.water.text"),
          label: task.label,
        }
      : {
          title: t("goal.analysis.title"),
          text: t("goal.analysis.text", d.surveyDue - game.day),
          label: t("goal.receive"),
        };
  if (d.paid && task.target === "project")
    return {
      title: t("goal.diversify.title"),
      text: t("goal.diversify.text"),
      label: t("goal.plot"),
    };
  if (task.action?.type === "autoFeed")
    return {
      title: t("goal.feed.title"),
      text: t("goal.feed.text"),
      label: task.label,
    };
  if (task.action?.type === "asset")
    return {
      title: t("goal.assets.title"),
      text: t("goal.assets.text"),
      label: task.label,
    };
  if (task.stock)
    return {
      title: t("goal.stock.title"),
      text: t("goal.stock.text"),
      label: t("goal.stock.action"),
    };
  if (task.stage === 1)
    return {
      title: t("goal.plan.title"),
      text: t("goal.plan.text"),
      label: t("goal.plot"),
    };
  if (task.stage === 2)
    return {
      title: t(task.wait ? "goal.works.title" : "goal.build.title"),
      text: task.wait
        ? t(
            "goal.works.text",
            Math.max(0, ...game.ponds.map((p) => p.constructionDays)),
          )
        : t("goal.build.text"),
      label: task.action ? task.label : t("goal.advance"),
    };
  if (task.stage === 3 && task.wait) {
    const fallow = game.ponds.find((p) => p.built && p.fallowDays),
      works = d.works.find((w) => w.asset === "warehouse"),
      delivery = d.orders.find((o) => o.kind === "feed");
    if (works)
      return {
        title: t("goal.store.title"),
        text: t("goal.store.text", works.due - game.day),
        label: t("goal.advance"),
      };
    if (delivery)
      return {
        title: t("goal.delivery.title"),
        text: t("goal.delivery.text", delivery.amount, delivery.due - game.day),
        label: t("goal.advance"),
      };
    if (fallow)
      return {
        title: t("goal.fallow.title"),
        text: t("goal.fallow.text", fallow.fallowDays),
        label: t("goal.advance"),
      };
  }
  if (task.stage === 3)
    return {
      title: t("goal.supply.title"),
      text: t("goal.supply.text"),
      label: task.wait ? t("goal.advance") : t("goal.order"),
    };
  if (task.stage === 4) {
    const p = game.ponds.find((p) => p.count && p.species),
      ration = dailyFeed(game);
    return {
      title: t("goal.grow.title"),
      text:
        p && p.species
          ? t(
              "goal.grow.text",
              number(p.weight * 1000),
              number(SPECIES[p.species].harvestWeight * 1000),
              ration ? number(game.food / ration, 1) : "—",
            )
          : task.text,
      label: t("goal.advance"),
    };
  }
  if (task.stage === 5)
    return {
      title: t("goal.customer.title"),
      text: t("goal.customer.text"),
      label: t("goal.customer.action"),
    };
  if (task.stage === 6)
    return {
      title: t("goal.harvest.title"),
      text: t("goal.harvest.text"),
      label: t("goal.harvest.action"),
    };
  if (task.stage === 8 && d.shipments.length)
    return {
      title: t("goal.payment.title"),
      text: t(
        "goal.payment.text",
        Math.max(0, Math.min(...d.shipments.map((s) => s.payment)) - game.day),
      ),
      label: t("goal.advance"),
    };
  return { title: task.title, text: task.text, label: task.label };
}
