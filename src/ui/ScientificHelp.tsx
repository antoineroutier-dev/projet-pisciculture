import { number } from "./format";
import { t, displayText } from "../i18n";
import { Tooltip } from "./Tooltip";
import { SPECIES, type Pond } from "../game";
import { pondVitals } from "../state/pondSelectors";
export const SCIENCE_TERMS = {
  oxygen: {
    get label() {
      return t("m_a3665d89fe");
    },
    get text() {
      return t("m_65a93d88c9");
    },
  },
  ammonia: {
    get label() {
      return t("m_5b5bbd1bc0");
    },
    get text() {
      return t("m_cb2beabc70");
    },
  },
  tan: {
    get label() {
      return t("m_33e989a9e5");
    },
    get text() {
      return t("m_ec8efec572");
    },
  },
  fcr: {
    get label() {
      return t("m_f31d9200c7");
    },
    get text() {
      return t("m_b5b1fc735a");
    },
  },
  density: {
    get label() {
      return t("m_88f2fce145");
    },
    get text() {
      return t("m_2d83b044d6");
    },
  },
  flow: {
    get label() {
      return t("m_e7231673c9");
    },
    get text() {
      return t("m_b03eed3930");
    },
  },
} as const;
export type ScienceTerm = keyof typeof SCIENCE_TERMS;
export function scienceText(term: ScienceTerm, pond?: Pond) {
  const entry = SCIENCE_TERMS[term];
  if (!pond) return entry.text;
  const vital = pondVitals(pond).find((v) => v.key === term);
  return `${entry.text}${vital ? ` ${vital.threshold} ${vital.unit}.` : term === "fcr" && pond.species ? " " + t("m_95c9ad947e", number(SPECIES[pond.species].fcr, 2)) : ""}`;
}
export function ScientificHelp({
  term,
  pond,
}: {
  term: ScienceTerm;
  pond?: Pond;
}) {
  return (
    <Tooltip text={displayText(scienceText(term, pond))}>
      {(id) => (
        <button
          type="button"
          className="vital-help"
          aria-label={displayText(t("m_0b51688308", SCIENCE_TERMS[term].label))}
          aria-describedby={id}
        >
          ?
        </button>
      )}
    </Tooltip>
  );
}
