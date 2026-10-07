import {
  act,
  number,
  density,
  pondAmmonia,
  SPECIES,
  temperatureFactor,
  type Action,
  type Game,
  type Pond,
} from "../game";

/** Ask the pure engine about a command without applying its returned state. */
export function availability(game: Game, action: Action) {
  const result = act(game, action);
  return { disabled: !result.ok, reason: result.ok ? "" : result.message };
}
export function expectedHarvestDays(p: Pond): number | null {
  if (!p.species || !p.count) return null;
  const missing = SPECIES[p.species].harvestWeight - p.weight;
  if (missing <= 0) return p.quarantineDays;
  return p.lastGrowth > 0
    ? Math.max(p.quarantineDays, Math.ceil(missing / p.lastGrowth))
    : null;
}
export type VitalKey = "temperature" | "oxygen" | "ammonia" | "density";
export type Vital = {
  key: VitalKey;
  label: string;
  value: number;
  max: number;
  unit: string;
  digits: number;
  tone: "success" | "warning" | "danger";
  state: string;
  threshold: string;
  help: string;
};
export function pondVitals(p: Pond): Vital[] {
  const s = p.species
    ? SPECIES[p.species]
    : p.plannedSpecies
      ? SPECIES[p.plannedSpecies]
      : null;
  const temp = s && p.species ? temperatureFactor(p) : 1;
  const oxygen = s
    ? p.oxygen <= s.criticalOxygen
      ? "danger"
      : p.oxygen < s.minOxygen
        ? "warning"
        : "success"
    : "success";
  const nh3 = pondAmmonia(p),
    ammonia = s
      ? nh3 > s.ammoniaLimit
        ? "danger"
        : nh3 > s.ammoniaLimit / 2
          ? "warning"
          : "success"
      : "success";
  const d = density(p),
    crowding =
      d > p.maxDensity
        ? "danger"
        : d > p.maxDensity * 0.8
          ? "warning"
          : "success";
  const temperature =
    temp === 0
      ? "warning"
      : s &&
          (p.temperature < s.temperature[0] || p.temperature > s.temperature[1])
        ? "warning"
        : "success";
  const state = (tone: Vital["tone"]) =>
    tone === "danger"
      ? "Critique"
      : tone === "warning"
        ? "À surveiller"
        : "Bon";
  return [
    {
      key: "temperature",
      label: "Température de l’eau",
      value: p.temperature,
      max: 40,
      unit: "°C",
      digits: 1,
      tone: temperature,
      state: temp === 0 ? "Croissance nulle" : state(temperature),
      threshold: s
        ? `${s.temperature.join("–")} °C préférés`
        : "Espèce non choisie",
      help: "L’eau conditionne la croissance. Hors de la plage préférée, elle ralentit ; une croissance nulle en eau froide ne signifie pas, à elle seule, que le lot est malade.",
    },
    {
      key: "oxygen",
      label: "Oxygène dissous",
      value: p.oxygen,
      max: 15,
      unit: "mg/L",
      digits: 1,
      tone: oxygen,
      state: state(oxygen),
      threshold: s
        ? `Bon ≥ ${s.minOxygen} · critique ≤ ${s.criticalOxygen}`
        : "Concentration dissoute",
      help: "Sous le minimum de l’espèce, vérifiez débit et aération, puis réduisez la ration. Le seuil critique bloque la croissance liée à l’oxygène.",
    },
    {
      key: "ammonia",
      label: "Ammoniac · NH₃-N",
      value: nh3,
      max: s ? s.ammoniaLimit * 2 : 0.1,
      unit: "mg/L",
      digits: 4,
      tone: ammonia,
      state: state(ammonia),
      threshold: s
        ? `Attention > ${number(s.ammoniaLimit / 2, 3)} · critique > ${number(s.ammoniaLimit, 3)}`
        : "Fraction non ionisée",
      help: "Fraction toxique de l’azote ammoniacal, calculée avec le pH et la température. Réduisez les apports et vérifiez renouvellement et filtration.",
    },
    {
      key: "density",
      label: "Densité d’élevage",
      value: d,
      max: p.maxDensity * 1.2,
      unit: "kg/m³",
      digits: 2,
      tone: crowding,
      state: state(crowding),
      threshold: `Attention > ${number(p.maxDensity * 0.8, 2)} · limite ${number(p.maxDensity, 2)}`,
      help: "Biomasse divisée par le volume. La marge de surveillance commence à 80 % de la densité maximale ; prévoyez les collectes avant saturation.",
    },
  ];
}
export type PondReading = {
  day: number;
  temperature: number;
  oxygen: number;
  ammonia: number;
  density: number;
};
export type PondReadings = Record<number, PondReading[]>;
/** Actual observed samples only: missing days are never invented. */
export function recordReadings(
  previous: PondReadings,
  game: Game,
): PondReadings {
  return Object.fromEntries(
    game.ponds.map((p) => {
      const old = previous[p.id] || [];
      const keep =
        old.at(-1) && old.at(-1)!.day > game.day
          ? []
          : old.filter((r) => r.day > game.day - 14 && r.day !== game.day);
      return [
        p.id,
        [
          ...keep,
          {
            day: game.day,
            temperature: p.temperature,
            oxygen: p.oxygen,
            ammonia: pondAmmonia(p),
            density: density(p),
          },
        ],
      ];
    }),
  );
}
