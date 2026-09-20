import { acceptTripTimingWarning } from './trip-timing-fixtures';
import { openNaruTool } from './naru-tool-fixtures';
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions, openItinerary, plan } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
});

function observeRestoreRequests(page: Page) {
  const requests: URL[] = [];
  page.on("requestfinished", request => {
    const url = new URL(request.url());
    if (url.pathname === "/api/wave") requests.push(url);
  });
  return requests;
}

async function expectRestoredEvidence(page: Page, requests: URL[]) {
  // A restored region now starts a background recommendation automatically.
  // Await both completed responses before asserting the saved-ID/map contract.
  await expect.poll(() => requests.filter(url => url.searchParams.get("action") === "places").length).toBe(1);
  await expect.poll(() => requests.filter(url => url.searchParams.get("action") === "plan").length).toBe(1);
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  const lookups = requests.filter(url => url.searchParams.get("action") === "places");
  expect(lookups).toHaveLength(1);
  expect(lookups[0].searchParams.get("ids")).toBe("1001");
  expect(lookups[0].searchParams.get("profiles")?.split(",")).toEqual(["parking", "route", "wheelchair", "elevator", "restroom"]);
  expect(await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values["wave-saved-places"]))).toEqual(["1001"]);
}

async function openMap(page: Page) {
  if ((page.viewportSize()?.width || 1440) < 1024) await page.getByRole("group", { name: "일정 보기 방식", exact: true }).getByRole("button", { name: "지도", exact: true }).click();
  await expect(page.locator(".route-map-canvas")).toBeVisible();
  await expect(page.locator(".wave-map-icon.origin")).toHaveCount(1);
}

test("보관 일정을 열면 자동 조회 후에도 같은 일정과 누락된 지도 위치를 확인한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  // In this branch the provider's saved-ID response also lacks coordinates.
  // A valid newer coordinate is allowed to repair a restored archive elsewhere.
  await mockPlannerApi(page, { preserveView: true, placeCoordinate: { mapX: "", mapY: "" }, savedPlaces: plan.places.map(place => ({ ...place, mapX: "", mapY: "" })) });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page, { start: "2026-10-07" });
  await page.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
  await acceptTripTimingWarning(page);
  await expect(page.locator(".simple-save-control [role=status]")).toContainText("내 여행에 저장했어요");
  await page.getByRole("link", { name: "저장한 여행", exact: true }).click();
  await expect(page.getByRole("list", { name: "선택한 편의조건" }).getByRole("listitem")).toHaveText(["장애인 주차구역", "접근로", "휠체어 대여", "승강기", "장애인 화장실"]);
  const restoreRequests = observeRestoreRequests(page);
  await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
  await expect(page).toHaveURL(/from=travel-book#itinerary$/);
  await expect(page.locator(".simple-stops .simple-stop-copy").getByRole("button", { name: "경남도립미술관", exact: true })).toBeVisible();
  await expectRestoredEvidence(page, restoreRequests);
  await openMap(page);
  await expect(page.locator(".wave-map-icon.place")).toHaveCount(0);
  await openNaruTool(page, '장소 좌표 복원');
  await expect(page.getByRole("status").filter({ hasText: "좌표가 없는 장소는 일정에 보관하고 지도에서 제외해요:" })).toContainText("경남도립미술관");
  // The privacy contract still excludes coordinates from the archive; never
  // substitute unrelated recommendations or invented markers during restore.
  expect(await page.evaluate(() => localStorage.getItem("wave-travel-book-v1"))).not.toMatch(/mapX|mapY|128\.691|35\.238/);
});

test("플래너의 일정은 로컬 여행집에서 기록하고 다시 복원할 수 있다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page, { preserveView: true });
  await page.goto("/planner?travelStart=2026-09-01&travelEnd=2026-09-02");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page, { start: "2026-09-01", end: "2026-09-02" });
  const itinerary = page.locator("#itinerary");
  await itinerary.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
  await acceptTripTimingWarning(page);
  await expect(itinerary.locator(".simple-save-control [role=status]")).toContainText("내 여행에 저장했어요");

  const serialized = await page.evaluate(() => window.localStorage.getItem("wave-travel-book-v1") || "");
  expect(serialized).toContain("경남도립미술관");
  expect(serialized).not.toMatch(/mapX|mapY|128\.691|35\.238/);

  await itinerary.getByRole("link", { name: "저장한 여행", exact: true }).click();
  await expect(page).toHaveURL(/\/travel-book$/);
  await expect(page.getByRole("heading", { name: "창원 1곳 여행" })).toBeVisible();
  await expect(page.getByRole("link", { name: '계정에 저장한 여행', exact: true })).toBeVisible();
  await expect(page.getByText("경남도립미술관")).toBeVisible();
  await expect(page.getByRole("link", { name: "사진으로 코스 되살리기" })).toHaveAttribute("href", "/photo-course");
  await expect(page.getByRole("link", { name: "여행 후기 초안" })).toHaveAttribute("href", /draft=journal/);

  await page.getByRole("button", { name: "다녀온 여행" }).click();
  const note = page.getByPlaceholder(/현장에서 편했던 동선/);
  await note.fill("입구 경사로가 편했고 오전 방문이 여유로웠다.");
  await note.blur();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("wave-travel-book-v1") || "")).toContain("오전 방문이 여유로웠다");
  await page.reload();
  await expect(page.getByRole("button", { name: "다녀온 여행" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByPlaceholder(/현장에서 편했던 동선/)).toHaveValue("입구 경사로가 편했고 오전 방문이 여유로웠다.");

  const restoreRequests = observeRestoreRequests(page);
  // The automatic recommendation does not contain the saved museum. Its exact
  // ID refresh must restore it independently and must not add the park instead.
  await page.route("**/api/wave?**", route => new URL(route.request().url()).searchParams.get("action") === "plan"
    ? route.fulfill({ json: { ...plan, places: [plan.places[1]], stops: [plan.stops[1]] } }) : route.fallback());
  await page.getByRole("button", { name: /이 일정 다시 열기/ }).click();
  await expect(page).toHaveURL(/\/planner\?.*from=travel-book/);
  await expect(page.getByRole("region", { name: "날짜별 여행 일정" }).getByText("경남도립미술관").first()).toBeVisible();
  await expectRestoredEvidence(page, restoreRequests);
  await openMap(page);
  await expect(page.locator('.wave-map-icon.place[data-place-id="1001"]')).toHaveCount(1);
  await expect(page.locator('.wave-map-icon.place[data-place-id="1002"]')).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "좌표가 없는 장소는 일정에 보관하고 지도에서 제외해요:" })).toHaveCount(0);
  await itinerary.getByRole("button", { name: "여행 설정", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "여행 설정", exact: true });
  await expect(settings.getByLabel("시작일", { exact: true })).toHaveValue("2026-09-01");
  await expect(settings.getByLabel("마지막 날", { exact: true })).toHaveValue("2026-09-02");
  expect(await page.evaluate(() => localStorage.getItem("wave-travel-book-v1"))).not.toMatch(/mapX|mapY|128\.691|35\.238/);
});

test("여행집의 주요 조작은 44px 이상이고 삭제는 확인을 거친다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("wave-travel-book-v1", JSON.stringify([{
      id: "book-mobile", fingerprint: "mobile", title: "창원 한 곳 여행", region: "창원", theme: "휴양", profiles: ["걷기 불편"],
      travelStart: "2026-09-01", travelEnd: "2026-09-01", dayStartTime: "10:00", createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", status: "planned", note: "",
      places: [{ id: "1001", name: "경남도립미술관", city: "창원", address: "경남 창원", image: "", score: 100, knownFields: 4, source: "한국관광공사" }], scheduleAssignments: { "1001": "2026-09-01" },
    }]));
  });
  await page.goto("/travel-book");
  for (const control of [
    page.getByRole("button", { name: "갈 여행" }),
    page.getByRole("button", { name: /이 일정 다시 열기/ }),
    page.getByRole("link", { name: "사진으로 코스 되살리기" }),
  ]) {
    const box = await control.boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "여행집에서 삭제" }).click();
  const deleteTrigger = page.getByRole("button", { name: "여행집에서 삭제" });
  await expect(deleteTrigger).toHaveAttribute("aria-expanded", "true");
  await expect(deleteTrigger).toHaveAttribute("aria-controls", /travel-book-delete-/);
  await expect(page.getByText("이 여행을 삭제할까요?")).toBeVisible();
  await expect(page.getByRole("button", { name: "삭제 확인" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(deleteTrigger).toHaveAttribute("aria-expanded", "false");
  await expect(deleteTrigger).toBeFocused();

  const note = page.getByRole("textbox", { name: "출발 전에 기억할 점" });
  await note.fill("출발 전 운영시간 확인");
  await note.blur();
  await expect(page.getByRole("status").filter({ hasText: "메모를 저장했습니다" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "창원 한 곳 여행" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
});
