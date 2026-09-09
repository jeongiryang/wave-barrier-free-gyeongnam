import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

// Bounded secondary-engine release check. The complete Chromium CI suite stays
// unchanged; this checks the arrival and current editorial working surfaces.
export default defineConfig({
  ...base,
  testMatch: ["editorial-journey.spec.ts", "fullscreen-intro.spec.ts", "landing-regions.spec.ts"],
  use: { ...base.use, channel: undefined, launchOptions: undefined },
  projects: [
    { name: "desktop-webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 960 } } },
    { name: "mobile-webkit", use: { ...devices["iPhone 13"] } },
  ],
});
