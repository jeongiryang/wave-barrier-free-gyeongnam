import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

test("English preferences preserve locale choices, runtime reduced motion and CTA focus", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => localStorage.setItem("wave-locale", "en"));
  await page.goto("/");
  await openSupportMenu(page);
  const preferences = page.locator(".preference-controls");
  await openSupportMenu(page);
  await preferences.getByLabel("Open preferences", { exact: true }).click();
  await expect(preferences).not.toContainText(/[가-힣]/);
  const bounds = await preferences.locator(".preference-panel").boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await expect(preferences.getByLabel("Language", { exact: true }).locator("option")).toHaveCount(2);
  await expect(preferences.getByText("Some pages are in Korean", { exact: true })).toBeVisible();
  await preferences.getByRole("button", { name: "Dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(preferences.getByRole("button", { name: /Motion|Replay/ })).toHaveCount(0);
  await openSupportMenu(page);
  await preferences.getByLabel("Open preferences", { exact: true }).click();
  const cta = page.locator(".landing-actions a[href='/planner']");
  await expect(page.locator(".landing-hero button")).toHaveCount(0);
  await cta.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(cta).toBeFocused();
  await expect(page.locator(".hero-copy-sequence")).toHaveAttribute("data-running", "false");
  await expect(page.getByRole("dialog", { name: "WAVE", exact: true })).toBeHidden();
  await openSupportMenu(page);
  await preferences.getByLabel("Open preferences", { exact: true }).click();
  await expect(preferences).not.toContainText(/[가-힣]/);
  expect((await new AxeBuilder({ page }).include(".preference-controls").analyze()).violations).toEqual([]);
  await preferences.getByLabel("Language", { exact: true }).selectOption("ko");
  await expect(preferences.getByLabel("환경설정 열기", { exact: true })).toBeVisible();
  await preferences.getByLabel("언어", { exact: true }).selectOption("en");
  await expect(preferences.getByLabel("Open preferences", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("wave-locale"))).toBe("en");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("English help covers visible areas, traps focus and returns it on each public page", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { plannerView: "overview" });
  await page.route("**/api/community/posts?**", r => r.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
  await page.addInitScript(() => localStorage.setItem("wave-locale", "en"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  for (const path of ["/", "/planner", "/community", "/travel-book"]) {
    await page.goto(path);
    await openSupportMenu(page);
    const trigger = page.getByRole("button", { name: "Help", exact: true });
    await expect(trigger).toBeEnabled();
    if (path === "/planner") await expect(page.locator(".journey-stage-stream")).toHaveAttribute("data-view", "overview");
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close help", exact: true })).toBeFocused();
    let visited = 0;
    while (true) {
      await expect(dialog).not.toContainText(/[가-힣]/);
      await expect(page.locator('[data-help-tour-active="true"]')).toBeVisible();
      expect((await new AxeBuilder({ page }).include(".help-tour-dialog").analyze()).violations).toEqual([]);
      visited++;
      expect(visited).toBeLessThanOrEqual(5);
      const finish = dialog.getByRole("button", { name: "Finish tour", exact: true });
      if (await finish.count()) { await finish.click(); break; }
      await dialog.getByRole("button", { name: "Next area", exact: true }).click();
    }
    if (path === "/planner") expect(visited).toBe(4);
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});

for (const locale of ["ko", "en"] as const) {
  test(`${locale} guided help does not point to hidden or locked stages`, async ({ page }) => {
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.goto("/planner");
    await openSupportMenu(page);
    const trigger = page.getByRole("button", { name: locale === "en" ? "Help" : "도움말", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading")).toHaveText(locale === "en" ? "Choose your trip preferences." : "내게 필요한 여행 조건을 고르세요.");
    await expect(dialog.locator(".help-tour-progress")).toHaveAccessibleName(locale === "en" ? "Step 1 of 1" : "1단계 중 1단계");
    await expect(page.locator(".help-tour-spotlight")).toBeVisible();
    await expect(page.locator("#places")).toBeHidden();
    await expect(page.locator('.planner-navigation nav button').nth(3)).toBeDisabled();
    await dialog.getByRole("button", { name: locale === "en" ? "Finish tour" : "투어 마치기", exact: true }).click();
    await expect(trigger).toBeFocused();
  });
}

test("help loads only on request and gives a recoverable explanation when its file fails", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => localStorage.setItem("wave-locale", "en"));
  const contentPath = "**/features/help/tour-content.ts*";
  let requests = 0;
  await page.route(contentPath, async route => { requests++; await route.abort("failed"); });
  await page.goto("/");
  await openSupportMenu(page);
  const trigger = page.getByRole("button", { name: "Help", exact: true });
  await expect(trigger).toBeEnabled();
  expect(requests).toBe(0);
  await trigger.click();
  await expect(page.getByRole("alert")).toHaveText("Help could not be loaded. Reload the page and try again.");
  expect(requests).toBe(1);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.unroute(contentPath);
  await page.reload();
  await openSupportMenu(page);
  await trigger.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
