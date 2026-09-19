import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import type { Place, PlanData } from "../features/planner/types";

// 스펙 08: 여행지 주변 음식점 목록 위에 확인된 편의 정보를 겹쳐 보여준다.
// 두 묶음(관광공사 등록 / 카카오 장소 검색)은 근거가 다르므로 섞지 않고, 각
// 묶음의 근거를 제목 아래에 적는다. 미확인을 없음으로 표시하지 않는다.
// 별점·후기 수·조회수·순위·인기 배지는 어디에도 두지 않는다.

interface NearbyFixture { requests: { code: string; callback: (places: unknown, status: string) => void }[] }

const destination: Place = {
  id: "1001", contentTypeId: "12", city: "창원", name: "경남도립미술관", address: "경상남도 창원시",
  summary: "공식 관광정보", image: "", mapX: "128.6800", mapY: "35.2300", score: 40,
  knownFields: 1, unknownFields: 0, negativeFields: 0, checkedAt: "2026-09-19T00:00:00Z",
  accessibility: [{ key: "route", label: "접근로", state: "confirmed", detail: "정문에 경사로가 있습니다" }],
  features: [], details: [], source: "무장애 여행정보 · 국문 관광정보",
};

const SOURCE = "한국관광공사 국문 관광정보 · 무장애 여행정보";
const facility = (key: string, label: string, state: "confirmed" | "negative" | "unknown") => ({ key, label, state });
const official = (id: string, name: string, distanceMeters: number, facilities: ReturnType<typeof facility>[], hours?: string) => ({
  id, evidence: "official" as const, name, address: "경상남도 창원시", distanceMeters,
  destination: { latitude: 35.23, longitude: 128.68 },
  ...(hours ? { hours } : {}), facilities, checkedAt: "2026-09-19T00:00:00Z", source: SOURCE,
});

const confirmedPlace = official("2001", "확인된 국숫집", 347, [
  facility("route", "접근로", "confirmed"),
  facility("restroom", "장애인 화장실", "negative"),
  facility("elevator", "승강기", "unknown"),
  facility("parking", "장애인 주차구역", "confirmed"),
  facility("wheelchair", "휠체어 대여", "unknown"),
], "11:00~21:00");
const unknownPlace = official("2002", "미확인 해물탕", 820, [
  facility("route", "접근로", "unknown"),
  facility("restroom", "장애인 화장실", "unknown"),
]);

const available = { status: "available", contentId: "1001", checkedAt: "2026-09-19T00:00:00Z", source: SOURCE, items: [confirmedPlace, unknownPlace] };

const kakaoPlace = (index: number, name: string, distance: string) => ({
  id: String(index), place_name: name, address_name: "경남 창원시", road_address_name: "경남 창원시 팔용로 1",
  x: "128.6810", y: "35.2300", distance, place_url: `https://place.map.kakao.com/${index}`, category_name: "음식점 > 한식",
});

async function openFacilitiesStep(page: Page, dining: unknown, status = 200) {
  await mockPlannerApi(page, { plannerView: "overview", savedPlaces: [destination] });
  await page.route("**/api/wave?action=plan*", (route) => route.fulfill({ json: {
    criteria: { facilityKeys: ["route"] },
    mode: "live", generatedAt: "2026-09-19T00:00:00Z", baseYm: "202609",
    course: null, audio: null, places: [destination], stops: [], statuses: [],
  } satisfies PlanData }));
  await page.route("**/api/community/posts?*", (route) => route.fulfill({ json: { posts: [] } }));
  await page.route("**/api/wave?action=dining-accessibility*", (route) => route.fulfill({ status, json: dining as Record<string, unknown> }));
  await page.route("**/api/map-config", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ provider: "kakao", javascriptKey: "e2e-stub-key" }) }));
  await page.addInitScript(() => {
    const state: NearbyFixture = { requests: [] };
    Object.assign(window, { diningNearbyFixture: state });
    class LatLng { constructor(private lat: number, private lng: number) {} getLat() { return this.lat; } getLng() { return this.lng; } }
    const maps = {
      load: (callback: () => void) => callback(), LatLng,
      services: {
        Places: class {
          categorySearch(code: string, callback: (places: unknown, status: string) => void) { state.requests.push({ code, callback }); }
          keywordSearch(code: string, callback: (places: unknown, status: string) => void) { this.categorySearch(code, callback); }
        },
        Status: { OK: "OK", ZERO_RESULT: "ZERO_RESULT", ERROR: "ERROR" }, SortBy: { DISTANCE: "DISTANCE" },
      },
    };
    Object.defineProperty(window, "kakao", { value: { maps }, writable: true });
  });
  await page.goto("/planner");
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await page.locator(".simple-place-row h3 button").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
  await dialog.locator("summary").filter({ hasText: /^주차·입구·시설 미리보기$/ }).click();
  await dialog.getByRole("button", { name: "3. 시설", exact: true }).click();
  return dialog.locator(".dining-accessibility");
}

async function deliverNearby(page: Page, places: unknown, status = "OK") {
  await expect.poll(() => page.evaluate(() => (window as unknown as { diningNearbyFixture: NearbyFixture }).diningNearbyFixture.requests.length)).toBeGreaterThan(0);
  await page.evaluate(({ places, status }) => (window as unknown as { diningNearbyFixture: NearbyFixture }).diningNearbyFixture.requests[0].callback(places, status), { places, status });
}

test("두 묶음이 각자의 근거 문구와 함께 보이고, 별점·후기·순위 표시가 어디에도 없다", async ({ page }) => {
  const list = await openFacilitiesStep(page, available);
  await expect(list.getByRole("heading", { name: "편의 정보가 확인된 음식점", exact: true })).toBeVisible();
  await expect(list).toContainText("한국관광공사 무장애 여행정보에 등록된 음식점이에요.");
  await expect(list.getByRole("heading", { name: "주변 음식점", exact: true })).toBeVisible();
  await expect(list).toContainText("카카오 장소 검색 결과예요. 편의시설은 확인되지 않았어요.");
  await expect(list).toContainText("여행지에서 약 350m");
  await expect(list).toContainText("운영시간: 11:00~21:00");
  await expect(list).toContainText("편의 정보는 공공데이터에 등록된 내용이에요. 정보가 없다고 해서 시설이 없는 것은 아니에요.");
  await expect(list).not.toContainText(/별점|후기|평점|조회수|순위|인기|★|\d+\.\d\s*점/);
});

test("편의 태그는 요청한 조건부터 최대 3개까지 보이고 나머지는 +N으로 접힌다", async ({ page }) => {
  const list = await openFacilitiesStep(page, available);
  const tags = list.getByRole("list", { name: "확인된 국숫집 편의시설", exact: true });
  await expect(tags.locator("li")).toHaveCount(4);
  await expect(tags.locator("li").nth(0)).toHaveText("접근로");
  await expect(tags.locator("li").nth(3)).toHaveText("+2");
});

test("미확인은 없음으로 표시되지 않고, 색을 빼고도 글자로 구분된다", async ({ page }) => {
  const list = await openFacilitiesStep(page, available);
  const tags = list.getByRole("list", { name: "미확인 해물탕 편의시설", exact: true });
  await expect(tags).toContainText("접근로 정보 없음");
  await expect(tags).not.toContainText("접근로 없음");
  const confirmed = list.getByRole("list", { name: "확인된 국숫집 편의시설", exact: true });
  // 확인됨은 시설 이름만, 명시적 부재는 `없음`, 미확인은 `정보 없음`으로 적는다.
  await expect(confirmed).toContainText("장애인 화장실 없음");
  await expect(confirmed).toContainText("접근로");
  // 상한을 넘겨 접힌 미확인 항목이 `없음`으로 새어나오지 않는다.
  await expect(confirmed).toContainText("+2");
  await expect(confirmed).not.toContainText("승강기 없음");
});

test("편의 확인이 실패해 모두 미확인이어도 목록은 남는다", async ({ page }) => {
  const allUnknown = { ...available, items: [{ ...confirmedPlace, facilities: confirmedPlace.facilities.map(item => ({ ...item, state: "unknown" as const })) }] };
  const list = await openFacilitiesStep(page, allUnknown);
  await expect(list).toContainText("확인된 국숫집");
  await expect(list).toContainText("접근로 정보 없음");
  await expect(list).not.toContainText("접근로 없음");
});

test("제공처 실패는 다시 시도를 주고, 빈 결과는 조건을 유지한 두 갈래를 함께 준다", async ({ page }) => {
  const failed = await openFacilitiesStep(page, { status: "provider-error", contentId: "1001", checkedAt: "", source: SOURCE, items: [], message: "음식점 정보를 받지 못했어요." }, 502);
  await expect(failed.getByRole("alert")).toContainText("음식점 정보를 받지 못했어요.");
  await expect(failed.getByRole("button", { name: "다시 시도", exact: true })).toBeVisible();

  const empty = await openFacilitiesStep(page, { status: "empty", contentId: "1001", checkedAt: "", source: SOURCE, items: [], message: "등록된 음식점 정보가 없어요." });
  await expect(empty).toContainText("등록된 음식점 정보가 없어요.");
  await expect(empty.getByRole("button", { name: "조건을 유지한 채 다른 지역 보기", exact: true })).toBeVisible();
  await expect(empty.getByRole("button", { name: "조건 바꾸기", exact: true })).toBeVisible();
});

test("카카오 장소 검색은 버튼을 눌렀을 때만 실행되고, 외부 링크는 새 창으로 안전하게 연다", async ({ page }) => {
  const list = await openFacilitiesStep(page, available);
  expect(await page.evaluate(() => (window as unknown as { diningNearbyFixture: NearbyFixture }).diningNearbyFixture.requests.length)).toBe(0);
  await list.getByRole("button", { name: "주변 음식점 더 보기", exact: true }).click();
  await deliverNearby(page, [kakaoPlace(11, "검색으로 찾은 분식", "120"), kakaoPlace(12, "확인된 국숫집", "350")]);
  await expect(list).toContainText("검색으로 찾은 분식");
  await expect(list).toContainText("여행지에서 약 120m");
  await expect(list).toContainText("음식 종류: 음식점 > 한식");
  await expect(list).toContainText("편의시설: 확인되지 않음");
  // 상호와 거리가 둘 다 맞는 카카오 항목은 관광공사 항목을 남기고 지운다.
  await expect(list.getByRole("link", { name: "장소 정보 보기 ↗", exact: true })).toHaveCount(1);
  const link = list.getByRole("link", { name: "장소 정보 보기 ↗", exact: true });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(link).toHaveAttribute("href", "https://place.map.kakao.com/11");
  // 외부 링크에 출발지 좌표를 붙이지 않는다.
  expect(await link.getAttribute("href")).not.toMatch(/from|sLat|sLng|35\.23|128\.68/);
});

test("카카오 검색이 실패해도 관광공사 목록은 그대로 남는다", async ({ page }) => {
  const list = await openFacilitiesStep(page, available);
  await list.getByRole("button", { name: "주변 음식점 더 보기", exact: true }).click();
  await deliverNearby(page, [], "ERROR");
  await expect(list).toContainText("주변 음식점을 불러오지 못했어요.");
  await expect(list).toContainText("확인된 국숫집");
});

test("키보드만으로 목록을 열고 외부 링크까지 닿을 수 있다", async ({ page }) => {
  const list = await openFacilitiesStep(page, available);
  const more = list.getByRole("button", { name: "주변 음식점 더 보기", exact: true });
  await more.focus();
  await expect(more).toBeFocused();
  await page.keyboard.press("Enter");
  await deliverNearby(page, [kakaoPlace(11, "검색으로 찾은 분식", "120")]);
  const link = list.getByRole("link", { name: "장소 정보 보기 ↗", exact: true });
  await link.focus();
  await expect(link).toBeFocused();
  // 조작 영역은 44px 이상을 유지한다.
  const box = await link.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});

test("1440/960/390px에서 가로 스크롤이 없고 axe 위반이 없다", async ({ page }) => {
  const list = await openFacilitiesStep(page, available);
  await list.getByRole("button", { name: "주변 음식점 더 보기", exact: true }).click();
  await deliverNearby(page, [kakaoPlace(11, "검색으로 찾은 분식", "120")]);
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await list.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
  }
});
