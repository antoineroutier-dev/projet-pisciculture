import { afterEach, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import fr from "./fr.json" with { type: "json" };
import en from "./en.json" with { type: "json" };
import { engineText, setLocale, t, type MessageKey } from ".";
import {
  formatDate,
  formatDuration,
  formatEngineText,
  formatMoney,
  number,
} from "../ui/format";
import { parseSave, SPECIES, weather } from "../game";
import { nextTask } from "../development";
import { parsePreferences } from "../state/preferences";
afterEach(() => setLocale("fr"));
it("couvre les mêmes messages et paramètres dans les deux catalogues locaux", () => {
  expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(fr) as MessageKey[]) {
    expect(en[key].trim(), key).not.toBe("");
    const parameters = (v: string) =>
      [...v.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort();
    expect(parameters(en[key]), key).toEqual(parameters(fr[key]));
  }
});
it("localise nombres, monnaie, dates, pluriels et raccourcis sans zéro négatif", () => {
  setLocale("en");
  expect(number(1234.5, 1)).toBe("1,234.5");
  expect(formatMoney(37113.6)).toBe("€37,114");
  expect(formatMoney(0.16, true)).toBe("€0.16");
  expect(formatMoney(-0.1)).toBe("€0");
  expect(formatDate(1)).toBe("1 April 2026");
  expect(formatDuration(0)).toBe("0 days");
  expect(formatDuration(1)).toBe("1 day");
  expect(formatDuration(2)).toBe("2 days");
  expect(t("controls.space")).toBe("Space");
  setLocale("fr");
  expect(formatDuration(0)).toBe("0 jour");
  expect(t("controls.space")).toBe("Espace");
});
it("traduit les données connues du moteur uniquement à leur frontière d’affichage", () => {
  setLocale("en");
  expect(Object.values(SPECIES).map((s) => engineText(s.name))).toEqual([
    "Rainbow trout",
    "Common carp",
    "Nile tilapia",
  ]);
  expect(
    [1, 82, 174, 265].map((day) => engineText(weather(day).season)),
  ).toEqual(["Spring", "Summer", "Autumn", "Winter"]);
  for (const file of [
    "terrain-vide",
    "chantier",
    "elevage",
    "contrat-client",
    "lot-au-froid",
    "expedition",
    "cycle-paye",
  ]) {
    const game = parseSave(
      readFileSync(`docs/ui/fixtures/${file}.json`, "utf8"),
    )!;
    const before = JSON.stringify(game),
      task = nextTask(game);
    expect(engineText(task.title), file).not.toBe(task.title);
    expect(formatEngineText(task.text), file).not.toBe(task.text);
    expect(formatEngineText(task.text), file).not.toMatch(/\(s\)/);
    expect(JSON.stringify(game)).toBe(before);
  }
  expect(engineText("Votre note libre : bassin numéro quatre.")).toBe(
    "Votre note libre : bassin numéro quatre.",
  );
  expect(engineText("x".repeat(5000))).toBe("x".repeat(5000));
});
it("change les notices connues de langue sans polluer une autre partie et migre les préférences", () => {
  setLocale("en");
  const translated = engineText("Partie restaurée au jour 1234.");
  expect(translated).toBe("Game restored to day 1,234.");
  setLocale("fr");
  expect(engineText(translated)).toBe("Partie restaurée au jour 1 234.");
  expect(
    parsePreferences('{"version":2,"scale":125,"patterns":true}'),
  ).toMatchObject({ version: 3, locale: "fr", scale: 125, patterns: true });
  expect(parsePreferences('{"version":3,"locale":"en"}').locale).toBe("en");
  expect(parsePreferences('{"version":3,"locale":"de"}').locale).toBe("fr");
});

it("préserve les centimes des prix au kilo et les pluriels lors d’un aller-retour", () => {
  setLocale("en");
  const contract =
    "Coopérative régionale : poissons entiers à 8,92 €/kg. Livraison sous 30 jours, règlement 7 jours après réception.";
  expect(formatEngineText(contract)).toBe(
    "Regional cooperative: whole fish at €8.92/kg. Delivery within 30 days, payment 7 days after receipt.",
  );
  const cold = engineText(
    "454 kg au froid, péremption dans 3 jour(s). Coopérative régionale attend votre livraison.",
  );
  expect(cold).toBe(
    "454 kg chilled, expiry in 3 days. Regional cooperative is awaiting your delivery.",
  );
  expect(engineText("truite arc-en-ciel")).toBe("Rainbow trout");
  setLocale("fr");
  expect(engineText(cold)).toBe(
    "454 kg au froid, péremption dans 3 jours. Coopérative régionale attend votre livraison.",
  );
});
