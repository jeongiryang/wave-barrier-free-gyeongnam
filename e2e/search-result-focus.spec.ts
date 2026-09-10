import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
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
  await mockPlannerApi(page, { plannerView: "guided", crowdRate });
  await page.addInitScript(value => localStorage.setItem("wave-locale", value), en ? "en" : "ko");
  await page.goto("/planner");
  await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>(".journey-mode-toggle button")?.disabled);
  await page.getByRole("group", { name: en ? "Choose a region" : "여행 지역 선택", exact: true }).getByRole("button", { name: en ? "Changwon" : "창원", exact: true }).click();
  const next = page.locator(".condition-actions").getByRole("button", { name: en ? "Continue →" : "다음 →", exact: true });
  await next.click();
  await page.getByRole("button", { name: en ? /Wheelchair facilities/ : /휠체어 편의시설/ }).click();
  await next.click();
  await page.getByRole("button", { name: en ? /Nature/ : /자연·휴양 공원/ }).click();
  await next.click();
  return page.locator(".condition-actions").getByRole("button").last();
}

for (const en of [false, true]) {
test(`weather alternative search keeps focus during the return to conditions ${en ? "English" : "Korean"}`, async ({ page }) => {
  const search = await prepare(page, en);
  const date = await page.locator('input[type="date"]').first().inputValue();
  await page.route("**/api/weather?*", route => route.fulfill({ json: {
    region: "창원", source: "Open-Meteo", updatedAt: "2026-09-07T00:00:00Z",
    current: { temperature: 23, apparent: 23, code: 61, label: "비", wind: 2, precipitation: 3, isDay: true },
    days: [{ date, code: 61, label: "비", max: 24, min: 20, rainProbability: 80, rain: 3, snow: 0, uv: 2, advice: [] }], advice: [],
  } }));
  await search.click();
  await page.getByRole("button", { name: en ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가", exact: true }).click();
  await page.locator(".journey-rail nav button").last().click();
  await page.getByRole("button", { name: en ? "Refresh places and weather" : "장소·날씨 다시 조회", exact: true }).click();
  await page.locator("#layers > summary").click();
  const trigger = page.getByRole("button", { name: en ? "Find history and culture alternatives" : "역사·문화 후보로 다시 찾기", exact: true });
  await expect(trigger).toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/wave?*", async route => {
    if (new URL(route.request().url()).searchParams.get("action") === "plan") await gate;
    await route.fallback();
  });
  await trigger.focus(); await trigger.press("Enter");
  try {
    await expect(page.locator(".condition-heading")).toBeFocused();
    await expect(page).toHaveURL(/#conditions$/);
  } finally { release(); }
  await expect(page.locator("#places h2").first()).toBeFocused();
  await expect(page).toHaveURL(/#places$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
});

for (const action of ["nearby", "alternative"] as const) test(`departure ${action} selection focuses the itinerary and preserves browser history ${en ? "English" : "Korean"}`, async ({ page }) => {
  const search = await prepare(page, en, 84);
  await page.route("**/api/wave?*", async route => {
    if (new URL(route.request().url()).searchParams.get("action") !== "enrich") return route.fallback();
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      generatedAt: "2026-09-07T00:00:00Z", visitor: { total: 0, byType: {}, startYmd: "", endYmd: "" }, demand: [],
      camping: [], pet: [], wellness: [], medical: [], language: [], awards: [], water: [], rests: [], lodging: [], statuses: [],
      events: [{ id: "1003", title: "창원 문화 행사", mapX: "128.68", mapY: "35.23", address: "경남 창원시", tag: "행사", source: "한국관광공사", image: "", summary: "지역 행사" }],
    }) });
  });
  await search.click();
  await page.getByRole("button", { name: en ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가", exact: true }).click();
  await page.locator(".journey-rail nav button").last().click();
  await expect(page).toHaveURL(/#departure-readiness$/);
  await page.locator("#layers > summary").click();
  const trigger = action === "nearby"
    ? page.locator(".rich-card").getByRole("button", { name: "지도에서 경로 보기 ↗", exact: true })
    : page.getByRole("button", { name: en ? "Compare replacing with 용지호수공원" : "용지호수공원(으)로 교체 검토", exact: true });
  await expect(trigger).toBeVisible();
  await trigger.focus();
  page.once("dialog", dialog => dialog.accept());
  await trigger.press("Enter");
  const heading = page.locator("#itinerary-stage-title");
  await expect(heading).toBeFocused();
  await expect(page).toHaveURL(/#itinerary$/);
  await expect(page.locator(".day-planner-grid li")).toHaveCount(action === "nearby" ? 2 : 1);
  await expect(page.locator(".day-planner-grid")).toContainText(action === "nearby" ? "창원 문화 행사" : "용지호수공원");
  await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
  await expect(heading).toBeFocused();
  await expect.poll(() => heading.evaluate(element => {
    const box = element.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= innerHeight;
  })).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(/#departure-readiness$/);
  await expect(page.locator("#departure-readiness h2").first()).toBeFocused();
});

test(`keyboard search moves focus to the displayed results and synchronizes the URL ${en ? "English" : "Korean"}`, async ({ page }) => {
  const search = await prepare(page, en);
  await search.focus();
  await search.press("Enter");
  await expect(page.locator("#places")).toBeVisible();
  await expect(page.locator("#places h2").first()).toBeFocused();
  await expect(page).toHaveURL(/#places$/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("#places h2").first()).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("search-results-visible.png") });
  await page.goBack();
  await expect(page.locator(".condition-heading")).toBeFocused();
  await expect(page).toHaveURL(/question=3#conditions$/);
});

test(`a delayed search does not hide the question the user returned to ${en ? "English" : "Korean"}`, async ({ page }) => {
  const search = await prepare(page, en);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started = false;
  await page.route("**/api/wave?*", async route => {
    if (new URL(route.request().url()).searchParams.get("action") === "plan") { started = true; await gate; }
    await route.fallback();
  });
  await search.focus();
  await search.press("Enter");
  await expect.poll(() => started).toBe(true);
  await page.locator(".condition-progress button").first().click();
  const heading = page.getByRole("heading", { name: en ? "Where would you like to go?" : "어디로 갈까요?", exact: true });
  await expect(heading).toBeFocused();
  release();
  await expect(page.locator(".journey-rail nav button").nth(1)).toBeEnabled();
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page).toHaveURL(/question=0#conditions$/);
});

test(`keyboard next step focuses the displayed itinerary heading ${en ? "English" : "Korean"}`, async ({ page }) => {
  const search = await prepare(page, en);
  await search.click();
  await page.getByRole("button", { name: en ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가", exact: true }).click();
  const next = page.getByRole("button", { name: en ? /Next: Itinerary/ : /다음: 내 일정/ });
  await next.focus();
  await next.press("Enter");
  await expect(page.locator("#itinerary")).toBeVisible();
  await expect(page.locator("#itinerary-stage-title")).toBeFocused();
});

test(`a pending search keeps its keyboard focus ${en ? "English" : "Korean"}`, async ({ page }) => {
  const search = await prepare(page, en);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started = false;
  let requests = 0;
  await page.route("**/api/wave?*", async route => {
    if (new URL(route.request().url()).searchParams.get("action") === "plan") { started = true; requests++; await gate; }
    await route.fallback();
  });
  await search.focus();
  await search.press("Enter");
  await expect.poll(() => started).toBe(true);
  try {
    await expect(search).toBeFocused();
    await expect(search).toHaveAttribute("aria-disabled", "true");
    await search.press("Enter");
    expect(requests).toBe(1);
  }
  finally { release(); }
  await expect(page.locator("#places h2").first()).toBeFocused();
});

for (const end of ["cancel", "complete", "elsewhere"] as const) test(`all-journey ${end} preserves the user's focus ${en ? "English" : "Korean"}`, async ({ page }) => {
  const search = await prepare(page, en);
  await search.click();
  await page.getByRole("button", { name: en ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: en ? /Next: Itinerary/ : /다음: 내 일정/ }).click();
  await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
  const coverage = page.locator(".itinerary-route-coverage");
  const check = coverage.locator(".coverage-actions button").first();
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
    if (end === "elsewhere") await coverage.getByRole("combobox").focus();
  } finally { release(); }
  await expect(check).not.toHaveAttribute("aria-busy", "true");
  if (end === "elsewhere") await expect(coverage.getByRole("combobox")).toBeFocused();
  else await expect(check).toBeFocused();
  if (end === "cancel") {
    await expect(coverage.getByRole("checkbox")).toBeDisabled();
    await check.press("Enter");
  }
  await expect(coverage.getByRole("status")).toHaveText(en ? "1 of 1 journeys found for this transport" : "선택한 이동수단: 전체 1구간 중 1구간 확인");
  expect((await new AxeBuilder({ page }).include(".itinerary-route-coverage").analyze()).violations).toEqual([]);
});
}
