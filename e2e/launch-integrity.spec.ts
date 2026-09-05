import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

test("first visit stays neutral and later stages are locked without a search", async ({ page }) => {
  let requests = 0;
  await mockPlannerApi(page, { plannerView: "guided" });
  page.on("request", (request) => { if (request.url().includes("action=plan")) requests++; });
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "어디로 갈까요?", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "여행 지역 선택", exact: true }).locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator(".condition-actions button")).toBeDisabled();
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "0");
  await expect(page.locator(".journey-rail nav button").nth(1)).toBeDisabled();
  expect(requests).toBe(0);
  await expect(page.locator(".planner-progress-status")).toHaveText("4단계 중 0단계 완료 · 4단계 남음");
});

test("guided search failures stay visible with choices preserved and allow retry", async ({ page }) => {
  await mockPlannerApi(page, { plannerView: "guided", failPlan: true });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await expect(page.locator("#conditions").getByRole("alert")).toContainText("선택한 조건은 유지됩니다");
  await expect(page.locator(".condition-actions").getByRole("button", { name: /내 조건에 맞는 여행지 찾기/ })).toBeEnabled();
  await expect(page.locator("#places")).toBeHidden();
});

test("intro replays without blocking the planning link or moving keyboard focus", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/");
  const replay = page.getByRole("button", { name: "인트로 다시보기" });
  await replay.focus();
  await replay.press("Enter");
  await expect(replay).toBeFocused();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".landing-actions").getByRole("link", { name: /내 여행 설계하기/ })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await replay.press("Enter");
  await expect(replay).toBeFocused();
});

test("one saved place does not complete the trip and the dialog contains keyboard focus", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  const trigger = page.getByRole("button", { name: "편의시설 보기", exact: true }).first();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "경남도립미술관", exact: true })).toBeFocused();
  for (let index = 0; index < 18; index++) {
    await page.keyboard.press(index % 2 ? "Shift+Tab" : "Tab");
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await expect(page.locator('.journey-rail [role="progressbar"]')).toHaveAttribute("aria-valuenow", "50");
});

test("old dated stops are kept separately and never become new-date markers", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByLabel("여행 시작일", { exact: true }).fill("2026-10-14");
  await expect(page.locator(".outside-trip-dates")).toContainText("2026-10-08");
  await expect(page.locator(".day-planner-grid li")).toHaveCount(0);
  await expect(page.locator(".route-scope-note").first()).toContainText("일정 0곳");
  await page.getByLabel("경남도립미술관 이번 여행 날짜로 이동").selectOption("2026-10-14");
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
});

for (const width of [280, 320, 390, 768, 1024, 1366, 1920, 2560]) {
  test(`neutral questions reflow at ${width}px without page overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 800 : 960 });
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.goto("/planner");
    await expect(page.getByRole("heading", { name: "어디로 갈까요?", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`questions-${width}.png`), fullPage: true });
  });
}
