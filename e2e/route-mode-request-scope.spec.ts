import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

function bundle(mode: string, label = "fixture journey") {
  return { configured: mode === "car" || mode === "transit", providers: [], context: { nearbyStops: [], arrivals: [], korail: [], catalog: { trainCities: 0, expressTerminals: 0, intercityTerminals: 0 }, datasets: [] },
    alternatives: mode === "car" || mode === "transit" ? [{ id: `${mode}-${label}`, label, provider: mode === "car" ? "Kakao Mobility" : "ODsay", mode,
      configured: true, totalTime: 25, totalDistance: 8800, totalWalk: mode === "car" ? 0 : 300, payment: 0, transfers: 0, segments: [], geometry: [] }] : [],
  };
}

test("selected modes reach the request, and ordinary rendering makes no new route request", async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const calls: URL[] = [];
  await page.route("**/api/route?*", request => {
    const url = new URL(request.request().url()); calls.push(url);
    return request.fulfill({ json: bundle(url.searchParams.get("mode") || "") });
  });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  expect(calls).toHaveLength(0);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  const mode = page.locator(".itinerary-route-coverage select");
  await expect(mode).toHaveValue("transit");
  // One selected-map request and one automatic whole-itinerary request must
  // both settle. Ordinary rendering must not start a third request.
  await expect.poll(() => calls.map(url => url.searchParams.get("mode"))).toEqual(["transit", "transit"]);
  await expect(page.locator(".itinerary-route-coverage").getByRole("status")).toContainText("전체 1구간 중 1구간 확인");
  for (const value of ["car", "walk", "bicycle", "transit"]) {
    const count = calls.length;
    await mode.selectOption(value);
    await expect.poll(() => calls.length).toBe(count + 2);
    expect(calls.slice(count).map(url => url.searchParams.get("mode"))).toEqual([value, value]);
    await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".coverage-actions > button").first()).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".route-option")).toHaveCount(value === "car" || value === "transit" ? 1 : 0);
  }
  expect(calls.every(url => url.searchParams.get("startLng") === "128.6982")).toBe(true);
  expect(calls.every(url => url.searchParams.get("endLng") === plan.places[0].mapX)).toBe(true);
  await page.getByRole("button", { name: "경남도립미술관 일정에서 제거", exact: true }).scrollIntoViewIfNeeded();
  await page.keyboard.press("Control+Home");
  await page.clock.install();
  await page.clock.fastForward(1_000);
  expect(calls).toHaveLength(10);
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("switching modes cancels old coverage and cannot restore it by switching back", async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let held = false;
  let heldRequests = 0;
  let release!: () => void;
  const responseGate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/route?*", async request => {
    const mode = new URL(request.request().url()).searchParams.get("mode") || "";
    const oldResponse = held && mode === "car";
    if (oldResponse) { heldRequests++; await responseGate; }
    await request.fulfill({ json: bundle(mode, oldResponse ? "old car" : "current journey") }).catch(() => {});
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  const coverage = page.locator(".itinerary-route-coverage"), mode = coverage.locator("select");
  await mode.selectOption("car");
  await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
  const check = coverage.getByRole("button", { name: "모든 구간 조회하기", exact: true });
  held = true;
  await check.click();
  await expect(coverage.getByRole("button", { name: "구간 확인 중…", exact: true })).toHaveAttribute("aria-busy", "true");
  await expect.poll(() => heldRequests).toBe(1);
  await mode.selectOption("walk");
  release(); held = false;
  await expect(coverage.getByRole("status")).toContainText("전체 1구간 중 0구간 확인");
  await expect(page.locator(".route-option")).toHaveCount(0);
  await mode.selectOption("car");
  await expect(coverage.getByRole("status")).toContainText("전체 1구간 중 0구간 확인");
  await expect(check).toHaveAttribute("aria-busy", "false");
  await check.click();
  await expect(coverage.getByRole("status")).toContainText("전체 1구간 중 1구간 확인");
  await coverage.getByRole("button", { name: "이 구간 지도에서 보기", exact: true }).click();
  await expect(page.locator(".route-option")).toContainText("current journey");
  await expect(page.locator(".route-option")).not.toContainText("old car");
});

for (const english of [false, true]) test(`transport details deliberately switch the displayed second leg to transit: ${english ? "EN dark" : "KO light"}`, async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(en => {
    localStorage.setItem("wave-locale", en ? "en" : "ko");
    localStorage.setItem("wave-theme", en ? "dark" : "light");
  }, english);
  const calls: URL[] = [];
  await page.route("**/api/route?*", request => {
    const url = new URL(request.request().url()); calls.push(url);
    const response = bundle(url.searchParams.get("mode") || "");
    return request.fulfill({ json: response });
  });
  await page.goto("/planner");
  if (english) {
    await page.getByRole("button", { name: "Changwon", exact: true }).click();
    await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
    await page.getByRole("button", { name: /Nature and relaxation/ }).click();
    await page.getByRole("button", { name: "Find places →", exact: true }).click();
  } else await chooseTripConditions(page);
  for (const place of plan.places) await page.getByRole("button", { name: `${place.name} ${english ? "Add to itinerary" : "일정에 추가"}`, exact: true }).click();
  const coverage = page.locator(".itinerary-route-coverage"), mode = coverage.locator("select");
  await mode.selectOption("car");
  await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
  await coverage.getByRole("button", { name: english ? "Check all journeys" : "모든 구간 조회하기", exact: true }).click();
  const journeys = coverage.getByRole("button", { name: english ? "Show this journey" : "이 구간 지도에서 보기", exact: true });
  await expect(journeys).toHaveCount(2);
  await expect(coverage.locator(".coverage-actions > button").first()).toHaveAttribute("aria-busy", "false");
  await journeys.nth(1).click();
  const before = calls.length;
  await page.locator(".transport-details > summary").click();
  const panel = page.locator(".transport-data-panel");
  await expect(panel).toContainText(english ? "Select public transport to check bus and rail information for this journey." : "이 구간의 버스·철도 정보를 확인하려면 대중교통을 선택하세요.");
  expect(calls).toHaveLength(before);
  if (!test.info().project.name.startsWith("mobile")) await page.setViewportSize({ width: english ? 1440 : 960, height: 900 });
  await panel.scrollIntoViewIfNeeded();
  expect((await new AxeBuilder({ page }).include(".transport-data-panel").analyze()).violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("transport-mode-scope.png") });
  const action = panel.getByRole("button");
  await expect(action).toHaveText(english ? "Select public transport" : "대중교통으로 확인");
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(mode).toHaveValue("transit");
  // Changing the global mode requests this displayed leg immediately, then
  // refreshes each itinerary leg once. Both phases must keep their endpoints.
  await expect.poll(() => calls.length).toBe(before + 3);
  const changedModeCalls = calls.slice(before);
  expect(changedModeCalls.every(url => url.searchParams.get("mode") === "transit")).toBe(true);
  expect(changedModeCalls[0].searchParams.get("startLng")).toBe(plan.places[0].mapX);
  expect(changedModeCalls[0].searchParams.get("endLng")).toBe(plan.places[1].mapX);
  expect(changedModeCalls.slice(1).map(url => [url.searchParams.get("startLng"), url.searchParams.get("endLng")]).sort()).toEqual([
    ["128.6982", plan.places[0].mapX],
    [plan.places[0].mapX, plan.places[1].mapX],
  ].sort());
  await expect(coverage.getByRole("status")).toContainText(english ? "2 of 2 journeys found" : "전체 2구간 중 2구간 확인");
  await expect(coverage.locator(".coverage-actions > button").first()).toHaveAttribute("aria-busy", "false");
  await expect(action).toHaveAttribute("aria-busy", "false");
  await expect(action).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => calls.length).toBe(before + 4);
  expect(calls.at(-1)?.searchParams.get("startLng")).toBe(plan.places[0].mapX);
  expect(calls.at(-1)?.searchParams.get("endLng")).toBe(plan.places[1].mapX);
});
