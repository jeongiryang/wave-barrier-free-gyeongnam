import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

function trackRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  return errors;
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test("first visit stays neutral and later stages are locked without a search", async ({ page }) => {
  let requests = 0;
  await mockPlannerApi(page, { plannerView: "guided" });
  page.on("request", (request) => { if (request.url().includes("action=plan")) requests++; });
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "어디로 갈까요?", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "여행 지역 선택", exact: true }).locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator(".condition-actions button")).toBeDisabled();
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "0");
  await expect(page.locator(".journey-rail nav button").nth(1)).toBeDisabled();
  expect(requests).toBe(0);
  await expect(page.locator(".planner-progress-status")).toHaveText("4단계 중 0단계 완료 · 4단계 남음");
});

test("a returning user can open an existing device itinerary before a new search", async ({ page }) => {
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.addInitScript(() => {
    window.localStorage.setItem("wave-saved-places", JSON.stringify(["legacy-place"]));
    window.localStorage.setItem("wave-saved-place-catalog-v1", JSON.stringify([{
      id: "legacy-place",
      name: "기존 저장 여행지",
      city: "창원",
      address: "경상남도 창원시",
      mapX: "128.6811",
      mapY: "35.2279",
      score: 60,
      knownFields: 1,
      source: "기존 저장 정보",
    }]));
  });
  await page.goto("/planner");
  const itineraryStep = page.getByRole("navigation", { name: "여행 계획 단계 이동" })
    .getByRole("button", { name: /이 기기 일정/ });
  await expect(itineraryStep).toBeEnabled();
  await itineraryStep.click();
  await expect(page.getByRole("heading", { name: "이 기기 일정 만들기" })).toBeVisible();
  await expect(page.getByRole("region", { name: "날짜별 여행 일정" })).toContainText("기존 저장 여행지");
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "0");
  await page.getByRole("navigation", { name: "여행 계획 단계 이동" })
    .getByRole("button", { name: /^조건/ }).click();
  await chooseTripConditions(page);
  // The new results do not include the stored legacy place. It stays editable,
  // but must not satisfy the current recommendation-selection milestone.
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "25");
  await itineraryStep.click();
  await expect(page.getByRole("region", { name: "날짜별 여행 일정" })).toContainText("기존 저장 여행지");
});

test("guided search failures stay visible with choices preserved and allow retry", async ({ page }) => {
  await mockPlannerApi(page, { plannerView: "guided", failPlan: true });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await expect(page.locator("#conditions").getByRole("alert")).toContainText("선택한 조건은 유지됩니다");
  await expect(page.locator(".condition-actions").getByRole("button", { name: /내 조건에 맞는 여행지 찾기/ })).toBeEnabled();
  await expect(page.locator("#places")).toBeHidden();
});

test("intro keeps one clear planning action and never blocks the page", async ({ page }) => {
  const errors = trackRuntimeErrors(page);
  const width = test.info().project.name === "mobile-chromium" ? 390 : 1366;
  await page.setViewportSize({ width, height: 960 });
  await mockPlannerApi(page);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "인트로 다시보기" })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const planning = page.locator(".landing-actions").getByRole("link", { name: /내 여행 설계하기/ });
  await expect(planning).toBeVisible();
  await planning.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  await expect(planning).toBeFocused();
  // Root overflow clipping must not hide a wider hero grid on mobile.
  for (const element of await page.locator(".landing-hero-copy, .landing-hero h1, .landing-actions a, .landing-signal").all()) {
    const box = await element.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  }
  await page.screenshot({ path: test.info().outputPath(`intro-calm-${width}.png`) });
  await expectNoOverflow(page);
  expect(errors).toEqual([]);
});

test("one saved place does not complete the trip and the dialog contains keyboard focus", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  const trigger = page.getByRole("button", { name: "편의시설 보기", exact: true }).first();
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
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "50");
});

test("old dated stops are kept separately and never become new-date markers", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByLabel("여행 시작일", { exact: true }).fill("2026-10-14");
  await expect(page.locator(".outside-trip-dates")).toContainText("2026-10-08");
  await expect(page.locator(".day-planner-grid li")).toHaveCount(0);
  await expect(page.locator(".route-scope-note").first()).toContainText("일정 0곳");
  await page.getByLabel("경남도립미술관 이번 여행 날짜로 이동").selectOption("2026-10-14");
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
});

for (const width of [280, 320, 390, 768, 1024, 1366, 1920, 2560]) {
  test(`neutral questions reflow at ${width}px without page overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 800 : 960 });
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.goto("/planner");
    await expect(page.getByRole("heading", { name: "어디로 갈까요?", exact: true })).toBeVisible();
    const header = await page.locator(".site-header").boundingBox();
    const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`questions-${width}.png`), fullPage: true });
  });
}

test("rain response runs a new search and preserves accessibility needs and saved places", async ({ page }) => {
  await mockPlannerApi(page);
  await page.route("**/api/weather?*", async (route) => route.fulfill({ json: {
    source: "기상 정보", updatedAt: "2026-09-05T09:00:00Z",
    current: { temperature: 23, apparent: 23, code: 61, label: "비", wind: 2, precipitation: 3, isDay: true },
    days: [{ date: "2026-10-08", code: 61, label: "비", max: 24, min: 20, rainProbability: 80, rain: 3, snow: 0, uv: 2, advice: [] }], advice: [],
  } }));
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.locator("#layers > summary").click();
  const request = page.waitForRequest((item) => item.url().includes("action=plan") && new URL(item.url()).searchParams.get("themes") === "history");
  await page.getByRole("button", { name: /역사·문화 후보로 다시 찾기/ }).click();
  expect(new URL((await request).url()).searchParams.get("profiles")).toBe("wheel");
  await expect(page.getByRole("button", { name: "경남도립미술관 일정에서 제거", exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
});

test("a confirmed crowd alternative replaces the itinerary instead of an unrelated map-only route", async ({ page }) => {
  await mockPlannerApi(page);
  await page.route("**/api/wave?action=crowd*", (route) => route.fulfill({ json: { crowd: { rate: 80, baseYmd: "20260905", place: "경남도립미술관" } } }));
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.locator("#layers > summary").click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /용지호수공원.*교체 검토/ }).click();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
  await expect(page.locator(".day-planner-grid li")).toContainText("용지호수공원");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1002"]);
  const schedule = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-trip-schedule-v1") || "{}"));
  expect(schedule.scheduleAssignments).toEqual({ "1002": "2026-10-08" });
  await expect(page.locator(".route-scope-note").first()).toContainText("일정 1곳");
});

test("trip completion requires every ordered leg and separate itinerary and departure reviews", async ({ page }) => {
  const errors = trackRuntimeErrors(page);
  const width = test.info().project.name === "mobile-chromium" ? 390 : 1366;
  await page.setViewportSize({ width, height: 960 });
  await mockPlannerApi(page);
  const requests: URL[] = [];
  page.on("request", (request) => { if (request.url().includes("/api/route?")) requests.push(new URL(request.url())); });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true }).click();
  const move = page.getByRole("button", { name: "경남도립미술관 같은 날 앞 순서로 이동", exact: true });
  if (await move.isEnabled()) await move.click();
  const coverage = page.locator(".itinerary-route-coverage");
  await expect(page.getByLabel("여행 시작일", { exact: true })).toHaveValue("2026-10-08");
  await expect(page.getByLabel("경남도립미술관 여행 날짜", { exact: true })).toHaveValue("2026-10-08");
  await expect(page.getByLabel("용지호수공원 여행 날짜", { exact: true })).toHaveValue("2026-10-08");
  await expect(coverage.getByRole("listitem")).toHaveText([
    /2026-10-08 · 창원중앙역 → 경남도립미술관/,
    /2026-10-08 · 경남도립미술관 → 용지호수공원/,
  ]);
  await expect(coverage.getByRole("combobox", { name: "이동수단", exact: true })).toBeVisible();
  await coverage.getByLabel("이동수단", { exact: true }).selectOption("car");
  await expect(coverage.getByRole("checkbox")).toBeDisabled();
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "50");
  await coverage.getByRole("button", { name: "모든 구간 조회하기", exact: true }).click();
  await expect(coverage.getByRole("status")).toHaveText("선택한 이동수단: 전체 2구간 중 2구간 확인");
  expect(requests.some((url) => url.searchParams.get("startLat") === "35.238" && url.searchParams.get("startLng") === "128.691" && url.searchParams.get("endLat") === "35.229")).toBe(true);
  await coverage.getByRole("checkbox").check();
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "75");
  await page.getByRole("checkbox", { name: /일정과 출발 전 다시 확인할 항목/ }).check();
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "100");
  await expectNoOverflow(page);
  expect((await new AxeBuilder({ page }).include(".itinerary-route-coverage").analyze()).violations).toEqual([]);
  await coverage.screenshot({ path: test.info().outputPath(`all-journeys-${width}.png`) });
  await coverage.getByLabel("이동수단", { exact: true }).selectOption("transit");
  await expect(coverage.getByRole("status")).toHaveText("선택한 이동수단: 전체 2구간 중 0구간 확인");
  await expect(coverage.getByRole("checkbox")).not.toBeChecked();
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "50");
  await coverage.getByLabel("이동수단", { exact: true }).selectOption("car");
  await page.getByLabel("용지호수공원 여행 날짜").selectOption("2026-10-09");
  await expect(coverage.getByRole("status")).toHaveText("선택한 이동수단: 전체 2구간 중 0구간 확인");
  await expect(coverage.getByRole("listitem").nth(1)).toContainText("2026-10-09 · 창원중앙역 → 용지호수공원");
  await expect(page.getByRole("checkbox", { name: /일정과 출발 전 다시 확인할 항목/ })).not.toBeChecked();
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "50");
  expect(errors).toEqual([]);
});

test("guided itinerary unlocks the same dated journeys and transport control after saving places", async ({ page }) => {
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  const itineraryStep = page.locator(".journey-rail nav button").nth(2);
  await expect(itineraryStep).toBeDisabled();
  await chooseTripConditions(page);
  await expect(itineraryStep).toBeDisabled();
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true }).click();
  await expect(itineraryStep).toBeEnabled();
  await itineraryStep.click();
  await page.getByLabel("용지호수공원 여행 날짜", { exact: true }).selectOption("2026-10-09");
  const coverage = page.locator(".itinerary-route-coverage");
  await expect(coverage.getByRole("listitem")).toHaveText([
    /2026-10-08 · 창원중앙역 → 경남도립미술관/,
    /2026-10-09 · 창원중앙역 → 용지호수공원/,
  ]);
  await coverage.getByLabel("이동수단", { exact: true }).selectOption("car");
  await coverage.getByRole("button", { name: "모든 구간 조회하기", exact: true }).click();
  await expect(coverage.getByRole("status")).toHaveText("선택한 이동수단: 전체 2구간 중 2구간 확인");
  await coverage.getByRole("checkbox").check();
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "75");
  expect((await new AxeBuilder({ page }).include(".guided-stage-actions").analyze()).violations).toEqual([]);
  await expectNoOverflow(page);
});

test("clearing the last theme invalidates previous results without locking an existing itinerary", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: /자연·휴양 공원/ }).click();
  await expect(page.getByText("조건이 변경됐어요.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true })).toBeDisabled();
  await expect(page.locator(".journey-rail nav button").nth(2)).toBeEnabled();
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "0");
  await expect(page.locator(".day-planner-grid li")).toContainText("경남도립미술관");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
});
