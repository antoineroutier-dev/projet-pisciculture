import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
const output = process.argv[2] || "/tmp/etangs-quality.json";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--enable-unsafe-swiftshader",
    "--use-angle=swiftshader",
  ],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
page.setDefaultTimeout(120000);
try {
  await page.addInitScript(
    (raw) => localStorage.setItem("les-etangs-save-v3", raw),
    fs.readFileSync("docs/ui/fixtures/elevage.json", "utf8"),
  );
  await page.goto(process.env.UI_BASE_URL || "http://127.0.0.1:5173");
  const canvas = page.locator('canvas[data-engine="three-webgl"]');
  await expect(canvas).toHaveAttribute("data-settled", "true", {
    timeout: 120000,
  });
  const results = [];
  for (const quality of ["low", "medium", "high", "ultra"]) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .getByRole("button", { name: "Paramètres & sauvegarde", exact: true })
      .click();
    await page.getByRole("tab", { name: "Affichage", exact: true }).click();
    await page
      .getByLabel("Qualité graphique", { exact: true })
      .selectOption(quality);
    await page.keyboard.press("Escape");
    await expect(canvas).toHaveAttribute("data-quality", quality, {
      timeout: 120000,
    });
    await expect(canvas).toHaveAttribute("data-settled", "true", {
      timeout: 120000,
    });
    const measure = canvas.evaluate(
      (c) =>
        new Promise((resolve, reject) => {
          const rows = [];
          let last = 0;
          const observer = new MutationObserver(() => {
            const completed = Number(c.dataset.gpuCompletedAt);
            if (!completed || completed === last) return;
            last = completed;
            rows.push({
              completed,
              renderMs: Number(c.dataset.gpuFrameMs),
              frame: Number(c.dataset.renderCount),
              drawCalls: Number(c.dataset.drawCalls),
            });
            if (rows.length >= 30) {
              observer.disconnect();
              clearTimeout(timer);
              delete c.dataset.measureGpu;
              resolve({
                hardware: c.dataset.hardware,
                quality: c.dataset.quality,
                pixelWidth: c.width,
                pixelHeight: c.height,
                resources: JSON.parse(c.dataset.resources),
                samples: rows.slice(6),
                warmup: 6,
              });
            }
          });
          observer.observe(c, {
            attributes: true,
            attributeFilter: ["data-gpu-completed-at"],
          });
          c.dataset.measureGpu = "true";
          const timer = setTimeout(() => {
            observer.disconnect();
            delete c.dataset.measureGpu;
            reject(
              Error(`Only ${rows.length} completed frames in 180 seconds`),
            );
          }, 180000);
        }),
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const value = await measure,
      first = value.samples[0],
      last = value.samples.at(-1);
    value.fps =
      ((value.samples.length - 1) * 1000) / (last.completed - first.completed);
    value.averageRenderMs =
      value.samples.reduce((n, s) => n + s.renderMs, 0) / value.samples.length;
    value.elapsedMs = last.completed - first.completed;
    results.push(value);
    console.log(JSON.stringify({ ...value, samples: undefined }));
  }
  const report = {
    browser: await browser.version(),
    viewport: { width: 1440, height: 900 },
    fixture: "elevage",
    method:
      "6 warm-up frames, then 24 frames; gl.finish after every render, elapsed wall time between GPU-completed frames. Clock paused; decorative animation active. Software renderer; no inference about physical hardware.",
    results,
  };
  fs.mkdirSync(output.slice(0, output.lastIndexOf("/")), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
} finally {
  await browser.close();
}
