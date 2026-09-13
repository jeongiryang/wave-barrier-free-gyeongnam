import { openDeparture, departureItem, routeTools } from './departure-fixtures';
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, openItinerary } from "./fixtures";

for (const en of [false, true]) for (const color of ["light", "dark"]) test(`${en ? "EN" : "KO"} ${color}: route readiness tracks current itinerary legs and never confirms mobility access`, async ({ page }) => {
  await mockPlannerApi(page);
  await page.addInitScript(({ color, en }) => { localStorage.setItem('wave-theme', color); localStorage.setItem('wave-locale', en ? 'en' : 'ko'); }, { color, en });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await page.locator('.simple-place-row').nth(0).locator('.simple-place-add').click();
  await page.locator('.simple-place-row').nth(1).locator('.simple-place-add').click();
  await openItinerary(page, { start: '2026-10-08', end: '2026-10-09' });
  const card = await openDeparture(page);
  const journeys = await departureItem(page, '이동 경로·시간');
  const mobility = await departureItem(page, '이동 편의');
  await routeTools(page);
  const count = (value: number) => `전체 2구간 중 ${value}구간`;
  await expect(journeys).toContainText(count(0));
  await expect(journeys.locator('summary')).toContainText('확인할 정보 있음');
  await page.route("**/api/route?*", route => new URL(route.request().url()).searchParams.get("endLat") === "35.229"
    ? route.fulfill({ json: { configured: true, alternatives: [], providers: [{ id: "tago", name: "TAGO", state: "connected", configured: true }], context: {} } }) : route.fallback());
  const check = page.getByRole("button", { name: en ? "Check all journeys" : "모든 구간 조회하기", exact: true });
  const mode = page.locator(".itinerary-route-coverage select");
  // This scenario verifies car fixtures; the current UI starts with transit.
  await mode.selectOption("car");
  await check.click();
  await expect(journeys).toContainText(count(1));
  await expect(journeys.locator('summary')).toContainText('일부 정보 있음');
  await expect(mobility.locator('summary')).toContainText('확인할 정보 있음');
  await page.unroute("**/api/route?*");
  await check.click();
  await expect(journeys).toContainText(count(2));
  await expect(journeys.locator('summary')).toContainText('조회한 정보 있음');
  await expect(mobility.locator('summary')).toContainText('확인할 정보 있음');
  await mode.selectOption("walk");
  await expect(journeys).toContainText(count(0));
  await expect(journeys.locator('summary')).toContainText('확인할 정보 있음');
  await mode.selectOption("car");
  // Completed evidence is reusable only for the exact same mode and itinerary identity.
  await expect(journeys).toContainText(count(2));
  let resumeDate!: () => void; const dateGate = new Promise<void>(resolve => { resumeDate = resolve; });
  await page.route('**/api/route?*', async route => { await dateGate; return route.fallback(); });
  const stop = page.locator('.simple-stops > li').filter({ hasText: '용지호수공원' });
  await stop.getByRole('button', { name: '용지호수공원 일정 수정', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '용지호수공원 수정', exact: true });
  await editor.getByRole('combobox', { name: '방문 날짜', exact: true }).selectOption('2026-10-09');
  await editor.getByRole('button', { name: '적용', exact: true }).click();
  await expect(journeys).toContainText('현재 일정과 선택한 이동수단의 경로를 확인하고 있습니다.');
  await expect(journeys.locator('summary')).toContainText('확인할 정보 있음');
  resumeDate(); await page.unroute('**/api/route?*');
  await expect(journeys).toContainText(count(2));
  await card.scrollIntoViewIfNeeded();
  expect((await new AxeBuilder({ page }).include(".simple-readiness").analyze()).violations).toEqual([]);
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
    await page.reload(); await openItinerary(page); await openDeparture(page); await routeTools(page);
    await expect(mode).toHaveValue("car");
    await expect.poll(() => [...new Set(freshRoutes)].sort()).toEqual([
      "car/35.2422/128.6982/35.229/128.683",
      "car/35.2422/128.6982/35.238/128.691",
    ]);
    await expect(page.locator(".itinerary-route-coverage").getByRole("status")).toHaveText(en
      ? "0 of 2 journeys found for this transport"
      : "선택한 이동수단: 전체 2구간 중 0구간 확인");
    await expect(journeys).toContainText("현재 일정과 선택한 이동수단의 경로를 확인하고 있습니다.");
    await expect(journeys.locator('summary')).toContainText('확인할 정보 있음');
    await expect(mobility.locator('summary')).toContainText('확인할 정보 있음');
    release();
    await expect(journeys).toContainText(count(2));
    await expect(journeys.locator('summary')).toContainText('조회한 정보 있음');
    await expect(mobility.locator('summary')).toContainText('확인할 정보 있음');
    } finally { release(); }
});
