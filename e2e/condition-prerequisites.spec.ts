import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

for (const locale of ["ko", "en"] as const) {
  const en = locale === "en";
  test(`${locale}: main planning copy stays fully painted across forward and return scrolling`, async ({ page }) => {
    await mockPlannerApi(page);
    await page.addInitScript((value) => localStorage.setItem("wave-locale", value), locale);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    const copy = page.locator(".landing-hero-copy");
    const planning = page.locator(".landing-actions a");
    await expect(copy).toHaveCSS("opacity", "1");
    await page.locator(".region-showcase-stage").scrollIntoViewIfNeeded();
    // Keep the primary message painted even outside the viewport: returning
    // to the CTA must not start a transparent-to-readable reveal again.
    const scrollPaint = await copy.evaluate(node => new Promise<string[]>(resolve => {
      const samples: string[] = [];
      const start = performance.now();
      function sample() {
        samples.push(getComputedStyle(node).opacity);
        if (performance.now() - start < 900) requestAnimationFrame(sample);
        else resolve(samples);
      }
      requestAnimationFrame(sample);
    }));
    expect(new Set(scrollPaint)).toEqual(new Set(["1"]));
    await expect(copy).toHaveCSS("opacity", "1");
    await planning.scrollIntoViewIfNeeded();
    await expect(copy).toHaveCSS("opacity", "1");
    await expect(planning).toBeVisible();
    expect((await new AxeBuilder({ page }).include(".landing-hero-copy").analyze()).violations).toEqual([]);
    await planning.click();
    await expect(page).toHaveURL(/\/planner/);
  });

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
    const status = page.locator("#conditions > p[role='status']");
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
    await expect(page.locator(".condition-inputs")).toHaveCSS("opacity", "1");
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
    await page.setViewportSize({ width: 1440, height: 960 });
    const summary = page.locator(".story-progress");
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    await expect(summary).toBeVisible();
    await expect(page.locator(".landing-hero-copy")).toHaveCSS("opacity", "1");
    await expect(summary).toHaveAccessibleName(en ? "Introduction sections" : "서비스 소개 페이지 탐색");
    await expect(summary.locator("#story-progress-list a > span")).toHaveText(en
      ? ["Welcome", "Gyeongnam", "Facilities", "Places", "Before leaving", "Community", "Plan a trip"]
      : ["처음", "경남", "필요한 편의", "여행지", "출발 전", "여행 이야기", "여행 계획"]);
    if (en) await expect(summary).not.toContainText(/[가-힣]/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include(".landing-hero").analyze()).violations).toEqual([]);
  });
}
