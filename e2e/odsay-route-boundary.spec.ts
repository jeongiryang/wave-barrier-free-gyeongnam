import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";
import { odsayProviderStatus } from "../lib/transport/odsay-response.js";

// Browser contract only: provider/handler request-coordinate validation is exercised
// by odsay-route-integrity.test.mjs. These are controlled responses, not live API proof.
for (const [name, code, expected] of [
  ["unrelated endpoints", "ENDPOINT_MISMATCH", "요청한 출발·도착 장소와 정류장의 연결을 확인하지 못했습니다."],
  ["incomplete transfer", "MISSING_CONNECTION", "도보·환승 구간의 연결이 확인되지 않아 전체 경로로 표시하지 않습니다."],
  ["empty result", "-99", "이 구간에서 제공되는 대중교통 경로가 없습니다."],
  ["provider error", "500", "대중교통 경로 응답을 확인하지 못했습니다."],
] as const) test(`transit ${name} is visible and cannot become a confirmed option`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  const status = odsayProviderStatus({ configured: true, error: { code, message: "untrusted upstream text" } });
  await page.route("**/api/route?**", route => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ configured: false, alternatives: [], providers: [{ id: "odsay", name: "ODsay", role: "대중교통 경로", configured: true, ...status }], context: null }),
  }));
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  const notice = page.locator(".route-compare-panel").getByRole("status");
  await expect(notice).toContainText(expected);
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute("lang", "ko");
  await expect(page.locator(".route-option")).toHaveCount(0);
  await expect(page.locator(".route-kakao-fallback a")).toBeVisible();
  await expect(page.locator(".route-compare-panel")).not.toContainText("untrusted upstream text");
});
