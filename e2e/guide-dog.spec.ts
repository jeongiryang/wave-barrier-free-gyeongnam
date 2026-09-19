import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import type { Place, PlanData } from "../features/planner/types";

// 스펙 20: 안내견 동반은 법으로 보장되는 권리이므로 "동반 불가"라고 단정하지
// 않는다. 이 스펙은 새 제공처를 붙이지 않고 이미 연동된 `helpdog` 필드로
// (1) 편의 조건에서 안내견 동반을 고를 수 있는지, (2) 세 상태가 화면에서
// 다른 문구로 구분되는지, (3) negative·unknown 아래 법 안내 한 줄이 붙는지를
// 확인한다.

function place(id: string, index: number, name: string, state: "confirmed" | "negative" | "unknown", detail?: string): Place {
  return {
    id, contentTypeId: "14", city: "창원", name, address: "경상남도 창원시",
    summary: "공식 원문 설명", image: "", mapX: `128.6${index}1`, mapY: `35.2${index}8`, score: 40,
    knownFields: 1, unknownFields: 0, negativeFields: state === "negative" ? 1 : 0, checkedAt: "2026-09-19T00:00:00Z",
    accessibility: [{ key: "helpdog", label: "안내견 동반", state, detail: detail ?? "" }],
    features: [], details: [], source: "무장애 여행정보 · 국문 관광정보",
  } satisfies Place;
}

const places = [
  place("g1", 1, "안내견 동반 확인 장소", "confirmed"),
  place("g2", 2, "안내견 동반 부재 등록 장소", "negative"),
  place("g3", 3, "안내견 정보 미등록 장소", "unknown"),
];

async function openPlannerWithPlaces(page: Page) {
  await mockPlannerApi(page, { plannerView: "overview", savedPlaces: places });
  await page.route("**/api/wave?action=plan*", (route) => route.fulfill({ json: {
    criteria: { facilityKeys: (new URL(route.request().url()).searchParams.get("facilityKeys") || "").split(",").filter(Boolean) },
    mode: "live", generatedAt: places[0].checkedAt || "2026-09-19T00:00:00Z", baseYm: "202609",
    course: null, audio: null, places, stops: [], statuses: [],
  } satisfies PlanData }));
  await page.route("**/api/community/posts?*", (route) => route.fulfill({ json: { posts: [] } }));
  await page.goto("/planner");
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".simple-place-row")).toHaveCount(places.length);
}

test("안내견 동반은 편의 조건에서 고를 수 있다", async ({ page }) => {
  await openPlannerWithPlaces(page);
  await page.locator(".simple-facility-trigger").click();
  const picker = page.getByRole("dialog", { name: "필요한 편의", exact: true });
  await expect(picker.getByRole("checkbox", { name: "안내견 동반", exact: true })).toBeVisible();
});

test("세 상태가 서로 다른 문구로 구분되고 '불가'라고 단정하지 않으며, negative·unknown에는 법 안내가 붙는다", async ({ page }) => {
  await openPlannerWithPlaces(page);

  for (const [id, expectedText, expectNote] of [
    ["g1", "안내견 동반이 등록돼 있어요.", false],
    ["g2", "안내견 동반이 없다고 등록돼 있어요. 등록 내용과 실제 응대가 다를 수 있어요.", true],
    ["g3", "안내견 동반 정보가 등록돼 있지 않아요.", true],
  ] as const) {
    const row = page.locator(".simple-place-row").filter({ hasText: places.find((item) => item.id === id)!.name });
    await expect(row.locator(".simple-facility-summary")).toContainText(expectedText);
    await expect(row.locator(".simple-facility-summary")).not.toContainText("불가");
    if (expectNote) await expect(row.locator(".simple-facility-summary")).toContainText("장애인 보조견 동반은 법으로 보장돼 있어요. 방문 전에 확인하면 더 편해요.");
    else await expect(row.locator(".simple-facility-summary")).not.toContainText("법으로 보장돼 있어요");
  }

  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include(".simple-results").analyze()).violations).toEqual([]);
  }
});
