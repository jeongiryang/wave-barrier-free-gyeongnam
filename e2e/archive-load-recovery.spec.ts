import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

for (const en of [false, true]) test(`archive module failure preserves editable itinerary ${en ? "EN dark" : "KO light"}`, async ({ page }, testInfo) => {
  await mockPlannerApi(page);
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
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  await page.getByRole("group", { name: en ? "Choose a region" : "여행 지역 선택", exact: true }).getByRole("button", { name: en ? "Changwon" : "창원", exact: true }).click();
  await page.getByRole("button", { name: en ? /Wheelchair facilities/ : /휠체어 편의시설/ }).click();
  await page.getByRole("button", { name: en ? /Nature and relaxation/ : /자연·휴양 공원/ }).click();
  await page.locator(".condition-actions").getByRole("button", { name: en ? "Find places →" : "여행지 둘러보기 →", exact: true }).click();
  expect(archiveRequests).toBe(0);
  await page.getByRole("button", { name: en ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가", exact: true }).click();
  const unavailable = page.locator(".archive-unavailable");
  await expect(unavailable.getByRole("alert")).toContainText(en ? "You can keep editing" : "일정은 계속 편집");
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
  expect(archiveRequests).toBe(1);
  const start = page.locator('input[type="time"]').first();
  await start.fill("08:30");
  await expect(start).toHaveValue("08:30");
  expect((await new AxeBuilder({ page }).include(".archive-unavailable").analyze()).violations).toEqual([]);
  if (testInfo.project.name === "desktop-chromium") {
    await page.setViewportSize({ width: en ? 1440 : 960, height: 960 });
    await unavailable.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("archive-recovery.png") });
  }
  const reload = unavailable.getByRole("button", { name: en ? "Reload page" : "화면 다시 불러오기", exact: true });
  await reload.focus();
  await Promise.all([page.waitForEvent("load"), page.keyboard.press("Enter")]);
  await expect(page.locator(".travel-book-archive-controls button")).toBeEnabled();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
  await expect(page.locator('input[type="time"]').first()).toHaveValue("08:30");
  expect(archiveRequests).toBe(2);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
});
