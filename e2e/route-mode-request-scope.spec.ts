import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";
import { openPlannerMap, openRouteDetails, ensureMapView } from "./nearby-fixtures";

function bundle(mode: string, label = "fixture journey") {
  return { configured: mode === "car" || mode === "transit", providers: [], context: { nearbyStops: [], arrivals: [], korail: [], catalog: { trainCities: 0, expressTerminals: 0, intercityTerminals: 0 }, datasets: [] },
    alternatives: mode === "car" || mode === "transit" ? [{ id: `${mode}-${label}`, label, provider: mode === "car" ? "Kakao Mobility" : "ODsay", mode,
      configured: true, totalTime: 25, totalDistance: 8800, totalWalk: mode === "car" ? 0 : 300, payment: 0, transfers: 0, segments: [], geometry: [] }] : [],
  };
}

async function singlePublicJourney(page: Page) {
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openPlannerMap(page);
  await openRouteDetails(page);
  await expect(page.locator(".coverage-notice")).toContainText("조회가 끝났습니다.");
  await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
}

function requestedJourney(url: URL) {
  return Object.fromEntries(["mode", "startLat", "startLng", "endLat", "endLng"].map(key => [key, url.searchParams.get(key)]));
}

test("selected modes reach the request, and ordinary rendering makes no new route request", async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const calls: URL[] = [];
  await page.route("**/api/route?*", request => {
    const url = new URL(request.request().url()); calls.push(url);
    return request.fulfill({ json: bundle(url.searchParams.get("mode") || "") });
  });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  expect(calls).toHaveLength(0);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openPlannerMap(page);
  await openRouteDetails(page);
  const mode = page.locator(".itinerary-route-coverage select");
  await expect(mode).toHaveValue("transit");
  // One selected-map request and one automatic whole-itinerary request must
  // both settle. Ordinary rendering must not start a third request.
  await expect.poll(() => calls.map(url => url.searchParams.get("mode"))).toEqual(["transit", "transit"]);
  await expect(page.locator(".itinerary-route-coverage").getByRole("status")).toContainText("전체 1구간 중 1구간 확인");
  for (const value of ["car", "walk", "bicycle", "transit"]) {
    const count = calls.length;
    await mode.selectOption(value);
    // The map consumes this same itinerary leg's completed coverage bundle.
    // A mode change must make one request, never a duplicate selected-map call.
    await expect.poll(() => calls.length).toBe(count + 1);
    expect(calls.slice(count).map(requestedJourney)).toEqual([{
      mode: value, startLat: "35.2422", startLng: "128.6982", endLat: plan.places[0].mapY, endLng: plan.places[0].mapX,
    }]);
    await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".coverage-actions > button").first()).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".route-option")).toHaveCount(value === "car" || value === "transit" ? 1 : 0);
  }
  expect(calls.every(url => url.searchParams.get("startLng") === "128.6982")).toBe(true);
  expect(calls.every(url => url.searchParams.get("endLng") === plan.places[0].mapX)).toBe(true);
  await page.locator(".simple-itinerary-heading").scrollIntoViewIfNeeded();
  await page.keyboard.press("Control+Home");
  await page.clock.install();
  await page.clock.fastForward(1_000);
  expect(calls).toHaveLength(6);
  await expect(page.locator(".simple-stops > li")).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("switching modes cancels old coverage and cannot restore it by switching back", async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
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
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openPlannerMap(page);
  await openRouteDetails(page);
  const coverage = page.locator(".itinerary-route-coverage"), mode = coverage.locator("select");
  await mode.selectOption("car");
  await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
  const check = coverage.getByRole("button", { name: "모든 구간 조회하기", exact: true });
  await expect(coverage.getByRole("status")).toContainText("전체 1구간 중 1구간 확인");
  await expect(check).toHaveAttribute("aria-busy", "false");
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
  await mockPlannerApi(page, { preserveView: true });
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
  await chooseTripConditions(page);
  for (const place of plan.places) await page.getByRole("button", { name: `${place.name} ${english ? "add to itinerary" : "일정에 담기"}`, exact: true }).click();
  await openPlannerMap(page);
  await openRouteDetails(page);
  const coverage = page.locator(".itinerary-route-coverage"), mode = coverage.locator("select");
  await mode.selectOption("car");
  await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
  await coverage.getByRole("button", { name: english ? "Check all journeys" : "모든 구간 조회하기", exact: true }).click();
  const journeys = coverage.getByRole("button", { name: english ? "Show this journey" : "이 구간 지도에서 보기", exact: true });
  await expect(journeys).toHaveCount(2);
  await expect(coverage.locator(".coverage-actions > button").first()).toHaveAttribute("aria-busy", "false");
  await journeys.nth(1).click();
  const before = calls.length;
  await page.locator(".reference-transport-details > summary").click();
  await page.locator(".transport-details > summary").click();
  const panel = page.locator(".transport-data-panel");
  await expect(panel).toContainText(english ? "Select public transport to check bus and rail information for this journey." : "이 구간의 버스·철도 정보를 확인하려면 대중교통을 선택하세요.");
  expect(calls).toHaveLength(before);
  if (!test.info().project.name.startsWith("mobile")) await page.setViewportSize({ width: english ? 1440 : 960, height: 900 });
  await ensureMapView(page);
  await panel.scrollIntoViewIfNeeded();
  expect((await new AxeBuilder({ page }).include(".transport-data-panel").analyze()).violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("transport-mode-scope.png") });
  const action = panel.getByRole("button");
  await expect(action).toHaveText(english ? "Select public transport" : "대중교통으로 확인");
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(mode).toHaveValue("transit");
  // Each actual itinerary leg is checked once. The displayed second leg uses
  // that exact bundle, without requesting it twice or jumping to the first leg.
  await expect.poll(() => calls.length).toBe(before + 2);
  const changedModeCalls = calls.slice(before);
  expect(changedModeCalls.every(url => url.searchParams.get("mode") === "transit")).toBe(true);
  expect(changedModeCalls.map(url => [url.searchParams.get("startLat"), url.searchParams.get("startLng"), url.searchParams.get("endLat"), url.searchParams.get("endLng")]).sort()).toEqual([
    ["35.2422", "128.6982", plan.places[0].mapY, plan.places[0].mapX],
    [plan.places[0].mapY, plan.places[0].mapX, plan.places[1].mapY, plan.places[1].mapX],
  ].sort());
  await expect(coverage.getByRole("status")).toContainText(english ? "2 of 2 journeys found" : "전체 2구간 중 2구간 확인");
  await expect(coverage.locator(".coverage-actions > button").first()).toHaveAttribute("aria-busy", "false");
  await expect(action).toHaveAttribute("aria-busy", "false");
  await expect(action).toBeFocused();
  await expect(page.locator(".map-toolbar > button").nth(0)).toContainText(plan.places[0].name);
  await expect(page.locator(".map-toolbar > button").nth(1)).toContainText(plan.places[1].name);
  await page.keyboard.press("Enter");
  await expect.poll(() => calls.length).toBe(before + 3);
  expect(calls.at(-1)?.searchParams.get("startLng")).toBe(plan.places[0].mapX);
  expect(calls.at(-1)?.searchParams.get("endLng")).toBe(plan.places[1].mapX);
});

for (const outcome of ["empty", "failure"] as const) test(`a held mode coverage ${outcome} clears the old route and finishes with honest recovery`, async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const calls: URL[] = [];
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/route?*", async request => {
    const url = new URL(request.request().url()); calls.push(url);
    if (url.searchParams.get("mode") === "car") {
      await gate;
      return request.fulfill(outcome === "failure"
        ? { status: 503, json: { error: "Synthetic route provider unavailable" } }
        : { json: { ...bundle("car"), configured: false, alternatives: [] } });
    }
    return request.fulfill({ json: bundle("transit", "current public journey") });
  });
  try {
    await singlePublicJourney(page);
    expect(calls).toHaveLength(2);
    const mode = page.locator(".itinerary-route-coverage select");
    await expect(page.locator(".route-option")).toContainText("current public journey");
    await mode.selectOption("car");
    await expect.poll(() => calls.length).toBe(3);
    expect(requestedJourney(calls[2])).toEqual({ mode: "car", startLat: "35.2422", startLng: "128.6982", endLat: plan.places[0].mapY, endLng: plan.places[0].mapX });
    await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator(".route-option-skeleton")).toHaveCount(3);
    await expect(page.locator(".route-option")).toHaveCount(0);
    release();
    await expect(page.locator(".coverage-actions > button").first()).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".itinerary-route-coverage").getByRole("status")).toContainText("전체 1구간 중 0구간 확인");
    await expect(page.locator(".route-kakao-fallback")).toContainText("자동차 예상 시간을 확인하지 못했습니다.");
    await expect(page.locator(".route-option")).toHaveCount(0);
    await mode.selectOption("transit");
    await expect(page.locator(".route-option")).toContainText("current public journey");
    await page.clock.install(); await page.clock.runFor(1000);
    expect(calls.map(url => url.searchParams.get("mode"))).toEqual(["transit", "transit", "car", "transit"]);
    await expect(page.locator(".simple-stops > li")).toHaveCount(1);
  } finally { release(); }
});

test("a separate map-picked destination keeps its own exact request when the itinerary transport changes", async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const calls: URL[] = [];
  await page.route("**/api/route?*", request => {
    const url = new URL(request.request().url()); calls.push(url);
    const mode = url.searchParams.get("mode") || "";
    return request.fulfill({ json: bundle(mode, `${mode} to ${url.searchParams.get("endLng")}`) });
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  for (const place of plan.places) await page.getByRole("button", { name: `${place.name} 일정에 담기`, exact: true }).click();
  await openPlannerMap(page);
  await openRouteDetails(page);
  await expect(page.locator(".coverage-notice")).toContainText("조회가 끝났습니다.");
  await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
  expect(calls).toHaveLength(3);
  const destination = page.locator(".map-toolbar > button").nth(1);
  await destination.click();
  const picker = page.locator(".trip-point-picker");
  // Picking the second saved place directly makes a distinct station-to-lake
  // journey. The itinerary's second leg is museum-to-lake and cannot replace it.
  await picker.getByRole("button", { name: new RegExp(plan.places[1].name) }).click();
  await expect(destination).toContainText(plan.places[1].name);
  await expect(page.locator(".route-option")).toContainText(`transit to ${plan.places[1].mapX}`);
  expect(calls).toHaveLength(4);
  await page.locator(".itinerary-route-coverage select").selectOption("car");
  await expect.poll(() => calls.length).toBe(7);
  expect(calls.slice(4).map(requestedJourney)).toEqual([
    { mode: "car", startLat: "35.2422", startLng: "128.6982", endLat: plan.places[1].mapY, endLng: plan.places[1].mapX },
    { mode: "car", startLat: "35.2422", startLng: "128.6982", endLat: plan.places[0].mapY, endLng: plan.places[0].mapX },
    { mode: "car", startLat: plan.places[0].mapY, startLng: plan.places[0].mapX, endLat: plan.places[1].mapY, endLng: plan.places[1].mapX },
  ]);
  await expect(page.locator(".route-option")).toContainText(`car to ${plan.places[1].mapX}`);
  await expect(page.locator(".map-toolbar > button").nth(0)).toContainText("창원중앙역");
  await expect(destination).toContainText(plan.places[1].name);
  await expect(page.locator(".coverage-actions > button").first()).toHaveAttribute("aria-busy", "false");
  await page.locator(".recalculate-button").click();
  await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
  await page.clock.install(); await page.clock.runFor(1000);
  expect(calls).toHaveLength(8);
  expect(requestedJourney(calls[7])).toEqual(requestedJourney(calls[4]));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001", "1002"]);
});

test("changing transport with a private device origin never sends or stores its coordinates", async ({ page, context }) => {
  const position = { latitude: 35.12345678, longitude: 128.87654321 };
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(position);
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const routeCalls: string[] = [], apiCalls: string[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/")) apiCalls.push(request.url() + (request.postData() || ""));
    if (url.pathname === "/api/route") routeCalls.push(request.url());
  });
  await singlePublicJourney(page);
  const before = [...routeCalls];
  let consent = "";
  page.once("dialog", async dialog => { consent = dialog.message(); await dialog.accept(); });
  await page.locator(".map-command-bar").getByRole("button", { name: "◎ 내 위치", exact: true }).click();
  await expect(page.locator(".map-toolbar > button").nth(0)).toContainText("현재 위치");
  expect(consent).toContain("공개 출발 거점");
  await page.clock.install();
  for (const mode of ["car", "walk", "transit"]) {
    await page.locator(".itinerary-route-coverage select").selectOption(mode);
    await page.clock.runFor(1000);
    await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".route-option")).toHaveCount(0);
    await expect(page.locator(".itinerary-route-coverage")).toContainText("현재 위치는 전송하지 않습니다.");
    expect(routeCalls).toEqual(before);
  }
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  const externalLinks = await page.locator(".route-kakao-fallback a").evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href).join(" "));
  for (const coordinate of Object.values(position).map(String)) {
    expect(apiCalls.join(" ")).not.toContain(coordinate);
    expect(storage).not.toContain(coordinate);
    expect(externalLinks).not.toContain(coordinate);
  }
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
});

test("a mode change completed while browsing is already usable when returning to the itinerary map", async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const calls: URL[] = [];
  await page.route("**/api/route?*", request => {
    const url = new URL(request.request().url()); calls.push(url);
    const mode = url.searchParams.get("mode") || "";
    return request.fulfill({ json: bundle(mode, `${mode} current journey`) });
  });
  await page.route("**/api/assistant", request => request.fulfill({ json: request.request().method() === "GET"
    ? { available: true }
    : { reply: "자동차 이동으로 바꿀게요.", proposal: { action: "recalculate-route", transport: "car" } } }));
  await singlePublicJourney(page);
  expect(calls).toHaveLength(2);
  const views = page.getByRole("group", { name: "여행 설계 화면", exact: true });
  await views.getByRole("button", { name: "여행지 찾기", exact: true }).click();
  await page.getByRole("button", { name: "WAVE 여행 가이드 나루와 대화 열기", exact: true }).click();
  const chat = page.getByRole("dialog", { name: "WAVE 여행 가이드 나루와 대화", exact: true });
  await chat.getByRole("textbox").fill("자동차로 이동할게.");
  await chat.getByRole("textbox").press("Enter");
  const confirm = chat.getByRole("button", { name: "자동차 이동 경로 확인 · 기존 일정 유지", exact: true });
  await expect(confirm).toBeEnabled();
  await expect(page.locator(".itinerary-route-coverage select")).toHaveValue("transit");
  expect(calls).toHaveLength(2);
  await confirm.click();
  await expect(page.locator(".itinerary-route-coverage select")).toHaveValue("car");
  await expect.poll(() => calls.length).toBe(3);
  await expect(page.locator(".coverage-actions > button").first()).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".coverage-notice")).toContainText("조회가 끝났습니다.");
  await chat.getByRole("button", { name: "나루 대화 닫기", exact: true }).click();
  await expect(views.getByRole("button", { name: "여행지 찾기", exact: true })).toHaveAttribute("aria-pressed", "true");
  await views.getByRole("button", { name: /^내 일정/ }).click();
  await ensureMapView(page);
  await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".route-option")).toContainText("car current journey");
  await page.clock.install(); await page.clock.runFor(1000);
  expect(calls.map(url => url.searchParams.get("mode"))).toEqual(["transit", "transit", "car"]);
  await expect(page.locator(".map-toolbar > button").nth(1)).toContainText(plan.places[0].name);
});
