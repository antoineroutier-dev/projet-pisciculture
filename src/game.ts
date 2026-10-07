/** Daily farm model. Coefficients and unmodelled processes: docs/research/REALISME.md. */
export type SpeciesId = "trout" | "carp" | "tilapia";
export type Facility = "raceway" | "earth" | "ras";
export type View = "ponds" | "market" | "journal" | "guide";
export interface Species {
  id: SpeciesId;
  name: string;
  latin: string;
  description: string;
  identification: string;
  seedPrice: number;
  initialWeight: number;
  growth: number;
  harvestWeight: number;
  price: number;
  temperature: [number, number];
  level: number;
  color: string;
  fcr: number;
  ration: number;
  minOxygen: number;
  criticalOxygen: number;
  ammoniaLimit: number;
  facility: Facility;
  maxWeight: number;
}
export const SPECIES: Record<SpeciesId, Species> = {
  trout: {
    id: "trout",
    name: "Truite arc-en-ciel",
    latin: "Oncorhynchus mykiss",
    description:
      "Un salmonidé d’eau fraîche, élevé en bassin alimenté par la source.",
    identification:
      "Bande rose latérale, points noirs, silhouette fuselée et petite nageoire adipeuse.",
    seedPrice: 0.85,
    initialWeight: 0.05,
    growth: 0.016,
    harvestWeight: 0.45,
    price: 9.5,
    temperature: [12, 18],
    level: 1,
    color: "#dd927e",
    fcr: 1.1,
    ration: 0.018,
    minOxygen: 7,
    criticalOxygen: 4,
    ammoniaLimit: 0.02,
    facility: "raceway",
    maxWeight: 3,
  },
  carp: {
    id: "carp",
    name: "Carpe commune",
    latin: "Cyprinus carpio",
    description:
      "Un cyprinidé d’étang dont la croissance ralentit fortement en hiver.",
    identification:
      "Grandes écailles bronze, corps haut, longue dorsale et barbillons près de la bouche.",
    seedPrice: 1.2,
    initialWeight: 0.1,
    growth: 0.013,
    harvestWeight: 1,
    price: 5.5,
    temperature: [20, 26],
    level: 1,
    color: "#d4ad54",
    fcr: 1.8,
    ration: 0.02,
    minOxygen: 5,
    criticalOxygen: 2,
    ammoniaLimit: 0.05,
    facility: "earth",
    maxWeight: 8,
  },
  tilapia: {
    id: "tilapia",
    name: "Tilapia du Nil",
    latin: "Oreochromis niloticus",
    description:
      "Un poisson tropical : circuit recirculé chauffé, aération et biofiltration indispensables.",
    identification:
      "Corps ovale comprimé, dorsale épineuse et rayures verticales sur la nageoire caudale.",
    seedPrice: 0.7,
    initialWeight: 0.03,
    growth: 0.02,
    harvestWeight: 0.65,
    price: 7,
    temperature: [26, 30],
    level: 1,
    color: "#86aab7",
    fcr: 1.5,
    ration: 0.025,
    minOxygen: 5,
    criticalOxygen: 2,
    ammoniaLimit: 0.05,
    facility: "ras",
    maxWeight: 2.5,
  },
};
export interface Pond {
  id: number;
  name: string;
  built: boolean;
  capacity: number;
  species: SpeciesId | null;
  count: number;
  weight: number;
  health: number;
  water: number;
  oxygen: number;
  satiety: number;
  upgrade: number;
  facility: Facility;
  volume: number;
  maxDensity: number;
  temperature: number;
  flow: number;
  pH: number;
  tan: number;
  autoFeed: boolean;
  rationMultiplier: number;
  feedToday: number;
  lastFeed: number;
  lastGrowth: number;
  totalFeed: number;
  totalGain: number;
  age: number;
  fastingDays: number;
  filterAge: number;
  quarantineDays: number;
  fallowDays: number;
  constructionDays: number;
  mortality: number;
}
export interface Log {
  day: number;
  text: string;
  kind: "info" | "sale" | "warning" | "purchase";
}
export interface Game {
  version: 2;
  mode: "guided" | "expert";
  day: number;
  money: number;
  food: number;
  xp: number;
  ponds: Pond[];
  logs: Log[];
  claimed: string[];
  stats: {
    fed: number;
    soldKg: number;
    sales: number;
    income: number;
    expenses: number;
    upgrades: number;
    feedUsed: number;
    mortality: number;
    energyKwh: number;
  };
  history: { day: number; money: number }[];
  lastAidDay: number;
}
export const STORAGE_KEY = "les-etangs-save-v2";
export const LEGACY_STORAGE_KEY = "les-etangs-save-v1";
export const CONSTRUCTION_COST = [0, 0, 12000, 28000];
export const CONSTRUCTION_DAYS = [0, 0, 14, 45];
export const UPGRADE_COST = [1200, 3400];
export const FOOD_PACKS = [
  { kg: 25, cost: 65 },
  { kg: 100, cost: 230 },
  { kg: 500, cost: 1050 },
];
export const euro = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(v);
export const number = (v: number, decimals = 0) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: decimals }).format(v);
const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));
const round = (n: number, places = 2) =>
  Math.round(n * 10 ** places) / 10 ** places;
export const level = (game: Game) => Math.min(5, 1 + Math.floor(game.xp / 100));
export const biomass = (p: Pond) => p.count * p.weight;
export const density = (p: Pond) => biomass(p) / p.volume;
export const population = (g: Game) => g.ponds.reduce((n, p) => n + p.count, 0);
export const facilityName = (p: Pond) =>
  ({
    raceway: "Bassin d’eau courante",
    earth: "Étang de terre",
    ras: "Circuit recirculé chauffé",
  })[p.facility];
export const compatible = (p: Pond, species: SpeciesId) =>
  SPECIES[species].facility === p.facility;
export function simDate(day: number) {
  const d = new Date(Date.UTC(2026, 3, 1));
  d.setUTCDate(d.getUTCDate() + day - 1);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}
export function weather(day: number) {
  const phase = (day - 1) % 365;
  const rainy = day % 13 === 3 || day % 13 === 4;
  const hot = phase > 70 && phase < 160 && day % 17 > 13;
  return {
    season:
      phase < 81 || phase >= 355
        ? "Printemps"
        : phase < 173
          ? "Été"
          : phase < 264
            ? "Automne"
            : "Hiver",
    temperature: round(
      12 +
        10 * Math.sin((2 * Math.PI * phase) / 365) +
        Math.sin(day * 0.43) * 2 +
        (hot ? 4 : 0),
      1,
    ),
    rainy,
    hot,
    label: hot
      ? "Chaleur"
      : rainy
        ? "Pluie légère"
        : day % 3 === 0
          ? "Éclaircies"
          : "Ensoleillé",
  };
}
/** APHA freshwater saturation, mg O2/L at sea level; coefficients checked in marelac gas_O2sat. */
export function oxygenSaturation(t: number) {
  const k = t + 273.15;
  return Math.exp(
    -139.34411 +
      157570.1 / k -
      66423080 / k ** 2 +
      12438000000 / k ** 3 -
      862194900000 / k ** 4,
  );
}
/** Emerson et al. freshwater equilibrium; both TAN and result expressed as N. */
export function ammonia(tan: number, temperature: number, pH: number) {
  const pKa = 0.09018 + 2729.92 / (temperature + 273.15);
  return tan / (1 + 10 ** (pKa - pH));
}
export const pondAmmonia = (p: Pond) => ammonia(p.tan, p.temperature, p.pH);
export function temperatureFactor(p: Pond) {
  if (!p.species) return 0;
  const [lo, hi] = SPECIES[p.species].temperature;
  if (p.temperature < lo)
    return clamp(
      1 -
        (lo - p.temperature) /
          (p.species === "tilapia" ? 12 : p.species === "carp" ? 15 : 12),
      0,
      1,
    );
  return clamp(
    1 - (p.temperature - hi) / (p.species === "trout" ? 8 : 10),
    0,
    1,
  );
}
export function growthFactor(p: Pond, _day?: number) {
  if (!p.species || !p.count) return 0;
  const s = SPECIES[p.species];
  const oxygen = clamp(
    (p.oxygen - s.criticalOxygen) / (s.minOxygen - s.criticalOxygen),
    0,
    1,
  );
  const nitrogen = clamp(
    1 - Math.max(0, pondAmmonia(p) / s.ammoniaLimit - 0.5) * 0.4,
    0,
    1,
  );
  const crowding = clamp(1.2 - (density(p) / p.maxDensity) * 0.2, 0.3, 1);
  return temperatureFactor(p) * oxygen * nitrogen * (p.health / 100) * crowding;
}
export function feedNeeded(p: Pond) {
  if (!p.species || !p.count) return 0;
  const s = SPECIES[p.species];
  const base = s.ration * (0.1 / Math.max(0.01, p.weight)) ** 0.25;
  return round(biomass(p) * base * growthFactor(p) * p.rationMultiplier, 3);
}
export const cleaningCost = (p: Pond) => round(18 + p.volume * 0.3 * 0.25);
export function energyUse(p: Pond, day: number) {
  if (!p.built) return 0;
  const air = weather(day).temperature;
  return (
    (p.facility === "ras"
      ? 24 + Math.max(0, 27 - air) * 3.2
      : p.facility === "earth"
        ? 0.5
        : 2) +
    p.upgrade * 3.6
  );
}
export function costBreakdown(g: Game) {
  const ponds = g.ponds.filter((p) => p.built);
  const kwh = ponds.reduce((n, p) => n + energyUse(p, g.day), 0);
  return {
    labour: 55,
    maintenance: ponds.length * 2.5,
    electricity: round(kwh * 0.22),
    water: round(ponds.reduce((n, p) => n + p.flow * 86.4 * 0.012, 0)),
    kwh: round(kwh),
  };
}
export function dailyCost(g: Game) {
  const c = costBreakdown(g);
  return round(c.labour + c.maintenance + c.electricity + c.water);
}
export function marketPrice(species: SpeciesId, day: number) {
  const i = ["trout", "carp", "tilapia"].indexOf(species);
  return round(SPECIES[species].price * (1 + 0.07 * Math.sin(day / 30 + i)));
}
export function harvestValue(p: Pond, day: number) {
  return p.species
    ? round(
        biomass(p) * marketPrice(p.species, day) * (0.85 + p.health * 0.0015),
      )
    : 0;
}
export const harvestReady = (p: Pond) =>
  !!p.species &&
  p.count > 0 &&
  p.weight >= SPECIES[p.species].harvestWeight &&
  p.quarantineDays === 0;
export function pondStatus(p: Pond) {
  if (p.constructionDays)
    return { label: `Chantier · ${p.constructionDays} j`, tone: "muted" };
  if (!p.built) return { label: "À aménager", tone: "muted" };
  if (p.fallowDays)
    return { label: `Vide sanitaire · ${p.fallowDays} j`, tone: "muted" };
  if (!p.count) return { label: "Disponible", tone: "muted" };
  if (
    p.species &&
    (p.oxygen < SPECIES[p.species].minOxygen ||
      pondAmmonia(p) > SPECIES[p.species].ammoniaLimit ||
      p.health < 60)
  )
    return { label: "Alerte qualité d’eau", tone: "danger" };
  if (p.quarantineDays)
    return { label: `Observation · ${p.quarantineDays} j`, tone: "warning" };
  if (harvestReady(p))
    return { label: "Calibre de vente atteint", tone: "harvest" };
  if (!p.autoFeed && p.feedToday === 0)
    return { label: "Ration à programmer", tone: "warning" };
  return { label: "Lot en croissance", tone: "good" };
}
export function initialGame(mode: Game["mode"] = "guided"): Game {
  const names = ["Les Saules", "La Roselière", "Le Pré neuf", "Les Sources"];
  const volumes = [60, 600, 90, 40],
    caps = [3000, 450, 4500, 1200],
    maxDensity = [25, 0.8, 25, 25];
  const ponds: Pond[] = names.map((name, i) => ({
    id: i + 1,
    name,
    built: i < 2,
    capacity: caps[i],
    species: i === 0 ? "trout" : i === 1 ? "carp" : null,
    count: i === 0 ? 1200 : i === 1 ? 300 : 0,
    weight: i === 0 ? 0.38 : i === 1 ? 0.78 : 0,
    health: 98,
    water: 95,
    oxygen: i === 0 ? 9.4 : 8,
    satiety: 0,
    upgrade: 0,
    facility: i === 1 ? "earth" : i === 3 ? "ras" : "raceway",
    volume: volumes[i],
    maxDensity: maxDensity[i],
    temperature: i === 3 ? 27 : i === 1 ? 16 : 13.5,
    flow: i === 1 ? 0.08 : i === 3 ? 0.03 : i === 2 ? 10 : 12,
    pH: i === 1 ? 7.6 : 7.2,
    tan: 0.05,
    autoFeed: false,
    rationMultiplier: 1,
    feedToday: 0,
    lastFeed: 0,
    lastGrowth: 0,
    totalFeed: 0,
    totalGain: 0,
    age: i < 2 ? 180 : 0,
    fastingDays: 0,
    filterAge: 0,
    quarantineDays: 0,
    fallowDays: 0,
    constructionDays: 0,
    mortality: 0,
  }));
  return {
    version: 2,
    mode,
    day: 1,
    money: 48000,
    food: 500,
    xp: 0,
    ponds,
    logs: [
      {
        day: 1,
        text: "Reprise d’exploitation : les bâtiments et deux lots en croissance sont déjà en place. Contrôlez l’eau puis programmez les rations.",
        kind: "info",
      },
    ],
    claimed: [],
    stats: {
      fed: 0,
      soldKg: 0,
      sales: 0,
      income: 0,
      expenses: 0,
      upgrades: 0,
      feedUsed: 0,
      mortality: 0,
      energyKwh: 0,
    },
    history: [{ day: 1, money: 48000 }],
    lastAidDay: -90,
  };
}
function log(g: Game, text: string, kind: Log["kind"] = "info") {
  g.logs.unshift({ day: g.day, text, kind });
  g.logs = g.logs.slice(0, 120);
}
function spend(g: Game, cost: number) {
  g.money = round(g.money - cost);
  g.stats.expenses = round(g.stats.expenses + cost);
}
function growOneDay(p: Pond, game: Game, funded: boolean) {
  p.lastGrowth = 0;
  p.mortality = 0;
  if (p.fallowDays) p.fallowDays--;
  if (p.quarantineDays) p.quarantineDays--;
  const targetTemp =
    p.facility === "ras" && funded
      ? 27
      : p.facility === "raceway"
        ? 13.5 + 1.7 * Math.sin((2 * Math.PI * (game.day - 1)) / 365)
        : weather(game.day).temperature;
  p.temperature = round(
    p.temperature +
      (targetTemp - p.temperature) *
        (p.facility === "ras" && funded
          ? 0.55
          : p.facility === "raceway"
            ? 0.3
            : 0.12),
    2,
  );
  if (p.upgrade >= 2) p.filterAge = Math.min(60, p.filterAge + 1);
  const recommended = feedNeeded(p);
  if (p.autoFeed && p.count && p.feedToday === 0 && recommended > 0) {
    const available = Math.min(game.food, recommended);
    p.feedToday = available;
    game.food = round(game.food - available, 3);
    game.stats.feedUsed = round(game.stats.feedUsed + available, 3);
    if (available < recommended)
      log(
        game,
        `${p.name} : ration incomplète, le stock d’aliments est insuffisant.`,
        "warning",
      );
  }
  const supplied = p.feedToday;
  const s = p.species ? SPECIES[p.species] : null;
  const consumption = s
    ? Math.min(supplied, recommended / Math.max(0.01, p.rationMultiplier)) *
      clamp(p.oxygen / s.minOxygen, 0, 1)
    : 0;
  const waste = supplied - consumption;
  let minOxygen = p.oxygen,
    maxAmmonia = pondAmmonia(p),
    hypoxiaHours = 0;
  const saturation = oxygenSaturation(p.temperature);
  const turnover = (p.flow * 3.6) / p.volume;
  const aeration =
    (p.facility === "earth" ? 0.035 : 0.045) +
    (funded && (p.upgrade >= 1 || p.facility === "ras") ? 0.35 : 0);
  const maturity = p.upgrade >= 2 ? Math.min(1, p.filterAge / 30) : 0;
  for (let h = 0; h < 24; h++) {
    const nitrification =
      (p.facility === "earth" ? 0.008 : 0.004) +
      maturity * 0.15 * (funded ? 1 : 0.1) * clamp(p.oxygen / 5, 0, 1);
    const ammoniaProduction =
      ((supplied * 0.03 + waste * 0.04) * 1000) / (p.volume * 24);
    const removal = turnover + nitrification;
    const equilibrium = removal > 0 ? ammoniaProduction / removal : 0;
    p.tan =
      removal > 0
        ? equilibrium + (p.tan - equilibrium) * Math.exp(-removal)
        : p.tan + ammoniaProduction;
    const respiration = biomass(p) * 0.00018 * 2 ** ((p.temperature - 15) / 10);
    const organicDemand = (supplied * 0.1 + waste * 0.4) / 24;
    const nitrificationDemand = p.tan * nitrification * 4.57;
    const oxygenDemand =
      ((respiration + organicDemand) * 1000) / p.volume + nitrificationDemand;
    const exchange = turnover + aeration;
    const oxygenTarget =
      (turnover * saturation * 0.97 + aeration * saturation - oxygenDemand) /
      exchange;
    p.oxygen = clamp(
      oxygenTarget + (p.oxygen - oxygenTarget) * Math.exp(-exchange),
      0,
      saturation * 1.05,
    );
    minOxygen = Math.min(minOxygen, p.oxygen);
    maxAmmonia = Math.max(maxAmmonia, pondAmmonia(p));
    if (s && p.oxygen < s.criticalOxygen) hypoxiaHours++;
  }
  if (s && p.count) {
    const oxygenFactor = clamp(
      (minOxygen - s.criticalOxygen) / (s.minOxygen - s.criticalOxygen),
      0,
      1,
    );
    const toxicityFactor = clamp(
      1 - Math.max(0, maxAmmonia / s.ammoniaLimit - 1) * 0.5,
      0,
      1,
    );
    const potentialGain =
      (consumption / s.fcr) *
      temperatureFactor(p) *
      oxygenFactor *
      toxicityFactor *
      (p.health / 100);
    const maxGain =
      biomass(p) *
      s.growth *
      (0.1 / Math.max(0.01, p.weight)) ** 0.2 *
      temperatureFactor(p);
    const gain = Math.max(
      0,
      Math.min(
        potentialGain,
        maxGain,
        Math.max(0, s.maxWeight - p.weight) * p.count,
      ),
    );
    p.lastGrowth = gain / p.count;
    p.weight += p.lastGrowth;
    p.totalGain += gain;
    p.totalFeed += supplied;
    p.lastFeed = supplied;
    p.age++;
    // Cold-water dormancy is not starvation: carp can overwinter without growing.
    const dormant = p.species === "carp" && p.temperature < 6;
    p.fastingDays = dormant ? 0 : consumption < 0.001 ? p.fastingDays + 1 : 0;
    if (p.fastingDays > 7) p.weight = Math.max(0.005, p.weight * 0.9995);
    const temperatureStress =
      (p.species === "tilapia" && (p.temperature < 15 || p.temperature > 36)) ||
      (p.species === "trout" && p.temperature > 24) ||
      (p.species === "carp" && p.temperature > 34)
        ? 2
        : 0;
    const stress =
      (minOxygen < s.minOxygen ? (s.minOxygen - minOxygen) * 0.65 : 0) +
      Math.max(0, maxAmmonia / s.ammoniaLimit - 1) * 1.5 +
      temperatureStress +
      (p.fastingDays > 7 ? 0.5 : 0);
    p.health = clamp(p.health + (stress > 0 ? -Math.min(25, stress) : 0.4));
    if (hypoxiaHours >= 3 || p.health < 25 || maxAmmonia > s.ammoniaLimit * 8) {
      const fraction = Math.min(
        0.3,
        hypoxiaHours * 0.008 +
          (p.health < 25 ? 0.015 : 0) +
          (maxAmmonia > s.ammoniaLimit * 8 ? 0.02 : 0),
      );
      p.mortality = Math.min(
        p.count,
        Math.max(1, Math.floor(p.count * fraction)),
      );
      p.count -= p.mortality;
      game.stats.mortality += p.mortality;
      log(
        game,
        `${p.name} : ${p.mortality} mortalités après exposition critique. O₂ minimal ${number(minOxygen, 1)} mg/L ; NH₃-N maximal ${number(maxAmmonia, 3)} mg/L.`,
        "warning",
      );
      if (!p.count) {
        p.species = null;
        p.weight = 0;
        p.fallowDays = 7;
        p.health = 100;
        p.autoFeed = false;
      }
    }
  } else {
    p.lastFeed = 0;
  }
  p.feedToday = 0;
  p.satiety = 0;
  p.tan = clamp(p.tan, 0, 100);
  p.oxygen = round(p.oxygen, 3);
  p.water = clamp(
    100 - Math.max(0, p.tan - 0.1) * 12 - Math.max(0, 7 - p.oxygen) * 8,
  ); // Convenience index only, never a physical input.
}
export function nextDay(original: Game): Game {
  const g = structuredClone(original);
  const cost = dailyCost(g);
  const funded = g.money >= cost;
  spend(g, Math.min(g.money, cost));
  g.stats.energyKwh = round(
    g.stats.energyKwh + (funded ? costBreakdown(original).kwh : 0),
  );
  g.day++;
  g.xp++;
  if (!funded && (g.day % 7 === 0 || original.money > 0))
    log(
      g,
      "Charges non couvertes : équipements et chauffage dégradés. Vérifiez le budget d’exploitation.",
      "warning",
    );
  for (const p of g.ponds) {
    if (p.constructionDays) {
      p.constructionDays--;
      if (p.constructionDays === 0) {
        p.built = true;
        if (p.facility === "ras") {
          p.upgrade = 2;
          p.filterAge = 30;
        }
        log(
          g,
          `${p.name} : chantier et mise en service terminés. Le bassin est disponible.`,
        );
      }
    }
    if (!p.built) continue;
    const ready = harvestReady(p);
    growOneDay(p, g, funded);
    if (!ready && harvestReady(p))
      log(
        g,
        `${p.name} : calibre commercial atteint, ${number(p.weight * 1000)} g par poisson.`,
        "sale",
      );
  }
  if (g.day % 7 === 0)
    log(
      g,
      `Bilan hebdomadaire : ${number(population(g))} poissons ; ${number(g.stats.feedUsed, 1)} kg d’aliments distribués depuis la reprise ; ${g.stats.mortality} mortalités cumulées.`,
    );
  g.history.push({ day: g.day, money: g.money });
  g.history = g.history.slice(-90);
  return g;
}
export const OBJECTIVES = [
  {
    id: "feed",
    title: "La juste ration",
    description: "Programmez une ration adaptée au lot.",
    reward: 80,
    xp: 20,
    target: 1,
    progress: (g: Game) => g.stats.fed,
  },
  {
    id: "sale",
    title: "La première récolte",
    description: "Vendez un lot au calibre commercial.",
    reward: 180,
    xp: 40,
    target: 1,
    progress: (g: Game) => g.stats.sales,
  },
  {
    id: "upgrade",
    title: "Sécuriser l’oxygène",
    description: "Installez une aération de secours.",
    reward: 100,
    xp: 30,
    target: 1,
    progress: (g: Game) => g.stats.upgrades,
  },
  {
    id: "build",
    title: "Préparer l’avenir",
    description: "Mettez en service le troisième bassin.",
    reward: 200,
    xp: 50,
    target: 3,
    progress: (g: Game) => g.ponds.filter((p) => p.built).length,
  },
  {
    id: "harvest",
    title: "Une saison de travail",
    description: "Commercialisez au moins 500 kg de poissons.",
    reward: 500,
    xp: 100,
    target: 500,
    progress: (g: Game) => g.stats.soldKg,
  },
];
export type Action =
  | { type: "feed" | "clean" | "upgrade" | "harvest" | "build"; pondId: number }
  | { type: "stock"; pondId: number; species: SpeciesId; count: number }
  | { type: "food"; pack: number }
  | { type: "claim"; id: string }
  | { type: "aid" }
  | { type: "autoFeed"; pondId: number; enabled: boolean }
  | { type: "flow" | "ration"; pondId: number; value: number }
  | { type: "mode"; mode: Game["mode"] };
export interface ActionResult {
  game: Game;
  message: string;
  ok: boolean;
}
export function act(original: Game, a: Action): ActionResult {
  const g = structuredClone(original);
  const fail = (message: string): ActionResult => ({
    game: original,
    message,
    ok: false,
  });
  const success = (
    message: string,
    kind: Log["kind"] = "info",
  ): ActionResult => {
    log(g, message, kind);
    return { game: g, message, ok: true };
  };
  if (a.type === "mode") {
    g.mode = a.mode;
    return success(
      a.mode === "expert"
        ? "Mode expert : primes monétaires et aide de reprise désactivées."
        : "Mode pédagogique : conseils et aides explicitement identifiées.",
    );
  }
  if (a.type === "food") {
    const pack = FOOD_PACKS[a.pack];
    if (!pack) return fail("Conditionnement inconnu.");
    if (g.money < pack.cost) return fail("Trésorerie insuffisante.");
    spend(g, pack.cost);
    g.food = round(g.food + pack.kg, 3);
    return success(
      `${pack.kg} kg d’aliments au stock · ${euro(pack.cost)}.`,
      "purchase",
    );
  }
  if (a.type === "claim") {
    const o = OBJECTIVES.find((x) => x.id === a.id);
    if (!o || g.claimed.includes(o.id) || o.progress(g) < o.target)
      return fail("Objectif indisponible.");
    g.claimed.push(o.id);
    g.xp += o.xp;
    const bonus = g.mode === "guided" ? o.reward : 0;
    g.money += bonus;
    return success(
      `Objectif « ${o.title} » accompli · ${o.xp} XP${bonus ? ` et ${euro(bonus)} d’aide pédagogique` : ""}.`,
      "sale",
    );
  }
  if (a.type === "aid") {
    if (g.mode === "expert")
      return fail("Les aides fictives sont désactivées en mode expert.");
    if (g.money >= 1000 || g.day - g.lastAidDay < 90)
      return fail(
        "Aide pédagogique disponible sous 1 000 €, une fois tous les 90 jours.",
      );
    g.money += 5000;
    g.food += 100;
    g.lastAidDay = g.day;
    return success(
      "Aide pédagogique exceptionnelle : 5 000 € et 100 kg d’aliments. Ce dispositif n’est pas une subvention réelle.",
    );
  }
  const p = g.ponds.find((x) => x.id === a.pondId);
  if (!p) return fail("Bassin introuvable.");
  if (a.type === "build") {
    if (p.built || p.constructionDays)
      return fail("Ce bassin est construit ou en chantier.");
    if (g.ponds.some((x) => x.id < p.id && !x.built))
      return fail("Mettez d’abord le bassin précédent en service.");
    const cost = CONSTRUCTION_COST[p.id - 1];
    if (g.money < cost) return fail("Trésorerie insuffisante.");
    spend(g, cost);
    p.constructionDays = CONSTRUCTION_DAYS[p.id - 1];
    g.xp += 30;
    return success(
      `${p.name} : chantier lancé, ${p.constructionDays} jours de travaux et mise en service · ${euro(cost)}.`,
      "purchase",
    );
  }
  if (!p.built) return fail("Le bassin doit être mis en service.");
  if (a.type === "autoFeed") {
    p.autoFeed = a.enabled;
    return success(
      `${p.name} : distribution automatique ${a.enabled ? "activée" : "désactivée"}. Le stock sera consommé au passage des journées.`,
    );
  }
  if (a.type === "flow") {
    const max = p.facility === "earth" ? 0.5 : p.facility === "ras" ? 0.3 : 12;
    if (!Number.isFinite(a.value) || a.value < 0 || a.value > max)
      return fail(`Débit autorisé : de 0 à ${max} L/s.`);
    p.flow = a.value;
    return success(`${p.name} : débit réglé à ${number(p.flow, 2)} L/s.`);
  }
  if (a.type === "ration") {
    if (!Number.isFinite(a.value) || a.value < 0.5 || a.value > 1.5)
      return fail("Réglez la ration entre 50 et 150 % du calcul.");
    p.rationMultiplier = a.value;
    return success(
      `${p.name} : ration cible à ${number(a.value * 100)} % de la recommandation.`,
    );
  }
  if (a.type === "stock") {
    if (p.count) return fail("Ce bassin contient déjà un lot.");
    if (p.fallowDays)
      return fail(`Respectez encore ${p.fallowDays} jours de vide sanitaire.`);
    if (!Object.hasOwn(SPECIES, a.species)) return fail("Espèce inconnue.");
    if (!compatible(p, a.species))
      return fail(
        `${SPECIES[a.species].name} : installation incompatible. Choisissez ${facilityName({ ...p, facility: SPECIES[a.species].facility }).toLowerCase()}.`,
      );
    if (
      !Number.isInteger(a.count) ||
      a.count < 1 ||
      a.count > p.capacity ||
      (a.count * SPECIES[a.species].harvestWeight) / p.volume > p.maxDensity
    )
      return fail("Ce lot dépasserait la capacité en biomasse à la récolte.");
    const cost = round(a.count * SPECIES[a.species].seedPrice);
    if (g.money < cost) return fail("Trésorerie insuffisante.");
    spend(g, cost);
    Object.assign(p, {
      species: a.species,
      count: a.count,
      weight: SPECIES[a.species].initialWeight,
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
    });
    g.xp += 5;
    return success(
      `${p.name} : ${a.count} juvéniles introduits après acclimatation. Observation du lot pendant 14 jours · ${euro(cost)}.`,
      "purchase",
    );
  }
  if (a.type === "upgrade") {
    if (p.upgrade >= 2) return fail("Installation déjà équipée.");
    const cost = UPGRADE_COST[p.upgrade];
    if (g.money < cost) return fail("Trésorerie insuffisante.");
    spend(g, cost);
    p.upgrade++;
    if (p.upgrade === 2) p.filterAge = 0;
    g.stats.upgrades++;
    g.xp += 15;
    return success(
      `${p.name} : ${p.upgrade === 1 ? "aération installée" : "biofiltration installée, montée en charge sur 30 jours"} · ${euro(cost)}.`,
      "purchase",
    );
  }
  if (a.type === "clean") {
    const cost = cleaningCost(p);
    if (g.money < cost) return fail(`Entretien : ${euro(cost)} nécessaires.`);
    spend(g, cost);
    p.tan *= 0.7;
    p.oxygen = p.oxygen * 0.7 + oxygenSaturation(p.temperature) * 0.97 * 0.3;
    p.water = clamp(p.water + 12);
    return success(
      `${p.name} : boues retirées et 30 % de l’eau renouvelée · ${euro(cost)}. La santé du lot ne remonte pas instantanément.`,
    );
  }
  if (!p.count || !p.species) return fail("Ce bassin est vide.");
  if (a.type === "feed") {
    if (p.feedToday > 0)
      return fail("Une ration est déjà programmée pour cette journée.");
    const feed = feedNeeded(p);
    if (feed <= 0)
      return fail(
        "Conditions défavorables : corrigez l’eau ou la température avant de nourrir.",
      );
    if (g.food < feed) return fail("Stock d’aliments insuffisant.");
    g.food = round(g.food - feed, 3);
    g.stats.feedUsed = round(g.stats.feedUsed + feed, 3);
    p.feedToday = feed;
    p.satiety = 100;
    g.stats.fed++;
    g.xp += 2;
    return success(
      `${p.name} : ration de ${number(feed, 2)} kg programmée, distribuée sur 24 h.`,
    );
  }
  if (!harvestReady(p))
    return fail(
      p.quarantineDays
        ? `Lot en observation pendant encore ${p.quarantineDays} jours.`
        : `Calibre minimum : ${SPECIES[p.species].harvestWeight * 1000} g par poisson.`,
    );
  if (p.health < 60)
    return fail(
      "État du lot préoccupant : stabilisez les conditions et faites contrôler le lot avant commercialisation.",
    );
  const kg = biomass(p),
    value = harvestValue(p, g.day);
  g.money = round(g.money + value);
  g.stats.soldKg = round(g.stats.soldKg + kg);
  g.stats.sales++;
  g.stats.income = round(g.stats.income + value);
  g.xp += 25;
  // A scheduled ration is still in the hopper: return it when cancelling the batch for sale.
  g.food = round(g.food + p.feedToday, 3);
  g.stats.feedUsed = round(g.stats.feedUsed - p.feedToday, 3);
  Object.assign(p, {
    count: 0,
    species: null,
    weight: 0,
    health: 100,
    feedToday: 0,
    satiety: 0,
    autoFeed: false,
    fallowDays: 7,
  });
  return success(
    `${p.name} : ${number(kg, 1)} kg vendus pour ${euro(value)}. Nettoyage et vide sanitaire : 7 jours.`,
    "sale",
  );
}

/** Validates before normalizing. The original V1 browser key is never overwritten. */
export function parseSave(raw: string): Game {
  if (raw.length > 300000) throw new Error("Sauvegarde trop volumineuse.");
  const value: unknown = JSON.parse(raw);
  const obj = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);
  const num = (v: unknown, min = 0, max = 1e12): v is number =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  const int = (v: unknown, min = 0, max = 1e9) =>
    num(v, min, max) && Number.isInteger(v);
  const fail = (): never => {
    throw new Error(
      "Sauvegarde incompatible ou endommagée. La partie actuelle est conservée.",
    );
  };
  if (
    !obj(value) ||
    (value.version !== 1 && value.version !== 2) ||
    !int(value.day, 1, 1e6) ||
    !num(value.money) ||
    !num(value.food) ||
    !int(value.xp) ||
    !Array.isArray(value.ponds) ||
    value.ponds.length !== 4
  )
    return fail();
  const legacy = value.version === 1;
  if (!legacy && value.mode !== "guided" && value.mode !== "expert")
    return fail();
  if (
    !int(value.lastAidDay, legacy ? -20 : -90, value.day as number) ||
    !obj(value.stats)
  )
    return fail();
  const fields = [
    "fed",
    "soldKg",
    "sales",
    "income",
    "expenses",
    "upgrades",
    ...(legacy ? [] : ["feedUsed", "mortality", "energyKwh"]),
  ];
  if (!fields.every((k) => num((value.stats as Record<string, unknown>)[k])))
    return fail();
  if (
    !["fed", "sales", "upgrades", ...(legacy ? [] : ["mortality"])].every((k) =>
      int((value.stats as Record<string, unknown>)[k]),
    )
  )
    return fail();
  if (
    !Array.isArray(value.logs) ||
    value.logs.length > 120 ||
    !value.logs.every(
      (l) =>
        obj(l) &&
        int(l.day, 1, value.day as number) &&
        typeof l.text === "string" &&
        l.text.length > 0 &&
        l.text.length < 1000 &&
        ["info", "sale", "purchase", "warning"].includes(l.kind as string),
    )
  )
    return fail();
  if (
    !Array.isArray(value.claimed) ||
    new Set(value.claimed).size !== value.claimed.length ||
    !value.claimed.every((id) => OBJECTIVES.some((o) => o.id === id))
  )
    return fail();
  if (
    !Array.isArray(value.history) ||
    !value.history.length ||
    value.history.length > (legacy ? 60 : 90) ||
    !value.history.every(
      (h) => obj(h) && int(h.day, 1, value.day as number) && num(h.money),
    )
  )
    return fail();
  const base = initialGame();
  const parsedPonds: Pond[] = [];
  for (const [i, p] of value.ponds.entries()) {
    if (
      !obj(p) ||
      p.id !== i + 1 ||
      typeof p.name !== "string" ||
      p.name.length < 1 ||
      p.name.length > 50 ||
      typeof p.built !== "boolean" ||
      !int(
        p.count,
        0,
        legacy ? [80, 100, 120, 160][i] : base.ponds[i].capacity,
      ) ||
      !num(p.weight, 0, 10) ||
      !int(p.upgrade, 0, 2)
    )
      return fail();
    if (
      ![p.health, p.water, p.satiety].every((n) => num(n, 0, 100)) ||
      !num(p.oxygen, 0, legacy ? 100 : 20)
    )
      return fail();
    if (
      p.species !== null &&
      (typeof p.species !== "string" || !Object.hasOwn(SPECIES, p.species))
    )
      return fail();
    if (
      (p.count === 0 && (p.species !== null || p.weight !== 0)) ||
      ((p.count as number) > 0 &&
        (!p.built || p.species === null || p.weight === 0))
    )
      return fail();
    if (i < 2 && !p.built) return fail();
    if (i > 0 && p.built && !value.ponds[i - 1].built) return fail();
    if (!p.built && (p.count !== 0 || p.upgrade !== 0)) return fail();
    const normalized = {
      ...base.ponds[i],
      name: p.name,
      built: p.built,
      count: p.count as number,
      species: p.species as SpeciesId | null,
      weight: p.weight as number,
      health: p.health as number,
      water: p.water as number,
      upgrade: p.upgrade as number,
    };
    if (legacy) {
      if (p.capacity !== [80, 100, 120, 160][i]) return fail();
      // Preserve old species and the lot by converting the installation if necessary.
      if (normalized.species)
        normalized.facility = SPECIES[normalized.species].facility;
      normalized.maxDensity = normalized.facility === "earth" ? 0.8 : 25;
      normalized.flow =
        normalized.facility === "earth"
          ? 0.08
          : normalized.facility === "ras"
            ? 0.03
            : 12;
      normalized.temperature =
        normalized.facility === "ras"
          ? 27
          : normalized.facility === "earth"
            ? 16
            : 13.5;
      normalized.oxygen =
        (oxygenSaturation(normalized.temperature) * (p.oxygen as number)) / 100;
      normalized.filterAge = normalized.upgrade >= 2 ? 30 : 0;
    } else {
      if (
        p.capacity !== base.ponds[i].capacity ||
        !["raceway", "earth", "ras"].includes(p.facility as string) ||
        !num(p.volume, 1, 10000) ||
        p.volume !== base.ponds[i].volume ||
        p.maxDensity !== (p.facility === "earth" ? 0.8 : 25) ||
        !num(p.temperature, 0, 45) ||
        !num(
          p.flow,
          0,
          p.facility === "earth" ? 0.5 : p.facility === "ras" ? 0.3 : 12,
        ) ||
        !num(p.pH, 5, 10) ||
        !num(p.tan, 0, 100) ||
        typeof p.autoFeed !== "boolean" ||
        !num(p.rationMultiplier, 0.5, 1.5)
      )
        return fail();
      if (
        ![
          "feedToday",
          "lastFeed",
          "lastGrowth",
          "totalFeed",
          "totalGain",
        ].every((k) => num(p[k], 0, 1e9))
      )
        return fail();
      if (
        ![
          "age",
          "fastingDays",
          "filterAge",
          "quarantineDays",
          "fallowDays",
          "constructionDays",
          "mortality",
        ].every((k) => int(p[k], 0, 1e6))
      )
        return fail();
      if (
        !int(p.filterAge, 0, 60) ||
        !int(p.quarantineDays, 0, 14) ||
        !int(p.fallowDays, 0, 7) ||
        !int(p.constructionDays, 0, CONSTRUCTION_DAYS[i]) ||
        (p.count === 0 && p.feedToday !== 0)
      )
        return fail();
      if (
        (p.built && p.constructionDays !== 0) ||
        (!p.built && (p.feedToday !== 0 || p.fallowDays !== 0)) ||
        (p.count !== 0 && p.fallowDays !== 0)
      )
        return fail();
      if (p.species && SPECIES[p.species as SpeciesId].facility !== p.facility)
        return fail();
      for (const k of [
        "facility",
        "maxDensity",
        "temperature",
        "flow",
        "pH",
        "tan",
        "autoFeed",
        "rationMultiplier",
        "feedToday",
        "lastFeed",
        "lastGrowth",
        "totalFeed",
        "totalGain",
        "age",
        "fastingDays",
        "filterAge",
        "quarantineDays",
        "fallowDays",
        "constructionDays",
        "mortality",
        "oxygen",
        "satiety",
      ] as const)
        (normalized as unknown as Record<string, unknown>)[k] = p[k];
    }
    parsedPonds.push(normalized);
  }
  const s = value.stats as Record<string, number>;
  if (
    !legacy &&
    s.feedUsed + 1e-6 < parsedPonds.reduce((total, p) => total + p.feedToday, 0)
  )
    return fail();
  const g: Game = {
    version: 2,
    mode: legacy ? "guided" : (value.mode as Game["mode"]),
    day: value.day as number,
    money: value.money as number,
    food: value.food as number,
    xp: value.xp as number,
    ponds: parsedPonds,
    lastAidDay: value.lastAidDay as number,
    stats: {
      fed: s.fed,
      soldKg: s.soldKg,
      sales: s.sales,
      income: s.income,
      expenses: s.expenses,
      upgrades: s.upgrades,
      feedUsed: legacy ? 0 : s.feedUsed,
      mortality: legacy ? 0 : s.mortality,
      energyKwh: legacy ? 0 : s.energyKwh,
    },
    logs: value.logs.map((l) => ({ day: l.day, text: l.text, kind: l.kind })),
    claimed: [...value.claimed] as string[],
    history: value.history.map((h) => ({ day: h.day, money: h.money })),
  };
  if (legacy)
    log(
      g,
      "Migration vers le modèle biologique V2 : lots et trésorerie conservés, unités d’eau converties. L’ancienne sauvegarde reste disponible sous sa clé V1. Les installations incompatibles ont été adaptées.",
    );
  return g;
}
