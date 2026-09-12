import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

async function openFacilities(page: Page) {
  await page.goto("/planner");
  await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>(".journey-mode-toggle button")?.disabled);
  await page.getByRole("button", { name: "창원 지역 선택", exact: true }).click();
  await page.locator(".planner-navigation nav button").nth(1).click();
}

for (const theme of ["light", "dark"] as const) {
  test(`English ${theme}: facilities, saved preferences, activities and dates preserve search IDs`, async ({ page }) => {
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.addInitScript((value) => {
      localStorage.setItem("wave-locale", "en");
      localStorage.setItem("wave-theme", value);
    }, theme);
    const searches: URL[] = [];
    const errors: string[] = [];
    page.on("request", (r) => { if (r.url().includes("action=plan")) searches.push(new URL(r.url())); });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await openFacilities(page);
    const conditions = page.locator("#conditions");
    await expect(conditions).not.toContainText(/[가-힣]/);
    const facilities = conditions.getByRole("group", { name: "Required travel facilities" });
    await expect(facilities.getByRole("button")).toHaveCount(6);
    await facilities.getByRole("button", { name: /Wheelchair facilities/ }).click();
    await facilities.getByRole("button", { name: /Hearing information support/ }).click();
    await conditions.locator("summary").filter({ hasText: "Save and load facilities" }).click();
    await conditions.getByRole("button", { name: "Save these facilities", exact: true }).click();
    await expect(conditions.locator(".travel-profile-notice")).toHaveText("Your facilities were saved.");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-travel-profile-v1") || "null").selectedIds)).toEqual(["wheel", "hearing"]);
    await conditions.getByRole("button", { name: "Clear selected facilities", exact: true }).click();
    await expect(conditions.locator(".condition-actions button").last()).toBeEnabled();
    await expect(facilities.locator('[aria-pressed="true"]')).toHaveCount(0);
    await expect(conditions.getByRole("status").filter({ hasText: "You can continue without a facility filter." })).toBeVisible();
    await conditions.getByRole("button", { name: "Load saved facilities", exact: true }).click();
    await expect(conditions.locator(".travel-profile-notice")).toHaveText("The saved facilities were applied to this trip.");
    await expect(facilities.locator('[aria-pressed="true"]')).toHaveCount(2);
    await expect(conditions).not.toContainText(/[가-힣]/);
    expect((await new AxeBuilder({ page }).include("#conditions").analyze()).violations).toEqual([]);
    // Activity and calendar deep links remain editable without starting a search.
    await page.evaluate(() => { history.pushState(null, "", "/planner?question=2#conditions"); dispatchEvent(new PopStateEvent("popstate")); });
    await conditions.getByRole("button", { name: /Nature and relaxation/ }).click();
    await conditions.getByRole("button", { name: /History and culture/ }).click();
    await expect(conditions).not.toContainText(/[가-힣]/);
    expect((await new AxeBuilder({ page }).include("#conditions").analyze()).violations).toEqual([]);
    await page.evaluate(() => { history.pushState(null, "", "/planner?question=3#conditions"); dispatchEvent(new PopStateEvent("popstate")); });
    await expect(conditions.getByLabel("Start date", { exact: true })).toBeVisible();
    await expect(conditions.getByLabel("End date", { exact: true })).toBeVisible();
    await expect(conditions).not.toContainText(/[가-힣]/);
    expect(searches).toHaveLength(0);
    await page.evaluate(() => { history.pushState(null, "", "/planner?question=2#conditions"); dispatchEvent(new PopStateEvent("popstate")); });
    await conditions.getByRole("button", { name: "Find places →", exact: true }).click();
    await expect.poll(() => searches.length).toBe(1);
    expect(searches[0].searchParams.get("locale")).toBe("en");
    expect(searches[0].searchParams.get("profiles")).toBe("wheel,hearing");
    expect(searches[0].searchParams.get("themes")).toBe("nature,history");
    expect(searches[0].searchParams.get("region")).toBe("창원");
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test("English: saved and damaged facilities remain opt-in with readable status", async ({ page }) => {
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.addInitScript(() => {
    localStorage.setItem("wave-locale", "en");
    localStorage.setItem("wave-travel-profile-v1", JSON.stringify({ version: 1, selectedIds: ["wheel"], updatedAt: 1000 }));
  });
  await openFacilities(page);
  const conditions = page.locator("#conditions");
  await expect(conditions.locator('.profile-grid [aria-pressed="true"]')).toHaveCount(0);
  await expect(conditions.locator(".condition-actions button").last()).toBeEnabled();
  await conditions.locator("summary").filter({ hasText: "Save and load facilities" }).click();
  await conditions.getByRole("button", { name: "Delete saved facilities", exact: true }).click();
  await expect(conditions.locator(".travel-profile-notice")).toHaveText("Your saved facilities were deleted.");
  expect(await page.evaluate(() => localStorage.getItem("wave-travel-profile-v1"))).toBeNull();
  await page.addInitScript(() => localStorage.setItem("wave-travel-profile-v1", '{"version":99}'));
  await openFacilities(page);
  await expect(conditions.locator(".travel-profile-notice")).toHaveText("The saved facilities are damaged and were not applied. Your current choices are unchanged.");
  await expect(conditions).not.toContainText(/[가-힣]/);
});
