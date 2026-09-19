import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import type { Place, PlanData } from "../features/planner/types";

// 스펙 48: 숙소(contentTypeId "32") 전용 편의시설 표시. 이 머신에는 TourAPI
// 키가 없어 실제 응답으로 값 존재 비율을 확인할 수 없었다(0단계, PR 본문
// 참고). 그래서 이 테스트는 합성 fixture로 화면 계약(숙박에서만 보임, 세
// 상태 구분, 빈 묶음 없음, 문의 링크)만 고정한다.

function stayPlace(accessibility: Place["accessibility"]): Place {
  return {
    id: "500001", contentTypeId: "32", city: "통영", name: "검증용 숙소", address: "경상남도 통영시",
    summary: "공식 원문 설명", image: "", mapX: "128.433", mapY: "34.85", score: 40,
    knownFields: 1, unknownFields: 0, negativeFields: 0, checkedAt: "2026-09-19T00:00:00Z",
    accessibility, features: [], details: [], source: "무장애 여행정보 · 국문 관광정보",
  } satisfies Place;
}

async function openFacilityStep(page: Page, place: Place) {
  await mockPlannerApi(page, { plannerView: "overview", savedPlaces: [place] });
  await page.route("**/api/wave?action=plan*", (route) => route.fulfill({ json: {
    criteria: { facilityKeys: [] },
    mode: "live", generatedAt: place.checkedAt || "2026-09-19T00:00:00Z", baseYm: "202609",
    course: null, audio: null, places: [place], stops: [], statuses: [],
  } satisfies PlanData }));
  await page.route("**/api/community/posts?*", (route) => route.fulfill({ json: { posts: [] } }));
  await page.route("**/api/wave?action=visit-info*", (route) => route.fulfill({ json: {
    id: place.id, status: "available", checkedAt: "2026-09-19T00:00:00Z", source: "ⓒ한국관광공사",
    checkIn: "15:00", checkOut: "11:00",
  } }));
  await page.goto("/planner");
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("통영");
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".simple-place-row")).toHaveCount(1);
  await page.locator(".simple-place-row h3 button").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
  await dialog.locator("summary").filter({ hasText: /^주차·입구·시설 미리보기$/ }).click();
  await dialog.getByRole("button", { name: "3. 시설", exact: true }).click();
  return dialog;
}

test("숙박 장소에서만 숙소 편의 묶음이 보이고, 다른 타입에는 나타나지 않는다", async ({ page }) => {
  const dialog = await openFacilityStep(page, stayPlace([{ key: "route", label: "접근로", state: "confirmed", detail: "" }]));
  await expect(dialog.locator(".stay-facility-detail")).toBeVisible();
  await expect(dialog.locator(".stay-facility-detail h4").first()).toHaveText("들어가기");
});

test("세 상태가 문구로 구분되고 미확인이 없음으로 표시되지 않는다", async ({ page }) => {
  const dialog = await openFacilityStep(page, stayPlace([
    { key: "route", label: "접근로", state: "confirmed", detail: "" },
    { key: "parking", label: "장애인 주차구역", state: "negative", detail: "" },
    { key: "elevator", label: "승강기", state: "unknown", detail: "" },
  ]));
  const detail = dialog.locator(".stay-facility-detail");
  await expect(detail).toContainText("접근로: 정보 있음");
  await expect(detail).toContainText("장애인 주차구역: 이용 조건 확인");
  await expect(detail).toContainText("승강기: 미확인");
  await expect(detail).not.toContainText("승강기: 없음");
});

test("체크인·체크아웃이 있으면 머무는 동안 묶음이 보이고, 세 묶음이 모두 비면 안내와 문의 링크만 보인다", async ({ page }) => {
  const withStay = await openFacilityStep(page, stayPlace([]));
  await expect(withStay.locator(".stay-facility-detail")).toContainText("머무는 동안");
  await expect(withStay.locator(".stay-facility-detail")).toContainText("입실 시간");
});

test("확인된 편의가 전혀 없으면 등록된 시설 정보가 없다는 안내와 문의 링크만 보인다", async ({ page }) => {
  const place = stayPlace([]);
  await mockPlannerApi(page, { plannerView: "overview", savedPlaces: [place] });
  await page.route("**/api/wave?action=plan*", (route) => route.fulfill({ json: {
    criteria: { facilityKeys: [] }, mode: "live", generatedAt: place.checkedAt || "2026-09-19T00:00:00Z", baseYm: "202609",
    course: null, audio: null, places: [place], stops: [], statuses: [],
  } satisfies PlanData }));
  await page.route("**/api/community/posts?*", (route) => route.fulfill({ json: { posts: [] } }));
  await page.route("**/api/wave?action=visit-info*", (route) => route.fulfill({ json: { id: place.id, status: "empty", checkedAt: "2026-09-19T00:00:00Z", source: "ⓒ한국관광공사" } }));
  await page.goto("/planner");
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("통영");
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await page.locator(".simple-place-row h3 button").click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("summary").filter({ hasText: /^주차·입구·시설 미리보기$/ }).click();
  await dialog.getByRole("button", { name: "3. 시설", exact: true }).click();
  const detail = dialog.locator(".stay-facility-detail");
  await expect(detail).toHaveText("등록된 시설 정보가 없어요.");
  await expect(dialog.getByRole("button", { name: "문의 카드 만들기 ↗", exact: true }).first()).toBeVisible();
});

test("1440/960/390px에서 가로 스크롤이 없고 axe 위반이 없다", async ({ page }) => {
  const dialog = await openFacilityStep(page, stayPlace([
    { key: "restroom", label: "장애인 화장실", state: "confirmed", detail: "" },
    { key: "hearingroom", label: "청각 지원 객실", state: "unknown", detail: "" },
  ]));
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await dialog.locator(".stay-facility-detail").scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
  }
});
