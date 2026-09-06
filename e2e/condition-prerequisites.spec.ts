import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

for (const locale of ["ko", "en"] as const) {
  const en = locale === "en";
  test(`${locale}: activities gate dates, including direct history navigation`, async ({ page }) => {
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.addInitScript((value) => localStorage.setItem("wave-locale", value), locale);
    let searches = 0;
    page.on("request", (request) => { if (request.url().includes("action=plan")) searches++; });
    await page.goto("/planner");
    await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>(".journey-mode-toggle button")?.disabled);
    await page.getByRole("group", { name: en ? "Choose a region" : "여행 지역 선택", exact: true }).getByRole("button", { name: en ? "Changwon" : "창원", exact: true }).click();
    const next = page.locator(".condition-actions").getByRole("button", { name: en ? "Continue →" : "다음 →", exact: true });
    await next.click();
    await page.locator(".profile-grid button").first().click();
    await next.click();
    const dates = page.locator(".condition-progress button").nth(3);
    const status = page.locator("#conditions").getByRole("status");
    const activityHeading = en ? "What would you like to do?" : "무엇을 하고 싶나요?";
    await expect(next).toBeDisabled();
    await expect(dates).toBeDisabled();
    await expect(status).toHaveText(en ? "Select at least one activity to continue." : "하고 싶은 활동을 하나 이상 선택해 주세요.");
    await page.evaluate(() => {
      history.pushState(null, "", "/planner?question=3#conditions");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await expect(page.getByRole("heading", { name: activityHeading, exact: true })).toBeVisible();
    await expect(page.locator(".condition-actions").getByRole("button", { name: /Find places|여행지 찾기/ })).toHaveCount(0);
    expect(searches).toBe(0);
    const activity = page.locator(".theme-grid button").first();
    await activity.click();
    // A forced URL can now expose Dates only after its prerequisite is satisfied.
    await expect(dates).toBeEnabled();
    await dates.click();
    await expect(page.locator(".condition-actions").getByRole("button", { name: /Find places|여행지 찾기/ })).toBeEnabled();
    await page.locator(".condition-progress button").nth(2).click();
    expect((await new AxeBuilder({ page }).include("#conditions").analyze()).violations).toEqual([]);
    await activity.click();
    await expect(next).toBeDisabled();
    await expect(dates).toBeDisabled();
    await expect(status).toBeVisible();
    expect(searches).toBe(0);
    expect((await new AxeBuilder({ page }).include("#conditions").analyze()).violations).toEqual([]);
  });

  test(`${locale}: landing journey summary has a localized accessible name and steps`, async ({ page }) => {
    await mockPlannerApi(page);
    await page.addInitScript((value) => localStorage.setItem("wave-locale", value), locale);
    await page.goto("/");
    const summary = page.locator(".landing-journey-summary");
    await expect(summary).toHaveAccessibleName(en
      ? "Four steps: choose a region and facilities, find places, then check your itinerary and travel routes."
      : "지역과 필요한 편의를 고르고 여행지를 일정에 추가해 이동 경로를 확인하는 네 단계");
    await expect(summary.locator("li span")).toHaveText(en
      ? ["Choose a region", "Required facilities", "Find places", "Itinerary and routes"]
      : ["지역 선택", "필요한 편의", "여행지 찾기", "일정·이동 확인"]);
    if (en) await expect(summary).not.toContainText(/[가-힣]/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include(".landing-hero").analyze()).violations).toEqual([]);
  });
}
