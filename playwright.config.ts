import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1100 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--enable-unsafe-swiftshader",
        "--use-angle=swiftshader",
      ],
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
