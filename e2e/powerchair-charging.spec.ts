import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import type { Place, PlanData } from "../features/planner/types";

// 스펙 15의 대체 설계: 공공데이터포털에서 경남 표본을 실제 호출로 확인하지
// 못했기 때문에 지도 레이어나 장소 카드 대신, 장소 상세의 "주차" 단계에
// 정적 안내 카드 하나만 둔다. 이 스펙은 그 카드가 버튼 클릭 전 네트워크
// 요청을 만들지 않는지, 문구가 이용 가능을 보장하는 것으로 읽히지 않는지,
// 키보드만으로 조작 가능한지, axe 위반이 없는지를 확인한다.

const place = {
  id: "3003", contentTypeId: "14", city: "창원", name: "검증용 관광지", address: "경상남도 창원시",
  summary: "공식 원문 설명", image: "", mapX: "128.691", mapY: "35.238", score: 33,
  knownFields: 1, unknownFields: 0, negativeFields: 0, checkedAt: "2026-09-06T00:00:00Z",
  accessibility: [{ key: "parking", label: "장애인 주차", state: "confirmed", detail: "정문 앞 전용 구획" }],
  features: ["parking"], details: [], source: "무장애 여행정보 · 국문 관광정보",
} satisfies Place;

async function openArrivalPreview(page: Page) {
  await mockPlannerApi(page, { plannerView: "overview", savedPlaces: [place] });
  await page.route("**/api/wave?action=plan*", (route) => route.fulfill({ json: {
    criteria: { facilityKeys: (new URL(route.request().url()).searchParams.get("facilityKeys") || "").split(",").filter(Boolean) },
    mode: "live", generatedAt: place.checkedAt, baseYm: "202608",
    course: null, audio: null, places: [place], stops: [], statuses: [],
  } satisfies PlanData }));
  await page.route("**/api/community/posts?*", (route) => route.fulfill({ json: { posts: [] } }));
  await page.goto("/planner");
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await page.locator(".simple-facility-trigger").click();
  const picker = page.getByRole("dialog", { name: "필요한 편의", exact: true });
  await picker.getByRole("checkbox", { name: "장애인 주차구역", exact: true }).check();
  await picker.getByRole("button", { name: /^적용/ }).click();
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await page.locator(".simple-place-row h3 button").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
  await dialog.locator("summary").filter({ hasText: /^주차·입구·시설 미리보기$/ }).click();
  return dialog;
}

test("charging notice loads only after opening the parking step, never claims availability, and has no fabricated location list", async ({ page }) => {
  const calls: string[] = [];
  await page.route("**/api/wave?action=powerchair-charging*", (route) => { calls.push(route.request().url()); route.fulfill({ json: {} }); });
  const dialog = await openArrivalPreview(page);
  const notice = dialog.locator(".place-arrival-preview .place-inquiry-entry").filter({ hasText: "전동휠체어 충전 안내" });
  await expect(notice).toContainText("전동휠체어 충전 장소는 시군마다 안내가 달라요. 방문 전 관할 기관에 확인하는 것이 확실해요.");
  await expect(notice).not.toContainText(/이용 가능|사용 가능|빈자리/);
  expect(calls).toEqual([]);

  const summary = notice.getByText("시군별 공식 누리집 보기", { exact: true });
  await expect(summary).toBeVisible();
  const links = notice.getByRole("link");
  await expect(links).toHaveCount(0);
  // Keyboard-only: focus the disclosure and open it with Enter, no mouse.
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(links).toHaveCount(18);
  for (const link of await links.all()) {
    await expect(link).toHaveAttribute("href", /^https:\/\/[a-z0-9.-]+\.go\.kr\//);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
  }
  await expect(notice).toContainText("2026-09-19에 접속을 확인했어요");
  expect(calls).toEqual([]);

  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await notice.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
  }
});
