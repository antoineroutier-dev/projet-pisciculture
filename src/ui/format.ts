import { engineText, getLocale, localeTag, t } from "../i18n";
/** Presentation only: never rewrite the saved messages or engine values. */
export const plural = (value: number, one: string, other = `${one}s`) =>
  new Intl.PluralRules(localeTag()).select(value) === "one" ? one : other;
export const number = (value: number, decimals = 0) =>
  new Intl.NumberFormat(localeTag(), {
    maximumFractionDigits: decimals,
  }).format(value);
export const simDate = (day: number) => formatDate(day);
export function formatMoney(
  value: number,
  unitPrice = false,
  locale = localeTag(),
) {
  const decimals = unitPrice ? 2 : 0;
  const normalized = Math.abs(value) < 0.5 / 10 ** decimals ? 0 : value;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(normalized === 0 ? 0 : normalized);
}
export const formatUnitPrice = (value: number) => formatMoney(value, true);
export const formatKg = (value: number, locale = localeTag()) =>
  `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value === 0 ? 0 : value)} kg`;
export const formatDuration = (days: number) =>
  `${number(days, 1)} ${plural(days, t("m_b5977b836b"), t("m_5cd11d34bc"))}`;
export function formatDate(day: number, locale = localeTag()) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2026, 3, day)));
}
/** Display adapter for legacy engine text; the underlying log stays intact. */
export function formatEngineText(text: string) {
  const translated = engineText(text);
  if (getLocale() === "en")
    return translated.replace(
      /(\d+(?:[,.]\d+)?) (day|cycle)\(s\)/g,
      (_, value: string, noun: string) =>
        `${value} ${plural(Number(value.replaceAll(",", "")), noun)}`,
    );
  return translated
    .replaceAll("« Mon projet »", "« Construire »")
    .replace(
      /(\d+(?:[,.]\d+)?) (jour|cycle)\(s\)(?: (écoulé|réglé)\(s\))?/g,
      (_, value: string, noun: string, adjective?: string) => {
        const n = Number(value.replace(",", "."));
        return `${value} ${plural(n, noun)}${adjective ? ` ${plural(n, adjective)}` : ""}`;
      },
    )
    .replace(
      /([−-]?\d[\d\u202f\u00a0 ]*(?:,\d+)?)\s*€(\s*\/\s*kg)?/g,
      (_, value: string, unit?: string) =>
        `${formatMoney(
          Number(
            value
              .replace(/[\s\u202f\u00a0]/g, "")
              .replace("−", "-")
              .replace(",", "."),
          ),
          !!unit,
        )}${unit ? "/kg" : ""}`,
    );
}
