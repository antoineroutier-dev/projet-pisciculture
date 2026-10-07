import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.CAPTURE_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage();
  await page.route("**/portrait-authoring", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><link rel="stylesheet" href="/src/ui/tokens.css"></head><body></body></html>',
    }),
  );
  await page.goto(`${base}/portrait-authoring`);
  await mkdir("src/assets/portraits", { recursive: true });
  for (const species of ["trout", "carp", "tilapia"]) {
    const data = await page.evaluate(async (species) => {
      const { renderPortrait } = await import("/src/world/portraitScene.ts");
      return renderPortrait(species);
    }, species);
    const bytes = Buffer.from(data.split(",")[1], "base64");
    await writeFile(`src/assets/portraits/${species}.webp`, bytes);
    console.log(`${species}: ${bytes.length} bytes`);
  }
} finally {
  await browser.close();
}
