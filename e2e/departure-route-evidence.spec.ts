import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

for (const en of [false, true]) for (const color of ["light", "dark"]) test(`${en ? "EN" : "KO"} ${color}: route readiness tracks current itinerary legs and never confirms mobility access`, async ({ page }) => {
  await mockPlannerApi(page);
  await page.addInitScript(color => localStorage.setItem("wave-theme", color), color);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에 추가", exact: true }).click();
  if (en) {
    await page.keyboard.press("Control+Home");
    const preferences = page.locator(".preference-controls:visible");
    await preferences.getByLabel("환경설정 열기", { exact: true }).click();
    await preferences.getByLabel("언어", { exact: true }).selectOption("en");
    await preferences.getByLabel("Open preferences", { exact: true }).click();
  }
  const card = page.locator(".departure-readiness");
  const journeys = card.locator("article").filter({ has: page.getByText(en ? "Journey times" : "이동 경로·시간", { exact: true }) });
  const mobility = card.locator("article").filter({ has: page.getByText(en ? "Access along the journey" : "이동 편의", { exact: true }) });
  const count = (value: number) => en ? `${value} of 2 journeys verified` : `전체 2구간 중 ${value}구간`;
  await expect(journeys).toContainText(count(0));
  await expect(journeys).toHaveClass("recheck");
  await page.route("**/api/route?*", route => new URL(route.request().url()).searchParams.get("endLat") === "35.229"
    ? route.fulfill({ json: { configured: true, alternatives: [], providers: [{ id: "tago", name: "TAGO", state: "connected", configured: true }], context: {} } }) : route.fallback());
  const check = page.getByRole("button", { name: en ? "Check all journeys" : "모든 구간 조회하기", exact: true });
  await check.click();
  await expect(journeys).toContainText(count(1));
  await expect(journeys).toHaveClass("partial");
  await expect(mobility).toHaveClass("recheck");
  await page.unroute("**/api/route?*");
  await check.click();
  await expect(journeys).toContainText(count(2));
  await expect(journeys).toHaveClass("confirmed");
  await expect(mobility).toHaveClass("recheck");
  await expect(card.locator(".readiness-overall")).toHaveClass(/recheck/);
  const mode = page.locator(".itinerary-route-coverage select");
  await mode.selectOption("walk");
  await expect(journeys).toContainText(count(0));
  await expect(journeys).toHaveClass("recheck");
  await mode.selectOption("car");
  await expect(journeys).toContainText(count(2));
  await page.locator(".day-planner").getByLabel(en ? "용지호수공원 trip date" : "용지호수공원 여행 날짜", { exact: true }).selectOption("2026-10-09");
  await expect(journeys).toContainText(count(0));
  await expect(journeys).toHaveClass("recheck");
  await check.click();
  await expect(journeys).toContainText(count(2));
  await card.scrollIntoViewIfNeeded();
  expect((await new AxeBuilder({ page }).include(".departure-readiness").analyze()).violations).toEqual([]);
  if (test.info().project.name === "desktop-chromium") for (const width of [960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await card.screenshot({ path: test.info().outputPath(`departure-${en ? "en" : "ko"}-${color}-${width}.png`) });
  }
  await page.reload();
  await expect(journeys).toContainText(count(0));
  await expect(journeys).toHaveClass("recheck");
  await expect(mobility).toHaveClass("recheck");
});
