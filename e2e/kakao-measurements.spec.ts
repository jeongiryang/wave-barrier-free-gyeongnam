import { expect, test } from "@playwright/test";
import { fetchKakaoRoute } from "../server/transport/kakao-route";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

test("inconsistent provider measurements stay unavailable and a deliberate recheck recovers", async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let seconds = 60;
  const requests: string[] = [];
  let completed = 0;
  // Run the real provider adapter against an offline raw response. No provider API
  // or key is used; the API-composition unit contract separately verifies preview status.
  await page.route("**/api/route?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("mode") !== "car") return route.fulfill({ json: { configured: false, alternatives: [], providers: [], context: null } });
    requests.push(route.request().url());
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
    completed++;
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  const panel = page.locator(".route-compare-panel");
  await expect(panel.locator(".route-option")).toHaveCount(0);
  await panel.getByRole("group", { name: "이동수단별 예상 시간" }).getByRole("button", { name: /자동차/ }).click();
  await expect(panel.getByRole("heading", { name: "자동차 예상 시간을 확인하지 못했습니다." })).toBeVisible();
  await expect(panel.getByRole("button", { name: /자동차/ })).toContainText("시간 정보 없음");
  await expect(panel.getByRole("link", { name: /카카오맵에서 자동차 확인/ })).toBeVisible();
  await panel.screenshot({ path: test.info().outputPath("measurement-unavailable.png") });
  // One request checks the selected map leg; one checks the same leg for the
  // complete itinerary. Await the automatic check before deliberate retries.
  await expect.poll(() => completed).toBe(2);
  await expect(page.locator(".coverage-actions button").first()).toHaveAttribute("aria-busy", "false");
  expect(requests).toHaveLength(2);
  expect(requests[1]).toBe(requests[0]);
  expect(Object.fromEntries(new URL(requests[0]).searchParams)).toEqual({ startLat: "35.2422", startLng: "128.6982", endLat: "35.238", endLng: "128.691", mode: "car" });

  seconds = 900;
  await page.getByRole("button", { name: "다시 계산", exact: true }).click();
  await expect(panel.locator(".route-option")).toHaveCount(1);
  await expect(panel.locator(".route-option").getByText("15분", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(3);
  expect(requests[2]).toBe(requests[0]);
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
  await panel.screenshot({ path: test.info().outputPath("measurement-recovered.png") });

  seconds = 301 * 60;
  await page.getByRole("button", { name: "다시 계산", exact: true }).click();
  const stop = page.locator(".day-planner-grid li").first();
  await expect(stop).toContainText("확인된 경로 이동 301분");
  await expect(stop.locator("b")).toContainText("15:01");
  expect(requests).toHaveLength(4);
  expect(requests[3]).toBe(requests[0]);
  await page.getByLabel("하루 시작", { exact: true }).fill("23:00");
  await expect(stop.locator("b")).toContainText("+1일 04:01");
  await expect(stop).toContainText("일정이 다음 날로 이어집니다.");
  for (const width of [960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await stop.screenshot({ path: test.info().outputPath(`long-route-arrival-${width}.png`) });
  }
});
