import { expect, test } from "@playwright/test";
import { fetchKakaoRoute } from "../server/transport/kakao-route";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

test("inconsistent provider measurements stay unavailable and a deliberate recheck recovers", async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let seconds = 60;
  let requests = 0;
  // Run the real provider adapter against an offline raw response. No provider API
  // or key is used; the API-composition unit contract separately verifies preview status.
  await page.route("**/api/route?**", async (route) => {
    requests++;
    const params = new URL(route.request().url()).searchParams;
    const [startLat, startLng, endLat, endLng] = ["startLat", "startLng", "endLat", "endLng"].map(key => Number(params.get(key)));
    const originalFetch = globalThis.fetch;
    let result;
    try {
      globalThis.fetch = async (input) => {
        expect(String(input)).toMatch(/^https:\/\/apis-navi\.kakaomobility\.com\/v1\/directions\?/);
        return Response.json({ routes: [{ result_code: 0, summary: { duration: seconds, distance: 8229 },
          sections: [{ roads: [{ vertexes: [startLng, startLat, endLng, endLat] }] }] }] });
      };
      result = await fetchKakaoRoute({ KAKAO_REST_API_KEY: "fixture-not-a-real-key" }, startLat, startLng, endLat, endLng);
    } finally {
      globalThis.fetch = originalFetch;
    }
    await route.fulfill({ json: { configured: Boolean(result.alternative), alternatives: result.alternative ? [result.alternative] : [],
      providers: [{ id: "kakao-drive", name: "Kakao Mobility", configured: true, ...result.provider }], context: null } });
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  const panel = page.locator(".route-compare-panel");
  await expect(panel.locator(".route-option")).toHaveCount(0);
  await expect(panel.getByRole("heading", { name: "자동차 예상 시간을 확인하지 못했습니다." })).toBeVisible();
  await expect(panel.getByRole("button", { name: /자동차/ })).toContainText("시간 정보 없음");
  await expect(panel.getByRole("link", { name: /카카오맵에서 자동차 확인/ })).toBeVisible();
  await panel.screenshot({ path: test.info().outputPath("measurement-unavailable.png") });
  expect(requests).toBe(1);

  seconds = 900;
  await page.getByRole("button", { name: "다시 계산", exact: true }).click();
  await expect(panel.locator(".route-option")).toHaveCount(1);
  await expect(panel.locator(".route-option").getByText("15분", { exact: true })).toBeVisible();
  expect(requests).toBe(2);
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
  await panel.screenshot({ path: test.info().outputPath("measurement-recovered.png") });
});
