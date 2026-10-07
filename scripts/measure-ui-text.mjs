import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const { chromium } = createRequire(path.resolve("package.json"))(
  "@playwright/test",
);
const [mode, origin, output] = process.argv.slice(2);
if (!["before", "after"].includes(mode) || !origin || !output)
  throw Error("Usage: node script.mjs before|after URL sortie.json");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const rows = [];
const states = [
  "terrain-vide",
  "chantier",
  "elevage",
  "contrat-client",
  "lot-au-froid",
  "expedition",
  "cycle-paye",
];
const screens =
  mode === "before"
    ? ["Mon projet", "Mes bassins", "Logistique", "Marché", "Journal", "Guide"]
    : ["Construire", "Bassins", "Logistique", "Finances", "Journal", "Guide"];
try {
  for (const state of states) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    await page.addInitScript(
      (raw) => {
        localStorage.clear();
        localStorage.setItem("les-etangs-save-v3", raw);
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (["webgl", "webgl2", "experimental-webgl"].includes(type))
            return null;
          return Reflect.apply(original, this, [type, ...args]);
        };
      },
      fs.readFileSync(`docs/ui/fixtures/${state}.json`, "utf8"),
    );
    await page.goto(origin);
    await page.evaluate(() => document.fonts.ready);
    for (const screen of screens) {
      await page
        .getByRole("navigation")
        .getByRole("button", { name: screen, exact: true })
        .click();
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        const content = document.querySelector(".management-content");
        if (content) content.scrollTop = 0;
      });
      const result = await page.evaluate(() => {
        const words = [];
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
        );
        let node;
        while ((node = walker.nextNode())) {
          const parent = node.parentElement;
          if (
            !parent ||
            parent.closest("script,style,title,.sr-only,[inert]") ||
            !parent.checkVisibility({
              checkVisibilityCSS: true,
              checkOpacity: true,
            })
          )
            continue;
          let hiddenByDetails = false;
          for (let e = parent; e; e = e.parentElement) {
            if (
              e instanceof HTMLDetailsElement &&
              !e.open &&
              !e.querySelector(":scope > summary")?.contains(parent)
            )
              hiddenByDetails = true;
          }
          if (hiddenByDetails) continue;
          const matches = [...node.textContent.matchAll(/\S+/g)];
          if (!matches.length) continue;
          let clip = {
            left: 0,
            top: 0,
            right: innerWidth,
            bottom: innerHeight,
          };
          for (let e = parent; e && e !== document.body; e = e.parentElement) {
            const css = getComputedStyle(e);
            if (
              /hidden|clip|auto|scroll/.test(
                `${css.overflowX} ${css.overflowY}`,
              )
            ) {
              const r = e.getBoundingClientRect();
              clip = {
                left: Math.max(clip.left, r.left),
                top: Math.max(clip.top, r.top),
                right: Math.min(clip.right, r.right),
                bottom: Math.min(clip.bottom, r.bottom),
              };
            }
          }
          for (const m of matches) {
            const range = document.createRange();
            range.setStart(node, m.index);
            range.setEnd(node, m.index + m[0].length);
            const r = range.getBoundingClientRect();
            const visible =
              Math.max(
                0,
                Math.min(r.right, clip.right) - Math.max(r.left, clip.left),
              ) *
              Math.max(
                0,
                Math.min(r.bottom, clip.bottom) - Math.max(r.top, clip.top),
              );
            if (
              r.width > 1 &&
              r.height > 1 &&
              visible >= r.width * r.height * 0.8
            )
              words.push(m[0]);
          }
        }
        const text = words.join(" ");
        return { words: words.length, characters: text.length, text };
      });
      rows.push({ state, screen, ...result });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
const report = {
  mode,
  viewport: { width: 1440, height: 900 },
  scope:
    "Mots visibles à au moins 80 % dans la fenêtre et les régions défilantes, sans défilement ; repli WebGL pour isoler le texte de gestion.",
  characters: rows.reduce((n, r) => n + r.characters, 0),
  rows,
};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log({ mode, characters: report.characters, combinations: rows.length });
