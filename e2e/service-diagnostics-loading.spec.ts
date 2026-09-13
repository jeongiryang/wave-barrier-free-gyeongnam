import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi, openItinerary } from "./fixtures";

async function tripValues(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {});
}

for (const failure of [false, true]) test(`service diagnostics load only when opened and preserve the planner ${failure ? "on load failure" : "on success"}`, async ({ page }) => {
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests: string[] = [];
  page.on("request", request => { if (request.url().includes("PlannerServiceDiagnostics")) requests.push(request.url()); });
  if (failure) await page.route(/PlannerServiceDiagnostics/, route => route.abort("failed"));
  await page.goto("/planner");
  await chooseTripConditions(page);
  expect(requests).toHaveLength(0);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page, { start: "2026-10-08", end: "2026-10-09" });
  await expect.poll(async () => JSON.parse((await tripValues(page))["wave-trip-schedule-v1"] || "{}")).toMatchObject({ travelStart: "2026-10-08", travelEnd: "2026-10-09" });
  const before = await tripValues(page);
  expect(JSON.parse(before["wave-saved-places"] || "[]")).toEqual(["1001"]);

  const tools = page.locator(".simple-more-trip-tools");
  const toolsSummary = tools.locator(":scope > summary");
  const details = tools.locator(".planner-service-status");
  const summary = details.locator(":scope > summary");
  await expect(tools).not.toHaveAttribute("open");
  await expect(summary).toBeHidden();
  expect(requests).toHaveLength(0);
  await toolsSummary.focus();
  await page.keyboard.press("Enter");
  await expect(summary).toHaveAccessibleName("정보 연결 상태");
  await expect(summary).toBeVisible();
  // Opening the tools drawer still must not download its optional diagnostics.
  expect(requests).toHaveLength(0);
  await summary.focus();
  await expect(summary).toBeFocused();
  await page.keyboard.press("Enter");
  if (failure) await expect(details.getByRole("alert")).toContainText("일정은 유지됩니다");
  else await expect(details.getByRole("region", { name: "서비스 상태 상세" })).toContainText("인증키 연결과 실제 시간·운행정보 확인은 다른 상태");
  expect(requests).toHaveLength(1);
  await expect(summary).toBeFocused();
  expect(await tripValues(page)).toEqual(before);
  await page.keyboard.press("Enter");
  await expect(details).not.toHaveAttribute("open");
  await expect(summary).toBeFocused();
  await page.keyboard.press("Enter");
  if (failure) await expect(details.getByRole("alert")).toContainText("일정은 유지됩니다");
  else await expect(details.getByRole("region", { name: "서비스 상태 상세" })).toBeVisible();
  expect(requests).toHaveLength(1);
  await summary.focus();
  await page.keyboard.press("Enter");
  await toolsSummary.focus();
  await page.keyboard.press("Enter");
  await expect(tools).not.toHaveAttribute("open");
  await expect(toolsSummary).toBeFocused();
  expect(await tripValues(page)).toEqual(before);

  await page.getByRole("group", { name: "여행 설계 화면" }).getByRole("button", { name: "여행지 찾기", exact: true }).click();
  const changedSearch = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/wave" && url.searchParams.get("action") === "plan"
      && (url.searchParams.get("themes") || "").split(",").includes("food");
  });
  await page.getByRole("button", { name: /^음식/ }).click();
  await (await changedSearch).finished();
  await expect(page.getByRole("button", { name: /^음식/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await openItinerary(page);
  const after = await tripValues(page);
  for (const key of ["wave-saved-places", "wave-trip-order-v1", "wave-trip-schedule-v1"]) expect(after[key]).toEqual(before[key]);
  expect(requests).toHaveLength(1);
});
