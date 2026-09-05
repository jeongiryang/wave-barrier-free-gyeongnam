import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions } from "./fixtures";

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
  await expect(rail.locator("nav").getByRole("button", { name: /조건/ })).toHaveAttribute("aria-current", "step");
  await expect(rail.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await expect(page.getByText("선택한 편의 조건 없음", { exact: true })).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 1_000));
  await expect.poll(async () => Math.round(await rail.locator(".journey-rail-inner").evaluate(
    (element) => element.getBoundingClientRect().top,
  ))).toBe(104);

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

test("한 단계씩 보기에서는 질문 하나만 보여 주고 전체 보기로 즉시 전환한다", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.goto("/planner");

  const mode = page.getByRole("group", { name: "여행 설계 보기 방식" });
  await expect(mode.getByRole("button", { name: /한 단계씩/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "어디로 갈까요?", exact: true })).toBeVisible();
  await expect(page.locator("#places")).toBeHidden();

  const journeyNavigation = page.getByRole("navigation", { name: "여행 계획 단계 이동" });
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
  await expect(page.locator(".guided-stage-prompt").getByRole("heading", { name: "왜 이 장소가 나에게 맞을까요?" })).toBeVisible();
  await expect(page.locator("#places")).toBeVisible();
  await expect(page.locator("#conditions")).toBeHidden();

  await page.getByRole("button", { name: "전체 정보 한눈에 보기" }).click();
  await expect(mode.getByRole("button", { name: /전체 보기/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#conditions")).toBeVisible();
  await expect(page.locator("#itinerary")).toBeVisible();
  await expect(page.locator("#departure-readiness")).toBeVisible();
});
