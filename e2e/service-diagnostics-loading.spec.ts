import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

for (const failure of [false, true]) test(`service diagnostics load only when opened and preserve the planner ${failure ? "on load failure" : "on success"}`, async ({ page }) => {
  await mockPlannerApi(page);
  const requests: string[] = [];
  page.on("request", request => { if (request.url().includes("PlannerServiceDiagnostics")) requests.push(request.url()); });
  if (failure) await page.route(/PlannerServiceDiagnostics/, route => route.abort("failed"));
  await page.goto("/planner");
  await expect(page.getByRole("button", { name: /^자연·휴양/ })).toBeEnabled();
  expect(requests).toHaveLength(0);
  const details = page.locator(".planner-service-status");
  await details.locator("summary").focus();
  await page.keyboard.press("Enter");
  if (failure) await expect(details.getByRole("alert")).toContainText("일정은 유지됩니다");
  else await expect(details.getByRole("region", { name: "서비스 상태 상세" })).toContainText("인증키 연결과 실제 시간·운행정보 확인은 다른 상태");
  expect(requests.length).toBeGreaterThan(0);
  await details.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(details).not.toHaveAttribute("open", "");
  await page.getByRole("button", { name: /^음식/ }).click();
  await expect(page.getByRole("button", { name: /^음식/ })).toHaveAttribute("aria-pressed", "true");
});
