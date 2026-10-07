/** Presentation only: never rewrite the saved messages or engine values. */
const pluralRules = new Intl.PluralRules("fr-FR");
export const plural = (value: number, one: string, other = `${one}s`) =>
  pluralRules.select(value) === "one" ? one : other;

export function formatMoney(value: number, unitPrice = false, locale = "fr-FR") {
  const decimals = unitPrice ? 2 : 0;
  // Let Intl round ties symmetrically (−0.50 € → −1 € in whole euros).
  const normalized = Math.abs(value) < 0.5 / 10 ** decimals ? 0 : value;
  return new Intl.NumberFormat(locale, {
    style: "currency", currency: "EUR",
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(normalized === 0 ? 0 : normalized);
}
export const formatUnitPrice = (value: number) => formatMoney(value, true);
export const formatKg = (value: number, locale = "fr-FR") =>
  `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value === 0 ? 0 : value)} kg`;
export const formatDuration = (days: number) =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(days)} ${plural(days, "jour")}`;
export function formatDate(day: number, locale = "fr-FR") {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, 3, day)));
}

/** Display adapter for V1–V3 engine text; the underlying log stays intact. */
export function formatEngineText(text: string) {
  return text
    .replaceAll("« Mon projet »", "« Construire »")
    .replace(/(\d+(?:[,.]\d+)?) (jour|cycle)\(s\)(?: (écoulé|réglé)\(s\))?/g,
      (_, value: string, noun: string, adjective?: string) => {
        const n = Number(value.replace(",", "."));
        return `${value} ${plural(n, noun)}${adjective ? ` ${plural(n, adjective)}` : ""}`;
      })
    .replace(/([−-]?\d[\d\u202f\u00a0 ]*(?:,\d+)?)\s*€(\s*\/\s*kg)?/g,
      (_, value: string, unit?: string) => `${formatMoney(Number(value.replace(/[\s\u202f\u00a0]/g, "").replace("−", "-").replace(",", ".")), !!unit)}${unit ? "/kg" : ""}`);
}
