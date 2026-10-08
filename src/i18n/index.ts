import { useSyncExternalStore } from "react";
import fr from "./fr.json" with { type: "json" };
import en from "./en.json" with { type: "json" };
export type Locale = "fr" | "en";
export type MessageKey = keyof typeof fr;
let language: Locale = "fr";
try {
  if (
    JSON.parse(localStorage.getItem("les-etangs-ui-v3") || "{}").locale === "en"
  )
    language = "en";
} catch {
  /* Browser storage is optional, including file://. */
}
const listeners = new Set<() => void>();
const cache = new Map<string, string>();
export const getLocale = () => language;
export const localeTag = () => (language === "en" ? "en-GB" : "fr-FR");
export function setLocale(locale: Locale) {
  if (typeof document !== "undefined") document.documentElement.lang = locale;
  if (locale === language) return;
  language = locale;
  cache.clear();
  listeners.forEach((fn) => fn());
}
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const useLocale = () =>
  useSyncExternalStore(subscribe, getLocale, () => "fr" as Locale);
const normal = (s: string) => s.replace(/\s+/g, " ").trim();
const entries = Object.entries(fr) as [MessageKey, string][];
const exact = {
  fr: new Map(
    entries
      .filter(([, s]) => !/\{\d+\}/.test(s))
      .map(([k, s]) => [normal(s), k]),
  ),
  en: new Map(
    entries
      .filter(([k]) => !/\{\d+\}/.test(en[k]))
      .reverse()
      .map(([k]) => [normal(en[k]), k]),
  ),
};
function pattern(source: string) {
  const positions: number[] = [];
  const parts = normal(source).split(/(\{\d+\})/g);
  const expression = parts
    .map((s) =>
      /^\{\d+\}$/.test(s)
        ? (positions.push(Number(s.slice(1, -1))), "(.*?)")
        : s
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replaceAll("\\(s\\)", "(?:s|\\(s\\))?"),
    )
    .join("");
  return {
    regex: new RegExp(`^${expression}$`),
    positions,
    literals: parts
      .filter((s) => s && !/^\{\d+\}$/.test(s))
      .flatMap((s) => s.split("(s)"))
      .filter(Boolean),
    unitPrices: new Set(
      parts.flatMap((s, i) =>
        /^\{\d+\}$/.test(s) && /^\/kg/.test(parts[i + 1] || "")
          ? [Number(s.slice(1, -1))]
          : [],
      ),
    ),
    weight: parts.filter((s) => !/^\{\d+\}$/.test(s)).join("").length,
  };
}
const patterns = {
  fr: entries
    .filter(([, s]) => /\{\d+\}/.test(s))
    .map(([key, s]) => ({ key, ...pattern(s) }))
    .filter((p) => p.weight >= 4)
    .sort((a, b) => b.weight - a.weight),
  en: entries
    .filter(([k]) => /\{\d+\}/.test(en[k]))
    .map(([key]) => ({ key, ...pattern(en[key]) }))
    .filter((p) => p.weight >= 4)
    .sort((a, b) => b.weight - a.weight),
};
function readablePlural(source: string) {
  return source.replace(
    /(\d+(?:[,.]\d+)?) (day|jour|cycle)\(s\)/g,
    (_, value: string, noun: string) => {
      const count = Number(
        language === "fr" ? value.replace(",", ".") : value.replaceAll(",", ""),
      );
      return `${value} ${noun}${new Intl.PluralRules(localeTag()).select(count) === "one" ? "" : "s"}`;
    },
  );
}
const fill = (source: string, values: readonly unknown[]) =>
  source.replace(/\{(\d+)\}/g, (_, i: string) =>
    String(values[Number(i)] ?? ""),
  );
/** Catalog text is evaluated at render time. Values are never written to game data. */
export function t(key: MessageKey, ...values: unknown[]): string {
  return readablePlural(
    fill(
      (language === "en" ? en : fr)[key],
      values.map((v) =>
        typeof v === "string"
          ? engineText(v)
          : typeof v === "number"
            ? new Intl.NumberFormat(localeTag(), {
                maximumFractionDigits: 10,
              }).format(v === 0 ? 0 : v)
            : v,
      ),
    ),
  );
}
function translatedNumber(
  text: string,
  source: Locale,
  unitPrice = false,
): string | null {
  const currency =
    source === "fr"
      ? /^([−-]?[\d\s\u202f\u00a0]+(?:,\d+)?)\s*€(\/kg)?$/.exec(text)
      : /^€([−-]?[\d,]+(?:\.\d+)?)(\/kg)?$/.exec(text);
  const numeric = currency?.[1] ?? text;
  const valid =
    source === "fr"
      ? /^[−-]?\d[\d\s\u202f\u00a0]*(?:,\d+)?$/
      : /^[−-]?\d[\d,]*(?:\.\d+)?$/;
  if (!valid.test(numeric)) return null;
  const value = Number(
    numeric
      .replace("−", "-")
      .replace(source === "fr" ? /[\s\u202f\u00a0]/g : /,/g, "")
      .replace(source === "fr" ? "," : "\u0000", "."),
  );
  if (!Number.isFinite(value)) return null;
  const decimals = (numeric.split(source === "fr" ? "," : ".")[1] || "").length;
  const unit = currency?.[2] || "";
  return (
    new Intl.NumberFormat(
      localeTag(),
      currency
        ? {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: unit || unitPrice ? 2 : 0,
            maximumFractionDigits: unit || unitPrice ? 2 : 0,
          }
        : { maximumFractionDigits: Math.min(10, decimals) },
    ).format(value) + unit
  );
}
/** Translate known engine/catalog messages at the display boundary. Unknown imported prose stays verbatim. */
export function engineText(raw: string, depth = 0): string {
  if (!raw || depth > 5 || raw.length > 2048 || !/[A-Za-zÀ-ÿ]/.test(raw))
    return raw;
  if (cache.has(raw)) return cache.get(raw)!;
  const text = normal(raw),
    source: Locale = language === "en" ? "fr" : "en";
  // A French string already in the catalog must remain French on a round trip.
  if (language === "fr" && exact.fr.has(text)) return raw;
  const key = exact[source].get(text);
  const target = language === "en" ? en : fr;
  let result: string | null = key ? target[key] : null;
  if (result === null)
    for (const p of patterns[source]) {
      let cursor = 0,
        possible = true;
      for (const literal of p.literals) {
        const at = text.indexOf(literal, cursor);
        if (at < 0) {
          possible = false;
          break;
        }
        cursor = at + literal.length;
      }
      if (!possible) continue;
      const match = p.regex.exec(text);
      if (!match) continue;
      const values: string[] = [];
      p.positions.forEach((position, index) => {
        const part = match[index + 1];
        values[position] =
          translatedNumber(part, source, p.unitPrices.has(position)) ??
          engineText(part, depth + 1);
      });
      result = readablePlural(fill(target[p.key], values));
      break;
    }
  const output =
    result === null
      ? raw
      : (raw.match(/^\s*/)?.[0] || "") +
        result +
        (raw.match(/\s*$/)?.[0] || "");
  if (cache.size >= 1000) cache.clear();
  cache.set(raw, output);
  return output;
}
/** React nodes stay nodes. Only text, including engine-derived labels, is adapted. */
export function displayText<T>(value: T): T {
  if (typeof value === "string") return engineText(value) as T;
  if (Array.isArray(value)) return value.map((v) => displayText(v)) as T;
  return value;
}
