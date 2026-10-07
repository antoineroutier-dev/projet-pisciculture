import { expect, it } from "vitest";
import { formatMoney, formatUnitPrice, formatEngineText, formatDate, formatDuration } from "./format";

it("affiche les euros entiers, les prix unitaires précis et aucun zéro négatif", () => {
  expect(formatMoney(37113.6)).toBe("37\u202f114\u00a0€");
  expect(formatUnitPrice(0.16)).toBe("0,16\u00a0€");
  expect(formatUnitPrice(1.2)).toBe("1,20\u00a0€");
  expect(formatMoney(-0.5)).toBe("-1\u00a0€");
  expect(formatUnitPrice(-0.005)).toBe("-0,01\u00a0€");
  for (const value of [0, -0, -0.01, -0.49]) expect(formatMoney(value)).toBe("0\u00a0€");
});
it("présente les anciens messages sans toucher à leur contenu sauvegardé", () => {
  const text = "1 cycle(s) réglé(s), 2 jour(s) écoulé(s) · 37 113,6 € ; 9,5 €/kg";
  expect(formatEngineText(text)).toBe("1 cycle réglé, 2 jours écoulés · 37\u202f114\u00a0€ ; 9,50\u00a0€/kg");
  expect(text).toContain("cycle(s)");
  expect(formatEngineText("dans 1 jour(s). Tilapia du Nil")).toBe("dans 1 jour. Tilapia du Nil");
});
it("utilise le calendrier du jeu et les pluriels français", () => {
  expect(formatDate(1)).toBe("1 avril 2026");
  expect(formatDate(185)).toBe("2 octobre 2026");
  expect(formatDuration(1)).toBe("1 jour");
  expect(formatDuration(2)).toBe("2 jours");
});
