import { openNaruTool, closeNaruTool } from './naru-tool-fixtures';
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, plan } from "./fixtures";

const museum = "경남도립미술관";
async function setup(page: Page, locale: "ko" | "en", coordinates: { mapX: string; mapY: string }) {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
  await mockPlannerApi(page, { preserveView: true, placeCoordinate: coordinates });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
}
async function itinerary(page: Page) {
  await page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: /^내 일정/ }).click();
  await expect(page.locator("#itinerary")).toBeVisible();
}
async function map(page: Page) {
  await expect(page.locator("#itinerary")).toBeVisible();
  const switcher = page.getByRole("group", { name: "일정 보기 방식", exact: true });
  if ((page.viewportSize()?.width || 1440) < 1024) await switcher.getByRole("button", { name: "지도", exact: true }).click();
  await expect(page.locator(".route-map-canvas")).toBeVisible();
  await expect(page.locator(".wave-map-icon.origin")).toHaveCount(1);
}
async function tools(page: Page) {
  await openNaruTool(page, "장소 좌표 복원");
}
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    return { ids: JSON.parse(values["wave-saved-places"] || "[]"), order: JSON.parse(values["wave-trip-order-v1"] || "{}"), schedule: JSON.parse(values["wave-trip-schedule-v1"] || "{}"), identity: JSON.parse(values["wave-trip-identity-v1"] || "null"), books: localStorage.getItem("wave-travel-book-v1") };
  });
}
async function restoredTrip(page: Page, locale: "ko" | "en") {
  // Both automatic saved-ID and region lookups genuinely lack coordinates until
  // a test explicitly supplies a newer successful public response.
  await setup(page, locale, { mapX: "", mapY: "" });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => {
    if (localStorage.getItem("wave-travel-book-v1")) return;
    localStorage.setItem("wave-travel-book-v1", JSON.stringify([{
      id: "coordinate-recovery", title: "창원 1곳 여행", region: "창원", theme: "nature", profiles: [],
      travelStart: "2026-09-07", travelEnd: "2026-09-07", dayStartTime: "10:00",
      createdAt: "2026-09-07T00:00:00Z", updatedAt: "2026-09-07T00:00:00Z", status: "planned", note: "",
      places: [{ id: "1001", name: "경남도립미술관", city: "창원", address: "경남 창원", image: "", score: null, knownFields: 0, source: "한국관광공사" }],
      scheduleAssignments: { "1001": "2026-09-07" },
    }]));
  });
  await page.goto("/travel-book");
  await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
  await expect(page).toHaveURL(/#itinerary$/);
  await expect(page.locator("#itinerary-stop-1001")).toBeVisible();
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await map(page);
  await tools(page);
}

for (const [mapX, mapY] of [["0", "0"], ["139.7", "35.6"], ["NaN", "35.2"], ["128.6", "Infinity"], ["128.6", ""]]) {
  for (const locale of ["ko", "en"] as const) test(`${locale} invalid place ${mapX},${mapY} is recoverable but never mapped or sent as a journey`, async ({ page }) => {
    await setup(page, locale, { mapX, mapY });
    let routeCalls = 0;
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/route") routeCalls++; });
    await page.goto("/planner?region=창원&travelStart=2026-10-07&travelEnd=2026-10-08");
    const en = locale === "en";
    await page.getByRole("button", { name: `${museum} ${en ? "add to itinerary" : "일정에 담기"}`, exact: true }).click();
    await itinerary(page); await map(page); await tools(page);
    await expect(page.locator(".wave-map-icon.place")).toHaveCount(0);
    await expect(page.locator(".simple-more-trip-tools")).toContainText(`좌표가 없는 장소는 일정에 보관하고 지도에서 제외해요: ${museum}`);
    const recovery = page.getByRole("button", { name: en ? "Recheck place locations" : "장소 위치 다시 확인", exact: true });
    await expect(recovery).toBeVisible();
    await expect(recovery).toHaveAttribute("aria-disabled", "false");
    await expect(page.locator(".itinerary-route-coverage")).toContainText(en ? "Coordinates unavailable" : "좌표 미확인");
    const check = page.getByRole("button", { name: en ? "Check all journeys" : "모든 구간 조회하기", exact: true });
    await check.click();
    await expect(check).toHaveAttribute("aria-busy", "false");
    expect(routeCalls).toBe(0);
    expect((await snapshot(page)).ids).toEqual(["1001"]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

for (const locale of ["ko", "en"] as const) {
  const en = locale === "en";
  test(`${locale} an empty location lookup offers explicit regional search without replacing saved places`, async ({ page }) => {
    await restoredTrip(page, locale);
    const before = await snapshot(page);
    let searches = 0;
    page.on("request", request => { const url = new URL(request.url()); if (url.pathname === "/api/wave" && url.searchParams.get("action") === "plan") searches++; });
    await page.route("**/api/wave?action=place-coordinates&contentId=1001", route => route.fulfill({ json: { id: "1001", status: "empty" } }));
    await page.getByRole("button", { name: en ? "Recheck place locations" : "장소 위치 다시 확인", exact: true }).press("Enter");
    const recovery = page.getByRole("region", { name: en ? "Recheck saved place locations" : "저장 장소 위치 재확인", exact: true });
    await expect(recovery).toHaveAttribute("lang", locale);
    await expect(recovery.getByRole("status").locator("li > span")).toHaveAttribute("lang", "ko");
    await expect(recovery.getByRole("status")).toContainText(en ? "not found" : "찾지 못했습니다");
    const alternative = recovery.getByRole("link", { name: en ? "Review trip preferences" : "여행 조건에서 다시 찾기", exact: true });
    expect((await alternative.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
    await alternative.press("Enter");
    await expect(page).toHaveURL(/#conditions$/);
    await expect(page.getByRole("group", { name: "하고 싶은 활동", exact: true })).toBeVisible();
    expect(searches).toBe(0);
    await page.route("**/api/wave?**", route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("action") !== "plan") return route.fallback();
      expect(url.searchParams.get("region")).toBe("창원");
      return route.fulfill({ json: plan });
    });
    const activity = page.getByRole("button", { name: "자연·휴양", exact: true });
    await expect(activity).toHaveAttribute("aria-pressed", "true");
    await activity.click();
    await expect(activity).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => searches).toBe(1);
    await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
    await itinerary(page); await map(page); await tools(page);
    await expect(page.locator('.wave-map-icon.place[data-place-id="1001"]')).toHaveCount(1);
    await expect(recovery.getByRole("status")).toContainText(en ? "A location is now available for this itinerary." : "현재 일정에서 사용할 수 있는 위치가 있습니다.");
    await expect(recovery.getByRole("status")).not.toContainText(en ? "not found" : "찾지 못했습니다");
    await expect(recovery.getByRole("status")).not.toContainText(en ? "Official place location checked" : "공식 장소 위치를 확인했습니다");
    await expect(recovery.getByRole("button")).toHaveAttribute("aria-disabled", "true");
    // Changing an activity is an explicit edit, so the bound local archive now
    // updates automatically. Preserve its identity/content/privacy, not old bytes.
    await expect.poll(async () => JSON.parse((await snapshot(page)).books || "[]")[0]?.themes).toEqual([]);
    const after = await snapshot(page);
    expect(after.ids).toEqual(before.ids); expect(after.order).toEqual(before.order); expect(after.schedule).toEqual(before.schedule);
    expect(after.identity.id).toBe(before.identity.id);
    const books = JSON.parse(after.books || "[]"), previousBook = JSON.parse(before.books || "[]")[0];
    expect(books).toHaveLength(1);
    expect(books[0]).toMatchObject({ id: previousBook.id, tripId: before.identity.id, title: previousBook.title, note: previousBook.note, travelStart: previousBook.travelStart, travelEnd: previousBook.travelEnd, scheduleAssignments: previousBook.scheduleAssignments, profiles: [] });
    expect(books[0].places.map((place: { id: string }) => place.id)).toEqual(before.ids);
    expect(after.books).not.toMatch(/mapX|mapY/);
    expect(searches).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });

  test(`${locale} archived place coordinates are explicitly rechecked without changing dates, order or privacy`, async ({ page }) => {
    await restoredTrip(page, locale);
    const before = await snapshot(page);
    let requests = 0;
    await page.route("**/api/wave?action=place-coordinates&contentId=1001", route => {
      requests++;
      return route.fulfill({ json: { id: "1001", status: "available", mapX: "128.691", mapY: "35.238" } });
    });
    await expect(page.locator(".wave-map-icon.place")).toHaveCount(0);
    expect(requests).toBe(0);
    const trigger = page.getByRole("button", { name: en ? "Recheck place locations" : "장소 위치 다시 확인", exact: true });
    await trigger.press("Enter");
    await expect(page.locator('.wave-map-icon.place[data-place-id="1001"]')).toHaveCount(1);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-disabled", "true");
    expect((await trigger.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole("status").filter({ hasText: en ? "Official place location checked" : "공식 장소 위치를 확인" })).toContainText(museum);
    const after = await snapshot(page);
    expect(after.ids).toEqual(before.ids); expect(after.order).toEqual(before.order); expect(after.schedule).toEqual(before.schedule);
    expect(after.books).toBe(before.books);
    expect(after.books).not.toMatch(/mapX|mapY|128\.691|35\.238/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.reload(); await map(page); await tools(page);
    await expect(page.locator('.wave-map-icon.place[data-place-id="1001"]')).toHaveCount(1);
    expect(requests).toBe(1);
    expect((await snapshot(page)).schedule).toEqual(before.schedule);
  });

  test(`${locale} empty, wrong ID and provider errors remain retryable and cannot add markers`, async ({ page }) => {
    await restoredTrip(page, locale);
    const before = await snapshot(page);
    const trigger = page.getByRole("button", { name: en ? "Recheck place locations" : "장소 위치 다시 확인", exact: true });
    const recovery = page.getByRole("region", { name: en ? "Recheck saved place locations" : "저장 장소 위치 재확인", exact: true });
    for (const [body, status, message] of [
      [{ id: "1001", status: "empty" }, 200, en ? "not found" : "찾지 못했습니다"],
      [{ id: "9999", status: "available", mapX: "128.691", mapY: "35.238" }, 200, en ? "could not be verified" : "대응을 확인하지 못했습니다"],
      [{ id: "1001", status: "provider-error" }, 502, en ? "could not be loaded" : "불러오지 못했습니다"],
    ] as const) {
      await page.route("**/api/wave?action=place-coordinates&contentId=1001", route => route.fulfill({ json: body, status }));
      await trigger.press("Enter");
      await expect(recovery.getByRole("status")).toContainText(message);
      await expect(trigger).toBeFocused();
      await expect(page.locator(".wave-map-icon.place")).toHaveCount(0);
      await expect(trigger).toHaveAttribute("aria-disabled", "false");
      expect(await snapshot(page)).toEqual(before);
    }
  });

  test(`${locale} leaving a coordinate lookup and starting a new region cannot restore old places`, async ({ page }) => {
    await restoredTrip(page, locale);
    const before = await snapshot(page);
    let release!: () => void;
    const paused = new Promise<void>(resolve => { release = resolve; });
    let requested = 0;
    await page.route("**/api/wave?action=place-coordinates&contentId=1001", async route => {
      requested++; await paused;
      await route.fulfill({ json: { id: "1001", status: "available", mapX: "128.691", mapY: "35.238" } }).catch(() => {});
    });
    try {
      await page.getByRole("button", { name: en ? "Recheck place locations" : "장소 위치 다시 확인", exact: true }).press("Enter");
      await expect.poll(() => requested).toBe(1);
      await closeNaruTool(page);
      await page.getByRole("button", { name: "새 여행", exact: true }).click();
      await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue("");
      await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("하동");
      const fresh = await snapshot(page);
      expect(fresh.identity.id).not.toBe(before.identity.id);
      expect(fresh.ids).toEqual([]);
      release();
      const tripTab = page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: /^내 일정/ });
      await expect(tripTab).toBeDisabled();
      await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
      expect((await snapshot(page)).ids).toEqual([]);
      await page.reload();
      await expect(tripTab).toBeDisabled();
      await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue("하동");
      await expect(page.locator("#itinerary")).toHaveCount(0);
      expect((await snapshot(page)).identity.id).toBe(fresh.identity.id);
      expect((await snapshot(page)).ids).toEqual([]);
    } finally { release(); }
  });
}
