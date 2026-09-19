import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import type { Place, PlanData } from "../features/planner/types";

// 스펙 44: 1인 메뉴·단체석·좌석 형태를 주는 공공데이터가 없어 거르기가 아니라
// 문의 항목(#545)만 추가했다. 이 파일은 이전에 없던 문의 카드 e2e를 새로
// 만든다(확장할 기존 파일이 없었다). 이 기능은 네트워크를 쓰지 않아야 하므로
// 오프라인 상태에서도 동작하고 요청이 0건인지 함께 확인한다.

function place(): Place {
  return {
    id: "700001", contentTypeId: "39", city: "창원", name: "검증용 식당", address: "경상남도 창원시",
    summary: "공식 원문 설명", image: "", mapX: "128.691", mapY: "35.238", score: 40,
    knownFields: 0, unknownFields: 0, negativeFields: 0, checkedAt: "2026-09-19T00:00:00Z",
    accessibility: [], features: [], details: [], source: "무장애 여행정보 · 국문 관광정보",
  } satisfies Place;
}

async function openInquiryDialog(page: Page) {
  const target = place();
  await mockPlannerApi(page, { plannerView: "overview", savedPlaces: [target] });
  await page.route("**/api/wave?action=plan*", (route) => route.fulfill({ json: {
    criteria: { facilityKeys: [] },
    mode: "live", generatedAt: target.checkedAt || "2026-09-19T00:00:00Z", baseYm: "202609",
    course: null, audio: null, places: [target], stops: [], statuses: [],
  } satisfies PlanData }));
  await page.route("**/api/community/posts?*", (route) => route.fulfill({ json: { posts: [] } }));
  await page.route("**/api/wave?action=visit-info*", (route) => route.fulfill({ json: {
    id: target.id, status: "empty", checkedAt: "2026-09-19T00:00:00Z", source: "ⓒ한국관광공사",
  } }));
  await page.route("**/api/wave?action=dining-accessibility*", (route) => route.fulfill({ json: { status: "empty", items: [] } }));
  await page.goto("/planner");
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".simple-place-row")).toHaveCount(1);
  await page.locator(".simple-place-row h3 button").click();
  const placeDialog = page.getByRole("dialog");
  await expect(placeDialog.getByRole("heading", { level: 2 })).toBeFocused();
  await placeDialog.locator("summary").filter({ hasText: /^주차·입구·시설 미리보기$/ }).click();
  await placeDialog.getByRole("button", { name: "3. 시설", exact: true }).click();
  await expect(placeDialog.locator(".place-arrival-preview")).toContainText("자리 형태와 1인 주문 가능 여부는 공공데이터에 등록돼 있지 않아요.");
  await placeDialog.getByRole("button", { name: "문의 카드 만들기 ↗", exact: true }).first().click();
  const inquiry = page.locator("dialog.inquiry-dialog");
  await expect(inquiry).toBeVisible();
  return inquiry;
}

test("자리 관련 문의 항목 세 개를 고르면 문의 카드가 완성된다(오프라인에서도 동작, 네트워크 요청 0건)", async ({ page, context }) => {
  const inquiry = await openInquiryDialog(page);
  // 문의 카드를 연 뒤(이 기능이 실제로 동작하는 구간)부터 네트워크 요청을 센다.
  // 페이지 초기 로드의 plan/weather 등 요청은 이 기능과 무관하다.
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await context.setOffline(true);
  await inquiry.getByLabel("좌석 형태", { exact: true }).check();
  await inquiry.getByLabel("1인 주문", { exact: true }).check();
  await inquiry.getByLabel("여럿 자리", { exact: true }).check();
  const preview = inquiry.locator(".inquiry-card-preview");
  await expect(preview).toContainText("의자가 있는 자리가 있나요? 좌식만 있나요?");
  await expect(preview).toContainText("혼자 먹을 수 있는 메뉴가 있나요?");
  await expect(preview).toContainText("여러 명이 함께 앉을 자리가 있나요?");
  await context.setOffline(false);
  expect(requests.filter((url) => url.includes("/api/"))).toEqual([]);
});

test("문의 항목이 늘어도 dialog가 가로로 넘치지 않고 axe 위반이 없다(1440/960/390px)", async ({ page }) => {
  const inquiry = await openInquiryDialog(page);
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await inquiry.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include("dialog.inquiry-dialog").analyze()).violations).toEqual([]);
  }
});
