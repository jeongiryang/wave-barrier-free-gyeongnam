import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";

test("compact first step preserves an existing trip when replacing the old overview preference", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.evaluate(() => {
    localStorage.removeItem("wave-planner-stage-view-v2");
    localStorage.setItem("wave-planner-stage-view-v1", "overview");
    sessionStorage.removeItem("wave-planner-active-step-v1");
  });
  // The fixture does not overwrite the same traveller's saved view on navigation.
  await page.goto("/planner?question=0#conditions");
  await expect(page.locator(".journey-stage-stream")).toHaveAttribute("data-view", "guided");
  await expect(page.locator(".reference-region-card")).toHaveCount(3);
  await expect(page.locator(".condition-date-disclosure")).not.toHaveAttribute("open");
  await expect(page.locator(".wave-trip-count")).toHaveText("1");
  await page.getByRole("button", { name: /내 여행/ }).first().click();
  await expect(page.locator(".reference-day-list")).toContainText("경남도립미술관");
});

test("dates can be edited before saving a place and return to the first step", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.goto("/planner?question=3#conditions");
  await expect(page.getByRole("heading", { name: "언제 떠날까요?", exact: true })).toBeVisible();
  const start = page.locator(".reference-date-fields input").first();
  const date = await start.inputValue();
  await page.getByRole("button", { name: "여행 조건으로 돌아가기", exact: true }).click();
  await expect(page.getByRole("heading", { name: "경남, 어디부터 가볼까요?", exact: true })).toBeFocused();
  await expect(page.locator(".condition-date-disclosure summary")).toContainText(date);
  await expect(page.locator(".reference-journey-views")).toHaveCount(0);
});

test("landscape film follows scrolling, yields to controls, and releases with reduced motion", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.goto("/");
  const region = page.locator("#regions"), rails = region.locator(".region-card-rail");
  await expect(rails).toHaveCount(2);
  await expect(region).toHaveAttribute("data-film", "true");
  const scrollProgress = (progress: number) => region.evaluate((el, fraction) => {
    const sticky = (el as HTMLElement).dataset.filmSticky === "true";
    const start = scrollY + el.getBoundingClientRect().top - (sticky ? 116 : innerHeight);
    const range = sticky ? (el as HTMLElement).offsetHeight - (innerHeight - 116) : (el as HTMLElement).offsetHeight + innerHeight - 116;
    window.scrollTo({ top: start + range * fraction, behavior: "instant" });
  }, progress);
  await scrollProgress(.2);
  await expect.poll(() => rails.last().evaluate(el => el.scrollLeft)).toBe(0);
  const initial = await rails.first().evaluate(el => el.scrollLeft);
  await scrollProgress(.4);
  await expect.poll(() => rails.first().evaluate(el => el.scrollLeft)).toBeLessThan(initial);
  await expect.poll(() => rails.last().evaluate(el => el.scrollLeft)).toBe(0);
  await scrollProgress(.7);
  await expect.poll(() => rails.first().evaluate(el => el.scrollLeft)).toBe(0);
  await expect.poll(() => rails.last().evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
  await expect(page.locator('.story-progress [aria-current="location"]')).toHaveAttribute("href", "#regions");
  await region.getByRole("button", { name: "다음 지역", exact: true }).click();
  await expect(region.locator("[data-region-stage]")).toHaveAttribute("data-active-region", "하동");
  const manual = await rails.evaluateAll(rows => rows.map(row => row.scrollLeft));
  await page.evaluate(() => window.scrollBy({ top: 90, behavior: "instant" }));
  await expect.poll(() => rails.evaluateAll(rows => rows.map(row => row.scrollLeft))).toEqual(manual);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(region).toHaveAttribute("data-film", "false");
  await expect(region.locator(".region-showcase-stage")).toHaveCSS("position", "relative");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("automatic album changes do not recenter a film owned by vertical scrolling", async ({ page }) => {
  await mockPublicShellApi(page); await mockPlannerApi(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.goto("/");
  const region = page.locator("#regions"), stage = region.locator("[data-region-stage]"), rails = region.locator(".region-card-rail");
  await expect(region).toHaveAttribute("data-film", "true");
  await region.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 116, behavior: "instant" }));
  await page.clock.runFor(100);
  await expect(stage).toHaveAttribute("data-running", "true");
  const offsets = await rails.evaluateAll(rows => rows.map(row => row.scrollLeft));
  const count = Number(await stage.locator(".region-photo-album").getAttribute("data-photo-count"));
  for (let index = 0; index < count; index++) await page.clock.fastForward(4001);
  await expect(stage).toHaveAttribute("data-active-region", "하동");
  expect(await rails.evaluateAll(rows => rows.map(row => row.scrollLeft))).toEqual(offsets);
  await page.evaluate(() => scrollBy({ top: 2, behavior: "instant" }));
  await page.clock.runFor(32);
  const moved = await rails.evaluateAll(rows => rows.map(row => row.scrollLeft));
  for (let index = 0; index < 2; index++) expect(Math.abs(moved[index] - offsets[index])).toBeLessThan(10);
});
