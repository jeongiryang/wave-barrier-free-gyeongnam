import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockPlannerApi, openItinerary, plan } from "./fixtures";

const hadong = plan.places.map((place, index) => ({ ...place, id: `2100${index}`, city: "하동", name: `하동 검증 장소 ${index + 1}`, mapX: "127.75", mapY: "35.06" }));
const jinju = plan.places.map((place, index) => ({ ...place, id: `2200${index}`, city: "진주", name: `진주 검증 장소 ${index + 1}`, mapX: "128.08", mapY: "35.19" }));
function regionPlan(region: string | null) {
  const places = region === "하동" ? hadong : region === "진주" ? jinju : plan.places;
  return { ...plan, places, stops: places.map(place => ({ id: place.id, contentTypeId: place.contentTypeId, title: place.name, note: place.summary, source: place.source, mapX: place.mapX, mapY: place.mapY })) };
}
async function setup(page: Page) {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
  await mockPlannerApi(page, { preserveView: true, savedPlaces: [...plan.places, ...hadong, ...jinju] });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/wave?**", route => {
    const url = new URL(route.request().url());
    return url.searchParams.get("action") === "plan" ? route.fulfill({ json: regionPlan(url.searchParams.get("region")) }) : route.fallback();
  });
}
async function current(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    return { ids: JSON.parse(values["wave-saved-places"] || "[]"), catalog: JSON.parse(values["wave-saved-place-catalog-v1"] || "[]"), schedule: JSON.parse(values["wave-trip-schedule-v1"] || "{}"), order: JSON.parse(values["wave-trip-order-v1"] || "{}"), identity: JSON.parse(values["wave-trip-identity-v1"] || "null"), region: values["wave-planner-region-v1"], books: JSON.parse(localStorage.getItem("wave-travel-book-v1") || "[]") };
  });
}
async function browse(page: Page) {
  await page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: "여행지 찾기", exact: true }).click();
  return page.getByRole("combobox", { name: "여행 지역", exact: true });
}
async function map(page: Page) {
  const switcher = page.getByRole("group", { name: "일정 보기 방식", exact: true });
  if (await switcher.count()) await switcher.getByRole("button", { name: "지도", exact: true }).click();
  await expect(page.locator(".route-map-canvas")).toBeVisible();
  await expect(page.locator(".wave-map-icon.origin")).toHaveCount(1);
}
async function save(page: Page) {
  await page.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
  await expect(page.locator(".simple-save-control [role=status]")).toContainText("이 기기의 내 여행에 저장했어요");
}
async function initial(page: Page, en = false) {
  await page.goto("/planner?region=창원&travelStart=2026-10-07&travelEnd=2026-10-08");
  await page.getByRole("button", { name: `경남도립미술관 ${en ? "add to itinerary" : "일정에 담기"}`, exact: true }).click();
}
function expectSchedulePreserved(after: Awaited<ReturnType<typeof current>>, before: Awaited<ReturnType<typeof current>>) {
  expect(after.ids).toEqual(before.ids);
  expect(after.order).toEqual(before.order);
  expect(after.schedule).toEqual(before.schedule);
  expect(after.catalog).toEqual(before.catalog);
  expect(after.identity.id).toBe(before.identity.id);
}

for (const outcome of ["success", "failure"] as const) test(`new trip ignores a delayed map location ${outcome}`, async ({ page }) => {
  await setup(page);
  await page.addInitScript(() => {
    const state: { calls: number; release: (outcome: "success" | "failure") => void } = { calls: 0, release: () => undefined };
    Object.assign(window, { locationResetFixture: state });
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (success: PositionCallback, failure: PositionErrorCallback) => {
      state.calls++;
      state.release = outcome => outcome === "success" ? success({ coords: { latitude: 35.3, longitude: 128.7 } } as GeolocationPosition) : failure({ code: 1, message: "denied" } as GeolocationPositionError);
    } } });
  });
  const routeQueries: string[] = [];
  page.on("request", request => { const url = new URL(request.url()); if (url.pathname === "/api/route") routeQueries.push(url.search); });
  await initial(page); await openItinerary(page); await map(page);
  const before = await current(page);
  await page.locator('.map-command-bar button[aria-controls="map-panel-route"]').click();
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#map-panel-route").getByRole("button", { name: /기기에서 거리 확인/ }).click();
  expect(await page.evaluate(() => (window as unknown as { locationResetFixture: { calls: number } }).locationResetFixture.calls)).toBe(1);
  // Release the native callback immediately after the actual new-trip button
  // commits its new ID, before full-document navigation can destroy the callback.
  await page.getByRole("button", { name: "새 여행", exact: true }).evaluate((button, outcome) => {
    (button as HTMLButtonElement).click();
    (window as unknown as { locationResetFixture: { release: (outcome: "success" | "failure") => void } }).locationResetFixture.release(outcome);
  }, outcome);
  const picker = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(picker).toHaveValue("");
  await expect(picker).toBeEnabled();
  const fresh = await current(page);
  expect(fresh.identity.id).not.toBe(before.identity.id);
  expect(fresh.ids).toEqual([]);
  expect(fresh.books).toHaveLength(1);
  expect(fresh.books[0].tripId).toBe(before.identity.id);
  expect(fresh.books[0].scheduleAssignments).toEqual(before.schedule.scheduleAssignments);
  await picker.selectOption("하동");
  await page.getByRole("button", { name: "하동 검증 장소 1 일정에 담기", exact: true }).click();
  await openItinerary(page, { start: "2026-10-09" }); await map(page);
  await expect(page.locator(".map-toolbar").getByRole("button", { name: "출발 · 눌러서 변경 창원중앙역", exact: true })).toBeVisible();
  await expect(page.locator(".map-provider-badge")).not.toContainText("현재 위치");
  expect((await current(page)).ids).toEqual(["21000"]);
  expect(routeQueries.some(query => [...new URLSearchParams(query).values()].includes("35.3"))).toBe(false);
  expect(JSON.stringify((await current(page)).books)).not.toContain("35.3");
});

test("region browsing preserves the itinerary; delayed results and history cannot restore earlier candidates", async ({ page }) => {
  await setup(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let pending = 0, hold = true;
  await page.route("**/api/wave?**", async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("action") !== "plan" || url.searchParams.get("region") !== "하동" || !hold) return route.fallback();
    pending++; await gate;
    await route.fulfill({ json: regionPlan("하동") }).catch(() => {});
  });
  try {
    await initial(page);
    const before = await current(page);
    const picker = await browse(page);
    await picker.selectOption("하동");
    await expect.poll(() => pending).toBe(1);
    await picker.selectOption("진주");
    hold = false; release();
    await expect(page.getByRole("button", { name: "진주 검증 장소 1 일정에 담기", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "하동 검증 장소 1 일정에 담기", exact: true })).toHaveCount(0);
    expectSchedulePreserved(await current(page), before);
    await picker.selectOption("하동");
    await page.getByRole("button", { name: "하동 검증 장소 1 일정에 담기", exact: true }).click();
    await openItinerary(page); await map(page);
    await expect(page.locator('.wave-map-icon.place[data-place-id="1001"]')).toHaveCount(1);
    await expect(page.locator('.wave-map-icon.place[data-place-id="21000"]')).toHaveCount(1);
    const combined = await current(page);
    expect(combined.ids).toEqual(["1001", "21000"]);
    expect(combined.schedule).toMatchObject({ travelStart: "2026-10-07", travelEnd: "2026-10-08", scheduleAssignments: { "1001": "2026-10-07", "21000": "2026-10-07" } });
    await browse(page);
    await page.evaluate(() => { history.pushState(null, "", "?region=진주#conditions"); dispatchEvent(new PopStateEvent("popstate")); });
    await expect(picker).toHaveValue("진주");
    await expect(page.getByRole("button", { name: "진주 검증 장소 1 일정에 담기", exact: true })).toBeEnabled();
    expectSchedulePreserved(await current(page), combined);
    await page.reload();
    await expect(picker).toHaveValue("진주");
    await openItinerary(page); await map(page);
    expectSchedulePreserved(await current(page), combined);
    await expect(page.locator(".wave-map-icon.place")).toHaveCount(2);
    await save(page);
    await page.getByRole("link", { name: "저장한 여행", exact: true }).click();
    await expect(page.getByRole("heading", { name: "창원 · 하동 2곳 여행", exact: true })).toBeVisible();
  } finally { release(); }
});

for (const en of [false, true]) for (const theme of ["light", "dark"]) test(`region browsing preserves and explicit new trip resets the whole trip ${en ? "EN" : "KO"} ${theme}`, async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 768 });
  await page.addInitScript(({ theme, en }) => { localStorage.setItem("wave-theme", theme); localStorage.setItem("wave-locale", en ? "en" : "ko"); }, { theme, en });
  await setup(page); await initial(page, en);
  await page.getByRole("button", { name: `용지호수공원 ${en ? "add to itinerary" : "일정에 담기"}`, exact: true }).click();
  await openItinerary(page);
  await page.getByRole("button", { name: "용지호수공원 일정 수정", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "용지호수공원 수정", exact: true });
  await editor.getByRole("combobox", { name: "방문 날짜", exact: true }).selectOption("2026-10-08");
  await editor.getByRole("button", { name: "적용", exact: true }).click();
  await save(page);
  const picker = await browse(page), before = await current(page);
  await picker.focus(); await picker.selectOption("하동");
  await expect(picker).toHaveValue("하동");
  await expect(picker).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expectSchedulePreserved(await current(page), before);
  expect((await new AxeBuilder({ page }).include("#conditions").analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.locator("#conditions").screenshot({ path: info.outputPath(`region-browse-${en ? "en" : "ko"}-${theme}.png`) });
  await page.reload();
  await expect(picker).toHaveValue("하동");
  expectSchedulePreserved(await current(page), before);
  await page.getByRole("button", { name: "새 여행", exact: true }).click();
  await expect(picker).toHaveValue("");
  await expect(picker).toBeEnabled();
  const fresh = await current(page);
  expect(fresh.identity.id).not.toBe(before.identity.id);
  expect(fresh.ids).toEqual([]); expect(fresh.catalog).toEqual([]);
  expect(fresh.order).toEqual({ mode: "auto", ids: [] });
  expect(fresh.schedule).toMatchObject({ travelStart: "", travelEnd: "", scheduleAssignments: {} });
  expect(fresh.books).toHaveLength(1);
  expect(fresh.books[0].tripId).toBe(before.identity.id);
  expect(fresh.books[0].scheduleAssignments).toEqual(before.schedule.scheduleAssignments);
  const itineraryTab = page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: /^내 일정/ });
  await expect(itineraryTab).toBeDisabled();
  await picker.selectOption("진주");
  await page.reload();
  await expect(picker).toHaveValue("진주");
  await expect(itineraryTab).toBeDisabled();
  expect((await current(page)).ids).toEqual([]);
  expect((await current(page)).identity.id).toBe(fresh.identity.id);
  await page.goto("/travel-book");
  await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
  await expect(page.locator(".simple-itinerary-heading")).toContainText("2026-10-07 — 2026-10-08");
  await expect(page.locator("#itinerary-stop-1001")).toContainText("경남도립미술관");
  await page.getByRole("group", { name: "일정 날짜", exact: true }).getByRole("button", { name: /^2일차/ }).click();
  await expect(page.locator("#itinerary-stop-1002")).toContainText("용지호수공원");
  await page.getByRole("button", { name: "용지호수공원 일정 수정", exact: true }).click();
  await expect(editor.getByRole("combobox", { name: "방문 날짜", exact: true })).toHaveValue("2026-10-08");
  await editor.getByRole("button", { name: "취소", exact: true }).click();
  const restored = await current(page);
  expect(restored.ids).toEqual(before.ids);
  expect(restored.order.ids).toEqual(before.order.ids);
  expect(restored.schedule).toEqual(before.schedule);
  expect(restored.identity.id).toBe(before.identity.id);
  expect(errors).toEqual([]);
});
