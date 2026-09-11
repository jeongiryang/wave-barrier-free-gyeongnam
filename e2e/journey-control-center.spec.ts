import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions } from "./fixtures";

async function openPlanner(page: import("@playwright/test").Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("wave-arrival-session-v1", "done");
  });
  await page.goto("/planner");
  await page.locator(".reference-progress").waitFor();
}

test("데스크톱 여정 레일은 상태·다음 행동과 키보드 초점을 제공한다", async ({ page }) => {
  await openPlanner(page, 1366, 900);
  const rail = page.getByRole("navigation", { name: "여행 만들기 단계" });
  await expect(rail).toBeVisible();
  await expect(rail.getByRole("button", { name: /^1\. 여행 조건/ })).toHaveAttribute("aria-current", "step");
  await expect(page.locator(".reference-completion")).toHaveAttribute("aria-valuenow", "0");
  await expect(page.locator(".reference-search")).toContainText("필요한 편의");

  const departureSelect = page.getByRole("group", { name: "여행 지역 선택", exact: true }).getByRole("button", { name: "경남 전체", exact: true });
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

test("모바일 4단계 진행 표시는 44px 탐색과 수평 안전 영역을 유지한다", async ({ page }) => {
  await openPlanner(page, 390, 844);
  const rail = page.locator(".reference-progress");
  await expect(rail).toBeVisible();
  expect(await rail.evaluate((element) => getComputedStyle(element).position)).not.toBe("fixed");
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

test("한 단계씩 보기에서는 질문 하나만 보여 주고 전체 보기로 즉시 전환한다", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.goto("/planner");

  const mode = page.getByRole("group", { name: "여행 설계 보기 방식" });
  await expect(mode.getByRole("button", { name: /한 단계씩/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "경남, 어디부터 가볼까요?", exact: true })).toBeVisible();
  await expect(page.locator("#places")).toBeHidden();

  const journeyNavigation = page.getByRole("navigation", { name: "여행 만들기 단계" });
  const placesStep = journeyNavigation.getByRole("button", { name: /여행지/ });
  await expect(placesStep).toBeDisabled();
  await chooseTripConditions(page);
  await expect(page.getByRole("heading", { name: "경남도립미술관", exact: true })).toBeVisible();
  await placesStep.click();
  await expect.poll(
    () => page.evaluate(() => window.sessionStorage.getItem("wave-planner-active-step-v1")),
    { message: "여행지 단계 선택은 현재 탭의 단계 상태에 즉시 반영돼야 한다." },
  ).toBe("places");
  await expect(mode.getByRole("button", { name: /한 단계씩/ })).toHaveAttribute("aria-pressed", "true");
  await expect(placesStep).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("heading", { name: "내 조건에 맞는 여행지" })).toBeVisible();
  await expect(page.locator("#places")).toBeVisible();
  await expect(page.locator("#conditions")).toBeHidden();

  await mode.getByRole("button", { name: "전체 보기", exact: true }).click();
  await expect(mode.getByRole("button", { name: /전체 보기/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#conditions")).toBeVisible();
  await expect(page.locator("#itinerary")).toBeVisible();
  await expect(page.locator("#departure-readiness")).toBeVisible();
});
