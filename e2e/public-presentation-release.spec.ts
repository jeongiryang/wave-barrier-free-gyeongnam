import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

test.use({ storageState: { cookies: [], origins: [] } });

for (const restored of [false, true]) for (const path of ["/", "/planner", "/community", "/travel-book"]) {
  test(`${path} uses Korean/light and hides deferred controls with ${restored ? "old preferences" : "OS dark mode"}`, async ({ page }, testInfo) => {
    await mockPublicShellApi(page);
    await mockPlannerApi(page);
    await page.route("**/api/community/posts?**", route => route.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.setViewportSize({ width: testInfo.project.name === "mobile-chromium" ? 390 : restored ? 960 : 1440, height: 960 });
    if (restored) await page.addInitScript(() => {
      localStorage.setItem("wave-theme", "dark");
      localStorage.setItem("wave-locale", "en");
    });
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    if (path === "/") {
      const intro = page.getByRole("dialog", { name: "WAVE", exact: true });
      await page.keyboard.press("Escape");
      await expect(intro).toBeHidden();
    }
    await openSupportMenu(page);
    const preferences = page.locator(".preference-controls:visible");
    await expect(preferences).toHaveAttribute("aria-busy", "false");
    const trigger = preferences.getByLabel("환경설정 열기", { exact: true });
    await expect(trigger).toBeEnabled();
    await trigger.focus();
    await trigger.press("Enter");
    await expect(preferences.locator(".preference-panel")).toBeVisible();
    await expect(preferences.getByRole("combobox")).toHaveCount(0);
    await expect(preferences.getByRole("button", { name: /다크모드|라이트모드|Dark mode|Light mode/ })).toHaveCount(0);
    await expect(preferences).not.toContainText(/한국어 전체 지원|Some pages are in Korean|화면 색상|Appearance/);
    await expect(preferences).toContainText("홈 화면");
    expect((await new AxeBuilder({ page }).include(".preference-controls").analyze()).violations).toEqual([]);
    await preferences.locator(".preference-panel").screenshot({ path: testInfo.outputPath("public-preferences.png") });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
    if (restored) expect(await page.evaluate(() => [localStorage.getItem("wave-theme"), localStorage.getItem("wave-locale")])).toEqual(["dark", "en"]);
  });
}
