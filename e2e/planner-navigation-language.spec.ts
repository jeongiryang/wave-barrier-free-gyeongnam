import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

async function prepare(page: Page) {
  await page.goto("/planner");
  await expect(page.getByRole("button", { name: "Step by step", exact: true })).toBeEnabled();
  const conditions = page.locator("#conditions");
  await conditions.getByRole("button", { name: "Changwon", exact: true }).click();
  await conditions.locator(".condition-actions button").last().click();
  await conditions.getByRole("button", { name: /Wheelchair facilities/ }).click();
  await conditions.locator(".condition-actions button").last().click();
  await conditions.getByRole("button", { name: /Nature and relaxation/ }).click();
  await conditions.locator(".condition-actions button").last().click();
}

test("English navigation preserves gates, stage history and menu keyboard focus", async ({ page, isMobile }) => {
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.addInitScript(() => localStorage.setItem("wave-locale", "en"));
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  let searches = 0;
  page.on("request", (r) => { if (r.url().includes("action=plan")) searches++; });
  await prepare(page);
  const rail = page.getByRole("complementary", { name: "Trip planning progress" });
  await expect(rail).not.toContainText(/[가-힣]/);
  await expect(rail.locator('nav button')).toHaveCount(4);
  await expect(rail.locator('nav button')).toHaveText([/Preferences/, /Places/, /Itinerary/, /Before departure/]);
  for (const button of await rail.locator('nav button').all()) {
    if (await button.getAttribute("aria-current") === "step") await expect(button).toBeEnabled();
    else await expect(button).toBeDisabled();
  }
  const summary = rail.getByRole("status", { includeHidden: true });
  if (isMobile) await expect(summary).toBeHidden();
  else await expect(summary).toBeVisible();
  await expect(summary).toHaveText("Not searched");
  await expect(rail.getByRole("progressbar", { includeHidden: true })).toHaveAttribute("aria-valuenow", "0");
  await expect(page.locator(".journey-mode-toggle")).not.toContainText(/[가-힣]/);
  await expect(page.locator(".simple-footer")).not.toContainText(/[가-힣]/);
  await expect(page.getByRole("link", { name: "Log in", exact: true })).toHaveAttribute("href", "/login?next=%2Fplanner");
  await expect(page.getByRole("link", { name: "Open the W.A.V.E GitHub repository", exact: true })).toHaveAttribute("href", "https://github.com/jeongiryang/wave-barrier-free-gyeongnam");
  if (isMobile) {
    const trigger = page.getByRole("button", { name: "Open main menu", exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = page.getByRole("navigation", { name: "Mobile main menu", exact: true });
    await expect(menu.getByRole("link").first()).toBeFocused();
    await expect(menu).not.toContainText(/[가-힣]/);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  } else await expect(page.getByRole("navigation", { name: "Main menu", exact: true })).not.toContainText(/[가-힣]/);
  expect(searches).toBe(0);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await expect(page.locator(".journey-stage-stream")).toHaveAttribute("data-view", "overview");
  await page.getByRole("button", { name: "Step by step", exact: true }).click();
  await expect(page.locator(".journey-stage-stream")).toHaveAttribute("data-view", "guided");
  expect(searches).toBe(0);
  await page.getByRole("button", { name: "Find places →", exact: true }).click();
  await expect(summary).toHaveText("2 places");
  await expect(rail.getByRole("progressbar", { includeHidden: true })).toHaveAttribute("aria-valuenow", "25");
  await expect(page.locator('.journey-stage-panel[data-step="places"] .guided-stage-prompt')).not.toContainText(/[가-힣]/);
  const actions = page.locator('.guided-stage-actions[aria-label="Places navigation"]');
  await expect(actions.getByRole("button", { name: "Next: Itinerary", exact: true })).toBeDisabled();
  await expect(actions.getByRole("button", { name: "Next: Itinerary", exact: true })).toHaveAccessibleDescription("Add at least one place to your itinerary.");
  await rail.locator('nav button').nth(1).click();
  await expect(page).toHaveURL(/#places$/);
  await rail.locator('nav button').first().click();
  await expect(page).toHaveURL(/#conditions$/);
  await page.goBack();
  await expect(rail.locator('nav button').nth(1)).toHaveAttribute("aria-current", "step");
  await expect(page.locator("#places")).toBeVisible();
  expect((await new AxeBuilder({ page }).include(".journey-rail").include(".journey-mode-toggle").include(".simple-footer").analyze()).violations).toEqual([]);
  await rail.locator('nav button').first().click();
  await page.locator(".condition-progress button").nth(1).click();
  await page.getByRole("button", { name: /Hearing information support/ }).click();
  await expect(summary).toHaveText("Search again");
  await expect(rail.getByRole("progressbar", { includeHidden: true })).toHaveAttribute("aria-valuenow", "0");
  expect(searches).toBe(1);
  expect(errors).toEqual([]);
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
    await expect(page.locator('.journey-rail nav button').nth(2)).toBeDisabled();
    await expect(page.locator('.journey-rail nav button').nth(3)).toBeDisabled();
  });
}
