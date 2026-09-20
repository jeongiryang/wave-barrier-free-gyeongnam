import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, openItinerary } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

test("320px·390px·768px·1440px 직접 검색은 정보 상태·담기·되돌리기·일정 이동을 유지한다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "대표 Chromium 프로젝트에서 네 뷰포트를 직접 확인합니다.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/location-search?**", route => route.fulfill({ json: { places: [{ id: "544", name: "파도 카페", address: "경상남도 창원시 의창구", category: "카페", categoryCode: "CE7", region: "창원시", resultType: "cafe", summary: "음식점 · 카페", mapX: "128.68", mapY: "35.23", placeUrl: "https://place.map.kakao.com/544" }] } }));
  await mockPlannerApi(page, { preserveView: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
    await page.goto("/planner");
    await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
    const search = page.getByRole("combobox", { name: "여행지 검색", exact: true });
    await search.fill("파도 카페");
    await search.press("Enter");
    const result = page.locator("#direct-place-results").getByRole("listitem").filter({ hasText: "파도 카페" });
    await expect(result).toContainText("창원시 · 카페");
    await expect(result).toContainText("운영시간미확인");
    await expect(result).toContainText("편의·접근성미확인");
    await result.getByRole("button", { name: "파도 카페 일정에 담기", exact: true }).click();
    await expect(result.getByRole("button", { name: "파도 카페 담았음 · 되돌리기", exact: true })).toHaveAttribute("aria-pressed", "true");
    const build = page.getByRole("button", { name: "날짜 정하기", exact: true });
    await expect(build).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await result.getByRole("button", { name: "파도 카페 담았음 · 되돌리기", exact: true }).click();
    await expect(build).toHaveCount(0);
  }
});

test("390px·768px·1440px에서 지역 검색·담기·날짜 설정은 단일 일정으로 이어진다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "대표 Chromium 프로젝트에서 세 뷰포트를 직접 확인합니다.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page, { preserveView: true });
  const consoleErrors: string[] = [];
  page.on("pageerror", error => consoleErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) consoleErrors.push(message.text());
  });

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/planner");
    const tabs = page.getByRole("group", { name: "여행 설계 화면", exact: true });
    await tabs.getByRole("button", { name: "여행지 찾기", exact: true }).click();
    await expect(tabs.getByRole("button", { name: /^내 일정/ })).toBeDisabled();
    const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
    await expect(region).toBeEnabled();
    await region.selectOption("창원");
    await expect(page.locator(".simple-results").getByRole("heading", { name: "창원 여행지", exact: true })).toBeVisible();
    await expect(page.locator("#conditions")).toBeVisible();
    await expect(page.locator(".simple-itinerary-view")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), width + "px 화면의 가로 넘침").toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
    await expect(page.locator(".simple-results")).toBeVisible();
    await openItinerary(page, { start: "2026-09-20" });
    const itinerary = page.getByRole("region", { name: "날짜별 여행 일정", exact: true });
    await expect(itinerary).toHaveCount(1);
    await expect(page.locator(".simple-itinerary-board")).toHaveCount(1);
    await expect(page.locator(".simple-browse-view")).toBeHidden();
    await expect(page.locator(".simple-itinerary-heading")).toContainText("2026-09-20");
    await expect(itinerary.locator("#itinerary-stop-1001")).toContainText("경남도립미술관");
    await expect(page.locator(".simple-departure > summary").getByText("일정 점검", { exact: true })).toBeVisible();
    await expect(page.locator(".simple-more-trip-tools")).not.toHaveAttribute("open");
    const screenshotPath = testInfo.outputPath("planner-" + width + "px.png");
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach("planner-" + width + "px", { path: screenshotPath, contentType: "image/png" });
    await itinerary.getByRole("button", { name: "경남도립미술관 일정 수정", exact: true }).click();
    await page.getByRole("dialog", { name: "경남도립미술관 수정", exact: true }).getByRole("button", { name: "일정에서 빼기", exact: true }).click();
    await expect(page.locator("#itinerary-stop-1001")).toHaveCount(0);
    await expect(tabs.getByRole("button", { name: "여행지 찾기", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(tabs.getByRole("button", { name: /^내 일정/ })).toBeDisabled();
    await expect(region).toHaveValue("창원");
    await expect(page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true })).toBeEnabled();
    await expect.poll(() => page.evaluate(() => {
      const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
      const schedule = JSON.parse(values["wave-trip-schedule-v1"] || "{}");
      return { ids: JSON.parse(values["wave-saved-places"] || "[]"), dates: [schedule.travelStart, schedule.travelEnd] };
    })).toEqual({ ids: [], dates: ["2026-09-20", "2026-09-20"] });
  }
  expect(consoleErrors).toEqual([]);
});

test("랜딩 딥링크와 두 화면 탭·헤더는 현재 날짜·편의를 유지한 실제 일정과 지도를 연다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.goto("/");
  await expect(page.locator(".landing-actions a[href='/planner']")).toHaveAttribute("href", "/planner");
  await page.locator(".landing-actions a[href='/planner']").click();
  await expect(page).toHaveURL(/\/planner$/);

  await page.goto("/planner#navigation");
  const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(region).toBeEnabled();
  await expect(page.locator("#conditions")).toBeVisible();
  await expect(page.locator("#itinerary")).toHaveCount(0);
  await page.getByRole("button", { name: "필요한 편의", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "필요한 편의", exact: true });
  await picker.getByRole("checkbox", { name: "접근로", exact: true }).check();
  await picker.getByRole("button", { name: "적용 · 1개", exact: true }).click();
  await region.selectOption("창원");
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page, { start: "2026-09-20", end: "2026-09-21" });
  if ((page.viewportSize()?.width || 1440) < 1024) await page.getByRole("group", { name: "일정 보기 방식", exact: true }).getByRole("button", { name: "지도", exact: true }).click();
  await expect(page.locator("#navigation .leaflet-container")).toBeVisible();
  const tabs = page.getByRole("group", { name: "여행 설계 화면", exact: true });
  await expect(tabs.getByRole("button", { name: /^내 일정/ })).toHaveAttribute("aria-pressed", "true");
  const snapshot = () => page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    return { places: values["wave-saved-places"], schedule: values["wave-trip-schedule-v1"], facilities: sessionStorage.getItem("wave-session-facilities-v1") };
  });
  const before = await snapshot();

  await tabs.getByRole("button", { name: "여행지 찾기", exact: true }).click();
  await expect(page.locator("#conditions")).toBeVisible();
  await expect(page.getByRole("button", { name: "필요한 편의 · 1개", exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const itineraryAction = page.getByRole("button", { name: "내 여행, 담은 장소 1곳", exact: true });
  await expect(itineraryAction).toBeInViewport();
  await itineraryAction.click();
  await expect(page.locator("#itinerary")).toBeVisible();
  await expect(page.locator("#navigation .leaflet-container")).toBeVisible();
  await expect(tabs.getByRole("button", { name: /^내 일정/ })).toHaveAttribute("aria-pressed", "true");
  expect(await snapshot()).toEqual(before);
});
