import { openNaruTool, naruDialog } from './naru-tool-fixtures';
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, openItinerary } from "./fixtures";
import { confirmedAlternativePlan } from "./alternative-fixtures";
import AxeBuilder from "@axe-core/playwright";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on("pageerror", error => messages.push(error.message));
  page.on("console", message => { if (message.type() === "error") messages.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

async function prepare(page: Page, en = false, crowdRate?: number) {
  await page.setViewportSize({ width: test.info().project.name === "mobile-chromium" ? 390 : 1366, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true, crowdRate, savedPlaces: confirmedAlternativePlan.places });
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: { ...confirmedAlternativePlan, crowd: { ...confirmedAlternativePlan.crowd, rate: crowdRate ?? confirmedAlternativePlan.crowd.rate } } }));
  await page.addInitScript(value => localStorage.setItem("wave-locale", value), en ? "en" : "ko");
  await page.goto("/planner");
  const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(region).toBeEnabled();
  await page.getByRole("group", { name: "하고 싶은 활동", exact: true }).getByRole("button", { name: "자연·휴양", exact: true }).click();
  await page.getByRole("button", { name: "필요한 편의", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "필요한 편의", exact: true });
  for (const name of ["장애인 주차구역", "접근로", "휠체어 대여", "승강기", "장애인 화장실"]) await picker.getByRole("checkbox", { name, exact: true }).check();
  await picker.getByRole("button", { name: "적용 · 5개", exact: true }).click();
  return region;
}

async function collectMuseum(page: Page, en: boolean) {
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await page.getByRole("button", { name: en ? "경남도립미술관 add to itinerary" : "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page, { start: "2026-09-20" });
}
async function openSignals(page: Page) {
  await openNaruTool(page, "출발 전 확인");
  const weather = page.locator(".simple-readiness details").filter({ has: page.locator("summary strong").getByText("날씨", { exact: true }) });
  await weather.locator("summary").click();
  await weather.getByRole("link", { name: "상세 정보 확인 →", exact: true }).click();
  await expect(page.locator("#layers")).toHaveAttribute("open");
  await expect(page).toHaveURL(/#layers$/);
}
async function tripSnapshot(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    return { places: values["wave-saved-places"], order: values["wave-trip-order-v1"], schedule: values["wave-trip-schedule-v1"], facilities: sessionStorage.getItem("wave-session-facilities-v1") };
  });
}

for (const en of [false, true]) {
test("weather alternative search keeps focus in comparison without changing the current trip " + (en ? "English" : "Korean"), async ({ page }) => {
  await prepare(page, en);
  await page.route("**/api/weather?*", route => route.fulfill({ json: {
    region: "창원", source: "Open-Meteo", updatedAt: "2026-09-20T00:00:00Z",
    current: { temperature: 23, apparent: 23, code: 61, label: "비", windMps: 2, precipitation: 3, isDay: true },
    days: [{ date: "2026-09-20", code: 61, label: "비", max: 24, min: 20, rainProbability: 80, rain: 3, snow: 0, uv: 2, advice: [] }], advice: [],
  } }));
  await collectMuseum(page, en);
  await openSignals(page);
  const before = await tripSnapshot(page);
  const trigger = page.getByRole("button", { name: en ? "Find history and culture alternatives" : "역사·문화 후보로 다시 찾기", exact: true });
  await expect(trigger).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/wave?*", async route => {
    if (new URL(route.request().url()).searchParams.get("action") === "plan") await gate;
    await route.fallback();
  });
  await trigger.focus(); await trigger.press("Enter");
  const comparison = page.getByRole("dialog", { name: "이곳만 바꿔 볼까요?", exact: true });
  await expect(comparison.getByRole("heading", { level: 2 })).toBeFocused();
  await comparison.getByText("같은 편의로 문화 공간 찾기", { exact: true }).click();
  const compareSearch = comparison.getByRole("button", { name: "같은 편의로 후보 찾기", exact: true });
  await compareSearch.focus(); await compareSearch.press("Enter");
  try {
    await expect(comparison).toBeVisible();
    await expect(page).toHaveURL(/#layers$/);
    expect(await tripSnapshot(page)).toEqual(before);
  } finally { release(); }
  await expect(compareSearch).toBeEnabled();
  await expect(comparison).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/#layers$/);
  expect(await tripSnapshot(page)).toEqual(before);
});

for (const action of ["nearby", "alternative"] as const) test("departure " + action + " selection focuses the itinerary and preserves browser history " + (en ? "English" : "Korean"), async ({ page }) => {
  await prepare(page, en, 84);
  await page.route("**/api/wave?*", async route => {
    if (new URL(route.request().url()).searchParams.get("action") !== "enrich") return route.fallback();
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      generatedAt: "2026-09-20T00:00:00Z", visitor: { total: 0, byType: {}, startYmd: "", endYmd: "" }, demand: [],
      camping: [], pet: [], wellness: [], medical: [], language: [], awards: [], water: [], rests: [], lodging: [], statuses: [],
      events: [{ id: "1003", title: "창원 문화 행사", mapX: "128.68", mapY: "35.23", address: "경남 창원시", tag: "행사", source: "한국관광공사", image: "", summary: "지역 행사" }],
    }) });
  });
  await collectMuseum(page, en);
  await openSignals(page);
  const trigger = action === "nearby"
    ? page.locator(".rich-card").getByRole("button", { name: en ? "View route on the map ↗" : "지도에서 경로 보기 ↗", exact: true })
    : page.getByRole("button", { name: en ? "Compare replacing with 용지호수공원" : "용지호수공원(으)로 교체 검토", exact: true });
  await expect(trigger).toBeVisible();
  await trigger.focus();
  if (action === "nearby") page.once("dialog", dialog => dialog.accept());
  await trigger.press("Enter");
  if (action === "alternative") {
    const comparison = page.getByRole("dialog", { name: "이곳만 바꿔 볼까요?", exact: true });
    await expect(comparison.getByRole("heading", { level: 2 })).toBeFocused();
    await comparison.getByRole("button", { name: "용지호수공원 선택", exact: true }).click();
    await comparison.getByRole("button", { name: "선택한 장소로 교체", exact: true }).click();
  }
  const heading = page.locator("#itinerary-stage-title");
  // A committed choice returns to the timetable; an open modal would keep
  // that background heading inert even after the URL changes.
  await expect(naruDialog(page)).toBeHidden();
  await expect(heading).toBeFocused();
  await expect(page).toHaveURL(/#itinerary$/);
  await expect(page.locator(".simple-stops > li")).toHaveCount(action === "nearby" ? 2 : 1);
  await expect(page.locator(".simple-timeboard")).toContainText(action === "nearby" ? "창원 문화 행사" : "용지호수공원");
  await expect(page.locator(".simple-timeboard")).toBeVisible();
  await expect(page.locator(".simple-itinerary-heading")).toContainText("2026-09-20");
  await expect(heading).toBeFocused();
  await expect.poll(() => heading.evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= innerHeight;
  })).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(/#layers$/);
  await expect(naruDialog(page)).toBeVisible();
  await expect(page.locator("#layers > summary")).toBeFocused();
});

test("keyboard region selection updates results without stealing input focus or adding history " + (en ? "English" : "Korean"), async ({ page }) => {
  const region = await prepare(page, en);
  const before = { url: page.url(), history: await page.evaluate(() => history.length) };
  await region.focus();
  await region.press("Home"); await region.press("ArrowDown"); await region.press("Enter");
  await expect(region).toHaveValue("창원");
  await expect(page.locator("#places")).toBeVisible();
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("#places .simple-results h2").first()).toHaveText(en ? "창원 places" : "창원 여행지");
  await expect(region).toBeFocused();
  const expectedUrl = new URL(before.url);
  expectedUrl.searchParams.set("region", "창원");
  expect(page.url()).toBe(expectedUrl.toString());
  expect(await page.evaluate(() => history.length)).toBe(before.history);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("search-results-visible.png") });
});

test("a delayed automatic search does not hide the itinerary the user returned to " + (en ? "English" : "Korean"), async ({ page }) => {
  await prepare(page, en);
  await collectMuseum(page, en);
  await page.locator(".wave-header").locator(".night-search-link").click();
  const before = await tripSnapshot(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started = false;
  await page.route("**/api/wave?*", async route => {
    if (new URL(route.request().url()).searchParams.get("action") === "plan") { started = true; await gate; }
    await route.fallback();
  });
  const activity = page.getByRole("group", { name: "하고 싶은 활동", exact: true }).getByRole("button", { name: "역사·문화", exact: true });
  await activity.focus(); await activity.press("Enter");
  await expect.poll(() => started).toBe(true);
  try {
    const itinerary = page.locator(".wave-header").locator(".wave-my-trips");
    await itinerary.focus(); await itinerary.press("Enter");
    await expect(page.locator("#itinerary-stage-title")).toBeFocused();
  } finally { release(); }
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("#itinerary-stage-title")).toBeVisible();
  await expect(page.locator("#itinerary-stage-title")).toBeFocused();
  await expect(page.locator(".simple-browse-view")).toBeHidden();
  await expect(page).toHaveURL(/#itinerary$/);
  expect(await tripSnapshot(page)).toEqual(before);
});

test("keyboard itinerary tab focuses its displayed heading and keeps explicitly applied dates " + (en ? "English" : "Korean"), async ({ page }) => {
  await prepare(page, en);
  await collectMuseum(page, en);
  const before = await tripSnapshot(page);
  const tabs = page.locator(".wave-header");
  await tabs.locator(".night-search-link").click();
  const itinerary = tabs.locator(".wave-my-trips");
  await itinerary.focus(); await itinerary.press("Enter");
  await expect(page.locator("#itinerary")).toBeVisible();
  await expect(page.locator("#itinerary-stage-title")).toBeFocused();
  expect(await tripSnapshot(page)).toEqual(before);
});

test("a pending automatic search keeps keyboard input usable and does not duplicate an unchanged request " + (en ? "English" : "Korean"), async ({ page }) => {
  const region = await prepare(page, en);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  await page.route("**/api/wave?*", async route => {
    if (new URL(route.request().url()).searchParams.get("action") === "plan") { requests++; await gate; }
    await route.fallback();
  });
  await region.focus();
  await region.press("Home"); await region.press("ArrowDown"); await region.press("Enter");
  await expect(region).toHaveValue("창원");
  try {
    await expect.poll(() => requests).toBe(1);
    await expect(region).toBeFocused();
    await expect(region).toBeEnabled();
    await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "true");
    await region.press("Enter");
    expect(requests).toBe(1);
  } finally { release(); }
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("button", { name: en ? "경남도립미술관 add to itinerary" : "경남도립미술관 일정에 담기", exact: true })).toBeEnabled();
  await expect(region).toBeFocused();
  expect(requests).toBe(1);
});

for (const end of ["cancel", "complete", "elsewhere"] as const) test("all-journey " + end + " preserves the user's focus " + (en ? "English" : "Korean"), async ({ page }) => {
  await prepare(page, en);
  await collectMuseum(page, en);
  await openNaruTool(page, '이동 구간 확인');
  const coverage = page.locator(".itinerary-route-coverage");
  const transport = coverage.getByRole("combobox");
  await transport.selectOption("car");
  const check = coverage.locator(".coverage-actions button").first();
  await expect(coverage.getByRole("status")).toHaveText(en ? "1 of 1 journeys found for this transport" : "선택한 이동수단: 전체 1구간 중 1구간 확인");
  await expect(check).toHaveAttribute("aria-busy", "false");
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  await page.route("**/api/route?*", async route => { requests++; await gate; await route.fallback(); });
  await check.focus();
  await check.press("Enter");
  try {
    await expect.poll(() => requests).toBe(1);
    await expect(check).toBeFocused();
    await expect(check).toHaveAttribute("aria-disabled", "true");
    await check.press("Enter");
    expect(requests).toBe(1);
    await check.press("Tab");
    const cancel = coverage.getByRole("button", { name: en ? "Cancel" : "확인 중단", exact: true });
    await expect(cancel).toBeFocused();
    if (end === "cancel") await cancel.press("Enter");
    if (end === "elsewhere") await transport.focus();
  } finally { release(); }
  await expect(check).toHaveAttribute("aria-busy", "false");
  if (end === "elsewhere") await expect(transport).toBeFocused();
  else await expect(check).toBeFocused();
  if (end === "cancel") {
    await expect(coverage.getByRole("status")).toHaveText(en ? "0 of 1 journeys found for this transport" : "선택한 이동수단: 전체 1구간 중 0구간 확인");
    await expect(coverage.getByRole("button", { name: en ? "Show this journey" : "이 구간 지도에서 보기", exact: true })).toBeDisabled();
    await check.press("Enter");
  }
  await expect(coverage.getByRole("status")).toHaveText(en ? "1 of 1 journeys found for this transport" : "선택한 이동수단: 전체 1구간 중 1구간 확인");
  expect((await new AxeBuilder({ page }).include(".itinerary-route-coverage").analyze()).violations).toEqual([]);
});
}
