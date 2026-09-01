import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

async function openPlanner(page: import("@playwright/test").Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("wave-motion", "calm");
    window.sessionStorage.setItem("wave-intro-seen-v2", "1");
  });
  await page.goto("/planner");
  await page.locator(".journey-rail").waitFor();
}

test("데스크톱 여정 레일은 상태·다음 행동과 키보드 초점을 제공한다", async ({ page }) => {
  await openPlanner(page, 1366, 900);
  const rail = page.getByRole("complementary", { name: "여행 계획 진행 상황" });
  await expect(rail).toBeVisible();
  await expect(rail.getByRole("button", { name: /조건/ })).toHaveAttribute("aria-current", "step");
  await expect(page.getByLabel("정보 상태 안내")).toContainText("확인됨");
  await expect(page.getByLabel("정보 상태 안내")).toContainText("일부 확인");
  await expect(page.getByLabel("정보 상태 안내")).toContainText("재확인 필요");

  const departureSelect = page.getByLabel("출발 거점 선택");
  await departureSelect.focus();
  await expect(departureSelect).toBeFocused();
  const focusStyle = await departureSelect.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: Number.parseFloat(style.outlineWidth), type: style.outlineStyle };
  });
  expect(focusStyle.width).toBeGreaterThanOrEqual(3);
  expect(focusStyle.type).toBe("solid");

  const preference = page.locator("details.preference-controls");
  await preference.locator("summary").press("Enter");
  const language = preference.getByLabel("언어");
  await expect(language).toBeVisible();
  const languageBox = await language.boundingBox();
  expect(languageBox?.height || 0).toBeGreaterThanOrEqual(44);

  const results = await new AxeBuilder({ page }).include(".planner-journey-workspace").analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("모바일 여정 레일은 44px 하단 탐색과 수평 안전 영역을 유지한다", async ({ page }) => {
  await openPlanner(page, 390, 844);
  const rail = page.locator(".journey-rail");
  await expect(rail).toBeVisible();
  expect(await rail.evaluate((element) => getComputedStyle(element).position)).toBe("fixed");
  const sizes = await rail.getByRole("button").evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(sizes).toHaveLength(4);
  for (const size of sizes) {
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
});
