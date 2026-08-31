import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.README_SCREENSHOT_BASE_URL || "https://wave-barrier-free-gyeongnam.vercel.app";
const outputDirectory = path.resolve("docs/screenshots");
const logBase64 = process.env.README_SCREENSHOT_LOG_BASE64 === "1";

async function save(locator, fileName) {
  const filePath = path.join(outputDirectory, fileName);
  await locator.screenshot({ path: filePath, animations: "disabled" });
  if (logBase64) console.log(`READMESHOT:${fileName}:${(await readFile(filePath)).toString("base64")}`);
}

async function waitForPlanner(page) {
  await page.goto(`${baseUrl}/planner?region=${encodeURIComponent("창원")}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "내 여행 만들기" }).waitFor();
  await page.locator(".place-card").first().waitFor({ state: "visible", timeout: 30_000 });
  const saveButton = page.locator(".place-card button[aria-label$='보관하기']").first();
  await saveButton.waitFor({ state: "visible", timeout: 30_000 });
  await saveButton.click({ force: true });
  await page.locator(".day-planner").waitFor({ state: "visible", timeout: 30_000 });
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  await desktop.addInitScript(() => {
    window.sessionStorage.setItem("wave-intro-seen-v2", "1");
    window.localStorage.setItem("wave-theme", "dark");
    window.localStorage.setItem("wave-motion", "calm");
  });
  await waitForPlanner(desktop);
  await desktop.locator(".departure-readiness").scrollIntoViewIfNeeded();
  await save(desktop.locator(".departure-readiness"), "wave-planner-readiness-desktop.png");

  const mobilePlanner = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobilePlanner.addInitScript(() => {
    window.sessionStorage.setItem("wave-intro-seen-v2", "1");
    window.localStorage.setItem("wave-theme", "light");
    window.localStorage.setItem("wave-motion", "calm");
  });
  await waitForPlanner(mobilePlanner);
  await mobilePlanner.locator(".day-planner").scrollIntoViewIfNeeded();
  await save(mobilePlanner.locator(".day-planner"), "wave-planner-itinerary-mobile.png");

  const mobileCommunity = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobileCommunity.addInitScript(() => {
    window.sessionStorage.setItem("wave-intro-seen-v2", "1");
    window.localStorage.setItem("wave-theme", "dark");
    window.localStorage.setItem("wave-motion", "calm");
  });
  await mobileCommunity.goto(`${baseUrl}/community`, { waitUntil: "domcontentloaded" });
  await mobileCommunity.locator(".community-hero h1").waitFor({ state: "visible" });
  await mobileCommunity.locator(".community-list article").first().waitFor({ state: "visible", timeout: 20_000 });
  await save(mobileCommunity.locator(".community-page"), "wave-community-mobile.png");
} finally {
  await browser.close();
}
