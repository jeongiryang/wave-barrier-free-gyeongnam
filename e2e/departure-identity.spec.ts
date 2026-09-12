import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";

for (const locale of ["ko", "en"]) test(`departure follows the saved place instead of the first recommendation (${locale})`, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.clock.setFixedTime(new Date("2026-10-08T01:00:00Z"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.route("**/api/wave?*", async route => {
    if (new URL(route.request().url()).searchParams.get("action") !== "crowd") return route.fallback();
    return route.fulfill({ status: 200, json: { crowd: { place: "용지호수공원", rate: 31.5, baseYmd: "20261008" } } });
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-08");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true }).click();
  const card = page.locator("#departure-readiness");
  const forecast = card.locator("article").nth(1);
  await expect(forecast).toContainText("용지호수공원 31.5%");
  await expect(forecast).toContainText("2026-10-08");
  await expect(forecast).toHaveClass("confirmed");
  if (locale === "en") {
    await openSupportMenu(page);
    const preferences = page.locator(".preference-controls:visible");
    await preferences.locator("summary").focus();
    await openSupportMenu(page);
    await preferences.getByLabel("환경설정 열기", { exact: true }).click();
    await preferences.getByLabel("언어", { exact: true }).selectOption("en");
    await openSupportMenu(page);
    await preferences.getByLabel("Open preferences", { exact: true }).click();
    await expect(forecast).toContainText("1 of 1 itinerary places");
    await expect(forecast.locator('[lang="ko"]')).toContainText("용지호수공원");
  }
  await expect(forecast).not.toContainText("경남도립미술관");
  await expect(forecast).not.toContainText("24.0%");
  await expect(forecast).toContainText(locale === "en" ? "not a live visitor count" : "실시간 방문자 수가 아닙니다");
  await forecast.getByRole("link").focus();
  await expect(forecast.getByRole("link")).toBeFocused();
  await card.screenshot({ path: test.info().outputPath(`departure-identity-${locale}.png`) });
  expect((await new AxeBuilder({ page }).include("#departure-readiness").analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
