import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, openItinerary } from "./fixtures";

for (const en of [false, true]) test(`archive module failure preserves editable itinerary ${en ? "EN dark" : "KO light"}`, async ({ page }, testInfo) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(en => {
    localStorage.setItem("wave-locale", en ? "en" : "ko");
    localStorage.setItem("wave-theme", en ? "dark" : "light");
  }, en);
  let archiveRequests = 0;
  await page.route("**/features/travel-book/TravelBookArchiveAction.tsx*", route => {
    archiveRequests++;
    return archiveRequests === 1 ? route.abort("failed") : route.continue();
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  expect(archiveRequests).toBe(0);
  await page.getByRole("button", { name: `경남도립미술관 ${en ? "add to itinerary" : "일정에 담기"}`, exact: true }).click();
  expect(archiveRequests).toBe(0);
  await openItinerary(page, { start: "2026-10-07" });
  const unavailable = page.locator(".archive-unavailable");
  await expect(unavailable.getByRole("alert")).toContainText(en ? "You can keep editing" : "일정은 계속 편집");
  await expect(page.locator(".simple-stops > li")).toHaveCount(1);
  expect(archiveRequests).toBe(1);
  await page.getByRole("button", { name: "여행 설정", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "여행 설정", exact: true });
  const start = settings.getByLabel("하루 시작", { exact: true });
  await start.fill("08:30");
  await expect(start).toHaveValue("08:30");
  await settings.getByRole("button", { name: "적용", exact: true }).click();
  expect((await new AxeBuilder({ page }).include(".archive-unavailable").analyze()).violations).toEqual([]);
  if (testInfo.project.name === "desktop-chromium") {
    await page.setViewportSize({ width: en ? 1440 : 960, height: 960 });
    await unavailable.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("archive-recovery.png") });
  }
  const reload = unavailable.getByRole("button", { name: en ? "Reload page" : "화면 다시 불러오기", exact: true });
  await reload.focus();
  await Promise.all([page.waitForEvent("load"), page.keyboard.press("Enter")]);
  await expect(page.locator(".simple-save-control > button")).toBeEnabled();
  await expect(page.locator(".simple-stops > li")).toHaveCount(1);
  await page.getByRole("button", { name: "여행 설정", exact: true }).click();
  await expect(start).toHaveValue("08:30");
  await expect(settings.getByLabel("시작일", { exact: true })).toHaveValue("2026-10-07");
  expect(archiveRequests).toBe(2);
  expect(await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values["wave-saved-places"]))).toEqual(["1001"]);
});
