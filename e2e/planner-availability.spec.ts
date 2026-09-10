import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockPlannerApi } from "./fixtures";

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: "reduce" } });

test("편의·활동 단계는 현재 조건의 건수를 보여주고 편의 변경은 추가 조회하지 않는다", async ({ page }, info) => {
  await mockPlannerApi(page, { plannerView: "guided" });
  let calls = 0;
  await page.route("**/api/wave?action=availability&**", async route => {
    calls++;
    const params = new URL(route.request().url()).searchParams;
    const candidates = params.get("themes") === "history" ? [{ id: "museum", profiles: ["wheel"] }] : [{ id: "museum", profiles: ["wheel"] }, { id: "park", profiles: ["senior"] }];
    await route.fulfill({ json: { region: params.get("region"), themes: params.get("themes")?.split(","), limit: 12, candidates, status: { partial: false } } });
  });
  await page.goto("/planner?region=창원&question=1");
  const count = page.locator(".condition-availability");
  await expect(count).toContainText("총 2건");
  const needs = page.getByRole("group", { name: "여행 편의 조건 선택" });
  await needs.getByRole("button", { name: /휠체어 편의시설/ }).click();
  await expect(count).toContainText("총 1건");
  expect(calls).toBe(1);
  await count.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("facilities.png"), fullPage: false });
  if (info.project.name === "desktop-chromium") {
    await page.setViewportSize({ width: 960, height: 960 });
    await count.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath("facilities-960.png"), fullPage: false });
  }
  await page.locator(".condition-actions").getByRole("button", { name: "다음 →" }).click();
  await expect(count).toContainText("총 1건");
  await page.locator(".theme-grid").getByRole("button", { name: /역사/ }).click();
  await expect.poll(() => calls).toBe(2);
  await expect(count).toContainText("현재 검색한 1개 후보 기준");
  await count.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("activities.png"), fullPage: false });
  expect((await new AxeBuilder({ page }).include("#conditions").analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator(".condition-actions").getByRole("button", { name: "이전", exact: true }).click();
  await expect(count).toContainText("현재 검색한 2개 후보 기준");
  expect(calls).toBe(2);
});

test("조회 실패·부분 결과·정상 0건을 구분하고 다시 확인할 수 있다", async ({ page }) => {
  await mockPlannerApi(page, { plannerView: "guided" });
  let state = "error";
  await page.route("**/api/wave?action=availability&**", async route => {
    if (state === "error") return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    const params = new URL(route.request().url()).searchParams;
    return route.fulfill({ json: { region: params.get("region"), themes: params.get("themes")?.split(","), candidates: [], limit: 12, status: { partial: state === "partial" } } });
  });
  await page.goto("/planner?region=창원&question=1");
  const count = page.locator(".condition-availability");
  await expect(count).toContainText("검색 결과를 확인하지 못했어요");
  await expect(count).not.toContainText("총 0건");
  state = "partial";
  await count.getByRole("button", { name: "다시 확인" }).click();
  await expect(count).toContainText("일부 정보 확인 중");
  state = "empty";
  await count.getByRole("button", { name: "다시 확인" }).click();
  await expect(count).toContainText("총 0건");
  await expect(count.getByRole("button")).toHaveCount(0);
});
