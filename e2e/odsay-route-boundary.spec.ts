import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";
import { odsayProviderStatus } from "../lib/transport/odsay-response.js";

// Browser contract only: provider/handler request-coordinate validation is exercised
// by odsay-route-integrity.test.mjs. These are controlled responses, not live API proof.
for (const [name, code, expected, expectedEnglish] of [
  ["unrelated endpoints", "ENDPOINT_MISMATCH", "요청한 출발·도착 장소와 정류장의 연결을 확인하지 못했습니다.", "The stops could not be linked to your requested departure and destination."],
  ["incomplete transfer", "MISSING_CONNECTION", "도보·환승 구간의 연결이 확인되지 않아 전체 경로로 표시하지 않습니다.", "Walking or transfer connections could not be verified."],
  ["empty result", "-99", "이 구간에서 제공되는 대중교통 경로가 없습니다.", "No public transport route is available for this leg."],
  ["provider error", "500", "대중교통 경로 응답을 확인하지 못했습니다.", "Public transport information could not be checked."],
] as const) test(`transit ${name} is visible and cannot become a confirmed option`, async ({ page }) => {
  let requests = 0;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  const status = odsayProviderStatus({ configured: true, error: { code, message: "untrusted upstream text" } });
  await page.route("**/api/route?**", route => { requests++; return route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ configured: false, alternatives: [], providers: [{ id: "odsay", name: "ODsay", role: "대중교통 경로", configured: true, ...status }], context: null }),
  }); });
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
  const before = requests;
  await page.keyboard.press("Control+Home");
  const preferences = page.locator(".preference-controls:visible");
  await preferences.getByLabel("환경설정 열기", { exact: true }).click();
  await preferences.getByLabel("언어", { exact: true }).selectOption("en");
  await preferences.getByLabel("Open preferences", { exact: true }).click();
  await expect(notice).toHaveAttribute("lang", "en");
  await expect(notice).toContainText(expectedEnglish);
  await expect(notice).not.toContainText(/[가-힣]/);
  await expect(page.locator(".route-option")).toHaveCount(0);
  expect(requests).toBe(before);
});
