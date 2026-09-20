import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { enterDeparture } from "./departure-fixtures";
import { mockPlannerApi } from "./fixtures";

test("unapproved public programs leave no card, input or network activity", async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner");
  const readiness = await enterDeparture(page);
  await expect(readiness.locator(".companion-support-card")).toHaveCount(0);
  await expect(readiness.getByRole("heading", { name: "동행 도움이 필요하다면", exact: true })).toHaveCount(0);
  await expect(readiness.locator("input, textarea, form")).toHaveCount(0);

  await page.waitForTimeout(1000);
  await page.waitForLoadState("networkidle");
  const apiRequests: string[] = [];
  await page.route("**/api/**", route => {
    apiRequests.push(route.request().url());
    return route.fulfill({ status: 503, json: { error: "companion support must not request data" } });
  });
  await page.waitForTimeout(100);
  expect(apiRequests).toEqual([]);
  expect((await new AxeBuilder({ page }).include(".simple-readiness").analyze()).violations).toEqual([]);

  for (const width of [390, 960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("terms state that WAVE does not match or guarantee companions", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByText(/WAVE는 동행자를 모집·연결·배정하지 않으며/)).toBeVisible();
  await expect(page.getByText(/공공 제도의 신청과 이용은 각 주관 기관이 정합니다/)).toBeVisible();
  expect((await new AxeBuilder({ page }).include("#terms-purpose").analyze()).violations).toEqual([]);
});
