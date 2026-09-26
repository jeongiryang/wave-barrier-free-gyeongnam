import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import type { Place, PlanData } from "../features/planner/types";

// 스펙 16(1단계만 구현, #572와 겹치는 부분은 새로 만들지 않음): 장소 상세 "입구"
// 단계에서 `route` 필드의 원문 설명을 요약 없이 그대로 보여주고, 값이 없을 때는
// 이미 있는(#572) confirmed/negative/unknown 고정 문구로 대체하며, 색 신호등이나
// 등급 표시가 없고, 고정 안내 문구가 항상 붙는지 확인한다.

function place(id: string, name: string, state: "confirmed" | "negative" | "unknown", detail: string): Place {
  return {
    id, contentTypeId: "14", city: "창원", name, address: "경상남도 창원시",
    summary: "공식 원문 설명", image: "", mapX: "128.691", mapY: "35.238", score: 40,
    knownFields: 1, unknownFields: 0, negativeFields: state === "negative" ? 1 : 0, checkedAt: "2026-09-19T00:00:00Z",
    accessibility: [{ key: "route", label: "접근로", state, detail }],
    features: [], details: [], source: "무장애 여행정보 · 국문 관광정보",
  } satisfies Place;
}

const withText = place("s1", "접근로 설명 있는 장소", "confirmed", "정문 앞에 경사로가 있고 턱이 낮습니다. 안내견 동반도 가능합니다.");
const withoutText = place("s2", "접근로 설명 없는 장소", "unknown", "");

async function openArrivalPreview(page: Page, target: Place) {
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

test("접근로 원문이 요약 없이 그대로 보이고, 안내 문구가 항상 함께 붙는다", async ({ page }) => {
  const dialog = await openArrivalPreview(page, withText);
  const entrance = dialog.locator(".place-arrival-preview [aria-live='polite']");
  await expect(entrance.locator("blockquote")).toHaveText(withText.accessibility![0].detail!);
  await expect(entrance).toContainText("경사와 턱의 정도는 등록된 설명 그대로예요. 실제 기울기는 확인되지 않았어요.");
  // 등급이나 색 신호등을 뜻하는 낱말이 없어야 한다.
  await expect(entrance).not.toContainText(/쉬움|보통|어려움|초록|노랑|빨강/);
});

test("접근로 원문이 없으면 평탄하다고 쓰지 않고, 이미 있는 미확인 문구로 대체하며 안내는 그대로 붙는다", async ({ page }) => {
  const dialog = await openArrivalPreview(page, withoutText);
  const entrance = dialog.locator(".place-arrival-preview [aria-live='polite']");
  await expect(entrance.locator("blockquote")).toHaveCount(0);
  await expect(entrance).toContainText("접근로 정보가 등록돼 있지 않아요.");
  await expect(entrance).not.toContainText(/평탄|계단\s*없이\s*이동할 수 있어요/);
  await expect(entrance).toContainText("경사와 턱의 정도는 등록된 설명 그대로예요. 실제 기울기는 확인되지 않았어요.");
});

test("문의 기능으로 가는 링크가 동작한다(#545, 새 화면을 만들지 않는다)", async ({ page }) => {
  const dialog = await openArrivalPreview(page, withText);
  const notice = dialog.locator(".place-arrival-preview .place-inquiry-entry").filter({ hasText: "휠체어 통행 정보" });
  await notice.getByRole("button", { name: "문의 카드 만들기", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "3. 시설", exact: true }).first()).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.locator(".place-inquiry-entry").filter({ hasText: "방문 전에 물어보세요" }).getByRole("button", { name: "문의 카드 만들기", exact: true }).first()).toBeVisible();
});

test("1440/960/390px에서 가로 스크롤이 없고 axe 위반이 없다", async ({ page }) => {
  const dialog = await openArrivalPreview(page, withText);
  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await dialog.locator(".place-arrival-preview").first().scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
  }
});
