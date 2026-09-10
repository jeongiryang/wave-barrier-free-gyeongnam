import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

async function restoredTrip(page: Page, locale: "ko" | "en") {
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(value => {
    localStorage.setItem("wave-locale", value);
    localStorage.setItem("wave-travel-book-v1", JSON.stringify([{
      id: "coordinate-recovery", title: "창원 1곳 여행", region: "창원", theme: "nature", profiles: [],
      travelStart: "2026-09-07", travelEnd: "2026-09-07", dayStartTime: "10:00",
      createdAt: "2026-09-07T00:00:00Z", updatedAt: "2026-09-07T00:00:00Z", status: "planned", note: "",
      places: [{ id: "1001", name: "경남도립미술관", city: "창원", address: "경남 창원", image: "", score: null, knownFields: 0, source: "한국관광공사" }],
      scheduleAssignments: { "1001": "2026-09-07" },
    }]));
  }, locale);
  await page.goto("/travel-book");
  // The travel-book page currently retains its Korean labels; the restored
  // planner honors the selected locale. Do not pretend this page is translated.
  await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
  await expect(page).toHaveURL(/#itinerary$/);
  await page.locator(".reference-itinerary-details > summary").click();
}

for (const [mapX, mapY] of [["0", "0"], ["139.7", "35.6"], ["NaN", "35.2"], ["128.6", "Infinity"], ["128.6", ""]]) {
  for (const locale of ["ko", "en"] as const) {
    test(`${locale} invalid place ${mapX},${mapY} is recoverable but never mapped or sent as a journey`, async ({ page }) => {
      await mockPlannerApi(page, { placeCoordinate: { mapX, mapY } });
      await page.emulateMedia({ reducedMotion: "reduce" });
      let routeCalls = 0;
      page.on("request", request => { if (new URL(request.url()).pathname === "/api/route") routeCalls++; });
      await page.goto("/planner");
      await chooseTripConditions(page);
      await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
      if (locale === "en") {
        // The header is hidden while scrolling through recommendations. Use
        // the same keyboard route a user takes back to the preferences control.
        await page.keyboard.press("Control+Home");
        await expect(page.getByLabel("환경설정 열기", { exact: true })).toBeInViewport();
        await page.getByLabel("환경설정 열기", { exact: true }).click();
        await page.getByRole("combobox", { name: "언어", exact: true }).selectOption("en");
        await page.getByLabel("Open preferences", { exact: true }).click();
      }
      const en = locale === "en";
      await expect(page.locator(".reference-itinerary-details > .route-scope-note")).toContainText(en ? "0 of 1 itinerary places" : "일정 1곳 중 지도에 표시할 수 있는 장소 0곳");
      const recovery = page.getByRole("button", { name: en ? "Recheck place locations" : "장소 위치 다시 확인", exact: true });
      await expect(recovery).toBeVisible();
      await expect(recovery).toHaveAttribute("aria-disabled", "false");
      await expect(page.locator(".itinerary-route-coverage")).toContainText(en ? "Coordinates unavailable" : "좌표 미확인");
      const check = page.getByRole("button", { name: en ? "Check all journeys" : "모든 구간 조회하기", exact: true });
      await check.click();
      await expect(check).toHaveAttribute("aria-busy", "false");
      expect(routeCalls).toBe(0);
      await expect(page.getByRole("status").filter({ hasText: en ? "Coordinates unavailable:" : "좌표를 확인하지 못한 장소:" })).toContainText("경남도립미술관");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    });
  }
}

for (const locale of ["ko", "en"] as const) {
  const en = locale === "en";
  test(`${locale} an empty location lookup offers explicit regional search without replacing saved places`, async ({ page }) => {
    await restoredTrip(page, locale);
    let searches = 0;
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.pathname === "/api/wave" && url.searchParams.get("action") === "plan") searches++;
    });
    await page.route("**/api/wave?action=place-coordinates&contentId=1001", route => route.fulfill({ json: { id: "1001", status: "empty" } }));
    await page.getByRole("button", { name: en ? "Recheck place locations" : "장소 위치 다시 확인", exact: true }).press("Enter");
    const recovery = page.getByRole("region", { name: en ? "Recheck saved place locations" : "저장 장소 위치 재확인", exact: true });
    await expect(recovery).toHaveAttribute("lang", locale);
    await expect(recovery.getByRole("status").locator("li > span")).toHaveAttribute("lang", "ko");
    await expect(recovery.getByRole("status")).toContainText(en ? "not found" : "찾지 못했습니다");
    const alternative = page.getByRole("link", { name: en ? "Review trip preferences" : "여행 조건에서 다시 찾기", exact: true });
    await expect(alternative).toBeVisible();
    expect((await alternative.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
    await alternative.press("Enter");
    await expect(page).toHaveURL(/#conditions$/);
    expect(searches).toBe(0);
    await page.locator(".journey-mode-toggle").getByRole("button", { name: en ? "Overview" : "전체 보기", exact: true }).click();
    await page.getByRole("button", { name: en ? /Wheelchair facilities/ : /휠체어 편의시설/ }).click();
    const activity = page.getByRole("button", { name: en ? /Nature and relaxation/ : /자연·휴양 공원/ });
    const search = page.getByRole("button", { name: en ? "Find places →" : "여행지 찾기 →", exact: true });
    await expect(activity).toHaveAttribute("aria-pressed", "true");
    await activity.click();
    await expect(activity).toHaveAttribute("aria-pressed", "false");
    await expect(search).toBeDisabled();
    await activity.click();
    await expect(activity).toHaveAttribute("aria-pressed", "true");
    await expect(search).toBeEnabled();
    expect(searches).toBe(0);
    await search.click();
    await expect(page.locator(".reference-itinerary-details > .route-scope-note")).toContainText(en ? "1 of 1 itinerary places" : "일정 1곳 중 지도에 표시할 수 있는 장소 1곳");
    await expect(recovery.getByRole("status")).toContainText(en ? "A location is now available for this itinerary." : "현재 일정에서 사용할 수 있는 위치가 있습니다.");
    await expect(recovery.getByRole("status")).not.toContainText(en ? "not found" : "찾지 못했습니다");
    await expect(recovery.getByRole("status")).not.toContainText(en ? "Official place location checked" : "공식 장소 위치를 확인했습니다");
    await expect(recovery.getByRole("button")).toHaveAttribute("aria-disabled", "true");
    expect(searches).toBe(1);
    await expect(page.locator(".reference-itinerary-details").getByRole("combobox", { name: en ? "경남도립미술관 trip date" : "경남도립미술관 여행 날짜" })).toHaveValue("2026-09-07");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values["wave-saved-places"])).toBe('["1001"]');
    expect(await page.evaluate(() => localStorage.getItem("wave-travel-book-v1"))).not.toMatch(/mapX|mapY/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });

  test(`${locale} archived place coordinates are explicitly rechecked without changing dates, order or privacy`, async ({ page }) => {
    await restoredTrip(page, locale);
    let requests = 0;
    await page.route("**/api/wave?action=place-coordinates&contentId=1001", async route => {
      requests++;
      await route.fulfill({ json: { id: "1001", status: "available", mapX: "128.691", mapY: "35.238" } });
    });
    const scope = page.locator(".reference-itinerary-details > .route-scope-note");
    await expect(scope).toContainText(en ? "0 of 1 itinerary places" : "일정 1곳 중 지도에 표시할 수 있는 장소 0곳");
    expect(requests).toBe(0);
    const trigger = page.getByRole("button", { name: en ? "Recheck place locations" : "장소 위치 다시 확인", exact: true });
    await trigger.press("Enter");
    await expect(scope).toContainText(en ? "1 of 1 itinerary places" : "일정 1곳 중 지도에 표시할 수 있는 장소 1곳");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-disabled", "true");
    expect((await trigger.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole("status").filter({ hasText: en ? "Official place location checked" : "공식 장소 위치를 확인" })).toContainText("경남도립미술관");
    await expect(page.locator(".reference-itinerary-details").getByRole("combobox", { name: en ? "경남도립미술관 trip date" : "경남도립미술관 여행 날짜" })).toHaveValue("2026-09-07");
    expect(await page.evaluate(() => localStorage.getItem("wave-travel-book-v1"))).not.toMatch(/mapX|mapY|128\.691|35\.238/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.reload();
    await page.locator(".reference-itinerary-details > summary").click();
    await expect(scope).toContainText(en ? "1 of 1 itinerary places" : "일정 1곳 중 지도에 표시할 수 있는 장소 1곳");
    expect(requests).toBe(1);
  });

  test(`${locale} empty, wrong ID and provider errors remain retryable and cannot add markers`, async ({ page }) => {
    await restoredTrip(page, locale);
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
      await expect(page.locator(".reference-itinerary-details > .route-scope-note")).toContainText(en ? "0 of 1 itinerary places" : "일정 1곳 중 지도에 표시할 수 있는 장소 0곳");
      await expect(trigger).toHaveAttribute("aria-disabled", "false");
    }
  });

  test(`${locale} leaving a coordinate lookup and starting a new region cannot restore old places`, async ({ page }) => {
    await restoredTrip(page, locale);
    let release!: () => void;
    const paused = new Promise<void>(resolve => { release = resolve; });
    let requested!: () => void;
    const started = new Promise<void>(resolve => { requested = resolve; });
    await page.route("**/api/wave?action=place-coordinates&contentId=1001", async route => {
      requested(); await paused;
      await route.fulfill({ json: { id: "1001", status: "available", mapX: "128.691", mapY: "35.238" } }).catch(() => {});
    });
    await page.getByRole("button", { name: en ? "Recheck place locations" : "장소 위치 다시 확인", exact: true }).press("Enter");
    await started;
    await page.locator(".reference-progress button").first().click();
    await page.locator(".reference-section-label button").click();
    await page.getByRole("button", { name: en ? "Hadong" : "하동", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: en ? "Start a new trip" : "새 여행으로 시작", exact: true }).click();
    release();
    await expect(page.locator(".reference-journey-views button").nth(1)).toBeDisabled();
    await page.reload();
    await expect(page.locator(".reference-journey-views button").nth(1)).toBeDisabled();
    await expect(page.getByRole("button", { name: "하동 지역 선택", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("region", { name: en ? "My itinerary What order works for your trip?" : "내 일정 어떤 순서로 움직이면 편할까요?", exact: true })).toHaveCount(0);
  });
}
