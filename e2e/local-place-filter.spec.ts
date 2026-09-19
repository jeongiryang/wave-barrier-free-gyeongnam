import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import type { Place, PlanData } from "../features/planner/types";

// 스펙 35: 지역 가게 보기. 어떤 가게가 체인인지 알려주는 공식 제공처가
// 없으므로 상표 이름 목록으로 걸러내지 않는다. 대신 (1) 한국관광공사 관광정보
// 등록 여부, (2) 지금 결과 목록 안에서 같은 이름이 2곳 이상 나오는지, 두 가지
// 관찰된 사실만 쓴다. 접는 것이지 지우는 것이 아니며 항상 펼칠 수 있다.

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

const kakaoPlace = (index: number, name: string, distance: string) => ({
  id: String(index), place_name: name, address_name: "경남 창원시", road_address_name: "경남 창원시 팔용로 1",
  x: "128.6810", y: "35.2300", distance, place_url: `https://place.map.kakao.com/${index}`, category_name: "음식점 > 한식",
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

test("두 선택 모두 기본은 꺼짐이고, 근거 문구가 항상 보인다", async ({ page }) => {
  const list = await openFacilitiesStep(page);
  const registeredOnly = list.getByRole("button", { name: "관광정보에 등록된 곳만 보기", exact: true });
  await expect(registeredOnly).toHaveAttribute("aria-pressed", "false");
  await expect(list).toContainText("한국관광공사 관광정보에 등록된 음식점이에요.");
  await expect(list).toContainText("지금 결과 안에서 같은 이름이 2곳 이상 나온 가게예요. 체인인지 여부는 확인되지 않았어요.");
  // 체인이라고 단정하는 문구가 없다.
  await expect(list).not.toContainText(/체인점|체인이에요|체인입니다/);
});

test("관광정보에 등록된 곳만 보기를 켜면 주변 음식점(카카오) 묶음이 접히고, 다시 끄면 돌아온다", async ({ page }) => {
  const list = await searchWithPlaces(page, [kakaoPlace(11, "검색으로 찾은 분식", "120")]);
  await expect(list).toContainText("검색으로 찾은 분식");
  const toggle = list.getByRole("button", { name: "관광정보에 등록된 곳만 보기", exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(list.getByRole("heading", { name: "주변 음식점", exact: true })).toHaveCount(0);
  await expect(list).not.toContainText("검색으로 찾은 분식");
  await expect(list).toContainText("확인된 국숫집");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(list).toContainText("검색으로 찾은 분식");
});

test("같은 이름이 여러 곳에 있으면 접히고, 접힌 개수가 보이며 항상 펼칠 수 있다", async ({ page }) => {
  const list = await searchWithPlaces(page, [
    kakaoPlace(11, "같은이름집", "100"),
    kakaoPlace(12, "같은이름집", "150"),
    kakaoPlace(13, "혼자인집", "200"),
  ]);
  const collapseToggle = list.getByRole("button", { name: "같은 이름이 여러 곳에 있는 가게 접어두기", exact: true }).last();
  await expect(list).toContainText("같은이름집");
  await collapseToggle.click();
  await expect(collapseToggle).toHaveAttribute("aria-pressed", "true");
  await expect(list).toContainText("같은 이름 2곳 접음");
  await expect(list).not.toContainText("같은이름집");
  await expect(list).toContainText("혼자인집"); // 접히지 않은 항목은 그대로 남는다
  await list.getByRole("button", { name: "펼치기", exact: true }).click();
  await expect(list).toContainText("같은이름집");
});

test("접어도 결과를 지우지 않고 접기만 하며, 결과가 0개가 되어도 자동으로 꺼지지 않는다", async ({ page }) => {
  const list = await searchWithPlaces(page, [
    kakaoPlace(11, "같은이름집", "100"),
    kakaoPlace(12, "같은이름집", "150"),
  ]);
  const collapseToggle = list.getByRole("button", { name: "같은 이름이 여러 곳에 있는 가게 접어두기", exact: true }).last();
  await collapseToggle.click();
  await expect(collapseToggle).toHaveAttribute("aria-pressed", "true");
  await expect(list).toContainText("조건에 맞는 곳이 없어요.");
  await list.getByRole("button", { name: "조건 끄기", exact: true }).click();
  await expect(collapseToggle).toHaveAttribute("aria-pressed", "false");
  await expect(list).toContainText("같은이름집");
});

test("켜짐은 색 외에 aria-pressed와 체크 표시로도 구분된다", async ({ page }) => {
  const list = await openFacilitiesStep(page);
  const toggle = list.getByRole("button", { name: "관광정보에 등록된 곳만 보기", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle.locator("svg")).toHaveCount(1);
});

test("선택으로 인한 새 네트워크 요청이 없다", async ({ page }) => {
  const list = await searchWithPlaces(page, [
    kakaoPlace(11, "같은이름집", "100"),
    kakaoPlace(12, "같은이름집", "150"),
  ]);
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await list.getByRole("button", { name: "관광정보에 등록된 곳만 보기", exact: true }).click();
  await list.getByRole("button", { name: "관광정보에 등록된 곳만 보기", exact: true }).click();
  await list.getByRole("button", { name: "같은 이름이 여러 곳에 있는 가게 접어두기", exact: true }).last().click();
  expect(requests.filter((url) => url.includes("/api/"))).toEqual([]);
});

test("1440/960/390px에서 가로 스크롤이 없고 axe 위반이 없다", async ({ page }) => {
  const list = await searchWithPlaces(page, [
    kakaoPlace(11, "같은이름집", "100"),
    kakaoPlace(12, "같은이름집", "150"),
  ]);
  await list.getByRole("button", { name: "같은 이름이 여러 곳에 있는 가게 접어두기", exact: true }).last().click();
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await list.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
  }
});
