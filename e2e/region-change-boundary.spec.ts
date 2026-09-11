import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

test.beforeEach(async ({ page }) => {
  if (!process.env.E2E_BASE_URL) return;
  // Preview runs exercise deployed code with deterministic provider/permission
  // responses. They never write server data or replace real provider smoke.
  await page.route("**/*", route => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) ? route.continue() : route.abort("blockedbyclient"));
});

async function current(page: Page) {
  return page.evaluate(() => Object.fromEntries(["wave-current-trip-v1", "wave-saved-places", "wave-saved-place-catalog-v1", "wave-trip-schedule-v1", "wave-trip-order-v1", "wave-planner-region-v1"].map(key => [key, localStorage.getItem(key)])));
}

for (const outcome of ["success", "failure"] as const) test(`new trip ignores a delayed map location ${outcome}`, async ({ page }) => {
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    const state = { calls: 0, release: (_outcome: "success" | "failure") => undefined as void };
    Object.assign(window, { locationResetFixture: state });
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (success: PositionCallback, failure: PositionErrorCallback) => {
      state.calls++;
      state.release = outcome => outcome === "success" ? success({ coords: { latitude: 35.3, longitude: 128.7 } } as GeolocationPosition) : failure({ code: 1, message: "denied" } as GeolocationPositionError);
    } } });
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.locator('.map-command-bar button[aria-controls="map-panel-route"]').click();
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#map-panel-route").getByRole("button", { name: /현재 위치에서 출발/ }).click();
  expect(await page.evaluate(() => (window as unknown as { locationResetFixture: { calls: number } }).locationResetFixture.calls)).toBe(1);
  await page.getByRole("group", { name: "여행 지역 선택", exact: true }).getByRole("button", { name: "하동", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "새 여행으로 시작", exact: true }).click();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(0);
  const notice = page.locator(".route-notice");
  await expect(notice).toContainText("여행지를 찾으면 출발지부터의 이동 경로를 비교합니다.");
  await page.evaluate(outcome => (window as unknown as { locationResetFixture: { release: (outcome: "success" | "failure") => void } }).locationResetFixture.release(outcome), outcome);
  await expect(notice).toContainText("여행지를 찾으면 출발지부터의 이동 경로를 비교합니다.");
  await expect(page.locator(".map-toolbar").getByRole("button", { name: "출발 · 눌러서 변경 창원중앙역", exact: true })).toBeVisible();
  await expect(page.locator(".map-provider-badge")).not.toContainText("현재 위치");
  await expect(page.locator(".day-planner-grid li")).toHaveCount(0);
});

test("explicit multi-region addition preserves places and dates; rapid requests and history cannot bypass the decision", async ({ page }) => {
  await mockPlannerApi(page);
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("action") !== "plan" || url.searchParams.get("region") !== "하동") return route.fallback();
    const places = plan.places.map((place, index) => ({ ...place, id: `hadong-${index}`, city: "하동", name: `하동 검증 장소 ${index + 1}`, mapX: "127.75", mapY: "35.06" }));
    const stops: import("../features/planner/types").RouteStop[] = places.map(place => ({
      id: place.id, contentTypeId: place.contentTypeId, title: place.name,
      note: place.summary, source: place.source, mapX: place.mapX, mapY: place.mapY,
    }));
    return route.fulfill({ json: { ...plan, places, stops } });
  });
  await page.goto("/planner?travelStart=2026-10-07&travelEnd=2026-10-08");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  const picker = page.getByRole("group", { name: "여행 지역 선택", exact: true });
  await picker.evaluate(group => {
    const buttons = [...group.querySelectorAll("button")];
    buttons.find(button => button.textContent === "하동")?.click();
    buttons.find(button => button.textContent === "진주")?.click();
  });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("하동 여행을 어떻게 시작할까요?");
  await dialog.getByRole("button", { name: "기존 일정에 지역 추가", exact: true }).click();
  await page.locator(".condition-actions").getByRole("button", { name: "여행지 찾기 →", exact: true }).click();
  await page.getByRole("button", { name: "하동 검증 장소 1 일정에 추가", exact: true }).click();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(2);
  await expect(page.locator(".multi-region-notice")).toContainText("창원 · 하동");
  await expect(page.locator(".multi-region-notice")).toContainText("장거리 이동");
  await page.locator("#navigation").scrollIntoViewIfNeeded();
  await expect(page.locator(".wave-map-icon.place")).toHaveCount(2);
  await expect(page.locator('.wave-map-icon.place[title="경남도립미술관"]')).toHaveCount(1);
  await expect(page.locator('.wave-map-icon.place[title="하동 검증 장소 1"]')).toHaveCount(1);
  const before = await current(page);
  await page.evaluate(() => { history.pushState(null, "", "?region=진주"); dispatchEvent(new PopStateEvent("popstate")); });
  await expect(dialog).toHaveAccessibleName("진주 여행을 어떻게 시작할까요?");
  expect(await current(page)).toEqual(before);
  await dialog.getByRole("button", { name: "지역 변경 취소", exact: true }).click();
  expect(await current(page)).toEqual(before);
  await page.reload();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(2);
  await expect(page.locator(".multi-region-notice")).toContainText("창원 · 하동");
  await page.locator(".day-planner").getByRole("button", { name: "내 일정에 저장", exact: true }).click();
  await page.goto("/travel-book");
  await expect(page.getByRole("heading", { name: "창원 · 하동 2곳 여행", exact: true })).toBeVisible();
});
for (const en of [false, true]) for (const theme of ["light", "dark"]) {
  test(`region decision preserves or resets the whole trip ${en ? "EN" : "KO"} ${theme}`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewportSize({ width: 320, height: 768 });
    await page.addInitScript(theme => localStorage.setItem("wave-theme", theme), theme);
    await mockPlannerApi(page);
    await page.goto("/planner?travelStart=2026-10-07&travelEnd=2026-10-08");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
    await page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true }).click();
    await page.locator(".day-planner").getByLabel("용지호수공원 여행 날짜", { exact: true }).selectOption("2026-10-08");
    await page.locator(".day-planner").getByRole("button", { name: "내 일정에 저장", exact: true }).click();
    if (en) {
      const preferences = page.locator(".preference-controls:visible");
      await preferences.scrollIntoViewIfNeeded();
      await expect(preferences.getByLabel("환경설정 열기", { exact: true })).toBeInViewport();
      await preferences.getByLabel("환경설정 열기", { exact: true }).click();
      await preferences.getByLabel("언어", { exact: true }).selectOption("en");
      await preferences.getByLabel("Open preferences", { exact: true }).click();
    }
    const picker = page.getByRole("group", { name: en ? "Choose a region" : "여행 지역 선택", exact: true });
    const trigger = picker.getByRole("button", { name: en ? "Hadong" : "하동", exact: true });
    const before = await current(page);
    await trigger.focus(); await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: en ? "How would you like to visit Hadong?" : "하동 여행을 어떻게 시작할까요?" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("lang", en ? "en" : "ko");
    await expect(dialog.getByRole("button", { name: en ? "Start a new trip" : "새 여행으로 시작", exact: true })).toBeVisible();
    expect(await current(page)).toEqual(before);
    await expect(dialog.getByRole("heading")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("button", { name: en ? "Start a new trip" : "새 여행으로 시작", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: en ? "Cancel region change" : "지역 변경 취소", exact: true })).toBeFocused();
    expect((await new AxeBuilder({ page }).include(".region-change-dialog").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await dialog.screenshot({ path: info.outputPath(`region-decision-${en ? "en" : "ko"}-${theme}.png`) });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
    expect(await current(page)).toEqual(before);
    await trigger.press("Enter");
    await dialog.getByRole("button", { name: en ? "Add region to current itinerary" : "기존 일정에 지역 추가", exact: true }).click();
    await expect(trigger).toHaveAttribute("aria-pressed", "true");
    const added = await current(page);
    for (const key of ["wave-saved-places", "wave-saved-place-catalog-v1", "wave-trip-schedule-v1", "wave-trip-order-v1"]) expect(added[key]).toEqual(before[key]);
    await expect(page.locator(".day-planner-grid li")).toHaveCount(2);
    await page.reload();
    await expect(picker.getByRole("button", { name: en ? "Hadong" : "하동", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".day-planner-grid li")).toHaveCount(2);
    const next = picker.getByRole("button", { name: en ? "Jinju" : "진주", exact: true });
    await next.click();
    await page.getByRole("dialog").getByRole("button", { name: en ? "Start a new trip" : "새 여행으로 시작", exact: true }).click();
    await expect(next).toHaveAttribute("aria-pressed", "true");
    await expect(next).toBeFocused();
    await expect(page.locator(".day-planner-grid li")).toHaveCount(0);
    const fresh = await current(page);
    expect(JSON.parse(fresh["wave-saved-places"] || "[]")).toEqual([]);
    expect(JSON.parse(fresh["wave-saved-place-catalog-v1"] || "[]")).toEqual([]);
    expect(JSON.parse(fresh["wave-trip-order-v1"] || "{}")).toEqual({ mode: "auto", ids: [] });
    expect(JSON.parse(fresh["wave-trip-schedule-v1"] || "{}").scheduleAssignments).toEqual({});
    await expect(page.locator(".itinerary-route-coverage select")).toHaveCount(0);
    await page.reload();
    await expect(page.locator(".day-planner-grid li")).toHaveCount(0);
    await expect(picker.getByRole("button", { name: en ? "Jinju" : "진주", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.goto("/travel-book");
    await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
    await expect(page.locator(".day-planner-grid li")).toHaveCount(2);
    await expect(page.locator(".day-planner").getByLabel(en ? "Trip start date" : "여행 시작일", { exact: true })).toHaveValue("2026-10-07");
    await expect(page.locator(".day-planner").getByLabel(en ? "용지호수공원 trip date" : "용지호수공원 여행 날짜", { exact: true })).toHaveValue("2026-10-08");
    expect(errors).toEqual([]);
  });
}
