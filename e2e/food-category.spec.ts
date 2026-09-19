import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import type { Place, PlanData } from "../features/planner/types";

// 스펙 39: 음식 종류로 거르기. 카카오 장소 검색 묶음(주변 음식점)에서만
// 동작한다. 관광공사 묶음(`areaBasedList2`)은 분류 이름을 주지 않으므로
// `category`가 없고, 종류 선택 줄도 그려지지 않는다. 새 네트워크 요청을
// 만들지 않고 이미 받은 카카오 검색 결과에만 거른다.

interface NearbyFixture { requests: { code: string; callback: (places: unknown, status: string) => void }[] }

const destination: Place = {
  id: "1001", contentTypeId: "12", city: "창원", name: "경남도립미술관", address: "경상남도 창원시",
  summary: "공식 관광정보", image: "", mapX: "128.6800", mapY: "35.2300", score: 40,
  knownFields: 1, unknownFields: 0, negativeFields: 0, checkedAt: "2026-09-19T00:00:00Z",
  accessibility: [{ key: "route", label: "접근로", state: "confirmed", detail: "정문에 경사로가 있습니다" }],
  features: [], details: [], source: "무장애 여행정보 · 국문 관광정보",
};

const SOURCE = "한국관광공사 국문 관광정보 · 무장애 여행정보";
const available = {
  status: "available", contentId: "1001", checkedAt: "2026-09-19T00:00:00Z", source: SOURCE,
  items: [{
    id: "2001", evidence: "official" as const, name: "확인된 국숫집", address: "경상남도 창원시", distanceMeters: 347,
    destination: { latitude: 35.23, longitude: 128.68 }, facilities: [], checkedAt: "2026-09-19T00:00:00Z", source: SOURCE,
  }],
};

const kakaoPlace = (index: number, name: string, distance: string, category: string) => ({
  id: String(index), place_name: name, address_name: "경남 창원시", road_address_name: "경남 창원시 팔용로 1",
  x: "128.6810", y: "35.2300", distance, place_url: `https://place.map.kakao.com/${index}`, category_name: category,
});

async function openFacilitiesStep(page: Page) {
  await mockPlannerApi(page, { plannerView: "overview", savedPlaces: [destination] });
  await page.route("**/api/wave?action=plan*", (route) => route.fulfill({ json: {
    criteria: { facilityKeys: ["route"] },
    mode: "live", generatedAt: "2026-09-19T00:00:00Z", baseYm: "202609",
    course: null, audio: null, places: [destination], stops: [], statuses: [],
  } satisfies PlanData }));
  await page.route("**/api/community/posts?*", (route) => route.fulfill({ json: { posts: [] } }));
  await page.route("**/api/wave?action=dining-accessibility*", (route) => route.fulfill({ status: 200, json: available }));
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

let searchCallCount = 0;
test.beforeEach(() => { searchCallCount = 0; });

async function deliverNearby(page: Page, places: unknown, status = "OK") {
  searchCallCount += 1;
  await expect.poll(() => page.evaluate(() => (window as unknown as { diningNearbyFixture: NearbyFixture }).diningNearbyFixture.requests.length)).toBeGreaterThanOrEqual(searchCallCount);
  // 재검색 시 이전 요청이 취소되므로 항상 마지막(가장 최근) 요청에 응답한다.
  await page.evaluate(({ places, status }) => {
    const { requests } = (window as unknown as { diningNearbyFixture: NearbyFixture }).diningNearbyFixture;
    requests[requests.length - 1].callback(places, status);
  }, { places, status });
}

async function searchWithPlaces(page: Page, places: unknown[]) {
  const list = await openFacilitiesStep(page);
  await list.getByRole("button", { name: "주변 음식점 더 보기", exact: true }).click();
  await deliverNearby(page, places);
  return list;
}

test("관광공사 묶음(편의 정보가 확인된 음식점)에는 종류 선택 줄이 없다", async ({ page }) => {
  const list = await openFacilitiesStep(page);
  await expect(list.getByRole("list", { name: "편의 정보가 확인된 음식점 종류" })).toHaveCount(0);
});

test("지금 결과에 실제로 나타난 종류만 개수와 함께 선택지로 보이고, 여러 개를 동시에 고를 수 있다", async ({ page }) => {
  const list = await searchWithPlaces(page, [
    kakaoPlace(11, "한식집A", "100", "음식점 > 한식 > 국밥"),
    kakaoPlace(12, "한식집B", "150", "음식점 > 한식 > 냉면"),
    kakaoPlace(13, "카페A", "200", "음식점 > 카페"),
  ]);
  const chips = list.getByRole("list", { name: "주변 음식점 종류" });
  await expect(chips).toBeVisible();
  await expect(chips.getByRole("button", { name: /한식 2/ })).toBeVisible();
  await expect(chips.getByRole("button", { name: /카페 1/ })).toBeVisible();
  // 결과에 없는 종류(중식 등)는 선택지로 나타나지 않는다.
  await expect(chips.getByRole("button", { name: /중식/ })).toHaveCount(0);

  const foodChip = chips.getByRole("button", { name: /한식 2/ });
  await expect(foodChip).toHaveAttribute("aria-pressed", "false");
  await foodChip.click();
  await expect(foodChip).toHaveAttribute("aria-pressed", "true");
  await expect(list).toContainText("한식집A");
  await expect(list).toContainText("한식집B");
  await expect(list).not.toContainText("카페A");

  // 여러 종류를 동시에 고르면 합집합으로 보여준다.
  await chips.getByRole("button", { name: /카페 1/ }).click();
  await expect(list).toContainText("카페A");
});

test("선택으로 결과가 0개가 되어도 자동으로 꺼지지 않고, 선택 지우기를 제공한다", async ({ page }) => {
  const list = await searchWithPlaces(page, [kakaoPlace(11, "한식집A", "100", "음식점 > 한식")]);
  const chips = list.getByRole("list", { name: "주변 음식점 종류" });
  const chip = chips.getByRole("button", { name: /한식 1/ });
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  // 다시 검색해 이번에는 한식이 전혀 없는 결과를 준다. 선택은 그대로 남아
  // 있으므로(자동으로 꺼지지 않으므로) 표시되는 곳이 0개가 된다.
  await list.getByRole("button", { name: "주변 음식점 더 보기", exact: true }).click();
  await deliverNearby(page, [kakaoPlace(22, "카페B", "80", "음식점 > 카페")]);
  await expect(list).toContainText("고른 종류에 맞는 곳이 없어요.");
  await expect(list).not.toContainText("카페B");
  await list.getByRole("button", { name: "선택 지우기", exact: true }).first().click();
  await expect(list).toContainText("카페B");
});

test("분류 문자열이 없는 항목이 숨겨지면 알리고 함께 보기를 제공한다", async ({ page }) => {
  const list = await searchWithPlaces(page, [
    kakaoPlace(11, "한식집A", "100", "음식점 > 한식"),
    { ...kakaoPlace(12, "분류없음가게", "150", ""), category_name: undefined },
  ]);
  const chips = list.getByRole("list", { name: "주변 음식점 종류" });
  await chips.getByRole("button", { name: /한식 1/ }).click();
  await expect(list).toContainText("종류가 등록되지 않은 1곳은 숨겨졌어요.");
  await expect(list).not.toContainText("분류없음가게");
  await list.getByRole("button", { name: "함께 보기", exact: true }).click();
  await expect(list).toContainText("분류없음가게");
});

test("켜짐은 색 외에 aria-pressed와 체크 표시로도 구분된다", async ({ page }) => {
  const list = await searchWithPlaces(page, [kakaoPlace(11, "한식집A", "100", "음식점 > 한식")]);
  const chips = list.getByRole("list", { name: "주변 음식점 종류" });
  const chip = chips.getByRole("button", { name: /한식 1/ });
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
  await expect(chip.locator("svg")).toHaveCount(1);
});

test("선택으로 인한 새 네트워크 요청이 없다", async ({ page }) => {
  const list = await searchWithPlaces(page, [
    kakaoPlace(11, "한식집A", "100", "음식점 > 한식"),
    kakaoPlace(12, "카페A", "150", "음식점 > 카페"),
  ]);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  const chips = list.getByRole("list", { name: "주변 음식점 종류" });
  await chips.getByRole("button", { name: /한식 1/ }).click();
  await chips.getByRole("button", { name: /카페 1/ }).click();
  await chips.getByRole("button", { name: "선택 지우기", exact: true }).click();
  expect(requests.filter((url) => url.includes("/api/"))).toEqual([]);
});

test("1440/960/390px에서 가로 스크롤이 없고 axe 위반이 없다", async ({ page }) => {
  const list = await searchWithPlaces(page, [
    kakaoPlace(11, "한식집A", "100", "음식점 > 한식"),
    kakaoPlace(12, "카페A", "150", "음식점 > 카페"),
  ]);
  const chips = list.getByRole("list", { name: "주변 음식점 종류" });
  await chips.getByRole("button", { name: /한식 1/ }).click();
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await list.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
  }
});
