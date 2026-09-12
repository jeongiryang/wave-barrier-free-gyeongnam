import { openSupportMenu } from "./support-menu";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";

async function prepare(page: Page, scenario: "error" | "empty" | "unqueried" | "unknown" | "arrival", english = false, snapshot?: { retrievedAt?: string }, beforeConditions?: () => Promise<void>) {
  await mockPlannerApi(page);
  await page.addInitScript((en) => localStorage.setItem("wave-locale", en ? "en" : "ko"), english);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const arrival = {
    id: "bus-arrival", name: "버스도착",
    state: scenario === "error" ? "error" : scenario === "arrival" ? "live" : "ready",
    ...(scenario === "unknown" ? {} : { queryStatus: scenario === "error" ? "error" : scenario === "unqueried" ? "not-requested" : "success", resultCount: scenario === "arrival" ? 1 : scenario === "empty" ? 0 : null }),
  };
  await page.route("**/api/route**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    configured: true,
    alternatives: [{ id: "car-fast", label: "추천 자동차 경로", provider: "Kakao Mobility", mode: "car", totalTime: 25, totalDistance: 8800, payment: 0, paymentType: "toll", totalWalk: 0, transfers: 0, configured: true, segments: [], geometry: [{ lat: 35.227, lng: 128.681 }, { lat: 35.238, lng: 128.691 }] }],
    providers: [{ ...arrival, id: "tago-bus-arrival", name: "TAGO ARRIVAL", role: "가까운 정류장 도착 예정", configured: true, state: arrival.state === "live" ? "connected" : arrival.state }],
    context: { nearbyStops: [{ id: "stop", name: "경남도립미술관 정류장", cityCode: "38030" }],
      arrivals: scenario === "arrival" ? [{ route: "101", minutes: snapshot ? 2 : null, stops: snapshot ? 1 : null }] : [], korail: [],
      ...(snapshot ? { arrivalRetrievedAt: snapshot.retrievedAt } : {}),
      catalog: { trainCities: 2, expressTerminals: 0, intercityTerminals: 0 },
      datasets: [{ id: "bus-stop", name: "버스정류소", state: "live", queryStatus: "success", resultCount: 1 }, arrival,
        { id: "train", name: "철도 지역코드", state: "live", queryStatus: "success", resultCount: 2 }],
    },
  }) }));
  await page.goto("/planner");
  await beforeConditions?.();
  if (english) {
    await page.getByRole("button", { name: "Changwon", exact: true }).click();
    await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
    await page.getByRole("button", { name: /Nature and relaxation/ }).click();
    await page.getByRole("button", { name: "Find places →", exact: true }).click();
  } else await chooseTripConditions(page);
  await page.getByRole("button", { name: english ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가", exact: true }).click();
  await page.locator(".transport-details > summary").click();
  const details = page.locator(".transport-details");
  await details.locator(".transport-dataset-grid").getByRole("button", { name: english ? /Bus arrivals/ : /버스도착/ }).click();
  return details;
}

for (const fails of [false, true]) test(`transport summary loads after data and ${fails ? "failure" : "success"} keeps details usable`, async ({ page }) => {
  let modules = 0;
  await page.route("**/TransportLiveSummary.tsx*", route => { modules++; return fails ? route.abort() : route.continue(); });
  const details = await prepare(page, "arrival", false, undefined, async () => { expect(modules).toBe(0); });
  if (fails) await expect(page.locator(".transport-summary-note[role=alert]")).toContainText("교통정보 상세에서 받은 정보를 확인");
  else await expect(page.locator(".transport-live-rail")).toContainText("도착시간 미확인");
  expect(modules).toBe(1);
  await expect(details.locator(".transport-data-panel")).toContainText("도착시간 미확인");
  await expect(details.getByRole("button", { name: "현재 조건 다시 확인", exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "경남도립미술관 일정에서 빼기", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect((await new AxeBuilder({ page }).include(".transport-data-panel").include(".transport-summary-note").analyze()).violations).toEqual([]);
});

for (const english of [false, true]) for (const knownTime of [true, false]) {
  test(`cached bus arrivals retain snapshot context: ${english ? "EN dark" : "KO light"}, time ${knownTime ? "known" : "missing"}`, async ({ page, isMobile }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(en => localStorage.setItem("wave-theme", en ? "dark" : "light"), english);
    const retrievedAt = knownTime ? "2026-09-06T03:30:00.000Z" : undefined;
    const details = await prepare(page, "arrival", english, { retrievedAt });
    const panel = details.locator(".transport-data-panel");
    const rail = page.locator(".transport-live-rail");
    let requests = 0;
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/route") requests++; });
    for (const surface of [panel, rail]) {
      await expect(surface).toContainText(english ? "At retrieval: 2 min" : "조회 당시 2분");
      if (knownTime) {
        await expect(surface.locator("time")).toHaveAttribute("datetime", retrievedAt!);
        await expect(surface.locator("time")).toContainText("12:30");
        await expect(surface.locator("time")).toContainText("KST");
      } else {
        await expect(surface.locator("time")).toHaveCount(0);
        await expect(surface).toContainText(english ? "Retrieval time unavailable" : "조회 시각 미확인");
      }
    }
    await expect(panel).not.toContainText(english ? "Current arrival information" : "현재 도착 예정 정보");
    await expect(panel).toContainText(english ? "At retrieval: 1 stop away" : "조회 당시 1개 정류장 전");
    await panel.getByRole("button", { name: english ? "Check these conditions again" : "현재 조건 다시 확인", exact: true }).click();
    await expect.poll(() => requests).toBe(1);
    await expect(panel).toContainText(english ? "At retrieval: 2 min" : "조회 당시 2분");
    if (knownTime) await expect(panel.locator("time")).toHaveAttribute("datetime", retrievedAt!);
    await expect(page.getByRole("button", { name: english ? "경남도립미술관 Remove from itinerary" : "경남도립미술관 일정에서 빼기", exact: true })).toHaveAttribute("aria-pressed", "true");
    if (!isMobile) await page.setViewportSize({ width: english ? 1440 : 960, height: 900 });
    await panel.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include(".transport-data-panel").include(".transport-live-rail").analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath("arrival-snapshot.png") });
    expect(requests).toBe(1);
    expect(errors).toEqual([]);
  });
}

for (const [scenario, expected] of [
  ["error", "운행정보를 확인하지 못했습니다."],
  ["empty", "조회했지만 현재 조건의 결과가 없습니다."],
  ["unqueried", "아직 도착정보를 조회하지 않았습니다."],
  ["unknown", "현재 조회 상태를 확인할 수 없습니다."],
] as const) {
  test(`transport ${scenario} has an honest result and recovery action`, async ({ page }) => {
    const details = await prepare(page, scenario);
    await expect(details.locator(".transport-data-panel")).toContainText(expected);
    await expect(details).not.toContainText("이용 가능");
    await expect(details.getByRole("button", { name: "현재 조건 다시 확인", exact: true })).toBeEnabled();
    if (scenario === "error") await expect(details).not.toContainText("현재 조건의 결과가 없습니다.");
  });
}

test("missing arrival values do not assert a moving or approaching bus", async ({ page }) => {
  const details = await prepare(page, "arrival");
  await expect(details.locator(".transport-data-panel")).toContainText("도착시간 미확인");
  await expect(details.locator(".transport-data-panel")).toContainText("남은 정류장 수 미확인");
  await expect(page.locator(".transport-live-rail")).toContainText("도착시간 미확인");
  await expect(details).not.toContainText("운행 중");
  await expect(details).not.toContainText("정류장 접근 중");
  await details.locator(".transport-dataset-grid").getByRole("button", { name: /철도 지역코드/ }).click();
  await expect(details.locator(".transport-data-panel")).toContainText("지역코드 2개");
  await expect(details.locator(".transport-dataset-grid").getByRole("button", { name: /철도 지역코드/ })).toContainText("목록 확인");
});

test("English transport controls describe empty results and original names", async ({ page }) => {
  const details = await prepare(page, "empty", true);
  await expect(details.locator("summary")).toContainText("Transport details");
  await expect(details.locator(".transport-data-panel")).toContainText("The request returned no results for these conditions.");
  await expect(details.getByRole("button", { name: "Check these conditions again", exact: true })).toBeEnabled();
  await expect(page.getByRole("group", { name: "Filter transport information" })).toBeVisible();
  await expect(page.locator(".transport-live-rail").locator('[lang="ko"]')).toContainText(["경남도립미술관 정류장"]);
});

test("changing language preserves the selected transport dataset without querying again", async ({ page }) => {
  let requests = 0;
  page.on("request", (request) => { if (new URL(request.url()).pathname === "/api/route") requests++; });
  const details = await prepare(page, "empty", true);
  await details.locator(".transport-dataset-grid").getByRole("button", { name: /Rail service areas/ }).click();
  const before = requests;
  await page.keyboard.press("Control+Home");
  await openSupportMenu(page);
  const preferences = page.locator(".preference-controls:visible");
  await openSupportMenu(page);
  await preferences.getByLabel("Open preferences", { exact: true }).click();
  await preferences.getByLabel("Language", { exact: true }).selectOption("ko");
  await expect(details.locator('button[aria-pressed="true"]')).toContainText("철도 지역코드");
  await expect(details.locator(".transport-data-panel")).toContainText("지역코드 2개");
  await preferences.getByLabel("언어", { exact: true }).selectOption("en");
  await expect(details.locator('button[aria-pressed="true"]')).toContainText("Rail service areas");
  await expect(details.locator(".transport-data-panel")).toContainText("2 area codes");
  expect(requests).toBe(before);
});

test("transport recheck retains focus, rejects duplicate Enter and recovers from failure", async ({ page }) => {
  await prepare(page, "empty", true);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let count = 0;
  await page.route("**/api/route**", async (route) => {
    count += 1;
    if (count > 1) return route.fallback();
    await held;
    return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "unavailable" }) });
  });
  const panel = page.locator(".transport-data-panel");
  const retry = panel.getByRole("button");
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect(retry).toHaveAttribute("aria-busy", "true");
  await expect(retry).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => count).toBe(1);
  release();
  await expect(panel).toContainText("Transport information could not be checked.");
  await expect(retry).toBeFocused();
  await expect(retry).toBeEnabled();
  await page.keyboard.press("Enter");
  await expect(panel).toContainText("The request returned no results for these conditions.");
  expect(count).toBe(2);
  await expect(retry).toBeFocused();
  expect(await retry.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return rect.top >= 0 && rect.bottom <= innerHeight && Boolean(hit && element.contains(hit));
  })).toBe(true);
});

for (const theme of ["light", "dark"] as const) {
  test("transport " + theme + " is readable and operable at narrow and wide viewports", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.addInitScript((value) => localStorage.setItem("wave-theme", value), theme);
    const details = await prepare(page, "arrival", true);
    expect(errors).toEqual([]);
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      const pieces = page.locator(".transport-provider-strip b, .transport-data-results span, .transport-live-rail strong, .transport-mode-filter small");
      expect(await pieces.evaluateAll((elements) => elements.every((element) => !element.clientWidth || element.scrollWidth <= element.clientWidth))).toBe(true);
      for (const control of await details.locator("button,a,summary").all()) {
        const box = await control.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      expect((await new AxeBuilder({ page }).include(".transport-details").include(".transport-mode-filter").include(".transport-live-rail").analyze()).violations).toEqual([]);
      const retry = details.getByRole("button", { name: "Check these conditions again", exact: true });
      await retry.focus();
      await expect.poll(() => retry.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return box.top >= 0 && box.bottom <= innerHeight && Boolean(hit && element.contains(hit));
      })).toBe(true);
      await page.screenshot({ path: test.info().outputPath("transport-" + theme + "-" + width + ".png") });
    }
  });
}

test("transport details load on demand and a failed module leaves an accessible recovery", async ({ page }) => {
  let modules = 0;
  await page.route("**/TransportDetailsContents.tsx*", (route) => { modules += 1; return route.abort(); });
  await mockPlannerApi(page);
  await page.addInitScript(() => localStorage.setItem("wave-locale", "en"));
  await page.goto("/planner");
  expect(modules).toBe(0);
  await page.getByRole("button", { name: "Changwon", exact: true }).click();
  await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
  await page.getByRole("button", { name: /Nature and relaxation/ }).click();
  await page.getByRole("button", { name: "Find places →", exact: true }).click();
  expect(modules).toBe(0);
  await page.locator(".transport-details > summary").click();
  await expect(page.getByRole("status").filter({ hasText: "Transport details could not open" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload this page", exact: true })).toBeVisible();
  expect(modules).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "경남도립미술관 Add to itinerary", exact: true })).toBeVisible();
});
