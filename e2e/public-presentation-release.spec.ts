import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";
import { storyReady, expectUsableTarget } from "./landing-contract";

test.use({ storageState: { cookies: [], origins: [] } });

for (const restored of [false, true]) for (const path of ["/", "/planner", "/community", "/travel-book"]) {
  test(`${path === "/" ? "landing: " : ""}${path} uses Korean/light and hides deferred controls with ${restored ? "old preferences" : "OS dark mode"}`, async ({ page }, testInfo) => {
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
      await storyReady(page);
      const scene = page.locator(".arrival-scene");
      await expect(scene).toBeVisible();
      const skip = scene.getByRole("button", { name: "건너뛰기", exact: true });
      await expect(skip).toBeFocused();
      await skip.press("Enter");
      await expect(scene).toBeHidden();
      expect(await page.evaluate(() => sessionStorage.getItem("wave-arrival-session-v1"))).toBe("done");
      await expect(page.locator(":modal, [inert]:not(.horizon-chapter-backdrops > [aria-hidden=true]):not(.arrival-picture)")).toHaveCount(0);
      const planning = page.locator(".night-hero-search button[type=submit]");
      await expect(planning).toHaveAccessibleName("여행지 검색");
      await expect(page.locator(".night-hero-search")).toHaveAttribute("action", "/planner");
      await expect(planning).toHaveAttribute("type", "submit");
      await expectUsableTarget(planning);
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
    const textSize = preferences.getByRole('radiogroup', { name: '글자 크기', exact: true });
    await expect(textSize.getByRole('radio')).toHaveCount(3);
    await expect(textSize.getByRole('radio', { name: '기본', exact: true })).toBeChecked();
    await expect(preferences.getByRole('button', { name: /^색 구분 보조/ })).toBeVisible();
    await textSize.getByRole('radio', { name: '크게', exact: true }).check();
    await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'large');
    expect((await new AxeBuilder({ page }).include(".preference-controls").analyze()).violations).toEqual([]);
    await preferences.locator(".preference-panel").screenshot({ path: testInfo.outputPath("public-preferences.png") });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    if (restored) expect(await page.evaluate(() => [localStorage.getItem("wave-theme"), localStorage.getItem("wave-locale")])).toEqual(["dark", "en"]);
  });
}
