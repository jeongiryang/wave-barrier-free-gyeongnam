import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

for (const en of [false, true]) for (const color of ["light", "dark"]) test(`${en ? "EN" : "KO"} ${color}: route readiness tracks current itinerary legs and never confirms mobility access`, async ({ page }) => {
  await mockPlannerApi(page);
  await page.addInitScript(color => localStorage.setItem("wave-theme", color), color);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true }).click();
  if (en) {
    await page.keyboard.press("Control+Home");
    await openSupportMenu(page);
    const preferences = page.locator(".preference-controls:visible");
    await openSupportMenu(page);
    await preferences.getByLabel("환경설정 열기", { exact: true }).click();
    await preferences.getByLabel("언어", { exact: true }).selectOption("en");
    await openSupportMenu(page);
    await preferences.getByLabel("Open preferences", { exact: true }).click();
  }
  const card = page.locator(".departure-readiness");
  const journeys = card.locator("article").filter({ has: page.getByText(en ? "Journey times" : "이동 경로·시간", { exact: true }) });
  const mobility = card.locator("article").filter({ has: page.getByText(en ? "Access along the journey" : "이동 편의", { exact: true }) });
  const count = (value: number) => en ? `${value} of 2 journeys verified` : `전체 2구간 중 ${value}구간`;
  await expect(journeys).toContainText(count(0));
  await expect(journeys).toHaveClass("recheck");
  await page.route("**/api/route?*", route => new URL(route.request().url()).searchParams.get("endLat") === "35.229"
    ? route.fulfill({ json: { configured: true, alternatives: [], providers: [{ id: "tago", name: "TAGO", state: "connected", configured: true }], context: {} } }) : route.fallback());
  const check = page.getByRole("button", { name: en ? "Check all journeys" : "모든 구간 조회하기", exact: true });
  const mode = page.locator(".itinerary-route-coverage select");
  // This scenario verifies car fixtures; the current UI starts with transit.
  await mode.selectOption("car");
  await check.click();
  await expect(journeys).toContainText(count(1));
  await expect(journeys).toHaveClass("partial");
  await expect(mobility).toHaveClass("recheck");
  await page.unroute("**/api/route?*");
  await check.click();
  await expect(journeys).toContainText(count(2));
  await expect(journeys).toHaveClass("confirmed");
  await expect(mobility).toHaveClass("recheck");
  await expect(card.locator(".readiness-overall")).toHaveClass(/recheck/);
  await mode.selectOption("walk");
  await expect(journeys).toContainText(count(0));
  await expect(journeys).toHaveClass("recheck");
  await mode.selectOption("car");
  // Completed evidence is reusable only for the exact same mode and itinerary identity.
  await expect(journeys).toContainText(count(2));
  await page.locator(".day-planner").getByLabel(en ? "용지호수공원 trip date" : "용지호수공원 여행 날짜", { exact: true }).selectOption("2026-10-09");
  await expect(journeys).toContainText(count(0));
  await expect(journeys).toHaveClass("recheck");
  await check.click();
  await expect(journeys).toContainText(count(2));
  await card.scrollIntoViewIfNeeded();
  expect((await new AxeBuilder({ page }).include(".departure-readiness").analyze()).violations).toEqual([]);
  if (test.info().project.name === "desktop-chromium") for (const width of [960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await card.screenshot({ path: test.info().outputPath(`departure-${en ? "en" : "ko"}-${color}-${width}.png`) });
  }
  // The chosen mode survives reload, but verified route evidence does not.
  // Hold the fresh automatic requests so this boundary does not depend on API speed.
  const freshRoutes: string[] = [];
  let release!: () => void;
  const pendingRoutes = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/route?*", async route => {
    const params = new URL(route.request().url()).searchParams;
    freshRoutes.push(["mode", "startLat", "startLng", "endLat", "endLng"].map(key => params.get(key)).join("/"));
    await pendingRoutes;
    await route.fallback();
  });
  try {
    await page.reload();
    await expect(mode).toHaveValue("car");
    await expect.poll(() => [...new Set(freshRoutes)].sort()).toEqual([
      "car/35.2422/128.6982/35.229/128.683",
      "car/35.2422/128.6982/35.238/128.691",
    ]);
    await expect(page.locator(".itinerary-route-coverage").getByRole("status")).toHaveText(en
      ? "0 of 2 journeys found for this transport"
      : "선택한 이동수단: 전체 2구간 중 0구간 확인");
    await expect(journeys).toContainText(en
      ? "Checking the journeys for your current itinerary and transport."
      : "현재 일정과 선택한 이동수단의 경로를 확인하고 있습니다.");
    await expect(journeys).toHaveClass("recheck");
    await expect(mobility).toHaveClass("recheck");
    release();
    await expect(journeys).toContainText(count(2));
    await expect(journeys).toHaveClass("confirmed");
    await expect(mobility).toHaveClass("recheck");
    await expect(card.locator(".readiness-overall")).toHaveClass(/recheck/);
  } finally { release(); }
});
