import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import type { Place, PlanData } from "../features/planner/types";

// 스펙 13의 대체 설계(2단계): 공공데이터포털에서 경남 표본이 있는 무장애 보행로
// OpenAPI를 찾지 못해(docs/ai-logs/spec-13-wheelchair-route-layer.md 참고), 지도에
// 구간을 그리지 않고 장소 상세 "입구" 단계에서 이미 있는 `route` 필드를 이동
// 관점으로 다시 묶어 보여준다. 경로가 조회됐다는 사실이 통행 가능을 뜻하지
// 않으므로, 세 상태 표시와 항상 붙는 고정 안내, 문의 기능 링크, axe 위반 0건을
// 확인한다.

function place(state: "confirmed" | "negative" | "unknown"): Place {
  return {
    id: "r1", contentTypeId: "14", city: "창원", name: "검증용 관광지", address: "경상남도 창원시",
    summary: "공식 원문 설명", image: "", mapX: "128.691", mapY: "35.238", score: 40,
    knownFields: 1, unknownFields: 0, negativeFields: state === "negative" ? 1 : 0, checkedAt: "2026-09-19T00:00:00Z",
    accessibility: [{ key: "route", label: "접근로", state, detail: "" }],
    features: [], details: [], source: "무장애 여행정보 · 국문 관광정보",
  } satisfies Place;
}

async function openArrivalPreview(page: Page, state: "confirmed" | "negative" | "unknown") {
  const target = place(state);
  await mockPlannerApi(page, { plannerView: "overview", savedPlaces: [target] });
  await page.route("**/api/wave?action=plan*", (route) => route.fulfill({ json: {
    criteria: { facilityKeys: [] },
    mode: "live", generatedAt: target.checkedAt || "2026-09-19T00:00:00Z", baseYm: "202609",
    course: null, audio: null, places: [target], stops: [], statuses: [],
  } satisfies PlanData }));
  await page.route("**/api/community/posts?*", (route) => route.fulfill({ json: { posts: [] } }));
  await page.goto("/planner");
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".simple-place-row")).toHaveCount(1);
  await page.locator(".simple-place-row h3 button").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
  await dialog.locator("summary").filter({ hasText: /^주차·입구·시설 미리보기$/ }).click();
  await dialog.getByRole("button", { name: "2. 입구", exact: true }).click();
  return dialog;
}

test("경로가 조회됐다는 이유로 통행 가능을 단정하지 않고, 세 상태를 다른 문구로 보여준다", async ({ page }) => {
  for (const [state, expected] of [
    ["confirmed", "출입구까지 접근로가 등록돼 있어요."],
    ["negative", "접근로가 없다고 등록돼 있어요."],
    ["unknown", "접근로 정보가 등록돼 있지 않아요."],
  ] as const) {
    const dialog = await openArrivalPreview(page, state);
    const notice = dialog.locator(".place-arrival-preview .place-inquiry-entry").filter({ hasText: "휠체어 통행 정보" });
    await expect(notice).toContainText(expected);
    await expect(notice).toContainText("주차장에서 입구까지의 계단 없는 길은 확인되지 않았어요.");
    await expect(notice).not.toContainText(/통행\s*가능|이용\s*가능/);
  }
});

test("문의 기능으로 가는 링크가 있고, 눌러도 서버 요청이 나가지 않는다", async ({ page }) => {
  const calls: string[] = [];
  await page.route("**/api/wave?action=accessible-route*", (route) => { calls.push(route.request().url()); route.fulfill({ json: {} }); });
  const dialog = await openArrivalPreview(page, "unknown");
  const notice = dialog.locator(".place-arrival-preview .place-inquiry-entry").filter({ hasText: "휠체어 통행 정보" });
  await notice.getByRole("button", { name: "문의 카드 만들기", exact: true }).click();
  // "문의 카드 만들기로 물어보세요" 링크는 3단계(시설)로 이동시킨다. 그 단계에는
  // PlaceInquiryCard의 "문의 카드 만들기" 버튼이 이미 있다(#545). 새 화면을 만들지 않는다.
  await expect(dialog.getByRole("button", { name: "3. 시설", exact: true }).first()).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.locator(".place-inquiry-entry").filter({ hasText: "방문 전에 물어보세요" }).getByRole("button", { name: "문의 카드 만들기 ↗", exact: true }).first()).toBeVisible();
  expect(calls).toEqual([]);
});

test("입구 단계에서 출입문 데이터 부재를 안내하고 문의·현장 요청으로 연결한다", async ({ page }) => {
  const dialog = await openArrivalPreview(page, "unknown");
  const door = dialog.locator(".door-inquiry-entry");
  await expect(door).toContainText("미리 물어보거나 현장에서 화면으로 요청할 수 있어요.");
  await door.getByRole("button", { name: "문의 카드 만들기 ↗", exact: true }).click();
  const inquiry = page.getByRole("dialog", { name: "이렇게 물어보세요." });
  await expect(inquiry.getByRole("checkbox", { name: "출입문", exact: true })).toBeChecked();
  await expect(inquiry.locator(".inquiry-card-preview")).toContainText("출입문이 회전문인가요? 옆에 여닫이문이나 자동문이 있나요?");
  await inquiry.getByRole("button", { name: "문의 카드 닫기", exact: true }).click();
  await door.getByRole("button", { name: "현장에서 화면으로 요청하기", exact: true }).click();
  const board = page.getByRole("dialog", { name: "직원과 화면으로 대화", exact: true });
  await expect(board.locator(".inquiry-card-preview")).toContainText("문을 열기 어려워요. 도와주시거나 다른 출입구를 알려 주세요.");
});

test("1440/960/390px에서 가로 스크롤이 없고 axe 위반이 없다", async ({ page }) => {
  const dialog = await openArrivalPreview(page, "negative");
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await dialog.locator(".place-inquiry-entry").first().scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
  }
});
