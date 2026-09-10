import AxeBuilder from "@axe-core/playwright";
import { type Page } from "@playwright/test";
import { expect, test } from "./read-only-fixtures";

async function expectHealthyPage(page: Page, path: string) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") pageErrors.push(message.text()); });

  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, `${path} navigation should return a response`).not.toBeNull();
  expect(response!.status(), `${path} should not return an HTTP error`).toBeLessThan(400);
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error|Unhandled Runtime Error/i);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

  await page.waitForTimeout(800);
  expect(pageErrors).toEqual([]);
}

async function expectNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (item) => item.impact === "critical" || item.impact === "serious",
  );
  expect(serious).toEqual([]);
}

test("production health endpoint is ready", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty("checkedAt");
  expect(body.ok).toBe(true);
  expect(body.scope).toBe("configuration");
  expect(body.keys.every((key: { optional: boolean; state: string }) => key.optional || key.state === "configured")).toBe(true);
});

test("landing leads into the real planner without layout or accessibility blockers", async ({ page }) => {
  await expectHealthyPage(page, "/");
  await expect(page.locator("main")).toBeVisible();
  await expectNoSeriousA11yIssues(page);

  const plannerLink = page.locator('a[href*="/planner"]:visible').first();
  await expect(plannerLink).toBeVisible({ timeout: 15_000 });
  await plannerLink.click();
  await expect(page).toHaveURL(/\/planner(?:[?#]|$)/);
  await expectHealthyPage(page, page.url());
  await expect(page.locator("main")).toBeVisible();
});

test("public trip surfaces stay readable without writes", async ({ page }) => {
  for (const path of ["/planner", "/travel-book", "/community"]) {
    await expectHealthyPage(page, path);
    await expect(page.locator("main")).toBeVisible();
    await expectNoSeriousA11yIssues(page);
  }
});

test("reduced motion keeps the public entry flow usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.addInitScript(() => {
    localStorage.setItem("wave-theme", "dark");
    localStorage.setItem("wave-locale", "en");
    localStorage.setItem("wave-dev-presentation", "enabled");
  });
  await expectHealthyPage(page, "/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  if (await intro.isVisible()) await intro.getByRole("button", { name: "소개로 건너뛰기", exact: true }).click();
  const preferences = page.locator(".preference-controls:visible");
  await expect(preferences.getByLabel("환경설정 열기", { exact: true })).toBeVisible();
  await expect(preferences.getByRole("combobox", { includeHidden: true })).toHaveCount(0);
  await expect(preferences.getByRole("button", { name: /다크모드|라이트모드|Dark mode|Light mode/, includeHidden: true })).toHaveCount(0);
  const plannerLink = page.locator('a[href*="/planner"]:visible').first();
  await expect(plannerLink).toBeVisible({ timeout: 15_000 });
});
