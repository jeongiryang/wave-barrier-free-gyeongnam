import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

async function prepare(page: Page) {
  await page.goto("/planner");
  await expect(page.getByRole("button", { name: "Step by step", exact: true })).toBeEnabled();
  const conditions = page.locator("#conditions");
  await conditions.getByRole("button", { name: "창원 지역 선택", exact: true }).click();
  await conditions.locator(".condition-actions button").last().click();
  await conditions.getByRole("button", { name: /Wheelchair facilities/ }).click();
  await conditions.locator(".condition-actions button").last().click();
  await conditions.getByRole("button", { name: /Nature and relaxation/ }).click();
}

test("English navigation preserves gates, stage history and keyboard focus", async ({ page }) => {
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.addInitScript(() => localStorage.setItem("wave-locale", "en"));
  let searches = 0;
  page.on("request", request => { if (request.url().includes("action=plan")) searches++; });
  await prepare(page);
  const rail = page.locator(".reference-progress");
  const status = page.locator(".journey-live-summary [role=status]");
  const progress = page.locator(".reference-completion");
  await expect(rail.getByRole("button")).toHaveCount(4);
  await expect(rail).not.toContainText(/[가-힣]/);
  await expect(page.locator(".reference-journey-views button").nth(1)).toBeDisabled();
  await expect(rail.getByRole("button").last()).toBeDisabled();
  await expect(status).toHaveText("Not searched");
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await expect(page.locator(".journey-mode-toggle")).not.toContainText(/[가-힣]/);
  await expect(page.locator(".simple-footer")).not.toContainText(/[가-힣]/);
  await expect(page.getByRole("link", { name: "Log in", exact: true })).toHaveAttribute("href", "/login?next=%2Fplanner");
  const menuTrigger = page.getByRole("button", { name: "Open main menu", exact: true });
  if (await menuTrigger.isVisible()) {
    await menuTrigger.click();
    const mobileMenu = page.getByRole("navigation", { name: "Mobile main menu", exact: true });
    await expect(mobileMenu).toBeVisible();
    await expect(mobileMenu).not.toContainText(/[가-힣]/);
    await page.keyboard.press("Escape");
    await expect(mobileMenu).toBeHidden();
    await expect(menuTrigger).toBeFocused();
  } else {
    await expect(page.getByRole("navigation", { name: "Main menu", exact: true })).not.toContainText(/[가-힣]/);
  }
  expect(searches).toBe(0);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.locator(".journey-stage-stream")).toHaveAttribute("data-view", "overview");
  await page.getByRole("button", { name: "Step by step", exact: true }).click();
  expect(searches).toBe(0);
  await page.getByRole("button", { name: "Find places →", exact: true }).click();
  await expect(status).toHaveText("2 places");
  await expect(progress).toHaveAttribute("aria-valuenow", "25");
  await rail.getByRole("button").first().click();
  await expect(page).toHaveURL(/#conditions$/);
  await page.goBack();
  await expect(rail.getByRole("button").nth(2)).toHaveAttribute("aria-current", "step");
  await expect(page.locator("#places")).toBeVisible();
  expect((await new AxeBuilder({ page }).include(".reference-progress").include(".journey-mode-toggle").include(".simple-footer").analyze()).violations).toEqual([]);
  await rail.getByRole("button").nth(1).click();
  await page.getByRole("button", { name: /Hearing information support/ }).click();
  await expect(status).toHaveText("Search again");
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  expect(searches).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

for (const response of ["empty", "error"] as const) {
  test(`English recommendation summary distinguishes loading and ${response} from not searched`, async ({ page }) => {
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.addInitScript(() => localStorage.setItem("wave-locale", "en"));
    let release!: () => void;
    const released = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/wave?action=plan*", async (route) => {
      await released;
      await route.fulfill(response === "error" ? { status: 503, json: { error: "Unavailable" } } : {
        status: 200, json: { mode: "live", generatedAt: "2026-09-06T00:00:00Z", baseYm: "202609", course: null, audio: null, places: [], stops: [], statuses: [] } satisfies import("../features/planner/types").PlanData,
      });
    });
    await prepare(page);
    const status = page.locator(".journey-live-summary").getByRole("status", { includeHidden: true });
    await expect(status).toHaveText("Not searched");
    await page.getByRole("button", { name: "Find places →", exact: true }).click();
    try { await expect(status).toHaveText("Loading"); } finally { release(); }
    await expect(status).toHaveText(response === "error" ? "Try again" : "No matching places");
    await expect(page.locator(".reference-journey-views button").nth(1)).toBeDisabled();
    await expect(page.locator(".reference-progress button").last()).toBeDisabled();
  });
}
