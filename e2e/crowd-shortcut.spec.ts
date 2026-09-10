import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";

for (const plannerView of ["guided", "overview"] as const) {
  test(`${plannerView} visitor forecast shortcut opens the relevant evidence with keyboard focus`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPlannerApi(page, { plannerView, crowdRate: 65 });
    await mockPublicShellApi(page);
    let crowdRequests = 0;
    page.on("request", request => { if (new URL(request.url()).searchParams.get("action") === "crowd") crowdRequests++; });
    await page.goto("/planner");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
    if (plannerView === "guided") {
      await page.getByRole("navigation", { name: "여행 만들기 단계" }).getByRole("button", { name: /^7\. 전체보기/ }).click();
      await page.locator(".reference-departure-details > summary").click();
    }
    const shortcut = page.locator(".readiness-grid article").filter({ has: page.getByText("관광 집중률", { exact: true }) }).getByRole("link");
    await expect(page.locator("#layers")).not.toHaveAttribute("open");
    await shortcut.click();
    const heading = page.locator(".impact-response h3");
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    await expect(page.locator(".impact-response")).toContainText("관광 집중률 예측");
    const requests = crowdRequests;
    await page.locator("#layers > summary").click();
    await expect(page.locator("#layers")).not.toHaveAttribute("open");
    await shortcut.focus();
    await page.keyboard.press("Enter");
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    expect(crowdRequests).toBe(requests);
    await page.locator("#layers > summary").click();
    await page.goBack();
    await page.goForward();
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    for (const width of [960, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await heading.focus();
      await expect(page.locator(".impact-response")).toHaveCSS("opacity", "1");
      await page.locator(".impact-response").screenshot({ path: test.info().outputPath(`crowd-shortcut-${width}.png`) });
    }
    await page.locator("#layers > summary").click();
    await page.getByRole("button", { name: "날씨·방문 경향 바로 확인하기", exact: true }).click();
    await expect(page.locator("#layers > summary")).toBeFocused();
    await expect(page).toHaveURL(/#layers$/);
  });
}

test("a restored itinerary's visitor forecast link opens its unavailable state without a fresh search", async ({ page }) => {
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  let searches = 0;
  page.on("request", request => { if (new URL(request.url()).searchParams.get("action") === "plan") searches++; });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.goto("/planner#crowd");
  await expect(page.locator("#layers")).toHaveAttribute("open");
  await expect(page.locator("#crowd")).toContainText("현재 일정의 관광 집중률은 아직 조회하지 않았습니다.");
  await expect(page.locator("#crowd")).not.toContainText("65.0%");
  expect(searches).toBe(1);
});
