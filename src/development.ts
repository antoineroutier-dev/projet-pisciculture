/** Scenario logistics, not a regulatory or professional farm planning model. */
import {
  SPECIES,
  FOOD_PACKS,
  CONSTRUCTION_COST,
  CONSTRUCTION_DAYS,
  biomass,
  compatible,
  euro,
  feedNeeded,
  harvestReady,
  marketPrice,
  number,
  log,
  spend,
  type Action,
  type Game,
  type SpeciesId,
} from "./game";

export type Asset = "warehouse" | "coldstore" | "workshop";
export type Buyer = "cooperative" | "fishmonger";
export const ASSETS = {
  warehouse: {
    name: "Magasin d’aliments",
    cost: 2600,
    days: 7,
    description:
      "Un local sec pour 2 000 kg d’aliments. Le petit abri existant contient 100 kg.",
  },
  coldstore: {
    name: "Chambre froide",
    cost: 4800,
    days: 10,
    description:
      "1 500 kg à 0–2 °C. Récoltes conservées au maximum 3 jours dans ce scénario.",
  },
  workshop: {
    name: "Atelier de préparation",
    cost: 6500,
    days: 14,
    description:
      "Poissons éviscérés en 1 jour, rendement 85 %. Nécessaire pour les poissonneries.",
  },
} as const;
export const BUYERS = {
  cooperative: {
    name: "Coopérative régionale",
    product: "Poissons entiers",
    factor: 1,
    maxKg: 1500,
    payment: 7,
    freight: 95,
    perKg: 0.16,
    processed: false,
  },
  fishmonger: {
    name: "Poissonneries locales",
    product: "Poissons éviscérés",
    factor: 1.5,
    maxKg: 800,
    payment: 3,
    freight: 45,
    perKg: 0.3,
    processed: true,
  },
} as const;
export const SOURCE_FLOW = 24; // L/s available simultaneously to raceways and RAS makeup.
export const STOCK_FREIGHT = 90;
export const FEED_FREIGHT = 18;
export interface SupplyOrder {
  id: number;
  kind: "feed" | "juveniles";
  due: number;
  amount: number;
  cost: number;
  pondId: number | null;
  species: SpeciesId | null;
}
export interface Contract {
  id: number;
  pondId: number;
  species: SpeciesId;
  buyer: Buyer;
  deadline: number;
  price: number;
  maxKg: number;
}
export interface ColdBatch {
  id: number;
  contractId: number;
  species: SpeciesId;
  kg: number;
  harvested: number;
  expires: number;
  processed: boolean;
  processingDue: number | null;
}
export interface Shipment {
  id: number;
  contractId: number;
  species: SpeciesId;
  buyer: Buyer;
  kg: number;
  value: number;
  arrival: number;
  payment: number;
  delivered: boolean;
}
export interface Development {
  surveyed: boolean;
  surveyDue: number | null;
  assets: Record<Asset, boolean>;
  works: { asset: Asset; due: number }[];
  orders: SupplyOrder[];
  contracts: Contract[];
  batches: ColdBatch[];
  shipments: Shipment[];
  nextId: number;
  received: number;
  harvestedKg: number;
  deliveredKg: number;
  paid: number;
  wasteKg: number;
  migrated: boolean;
}
export type DevelopmentAction =
  | { type: "survey" }
  | { type: "plan"; pondId: number; species: SpeciesId }
  | { type: "asset"; asset: Asset }
  | { type: "contract"; pondId: number; buyer: Buyer }
  | { type: "cancelContract"; id: number }
  | { type: "process" | "dispatch"; id: number };
export function initialDevelopment(migrated = false): Development {
  return {
    surveyed: migrated,
    surveyDue: null,
    assets: { warehouse: migrated, coldstore: migrated, workshop: false },
    works: [],
    orders: [],
    contracts: [],
    batches: [],
    shipments: [],
    nextId: 1,
    received: 0,
    harvestedKg: 0,
    deliveredKg: 0,
    paid: 0,
    wasteKg: 0,
    migrated,
  };
}
export const feedCapacity = (g: Game) =>
  g.development.assets.warehouse ? 2000 : 100;
export const reservedFood = (g: Game) =>
  g.food +
  g.development.orders
    .filter((o) => o.kind === "feed")
    .reduce((n, o) => n + o.amount, 0) +
  g.ponds.reduce((n, p) => n + p.feedToday, 0);
export const waterUsed = (g: Game) =>
  g.ponds
    .filter((p) => p.facility !== "earth" && (p.built || p.constructionDays))
    .reduce((n, p) => n + p.flow, 0);
export const dailyFeed = (g: Game) =>
  g.ponds.reduce((n, p) => n + feedNeeded(p), 0);
export const coldStock = (g: Game) =>
  g.development.batches.reduce((n, b) => n + b.kg, 0);
export const transportCost = (b: ColdBatch, buyer: Buyer) =>
  Math.round((BUYERS[buyer].freight + b.kg * BUYERS[buyer].perKg) * 100) / 100;
const round = (v: number) => Math.round(v * 1000) / 1000;

/** Receipts are applied at the end of the day: a newly arrived lot is fed from the next day. */
export function advanceDevelopment(g: Game, funded = true) {
  const d = g.development;
  if (d.surveyDue !== null && g.day >= d.surveyDue) {
    d.surveyed = true;
    d.surveyDue = null;
    log(
      g,
      "Analyse reçue : source fraîche à 11,8–15,2 °C, débit disponible partagé de 24 L/s ; eau d’étang saisonnière. Choisissez votre filière.",
    );
  }
  d.works = d.works.filter((w) => {
    if (w.due > g.day) return true;
    d.assets[w.asset] = true;
    log(
      g,
      `${ASSETS[w.asset].name} : aménagement terminé, équipement disponible.`,
    );
    return false;
  });
  d.orders = d.orders.filter((o) => {
    if (o.due > g.day) return true;
    if (o.kind === "feed") {
      g.food = round(g.food + o.amount);
      log(
        g,
        `Livraison reçue : ${o.amount} kg d’aliments contrôlés et rangés au sec.`,
      );
    } else {
      const p = g.ponds.find((p) => p.id === o.pondId)!;
      Object.assign(p, {
        species: o.species,
        count: o.amount,
        weight: SPECIES[o.species!].initialWeight,
        health: 100,
        age: 0,
        quarantineDays: 14,
        fastingDays: 0,
        totalFeed: 0,
        totalGain: 0,
        feedToday: 0,
        lastFeed: 0,
        lastGrowth: 0,
        satiety: 0,
        autoFeed: false,
      });
      log(
        g,
        `${p.name} : ${o.amount} juvéniles reçus de l’écloserie, acclimatés. Observation pendant 14 jours. Activez la distribution d’aliments.`,
      );
    }
    d.received++;
    return false;
  });
  d.batches = d.batches.filter((b) => {
    if (g.day >= b.expires || !funded) {
      d.wasteKg = round(d.wasteKg + b.kg);
      log(
        g,
        `Lot froid #${b.id} : ${!funded ? "charges non couvertes, froid interrompu" : "durée de conservation dépassée"}. ${number(b.kg, 1)} kg retirés de la vente. Prévoyez le transport et la trésorerie avant récolte.`,
        "warning",
      );
      d.contracts = d.contracts.filter((c) => c.id !== b.contractId);
      return false;
    }
    if (b.processingDue !== null && g.day >= b.processingDue) {
      const loss = b.kg * 0.15;
      b.kg = round(b.kg * 0.85);
      b.processed = true;
      b.processingDue = null;
      log(
        g,
        `Lot #${b.id} préparé : ${number(b.kg, 1)} kg vendables, ${number(loss, 1)} kg de coproduits. La date limite de conservation reste inchangée.`,
      );
    }
    return true;
  });
  d.shipments = d.shipments.filter((s) => {
    if (!s.delivered && g.day >= s.arrival) {
      s.delivered = true;
      d.deliveredKg = round(d.deliveredKg + s.kg);
      log(
        g,
        `${BUYERS[s.buyer].name} : livraison de ${number(s.kg, 1)} kg acceptée. Règlement au jour ${s.payment}.`,
        "sale",
      );
    }
    if (g.day >= s.payment) {
      g.money = Math.round((g.money + s.value) * 100) / 100;
      g.stats.income = Math.round((g.stats.income + s.value) * 100) / 100;
      g.stats.sales++;
      g.stats.soldKg = round(g.stats.soldKg + s.kg);
      d.paid++;
      g.xp += 25;
      log(
        g,
        `${BUYERS[s.buyer].name} : règlement reçu de ${euro(s.value)}. Le cycle de vente est terminé.`,
        "sale",
      );
      return false;
    }
    return true;
  });
  d.contracts = d.contracts.filter((c) => {
    if (g.day <= c.deadline || d.batches.some((b) => b.contractId === c.id))
      return true;
    log(
      g,
      `${BUYERS[c.buyer].name} : réservation #${c.id} expirée sans livraison. Réservez un nouveau débouché.`,
      "warning",
    );
    return false;
  });
}

/** Returns null for actions belonging to the biological model. All mutations occur on a clone. */
export function developmentAction(
  g: Game,
  a: Action,
): { ok: boolean; message: string } | null {
  const d = g.development;
  const fail = (message: string) => ({ ok: false, message });
  const done = (message: string) => ({ ok: true, message });
  if (a.type === "survey") {
    if (d.surveyed || d.surveyDue !== null)
      return fail("L’analyse est déjà réalisée ou en cours.");
    if (g.money < 240) return fail("Il faut 240 € pour l’étude de l’eau.");
    spend(g, 240);
    d.surveyDue = g.day + 2;
    return done(
      "Prélèvements envoyés au laboratoire. Résultats dans 2 jours ; coût 240 €.",
    );
  }
  if (a.type === "asset") {
    if (!Object.hasOwn(ASSETS, a.asset)) return fail("Équipement inconnu.");
    const spec = ASSETS[a.asset];
    if (!d.surveyed)
      return fail("Analysez d’abord l’eau pour définir votre projet.");
    if (d.assets[a.asset] || d.works.some((w) => w.asset === a.asset))
      return fail("Cet équipement est déjà disponible ou en travaux.");
    if (a.asset === "workshop" && !d.assets.coldstore)
      return fail("Mettez d’abord la chambre froide en service.");
    if (g.money < spec.cost)
      return fail("Trésorerie insuffisante pour cet aménagement.");
    spend(g, spec.cost);
    d.works.push({ asset: a.asset, due: g.day + spec.days });
    return done(
      `${spec.name} : travaux commandés, ${spec.days} jours · ${euro(spec.cost)}.`,
    );
  }
  if (a.type === "plan") {
    const p = g.ponds.find((p) => p.id === a.pondId);
    if (!d.surveyed)
      return fail("Attendez les résultats de l’analyse de l’eau.");
    if (!p || p.built || p.constructionDays)
      return fail("Choisissez une parcelle encore libre.");
    if (!Object.hasOwn(SPECIES, a.species) || !compatible(p, a.species))
      return fail(
        "Cette espèce ne convient pas à l’eau et à l’installation de cette parcelle.",
      );
    p.plannedSpecies = a.species;
    return done(
      `${p.name} : projet ${SPECIES[a.species].name} retenu. Vous pouvez lancer le chantier.`,
    );
  }
  if (a.type === "build") {
    const p = g.ponds.find((p) => p.id === a.pondId);
    if (!p || p.built || p.constructionDays)
      return fail("Ce bassin est construit ou en chantier.");
    if (!d.surveyed || !p.plannedSpecies)
      return fail(
        "Analysez l’eau puis choisissez une filière dans « Mon projet ».",
      );
    if (p.facility !== "earth" && waterUsed(g) + p.flow > SOURCE_FLOW + 1e-6)
      return fail(
        "Débit de source insuffisant : les bassins partagent 24 L/s. Réduisez un débit avant de construire.",
      );
    const cost = CONSTRUCTION_COST[p.id - 1];
    if (g.money < cost) return fail("Trésorerie insuffisante.");
    spend(g, cost);
    p.constructionDays = CONSTRUCTION_DAYS[p.id - 1];
    g.xp += 30;
    return done(
      `${p.name} : chantier et mise en service, ${p.constructionDays} jours · ${euro(cost)}.`,
    );
  }
  if (a.type === "flow") {
    const p = g.ponds.find((p) => p.id === a.pondId);
    if (
      p?.built &&
      p.facility !== "earth" &&
      waterUsed(g) - p.flow + a.value > SOURCE_FLOW + 1e-6
    )
      return fail(
        "La source ne fournit que 24 L/s pour l’ensemble des installations.",
      );
    return null;
  }
  if (a.type === "food") {
    const pack = FOOD_PACKS[a.pack];
    if (!d.surveyed)
      return fail("Commencez par l’étude de l’eau et le choix d’une filière.");
    if (!pack) return fail("Conditionnement inconnu.");
    if (reservedFood(g) + pack.kg > feedCapacity(g) + 0.001)
      return fail(
        `Stock et commandes dépasseraient ${feedCapacity(g)} kg. Aménagez le magasin d’aliments ou commandez moins.`,
      );
    const cost = pack.cost + FEED_FREIGHT;
    if (g.money < cost)
      return fail("Trésorerie insuffisante, transport inclus.");
    spend(g, cost);
    d.orders.push({
      id: d.nextId++,
      kind: "feed",
      due: g.day + 2,
      amount: pack.kg,
      cost,
      pondId: null,
      species: null,
    });
    return done(
      `${pack.kg} kg commandés au fabricant. Livraison dans 2 jours · ${euro(cost)}, transport inclus.`,
    );
  }
  if (a.type === "stock") {
    const p = g.ponds.find((p) => p.id === a.pondId);
    if (!p?.built)
      return fail(
        "Le bassin doit être mis en service avant de commander des poissons.",
      );
    if (p.count || d.orders.some((o) => o.pondId === p.id))
      return fail(
        "Ce bassin contient déjà un lot ou attend une livraison de juvéniles.",
      );
    if (p.fallowDays)
      return fail(`Respectez encore ${p.fallowDays} jours de vide sanitaire.`);
    if (!Object.hasOwn(SPECIES, a.species) || !compatible(p, a.species))
      return fail("Espèce incompatible avec cette installation.");
    const s = SPECIES[a.species];
    if (
      !Number.isInteger(a.count) ||
      a.count < 1 ||
      a.count > p.capacity ||
      (a.count * s.harvestWeight) / p.volume > p.maxDensity
    )
      return fail("Ce lot dépasserait la capacité en biomasse à la récolte.");
    const cost =
      Math.round((a.count * s.seedPrice + STOCK_FREIGHT) * 100) / 100;
    if (g.money < cost)
      return fail("Trésorerie insuffisante, transport vivant inclus.");
    if (
      g.food +
        d.orders
          .filter((o) => o.kind === "feed")
          .reduce((n, o) => n + o.amount, 0) <
      a.count * s.initialWeight * s.ration * 3
    )
      return fail(
        "Prévoyez au moins trois premières rations d’aliments avant de commander les juvéniles.",
      );
    spend(g, cost);
    p.plannedSpecies = a.species;
    d.orders.push({
      id: d.nextId++,
      kind: "juveniles",
      due: g.day + 4,
      amount: a.count,
      cost,
      pondId: p.id,
      species: a.species,
    });
    return done(
      `${a.count} juvéniles réservés à l’écloserie. Transport vivant et acclimatation dans 4 jours · ${euro(cost)}.`,
    );
  }
  if (a.type === "contract") {
    const p = g.ponds.find((p) => p.id === a.pondId);
    if (!p?.species || !p.count)
      return fail("Il faut un lot en élevage pour réserver un débouché.");
    if (!Object.hasOwn(BUYERS, a.buyer)) return fail("Client inconnu.");
    if (d.contracts.some((c) => c.pondId === p.id))
      return fail("Un débouché est déjà réservé pour ce bassin.");
    if (p.weight < SPECIES[p.species].harvestWeight * 0.8)
      return fail(
        "Prospection ouverte à partir de 80 % du calibre de récolte, pour éviter une promesse trop précoce.",
      );
    const buyer = BUYERS[a.buyer];
    if (buyer.processed && !d.assets.workshop)
      return fail(
        "Les poissonneries demandent un lot éviscéré : aménagez l’atelier de préparation.",
      );
    if (!d.assets.coldstore)
      return fail("Aménagez la chambre froide avant de réserver une récolte.");

    const price =
      Math.round(marketPrice(p.species, g.day) * buyer.factor * 100) / 100;
    d.contracts.push({
      id: d.nextId++,
      pondId: p.id,
      species: p.species,
      buyer: a.buyer,
      deadline: g.day + 30,
      price,
      maxKg: buyer.maxKg,
    });
    return done(
      `${buyer.name} : ${buyer.product.toLowerCase()} à ${euro(price)}/kg. Livraison sous 30 jours, règlement ${buyer.payment} jours après réception.`,
    );
  }
  if (a.type === "cancelContract") {
    const c = d.contracts.find((c) => c.id === a.id);
    if (!c || d.batches.some((b) => b.contractId === c.id))
      return fail("La réservation ne peut plus être annulée après la récolte.");
    d.contracts = d.contracts.filter((c) => c.id !== a.id);
    return done(
      "Réservation annulée sans frais avant récolte. Vous pouvez choisir un autre client.",
    );
  }
  if (a.type === "harvest") {
    const p = g.ponds.find((p) => p.id === a.pondId);
    if (!p?.species || !harvestReady(p))
      return fail(
        "Attendez le calibre commercial et la fin des 14 jours d’observation.",
      );
    if (p.health < 60)
      return fail("Stabilisez la santé du lot avant commercialisation.");
    if (!d.assets.coldstore)
      return fail("La récolte nécessite une chambre froide opérationnelle.");
    const c = d.contracts.find((c) => c.pondId === p.id);
    if (!c || c.deadline < g.day + (BUYERS[c.buyer].processed ? 2 : 1))
      return fail(
        "Réservez un débouché avec assez de temps pour préparer et livrer le lot.",
      );
    const harvestCount = Math.min(
      p.count,
      Math.floor((1500 - coldStock(g)) / p.weight),
      Math.floor(c.maxKg / (p.weight * (BUYERS[c.buyer].processed ? 0.85 : 1))),
    );
    if (harvestCount < 1)
      return fail(
        "La chambre froide est pleine. Expédiez d’abord les lots en stock.",
      );
    const kg = harvestCount * p.weight;
    const cost = Math.round(kg * 0.25 * 100) / 100;
    if (g.money < cost)
      return fail(
        "Prévoyez 0,25 €/kg pour la récolte, le glaçage et les caisses.",
      );
    spend(g, cost);
    d.batches.push({
      id: d.nextId++,
      contractId: c.id,
      species: p.species,
      kg,
      harvested: g.day,
      expires: g.day + 3,
      processed: false,
      processingDue: null,
    });
    d.harvestedKg = round(d.harvestedKg + kg);
    const returned = round((p.feedToday * harvestCount) / p.count);
    g.food = round(g.food + returned);
    g.stats.feedUsed = round(g.stats.feedUsed - returned);
    p.feedToday = round(p.feedToday - returned);
    p.count -= harvestCount;
    if (!p.count)
      Object.assign(p, {
        species: null,
        weight: 0,
        health: 100,
        feedToday: 0,
        satiety: 0,
        autoFeed: false,
        fallowDays: 7,
      });
    return done(
      `${number(kg, 1)} kg récoltés et mis au froid · ${euro(cost)}. Livraison avant péremption dans 3 jours. ${p.count ? `${p.count} poissons restent en élevage ; vous pourrez réserver une autre collecte.` : "Bassin vidé : vide sanitaire de 7 jours."}`,
    );
  }
  if (a.type === "process" || a.type === "dispatch") {
    const b = d.batches.find((b) => b.id === a.id);
    const c = b && d.contracts.find((c) => c.id === b.contractId);
    if (!b || !c) return fail("Lot froid ou réservation introuvable.");
    const buyer = BUYERS[c.buyer];
    if (a.type === "process") {
      if (!d.assets.workshop || !buyer.processed)
        return fail(
          "Préparation réservée aux contrats poissonnerie, dans un atelier opérationnel.",
        );
      if (b.processed || b.processingDue !== null)
        return fail("Ce lot est déjà préparé ou en préparation.");
      if (g.day + 2 >= b.expires || g.day + 2 > c.deadline)
        return fail(
          "Il ne reste pas assez de temps pour préparer puis livrer ce lot frais.",
        );
      const cost = Math.round(b.kg * 0.55 * 100) / 100;
      if (g.money < cost)
        return fail(
          "Trésorerie insuffisante : la préparation coûte 0,55 €/kg brut.",
        );
      spend(g, cost);
      b.processingDue = g.day + 1;
      return done(
        `Préparation lancée pour le lot #${b.id} : 1 jour, rendement 85 % · ${euro(cost)}.`,
      );
    }
    if (b.processingDue !== null || b.processed !== buyer.processed)
      return fail(
        "Terminez la préparation demandée par le client avant expédition.",
      );
    if (g.day + 1 >= b.expires || g.day + 1 > c.deadline)
      return fail(
        "La livraison arriverait trop tard. La durée de conservation ne permet plus cet envoi.",
      );
    const cost = transportCost(b, c.buyer);
    if (g.money < cost)
      return fail(
        "Trésorerie insuffisante pour affréter le transport frigorifique.",
      );
    spend(g, cost);
    d.shipments.push({
      id: d.nextId++,
      contractId: c.id,
      species: b.species,
      buyer: c.buyer,
      kg: b.kg,
      value: Math.round(b.kg * c.price * 100) / 100,
      arrival: g.day + 1,
      payment: g.day + 1 + buyer.payment,
      delivered: false,
    });
    d.batches = d.batches.filter((x) => x.id !== b.id);
    d.contracts = d.contracts.filter((x) => x.id !== c.id);
    return done(
      `Lot #${b.id} confié au transporteur frigorifique · ${euro(cost)}. Livraison demain, paiement ${buyer.payment} jours après réception.`,
    );
  }
  return null;
}

/** Strict shape and relationship checks for imported logistics. Unknown fields are discarded. */
export function parseDevelopment(
  raw: unknown,
  ponds: Game["ponds"],
  day: number,
): Development {
  const obj = (x: unknown): x is Record<string, unknown> =>
    !!x && typeof x === "object" && !Array.isArray(x);
  const num = (x: unknown, min = 0, max = 1e12): x is number =>
    typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
  const int = (x: unknown, min = 0, max = 1e9): x is number =>
    num(x, min, max) && Number.isInteger(x);
  const array = (x: unknown): x is Record<string, unknown>[] =>
    Array.isArray(x) && x.length <= 100 && x.every(obj);
  const species = (x: unknown): x is SpeciesId =>
    typeof x === "string" && Object.hasOwn(SPECIES, x);
  const asset = (x: unknown): x is Asset =>
    typeof x === "string" && Object.hasOwn(ASSETS, x);
  const buyer = (x: unknown): x is Buyer =>
    typeof x === "string" && Object.hasOwn(BUYERS, x);
  const fail = (): never => {
    throw new Error(
      "Sauvegarde incompatible ou endommagée : chaîne logistique incohérente. La partie actuelle est conservée.",
    );
  };
  if (
    !obj(raw) ||
    typeof raw.surveyed !== "boolean" ||
    typeof raw.migrated !== "boolean" ||
    !(raw.surveyDue === null || int(raw.surveyDue, day + 1, day + 2)) ||
    (raw.surveyed && raw.surveyDue !== null) ||
    !obj(raw.assets) ||
    !Object.keys(ASSETS).every(
      (k) => typeof (raw.assets as Record<string, unknown>)[k] === "boolean",
    ) ||
    !int(raw.nextId, 1) ||
    !int(raw.received) ||
    !int(raw.paid) ||
    !["harvestedKg", "deliveredKg", "wasteKg"].every((k) => num(raw[k])) ||
    !array(raw.works) ||
    !array(raw.orders) ||
    !array(raw.contracts) ||
    !array(raw.batches) ||
    !array(raw.shipments)
  )
    return fail();
  const d = initialDevelopment(raw.migrated);
  d.surveyed = raw.surveyed;
  d.surveyDue = raw.surveyDue as number | null;
  d.assets = {
    warehouse: raw.assets.warehouse as boolean,
    coldstore: raw.assets.coldstore as boolean,
    workshop: raw.assets.workshop as boolean,
  };
  d.nextId = raw.nextId;
  d.received = raw.received;
  d.paid = raw.paid;
  d.harvestedKg = raw.harvestedKg as number;
  d.deliveredKg = raw.deliveredKg as number;
  d.wasteKg = raw.wasteKg as number;
  if (d.assets.workshop && !d.assets.coldstore) return fail();
  for (const w of raw.works) {
    if (
      !asset(w.asset) ||
      d.assets[w.asset] ||
      d.works.some((x) => x.asset === w.asset) ||
      !int(w.due, day + 1, day + ASSETS[w.asset].days) ||
      (w.asset === "workshop" && !d.assets.coldstore)
    )
      return fail();
    d.works.push({ asset: w.asset, due: w.due });
  }
  const ids = new Set<number>();
  const checkId = (v: unknown) => {
    if (!int(v, 1, d.nextId - 1) || ids.has(v)) return false;
    ids.add(v);
    return true;
  };
  for (const o of raw.orders) {
    if (
      !checkId(o.id) ||
      !["feed", "juveniles"].includes(o.kind as string) ||
      !int(o.amount, 1, 10000) ||
      !num(o.cost) ||
      !int(o.due, day + 1, day + (o.kind === "feed" ? 2 : 4))
    )
      return fail();
    if (o.kind === "feed") {
      if (
        o.species !== null ||
        o.pondId !== null ||
        !FOOD_PACKS.some((p) => p.kg === o.amount)
      )
        return fail();
    } else {
      const p = ponds.find((p) => p.id === o.pondId);
      if (
        !p?.built ||
        p.count ||
        p.fallowDays ||
        !species(o.species) ||
        !compatible(p, o.species) ||
        o.amount > p.capacity ||
        (o.amount * SPECIES[o.species].harvestWeight) / p.volume >
          p.maxDensity ||
        d.orders.some((x) => x.pondId === p.id)
      )
        return fail();
    }
    d.orders.push({
      id: o.id as number,
      kind: o.kind as SupplyOrder["kind"],
      due: o.due,
      amount: o.amount,
      cost: o.cost,
      pondId: o.pondId as number | null,
      species: o.species as SpeciesId | null,
    });
  }
  for (const c of raw.contracts) {
    if (
      !checkId(c.id) ||
      !int(c.pondId, 1, 4) ||
      !species(c.species) ||
      !buyer(c.buyer) ||
      !int(c.deadline, 1, day + 30) ||
      !num(c.price, 0.01, 1000) ||
      c.maxKg !== BUYERS[c.buyer].maxKg ||
      d.contracts.some((x) => x.pondId === c.pondId)
    )
      return fail();
    d.contracts.push({
      id: c.id as number,
      pondId: c.pondId,
      species: c.species,
      buyer: c.buyer,
      deadline: c.deadline,
      price: c.price,
      maxKg: c.maxKg as number,
    });
  }
  for (const b of raw.batches) {
    const c = d.contracts.find((c) => c.id === b.contractId);
    if (
      !checkId(b.id) ||
      !c ||
      !d.assets.coldstore ||
      d.batches.some((x) => x.contractId === c.id) ||
      b.species !== c.species ||
      !num(b.kg, 0.001, 1500) ||
      !int(b.harvested, Math.max(1, day - 2), day) ||
      b.expires !== b.harvested + 3 ||
      typeof b.processed !== "boolean" ||
      !(b.processingDue === null || b.processingDue === day + 1) ||
      (b.processed && b.processingDue !== null) ||
      ((b.processed || b.processingDue !== null) &&
        (!d.assets.workshop || !BUYERS[c.buyer].processed))
    )
      return fail();
    d.batches.push({
      id: b.id as number,
      contractId: c.id,
      species: c.species,
      kg: b.kg,
      harvested: b.harvested,
      expires: b.expires as number,
      processed: b.processed,
      processingDue: b.processingDue as number | null,
    });
  }
  if (d.batches.reduce((n, b) => n + b.kg, 0) > 1500 + 0.001) return fail();
  for (const c of d.contracts) {
    const p = ponds.find((p) => p.id === c.pondId)!;
    if (
      !d.batches.some((b) => b.contractId === c.id) &&
      (p.species !== c.species || !p.count || c.deadline < day)
    )
      return fail();
  }
  for (const s of raw.shipments) {
    if (
      !checkId(s.id) ||
      !int(s.contractId, 1, d.nextId - 1) ||
      ids.has(s.contractId) ||
      !species(s.species) ||
      !buyer(s.buyer) ||
      !num(s.kg, 0.001, BUYERS[s.buyer].maxKg) ||
      !num(s.value, 0.01) ||
      !int(s.arrival, Math.max(1, day - 7), day + 1) ||
      s.payment !== s.arrival + BUYERS[s.buyer].payment ||
      (s.payment as number) <= day ||
      typeof s.delivered !== "boolean" ||
      s.delivered !== s.arrival <= day
    )
      return fail();
    ids.add(s.contractId);
    d.shipments.push({
      id: s.id as number,
      contractId: s.contractId,
      species: s.species,
      buyer: s.buyer,
      kg: s.kg,
      value: s.value,
      arrival: s.arrival,
      payment: s.payment as number,
      delivered: s.delivered,
    });
  }
  if (
    !d.surveyed &&
    (ponds.some((p) => p.built || p.constructionDays || p.plannedSpecies) ||
      d.works.length ||
      d.orders.length ||
      d.contracts.length ||
      d.batches.length ||
      d.shipments.length ||
      Object.values(d.assets).some(Boolean))
  )
    return fail();
  return d;
}

export interface Task {
  stage: number;
  title: string;
  text: string;
  label: string;
  action?: Action;
  target?: "project" | "ponds" | "logistics";
  pondId?: number;
  wait?: number;
  stock?: number;
  urgent?: boolean;
}
export const STAGES = [
  "Comprendre l’eau",
  "Choisir la filière",
  "Aménager",
  "Approvisionner",
  "Élever",
  "Réserver un client",
  "Récolter",
  "Livrer",
  "Encaisser",
];
export function nextTask(g: Game): Task {
  const d = g.development;
  if (!d.surveyed)
    return d.surveyDue === null
      ? {
          stage: 0,
          title: "Tout commence par l’eau",
          text: "Vous disposez d’un terrain et de 60 000 € de capital de départ. Avant d’élever un poisson, faites analyser la ressource : elle déterminera les espèces et les installations possibles.",
          label: "Analyser l’eau · 240 €",
          action: { type: "survey" },
        }
      : {
          stage: 0,
          title: "Le laboratoire analyse vos prélèvements",
          text: `Les résultats arrivent dans ${d.surveyDue - g.day} jour(s). Le calendrier est en pause : avancez jusqu’au résultat. Aucun poisson n’attend vos soins.`,
          label: "Recevoir les résultats",
          wait: d.surveyDue - g.day,
        };
  const critical = g.ponds.find(
    (p) =>
      p.count &&
      p.species &&
      (p.oxygen < SPECIES[p.species].minOxygen || p.health < 60),
  );
  if (critical)
    return {
      stage: 4,
      title: `${critical.name} : contrôlez l’eau`,
      text: "Le lot est en difficulté. Vérifiez l’oxygène, le débit et la ration. Une aération peut être nécessaire avant de poursuivre le calendrier.",
      label: "Contrôler ce bassin",
      target: "ponds",
      pondId: critical.id,
      urgent: true,
    };
  const batch = d.batches[0];
  if (batch) {
    const c = d.contracts.find((c) => c.id === batch.contractId)!;
    const buyer = BUYERS[c.buyer];
    if (batch.processingDue !== null)
      return {
        stage: 7,
        title: "La préparation est en cours",
        text: "Le lot sera prêt demain. La conservation reste limitée à 3 jours depuis la récolte : expédiez dès la fin de la préparation.",
        label: "Terminer la préparation",
        wait: 1,
        urgent: true,
      };
    const timeNeeded = buyer.processed && !batch.processed ? 2 : 1;
    if (g.day + timeNeeded >= batch.expires || g.day + timeNeeded > c.deadline)
      return {
        stage: 7,
        title: "Ce lot ne peut plus être livré à temps",
        text: "La préparation ou le transport dépasserait la fraîcheur disponible ou la date convenue. Le lot sera retiré au jour de sa péremption. Expédiez plus tôt lors du prochain cycle.",
        label: "Clôturer la perte de ce lot",
        wait: batch.expires - g.day,
        urgent: true,
      };
    return {
      stage: 7,
      title:
        buyer.processed && !batch.processed
          ? "Préparez le lot pour les poissonneries"
          : "Votre récolte attend son transport",
      text: `${number(batch.kg, 1)} kg au froid, péremption dans ${batch.expires - g.day} jour(s). ${buyer.name} attend votre livraison.`,
      label:
        buyer.processed && !batch.processed
          ? "Préparer et expédier"
          : "Organiser le transport",
      target: "logistics",
      urgent: true,
    };
  }
  const hungry = g.ponds.find((p) => p.count && !p.autoFeed && !p.feedToday);
  if (hungry)
    return {
      stage: 4,
      title: "Programmez la distribution quotidienne",
      text: `${hungry.name} a reçu ses poissons. La distribution automatique adapte chaque ration au poids et à l’eau ; elle consomme votre stock chaque jour.`,
      label: "Activer la distribution",
      action: { type: "autoFeed", pondId: hungry.id, enabled: true },
      pondId: hungry.id,
    };
  const ration = dailyFeed(g);
  if (ration > 0 && g.food < ration * 4) {
    const arrival = d.orders.find((o) => o.kind === "feed");
    if (arrival && g.food >= ration * (arrival.due - g.day))
      return {
        stage: 4,
        title: "La prochaine livraison d’aliments approche",
        text: `Stock actuel : ${number(g.food, 1)} kg. ${arrival.amount} kg arrivent au jour ${arrival.due}. Vérifiez la réception avant de poursuivre.`,
        label: "Attendre la livraison",
        wait: arrival.due - g.day,
      };
    return {
      stage: 3,
      title: "Anticipez la rupture d’aliments",
      text: `Il reste environ ${number(g.food / ration, 1)} jour(s) de ration au rythme actuel. Le fabricant livre en 2 jours : commandez avant de manquer de stock.`,
      label: "Commander des aliments",
      target: "logistics",
      urgent: true,
    };
  }
  const live = g.ponds
    .filter((p) => p.count && p.species)
    .sort(
      (a, b) =>
        b.weight / SPECIES[b.species!].harvestWeight -
        a.weight / SPECIES[a.species!].harvestWeight,
    )[0];
  if (live?.species) {
    const ratio = live.weight / SPECIES[live.species].harvestWeight;
    if (ratio >= 0.6 && !d.assets.coldstore) {
      const works = d.works.find((w) => w.asset === "coldstore");
      if (!works)
        return {
          stage: 5,
          title: "Préparez la sortie de vos poissons",
          text: "Le lot approche du calibre commercial. Il faut 10 jours pour aménager la chambre froide. Anticipez-la avant de réserver un client.",
          label: "Aménager la chambre froide · 4 800 €",
          action: { type: "asset", asset: "coldstore" },
        };
    }
    if (
      ratio >= 0.8 &&
      d.assets.coldstore &&
      !d.contracts.some((c) => c.pondId === live.id)
    )
      return {
        stage: 5,
        title: "Trouvez un client avant de récolter",
        text: "Le lot approche du calibre demandé. Réservez un débouché pour 30 jours : le prix est fixé et le paiement interviendra après livraison.",
        label: "Choisir un client",
        target: "logistics",
      };
    if (harvestReady(live) && d.contracts.some((c) => c.pondId === live.id))
      return {
        stage: 6,
        title: "Votre premier lot est prêt à récolter",
        text: `${number(biomass(live), 1)} kg ont atteint le calibre de vente. La récolte sera stockée au froid pendant 3 jours maximum. Prévoyez immédiatement son transport.`,
        label: "Préparer la récolte",
        target: "logistics",
        pondId: live.id,
      };
    return {
      stage: 4,
      title: "Laissez grandir, gardez un œil sur le stock",
      text: `${SPECIES[live.species].name} : ${number(live.weight * 1000)} g sur ${SPECIES[live.species].harvestWeight * 1000} g visés. Comptez plusieurs mois ; l’avance guidée s’arrête aux livraisons, aux besoins d’aliments et au calibre de vente. Vous pouvez développer d’autres parcelles entre-temps.`,
      label: "Avancer jusqu’à 14 jours",
      wait: 14,
    };
  }
  if (d.shipments.length) {
    const s = d.shipments[0];
    return {
      stage: 8,
      title: s.delivered
        ? "Livraison acceptée, facture en attente"
        : "Votre récolte est en route",
      text: `${BUYERS[s.buyer].name} règlera ${euro(s.value)} au jour ${s.payment}. Le transport prend un jour ; la trésorerie sera créditée à l’échéance.`,
      label: s.delivered ? "Avancer jusqu’au règlement" : "Suivre la livraison",
      wait: (s.delivered ? s.payment : s.arrival) - g.day,
    };
  }
  const supply = d.orders.find((o) => o.kind === "juveniles");
  if (supply)
    return {
      stage: 3,
      title: "Votre lot arrive de l’écloserie",
      text: `${supply.amount} juvéniles sont réservés. Réception, acclimatation puis observation sanitaire : l’élevage commence à l’arrivée, dans ${supply.due - g.day} jour(s).`,
      label: "Avancer jusqu’à la réception",
      wait: supply.due - g.day,
    };
  const p = g.ponds.find(
    (p) => p.built || p.constructionDays || p.plannedSpecies,
  );
  if (!p)
    return {
      stage: 1,
      title: "Choisissez une espèce adaptée à votre eau",
      text: "La source convient naturellement à la truite. L’étang accueille la carpe avec une croissance saisonnière. Le tilapia demande une eau chauffée toute l’année. Comparez les trois filières ci-dessous.",
      label: "Comparer les filières",
      target: "project",
    };
  if (!p.built)
    return p.constructionDays
      ? {
          stage: 2,
          title: "Votre premier bassin prend forme",
          text: `${p.name} sera disponible dans ${p.constructionDays} jours. Vous pouvez déjà aménager votre magasin d’aliments dans la chaîne logistique.`,
          label: "Avancer le chantier",
          wait: Math.min(14, p.constructionDays),
        }
      : {
          stage: 2,
          title: "Lancez l’aménagement du bassin",
          text: `${p.name} accueillera ${SPECIES[p.plannedSpecies!].name.toLowerCase()}. Travaux et mise en service : ${CONSTRUCTION_DAYS[p.id - 1]} jours. Aucun poisson ne peut arriver avant la fin du chantier.`,
          label: `Lancer le chantier · ${euro(CONSTRUCTION_COST[p.id - 1])}`,
          action: { type: "build", pondId: p.id },
        };
  if (!d.assets.warehouse && !d.works.some((w) => w.asset === "warehouse"))
    return {
      stage: 3,
      title: "Préparez votre réserve d’aliments",
      text: "L’abri existant ne contient que 100 kg. Un magasin sec porte la capacité à 2 000 kg et permet de sécuriser plusieurs semaines d’alimentation.",
      label: "Aménager le magasin · 2 600 €",
      action: { type: "asset", asset: "warehouse" },
    };
  const work = d.works.find((w) => w.asset === "warehouse");
  if (work)
    return {
      stage: 3,
      title: "Le magasin est en cours d’aménagement",
      text: `Mise en service au jour ${work.due}. Vous pourrez ensuite commander vos aliments avant l’arrivée des poissons.`,
      label: "Terminer le magasin",
      wait: work.due - g.day,
    };
  if (!g.food) {
    const order = d.orders.find((o) => o.kind === "feed");
    return order
      ? {
          stage: 3,
          title: "Les aliments sont en route",
          text: `${order.amount} kg seront reçus dans ${order.due - g.day} jour(s). La réception permettra de préparer l’arrivée des juvéniles.`,
          label: "Recevoir les aliments",
          wait: order.due - g.day,
        }
      : {
          stage: 3,
          title: "Commandez les premiers aliments",
          text: "Les juvéniles doivent trouver leurs aliments à leur arrivée. Une commande de 100 kg suffit pour démarrer un premier lot de taille modérée.",
          label: "Choisir un conditionnement",
          target: "logistics",
        };
  }
  if (p.fallowDays)
    return {
      stage: 3,
      title: d.paid
        ? "Le premier cycle est bouclé"
        : "Respectez le vide sanitaire",
      text: `Nettoyage et repos de ${p.name} : encore ${p.fallowDays} jours. Vous pouvez préparer le prochain lot et développer une autre parcelle.`,
      label: "Avancer le vide sanitaire",
      wait: p.fallowDays,
    };
  return {
    stage: 3,
    title: d.paid
      ? "Préparez le prochain cycle"
      : "Réservez vos premiers juvéniles",
    text: `${p.name} est prêt et les aliments sont au stock. L’écloserie livre en 4 jours. Commencez avec un lot modéré pour apprendre à gérer l’eau et les approvisionnements.`,
    label: "Commander à l’écloserie",
    stock: p.id,
  };
}
