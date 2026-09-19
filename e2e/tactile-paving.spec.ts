import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import type { Place, PlanData } from "../features/planner/types";

// 스펙 14: 점자블록은 이미 연동된 `braileblock` 필드로 (1) 편의 조건에서 고를
// 수 있는지, (2) 장소 상세(편의 요약)에서 세 상태가 다른 문구로 구분되는지,
// (3) 미확인이 없음으로 읽히지 않는지를 확인한다. 새 제공처를 붙이지 않는다.

function place(id: string, index: number, name: string, state: "confirmed" | "negative" | "unknown", detail?: string): Place {
  return {
    id, contentTypeId: "14", city: "창원", name, address: "경상남도 창원시",
    summary: "공식 원문 설명", image: "", mapX: `128.6${index}1`, mapY: `35.2${index}8`, score: 40,
    knownFields: 1, unknownFields: 0, negativeFields: state === "negative" ? 1 : 0, checkedAt: "2026-09-19T00:00:00Z",
    accessibility: [{ key: "braileblock", label: "점자블록", state, detail: detail ?? "" }],
    features: [], details: [], source: "무장애 여행정보 · 국문 관광정보",
  } satisfies Place;
}

const places = [
  place("t1", 1, "점자블록 확인 장소", "confirmed"),
  place("t2", 2, "점자블록 부재 등록 장소", "negative"),
  place("t3", 3, "점자블록 정보 미등록 장소", "unknown"),
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

test("점자블록은 편의 조건에서 고를 수 있다", async ({ page }) => {
  await openPlannerWithPlaces(page);
  await page.locator(".simple-facility-trigger").click();
  const picker = page.getByRole("dialog", { name: "필요한 편의", exact: true });
  await expect(picker.getByRole("checkbox", { name: "점자블록", exact: true })).toBeVisible();
});

test("세 상태가 서로 다른 문구로 구분되고 미확인이 없음으로 읽히지 않으며, 관광지 단위 정보임을 알린다", async ({ page }) => {
  await openPlannerWithPlaces(page);

  for (const [id, expectedText] of [
    ["t1", "점자블록 있음"],
    ["t2", "점자블록 없음"],
    ["t3", "점자블록 정보 없음"],
  ] as const) {
    const row = page.locator(".simple-place-row").filter({ hasText: places.find((item) => item.id === id)!.name });
    await expect(row.locator(".simple-facility-summary")).toContainText(expectedText);
    await expect(row.locator(".simple-facility-summary")).toContainText("관광지에 등록된 정보예요. 주변 보도의 점자블록은 확인되지 않았어요.");
  }

  // 미확인(unknown) 문구는 없음(negative) 문구와 같지 않아야 한다.
  const unknownRow = page.locator(".simple-place-row").filter({ hasText: "점자블록 정보 미등록 장소" });
  const negativeRow = page.locator(".simple-place-row").filter({ hasText: "점자블록 부재 등록 장소" });
  await expect(unknownRow.locator(".simple-facility-summary")).not.toContainText("점자블록 없음");
  await expect(negativeRow.locator(".simple-facility-summary")).not.toContainText("점자블록 정보 없음");

  for (const width of [1440, 960, 390]) {
    await page.setViewportSize({ width, height: 960 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include(".simple-results").analyze()).violations).toEqual([]);
  }
});
