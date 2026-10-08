import { number } from "../ui/format";
import { t } from "../i18n";
import {
  act,
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
      ? t("m_0197946cc3")
      : tone === "warning"
        ? t("m_1a9a292c78")
        : t("m_8c2bab1a74");
  return [
    {
      key: "temperature",
      label: t("m_c7f2fe3809"),
      value: p.temperature,
      max: 40,
      unit: t("m_11c4350690"),
      digits: 1,
      tone: temperature,
      state: temp === 0 ? t("m_c3d0528d46") : state(temperature),
      threshold: s
        ? t("m_2e2110c2e6", s.temperature.join("–"))
        : t("m_a0ef5a8254"),
      help: t("m_3e514ed9a3"),
    },
    {
      key: "oxygen",
      label: t("m_a3665d89fe"),
      value: p.oxygen,
      max: 15,
      unit: "mg/L",
      digits: 1,
      tone: oxygen,
      state: state(oxygen),
      threshold: s
        ? t("m_8cc4f7a329", s.minOxygen, s.criticalOxygen)
        : t("m_4240b79ac0"),
      help: t("m_2478826e61"),
    },
    {
      key: "ammonia",
      label: t("m_5b5bbd1bc0"),
      value: nh3,
      max: s ? s.ammoniaLimit * 2 : 0.1,
      unit: "mg/L",
      digits: 4,
      tone: ammonia,
      state: state(ammonia),
      threshold: s
        ? t(
            "m_ceb6b6bf4e",
            number(s.ammoniaLimit / 2, 3),
            number(s.ammoniaLimit, 3),
          )
        : t("m_a46a1b309d"),
      help: t("m_a3c7e22f5e"),
    },
    {
      key: "density",
      label: t("m_88f2fce145"),
      value: d,
      max: p.maxDensity * 1.2,
      unit: "kg/m³",
      digits: 2,
      tone: crowding,
      state: state(crowding),
      threshold: t(
        "m_a473c30005",
        number(p.maxDensity * 0.8, 2),
        number(p.maxDensity, 2),
      ),
      help: t("m_2d9c4477cf"),
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
