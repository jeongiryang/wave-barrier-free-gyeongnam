import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

for (const source of ["archive", "shared"] as const) test(`${source}: restoring a two-theme trip keeps both selected activities`, async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (source === "archive") {
    await page.goto("/planner");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: /^음식/ }).click();
    await page.locator(".condition-actions").getByRole("button", { name: "여행지 찾기 →", exact: true }).click();
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
    const itinerary = page.getByRole("region", { name: "날짜별 여행 일정" });
    await itinerary.getByRole("button", { name: "내 일정에 저장", exact: true }).click();
    await expect(itinerary.locator(".travel-book-archive-action [role=status]")).toContainText("내 일정에 저장했어요");
    await itinerary.getByRole("link", { name: /저장한 일정 보기/ }).click();
    await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
  } else {
    await page.route("**/api/trips/shared-theme", route => route.fulfill({ json: {
      plan, selections: { region: "창원", theme: "nature,food", themes: ["nature", "food"], profiles: [], travelStart: "2026-10-08", travelEnd: "2026-10-09" }, expiresAt: Date.now() + 86_400_000,
    } }));
    await page.goto("/trip/shared-theme");
    await page.getByRole("link", { name: "이 조건으로 다시 설계하기 →", exact: true }).click();
  }
  await expect(page.getByRole("button", { name: /^자연·휴양/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^음식/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^역사·문화/ })).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByRole("button", { name: /^자연·휴양/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^음식/ })).toHaveAttribute("aria-pressed", "true");
});
