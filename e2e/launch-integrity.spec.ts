import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, openItinerary, plan, showItineraryMap } from "./fixtures";
import { confirmedAlternativePlan } from "./alternative-fixtures";
import { freshArrival, prepareLandingMedia, storyReady, expectUsableTarget } from "./landing-contract";
import { routeTools } from "./departure-fixtures";

function trackRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

const facilities = ["parking", "route", "wheelchair", "elevator", "restroom"];
const dates = { start: "2026-10-08", end: "2026-10-09" };
const itineraryTab = (page: Page) => page.locator(".simple-planner-tabs").getByRole("button", { name: /^내 일정/ });
const add = (page: Page, name: string) => page.getByRole("button", { name: `${name} 일정에 담기`, exact: true });
async function current(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    return {
      ids: JSON.parse(values["wave-saved-places"] || "[]"),
      schedule: JSON.parse(values["wave-trip-schedule-v1"] || "{}"),
      facilities: JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]"),
    };
  });
}
async function timeboard(page: Page) {
  const view = page.getByRole("group", { name: "일정 보기 방식", exact: true });
  if (await view.isVisible()) await view.getByRole("button", { name: "시간표", exact: true }).click();
}
async function changeVisitDay(page: Page, name: string, day: string) {
  await timeboard(page);
  await page.getByRole("button", { name: `${name} 일정 수정`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `${name} 수정`, exact: true });
  await dialog.getByRole("combobox", { name: "방문 날짜", exact: true }).selectOption(day);
  await dialog.getByRole("button", { name: "적용", exact: true }).click();
}
async function openDeparture(page: Page) {
  const details = page.locator(".simple-departure");
  if (await details.getAttribute("open") === null) await details.locator(":scope > summary").click();
  await expect(page.locator(".simple-readiness")).toBeVisible();
}
const readinessItem = (page: Page, label: string) => page.locator(".simple-readiness > details").filter({ has: page.locator("summary strong", { hasText: label }) });
function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
});

test("first visit stays neutral with optional conditions and locked unsearched results", async ({ page }) => {
  const requests: URL[] = [];
  await mockPlannerApi(page, { preserveView: true });
  page.on("request", request => { if (request.url().includes("action=plan")) requests.push(new URL(request.url())); });
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "어디로 갈까요?", exact: true })).toBeVisible();
  const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(region).toHaveValue("");
  await expect(page.getByRole("group", { name: "하고 싶은 활동", exact: true }).locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator(".simple-facility-trigger")).toBeEnabled();
  await expect(page.locator(".simple-planner-tabs button")).toHaveCount(2);
  await expect(itineraryTab(page)).toBeDisabled();
  await expect(page.locator(".simple-results")).toHaveCount(0);
  expect(requests).toEqual([]);
  expect((await current(page)).facilities).toEqual([]);
  await region.selectOption("창원");
  await expect(add(page, "경남도립미술관")).toBeEnabled();
  expect(requests.length).toBeGreaterThan(0);
  for (const request of requests) {
    expect(request.searchParams.get("region")).toBe("창원");
    expect(request.searchParams.get("themes") || "").toBe("");
    expect(request.searchParams.get("facilityKeys") || "").toBe("");
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(itineraryTab(page)).toBeDisabled();
});

test("a returning user can open an existing device itinerary before refreshed search results arrive", async ({ page }) => {
  const legacy = { ...plan.places[0], id: "9901", name: "기존 저장 여행지", mapX: "128.6811", mapY: "35.2279", score: 60, knownFields: 1, source: "기존 저장 정보" };
  await mockPlannerApi(page, { preserveView: true, savedPlaces: [...plan.places, legacy] });
  let searches = 0, completedSearches = 0;
  const refreshedSearch = gate();
  await page.route("**/api/wave?action=plan*", async route => {
    searches++;
    await refreshedSearch.promise;
    await route.fallback();
  });
  page.on("response", response => { if (response.url().includes("action=plan") && response.status() === 200) completedSearches++; });
  await page.addInitScript(place => {
    localStorage.setItem("wave-saved-places", JSON.stringify([place.id]));
    localStorage.setItem("wave-saved-place-catalog-v1", JSON.stringify([place]));
    localStorage.setItem("wave-trip-schedule-v1", JSON.stringify({ travelStart: "2026-10-08", travelEnd: "2026-10-09", scheduleAssignments: { [place.id]: "2026-10-08" } }));
  }, legacy);
  await page.goto("/planner");
  await expect(itineraryTab(page)).toBeEnabled();
  await openItinerary(page);
  await expect(page.locator(".simple-stops > li")).toContainText("기존 저장 여행지");
  await expect(page.getByRole("button", { name: "기존 저장 여행지 일정 수정", exact: true })).toBeEnabled();
  // The saved city's automatic search may start, but its response must not be
  // a prerequisite for opening or editing the independently stored itinerary.
  await expect.poll(() => searches).toBeGreaterThan(0);
  expect(completedSearches).toBe(0);
  const before = await current(page);
  expect(before.ids).toEqual(["9901"]);
  expect(before.schedule).toMatchObject({ travelStart: dates.start, travelEnd: dates.end, scheduleAssignments: { "9901": dates.start } });
  refreshedSearch.release();
  await expect.poll(() => completedSearches).toBeGreaterThan(0);
  await page.locator(".simple-planner-tabs").getByRole("button", { name: "여행지 찾기", exact: true }).click();
  await chooseTripConditions(page);
  await expect(page.locator(".simple-results")).not.toContainText("기존 저장 여행지");
  await openItinerary(page);
  await expect(page.locator(".simple-stops > li")).toContainText("기존 저장 여행지");
  expect(await current(page)).toMatchObject({ ids: before.ids, schedule: before.schedule });
  await openDeparture(page);
  await expect(readinessItem(page, "장소 편의근거").locator("summary")).toContainText("확인할 정보 있음");
});

test("search failures stay visible and retry the same optional choices without relaxing required facilities", async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  let fail = true;
  const requests: URL[] = [];
  await page.route("**/api/wave?action=plan*", route => {
    requests.push(new URL(route.request().url()));
    return fail ? route.fulfill({ status: 503, json: { error: "여행 정보를 잠시 확인할 수 없습니다." } }) : route.fallback();
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  const results = page.locator(".simple-results");
  await expect(results.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue("창원");
  await expect(page.getByRole("button", { name: "자연·휴양", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect((await current(page)).facilities).toEqual(facilities);
  const failed = requests.at(-1)!.searchParams.toString();
  expect(requests.at(-1)!.searchParams.get("facilityKeys")?.split(",")).toEqual(facilities);
  fail = false;
  const response = page.waitForResponse(item => item.url().includes("action=plan") && item.status() === 200);
  await results.getByRole("button", { name: "같은 조건으로 다시 시도", exact: true }).click();
  await response;
  await expect(add(page, "경남도립미술관")).toBeEnabled();
  expect(requests.at(-1)!.searchParams.toString()).toBe(failed);
  expect((await current(page)).facilities).toEqual(facilities);
});

test("landing: intro exposes its message and an immediate keyboard dismissal", async ({ page }) => {
  const errors = trackRuntimeErrors(page);
  const width = test.info().project.name === "mobile-chromium" ? 390 : 1366;
  await page.setViewportSize({ width, height: 960 });
  await freshArrival(page);
  const scene = page.locator(".arrival-scene"), planning = page.locator(".landing-actions a");
  await expect(scene).toContainText("모두의 여행이 같은 출발선에 설 수 있도록");
  await expect(scene.getByRole("button", { name: "건너뛰기" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(scene).toBeHidden();
  await planning.focus(); await expect(planning).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.runFor(32);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  await expect(planning).toBeFocused();
  for (const element of await page.locator(".landing-hero-copy, .landing-hero h1, .landing-actions a").all()) {
    const box = (await element.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  }
  await page.screenshot({ path: test.info().outputPath(`intro-calm-${width}.png`) });
  await expectNoOverflow(page);
  expect(errors).toEqual([]);
});

for (const locale of ["ko", "en"] as const) test(`landing: ${locale} fresh reduced-motion sessions preserve keyboard focus and a real planning link`, async ({ page }) => {
  const errors = trackRuntimeErrors(page);
  await prepareLandingMedia(page);
  await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await storyReady(page);
  const scene = page.locator(".arrival-scene"), planning = page.locator(".landing-actions a");
  await expect(scene).toBeHidden();
  await expect(page.locator(":modal, [inert]:not(.horizon-chapter-backdrops > [aria-hidden=true]):not(.arrival-picture)")).toHaveCount(0);
  await expect(planning).toHaveAccessibleName(locale === "en" ? "Explore places" : "여행지 둘러보기");
  await expectUsableTarget(planning);
  for (const motion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion: motion });
    await expect(planning).toBeFocused();
    await expect(scene).toBeHidden();
  }
  await page.keyboard.press("Tab");
  await expect(planning).not.toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(planning).toBeFocused();
  await expect(page.getByRole("button", { name: /인트로|다시보기|Replay intro/ })).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include(".landing-hero").analyze()).violations).toEqual([]);
  await expectNoOverflow(page);
  await planning.press("Enter");
  await expect(page).toHaveURL(url => url.pathname === "/planner");
  expect(errors).toEqual([]);
});

test("one saved place does not complete the trip and the dialog contains keyboard focus", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  const trigger = page.getByRole("button", { name: "경남도립미술관 상세 보기", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "경남도립미술관", exact: true })).toBeFocused();
  for (let index = 0; index < 18; index++) {
    await page.keyboard.press(index % 2 ? "Shift+Tab" : "Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await add(page, "경남도립미술관").click();
  await openItinerary(page, dates);
  await expect(page.locator(".simple-stops > li")).toHaveCount(1);
  await openDeparture(page);
  // Saving a place and aggregate facility counts do not prove a usable trip.
  for (const label of ["이동 편의", "장소 편의근거"]) {
    await expect(readinessItem(page, label).locator("summary")).toContainText("확인할 정보 있음");
  }
  await expect(page.locator(".simple-stop-copy")).not.toContainText("%");
  expect((await current(page)).facilities).toEqual(facilities);
});

test("old dated stops are kept separately and never become new-date markers", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await add(page, "경남도립미술관").click();
  await openItinerary(page);
  await page.getByRole("button", { name: "여행 설정", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "여행 설정", exact: true });
  await settings.getByLabel("시작일", { exact: true }).fill("2026-10-14");
  await settings.getByRole("button", { name: "적용", exact: true }).click();
  const outside = page.locator(".simple-outside-dates");
  await expect(outside).toContainText("2026-10-08");
  await expect(outside).toContainText("경남도립미술관");
  await expect(page.locator(".simple-stops > li")).toHaveCount(0);
  expect((await current(page)).schedule.scheduleAssignments).toEqual({ "1001": "2026-10-08" });
  await showItineraryMap(page);
  await expect(page.locator(".simple-itinerary-map .leaflet-container")).toBeVisible();
  await expect(page.locator('.simple-itinerary-map .wave-map-icon.place[data-place-id="1001"]')).toHaveCount(0);
  await timeboard(page);
  await outside.getByRole("button", { name: "날짜 수정", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "경남도립미술관 수정", exact: true });
  await editor.getByRole("combobox", { name: "방문 날짜", exact: true }).selectOption("2026-10-14");
  await editor.getByRole("button", { name: "적용", exact: true }).click();
  await expect(page.locator(".simple-stops > li")).toHaveCount(1);
  expect((await current(page)).schedule.scheduleAssignments).toEqual({ "1001": "2026-10-14" });
  await showItineraryMap(page);
  await expect(page.locator('.simple-itinerary-map .wave-map-icon.place[data-place-id="1001"]')).toBeVisible();
});

for (const width of [280, 320, 390, 768, 1024, 1366, 1920, 2560]) {
  test(`neutral questions reflow at ${width}px without page overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 800 : 960 });
    await mockPlannerApi(page, { preserveView: true });
    await page.goto("/planner");
    await expect(page.getByRole("heading", { name: "어디로 갈까요?", exact: true })).toBeVisible();
    await expect(page.locator(".simple-region-discovery .simple-region h3")).toHaveText(["통영", "거제", "남해", "진주", "창원", "하동"]);
    await page.evaluate(() => document.fonts.ready);
    const header = await page.locator(".wave-header").boundingBox();
    const heading = await page.getByRole("heading", { name: "어디로 갈까요?", exact: true }).boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`questions-${width}.png`), fullPage: true });
  });
}

test("rain response runs a new search and preserves accessibility needs and saved places", async ({ page }) => {
  await mockPlannerApi(page, { savedPlaces: confirmedAlternativePlan.places });
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: confirmedAlternativePlan }));
  await page.route("**/api/weather?*", async (route) => route.fulfill({ json: {
    region: "창원", source: "기상 정보", updatedAt: "2026-09-05T09:00:00Z",
    current: { temperature: 23, apparent: 23, code: 61, label: "비", windMps: 2, precipitation: 3, isDay: true },
    days: [{ date: "2026-10-08", code: 61, label: "비", max: 24, min: 20, rainProbability: 80, rain: 3, snow: 0, uv: 2, advice: [] }], advice: [],
  } }));
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await add(page, "경남도립미술관").click();
  await openItinerary(page);
  const before = await current(page);
  await openDeparture(page);
  await page.locator("#layers > summary").click();
  const request = page.waitForRequest((item) => item.url().includes("action=plan") && new URL(item.url()).searchParams.get("themes") === "history");
  await page.getByRole("button", { name: /역사·문화 후보로 다시 찾기/ }).click();
  const comparison = page.getByRole("dialog", { name: "이곳만 바꿔 볼까요?", exact: true });
  await comparison.getByText("같은 편의로 문화 공간 찾기", { exact: true }).click();
  await comparison.getByRole("button", { name: "같은 편의로 후보 찾기", exact: true }).click();
  expect(new URL((await request).url()).searchParams.get("facilityKeys")?.split(",")).toEqual(facilities);
  await page.keyboard.press("Escape");
  await expect(page.locator(".simple-stops > li")).toContainText("경남도립미술관");
  expect(await current(page)).toEqual(before);
});

test("a confirmed crowd alternative replaces the itinerary instead of an unrelated map-only route", async ({ page }) => {
  await mockPlannerApi(page, { savedPlaces: confirmedAlternativePlan.places });
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: confirmedAlternativePlan }));
  await page.route("**/api/wave?action=crowd*", (route) => route.fulfill({ json: { crowd: { rate: 80, baseYmd: "20260905", place: "경남도립미술관" } } }));
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await add(page, "경남도립미술관").click();
  await openItinerary(page);
  await openDeparture(page);
  await page.locator("#layers > summary").click();
  await page.getByRole("button", { name: /용지호수공원.*교체 검토/ }).click();
  const comparison = page.getByRole("dialog", { name: "이곳만 바꿔 볼까요?", exact: true });
  await comparison.getByRole("button", { name: "용지호수공원 선택", exact: true }).click();
  await comparison.getByRole("button", { name: "선택한 장소로 교체", exact: true }).click();
  await expect(page.locator(".simple-stops > li")).toHaveCount(1);
  await expect(page.locator(".simple-stops > li")).toContainText("용지호수공원");
  await expect.poll(async () => (await current(page)).ids).toEqual(["1002"]);
  expect((await current(page)).schedule.scheduleAssignments).toEqual({ "1002": "2026-10-08" });
  expect((await current(page)).facilities).toEqual(facilities);
  await showItineraryMap(page);
  await expect(page.locator('.simple-itinerary-map .wave-map-icon.place[data-place-id="1002"]')).toBeVisible();
  await expect(page.locator('.simple-itinerary-map .wave-map-icon.place[data-place-id="1001"]')).toHaveCount(0);
});

test("every ordered leg needs current route evidence while departure access stays separately unverified", async ({ page }) => {
  const errors = trackRuntimeErrors(page);
  const width = test.info().project.name === "mobile-chromium" ? 390 : 1366;
  await page.setViewportSize({ width, height: 960 });
  await mockPlannerApi(page, { preserveView: true });
  const requests: URL[] = [];
  const museum = gate(), park = gate(), changedDays = gate();
  let daysChanged = false;
  await page.route("**/api/route?*", async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("mode") === "car") {
      requests.push(url);
      await (daysChanged ? changedDays.promise : url.searchParams.get("endLat") === "35.238" ? museum.promise : park.promise);
    }
    await route.fallback();
  });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await add(page, "경남도립미술관").click();
  await add(page, "용지호수공원").click();
  await openItinerary(page);
  const move = page.getByRole("button", { name: "경남도립미술관 같은 날 앞 순서로 이동", exact: true });
  if (await move.isEnabled()) await move.click();
  const coverage = await routeTools(page);
  expect((await current(page)).schedule).toMatchObject({ travelStart: dates.start, travelEnd: dates.end, scheduleAssignments: { "1001": dates.start, "1002": dates.start } });
  await expect(coverage.getByRole("listitem")).toHaveText([
    /2026-10-08 · 창원중앙역 → 경남도립미술관/,
    /2026-10-08 · 경남도립미술관 → 용지호수공원/,
  ]);
  await expect(coverage.getByRole("combobox", { name: "이동수단", exact: true })).toBeVisible();
  await coverage.getByLabel("이동수단", { exact: true }).selectOption("car");
  await expect.poll(() => requests.filter(url => url.searchParams.get("endLat") === "35.229").length).toBeGreaterThan(0);
  await expect(coverage.getByRole("status")).toHaveText("선택한 이동수단: 전체 2구간 중 0구간 확인");
  await openDeparture(page);
  const transport = readinessItem(page, "이동 경로·시간"), mobility = readinessItem(page, "이동 편의");
  await expect(transport.locator("summary")).toContainText("확인할 정보 있음");
  museum.release();
  await expect(coverage.getByRole("status")).toHaveText("선택한 이동수단: 전체 2구간 중 1구간 확인");
  await expect(coverage.getByRole("listitem").nth(1).locator(".coverage-leg-evidence")).toContainText("미확인");
  await expect(transport.locator("summary")).not.toContainText("조회한 정보 있음");
  park.release();
  await expect(coverage.getByRole("status")).toHaveText("선택한 이동수단: 전체 2구간 중 2구간 확인");
  expect(requests.some((url) => url.searchParams.get("startLat") === "35.238" && url.searchParams.get("startLng") === "128.691" && url.searchParams.get("endLat") === "35.229")).toBe(true);
  await expect(transport.locator("summary")).toContainText("조회한 정보 있음");
  await transport.locator("summary").click();
  await expect(transport.locator("p")).toContainText("전체 2구간 중 2구간을 확인했습니다");
  await expect(mobility.locator("summary")).toContainText("확인할 정보 있음");
  await mobility.locator("summary").click();
  await expect(mobility.locator("p")).toContainText("경로 시간이 있어도 접근 가능한 이동을 보장하지 않습니다");
  await expectNoOverflow(page);
  expect((await new AxeBuilder({ page }).include(".itinerary-route-coverage").analyze()).violations).toEqual([]);
  await coverage.screenshot({ path: test.info().outputPath(`all-journeys-${width}.png`) });
  await coverage.getByLabel("이동수단", { exact: true }).selectOption("transit");
  await expect(coverage.getByRole("status")).toHaveText("선택한 이동수단: 전체 2구간 중 0구간 확인");
  await expect(transport.locator("summary")).toContainText("확인할 정보 있음");
  // The changed date creates a new origin→park leg. Hold its fresh response so
  // the prior museum→park result cannot satisfy the new journey in the meantime.
  daysChanged = true;
  await changeVisitDay(page, "용지호수공원", dates.end);
  const beforeChanged = requests.length;
  await coverage.getByLabel("이동수단", { exact: true }).selectOption("car");
  await expect.poll(() => requests.slice(beforeChanged).filter(url => url.searchParams.get("endLat") === "35.229").length).toBeGreaterThan(0);
  await expect(coverage.getByRole("status")).toHaveText("선택한 이동수단: 전체 2구간 중 0구간 확인");
  await expect(coverage.getByRole("listitem").nth(1)).toContainText("2026-10-09 · 창원중앙역 → 용지호수공원");
  await expect(coverage.getByRole("listitem").nth(1)).not.toContainText("경남도립미술관 → 용지호수공원");
  const nextPark = requests.slice(beforeChanged).find(url => url.searchParams.get("endLat") === "35.229")!;
  expect([nextPark.searchParams.get("startLat"), nextPark.searchParams.get("startLng")]).toEqual(["35.2422", "128.6982"]);
  await expect(transport.locator("summary")).toContainText("확인할 정보 있음");
  changedDays.release();
  await expect(coverage.getByRole("status")).toHaveText("선택한 이동수단: 전체 2구간 중 2구간 확인");
  await expect(mobility.locator("summary")).toContainText("확인할 정보 있음");
  expect((await current(page)).schedule.scheduleAssignments).toEqual({ "1001": dates.start, "1002": dates.end });
  expect(errors).toEqual([]);
});

test("the itinerary tab unlocks dated journeys and the shared transport control after saving places", async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await expect(page.locator(".simple-stops > li")).toHaveCount(0);
  await expect(itineraryTab(page)).toBeDisabled();
  await chooseTripConditions(page);
  await expect(itineraryTab(page)).toBeDisabled();
  await add(page, "경남도립미술관").click();
  await add(page, "용지호수공원").click();
  await expect(itineraryTab(page)).toBeEnabled();
  await openItinerary(page);
  await changeVisitDay(page, "용지호수공원", dates.end);
  const coverage = await routeTools(page);
  await expect(coverage.getByRole("listitem")).toHaveText([
    /2026-10-08 · 창원중앙역 → 경남도립미술관/,
    /2026-10-09 · 창원중앙역 → 용지호수공원/,
  ]);
  await coverage.getByLabel("이동수단", { exact: true }).selectOption("car");
  await expect(coverage.getByRole("status")).toHaveText("선택한 이동수단: 전체 2구간 중 2구간 확인");
  expect((await current(page)).schedule).toMatchObject({ travelMode: "car", scheduleAssignments: { "1001": dates.start, "1002": dates.end } });
  await openDeparture(page);
  await expect(readinessItem(page, "이동 편의").locator("summary")).toContainText("확인할 정보 있음");
  expect((await new AxeBuilder({ page }).include("#itinerary").analyze()).violations).toEqual([]);
  await expectNoOverflow(page);
});

test("clearing the last theme invalidates previous results without locking an existing itinerary", async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  const nextResults = gate();
  const changedRequests: URL[] = [];
  let hold = false;
  await page.route("**/api/wave?action=plan*", async route => {
    const url = new URL(route.request().url());
    if (hold && !url.searchParams.get("themes")) { changedRequests.push(url); await nextResults.promise; }
    await route.fallback();
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await add(page, "경남도립미술관").click();
  const before = await current(page);
  hold = true;
  await page.getByRole("button", { name: "자연·휴양", exact: true }).click();
  await expect.poll(() => changedRequests.length).toBeGreaterThan(0);
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "true");
  await expect(add(page, "용지호수공원")).toBeDisabled();
  await expect(itineraryTab(page)).toBeEnabled();
  expect(await current(page)).toEqual(before);
  nextResults.release();
  await expect(add(page, "용지호수공원")).toBeEnabled();
  await expect(page.getByRole("group", { name: "하고 싶은 활동", exact: true }).locator('[aria-pressed="true"]')).toHaveCount(0);
  expect(changedRequests.at(-1)!.searchParams.get("facilityKeys")?.split(",")).toEqual(facilities);
  await openItinerary(page, dates);
  await expect(page.locator(".simple-stops > li")).toContainText("경남도립미술관");
  expect((await current(page)).ids).toEqual(["1001"]);
});
