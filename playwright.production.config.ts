import { defineConfig, devices } from "@playwright/test";
import { validateProductionOrigin } from "./lib/production-read-only";

const baseURL = validateProductionOrigin(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: "./e2e-production",
  outputDir: "test-results-production",
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["line"], ["html", { outputFolder: "playwright-production-report", open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "production-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "production-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
