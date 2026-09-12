import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

for (const locale of ["ko", "en"] as const) for (const width of [320, 1366]) {
  test(`${locale} ${width}px preferences never obscure keyboard focus after leaving or Escape`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewportSize({ width, height: 768 });
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.goto("/planner");
    await openSupportMenu(page);
    const details = page.locator(".preference-controls");
    await expect(details).toHaveAttribute("aria-busy", "false");
    const trigger = details.locator("summary");
    await openSupportMenu(page);
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(details).toContainText(locale === "ko" ? "한국어 전체 지원" : "Some pages are in Korean");
    if (locale === "en") await expect(details).toContainText("Original place information and some features may appear in Korean.");
    await page.keyboard.press("Tab");
    await expect(details.getByRole("combobox")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(details.getByRole("button", { name: locale === "ko" ? "다크모드" : "Dark mode", exact: true })).toBeFocused();
    await page.keyboard.press("Space");
    await expect(details.getByRole("button", { name: locale === "ko" ? "라이트모드" : "Light mode", exact: true })).toBeFocused();
    const appearance = details.getByRole("button", { name: locale === "ko" ? "라이트모드" : "Light mode", exact: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
    await expect(details.locator(".motion-toggle")).toHaveCount(0);
    await expect(appearance).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: locale === "ko" ? "계정 관리" : "Account", exact: true })).toBeFocused();
    await expect(details).not.toHaveAttribute("open", "");
    await expect(details.locator(".preference-panel")).toBeHidden();

    await openSupportMenu(page);
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(details.getByRole("combobox")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(details.locator(".preference-panel")).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const nav = page.locator('.wave-header nav');
    const navBounds = await nav.boundingBox();
    for (const link of await nav.getByRole('link').all()) {
      const bounds = await link.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(navBounds!.x);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(navBounds!.x + navBounds!.width + 1);
      if (/^\S+$/.test((await link.textContent())!.trim())) {
        expect(await link.evaluate(element => {
          const range = document.createRange(); range.selectNodeContents(element);
          return new Set([...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0).map(rect => Math.round(rect.top))).size;
        }), 'A one-word navigation label must not split its last letter onto another line').toBe(1);
      }
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`preferences-focus-${locale}-${width}.png`) });
    const support = page.locator('.wave-support-menu');
    await support.locator(':scope > summary').click();
    await expect(support).not.toHaveAttribute('open', '');
    await page.screenshot({ path: test.info().outputPath(`preferences-nav-${locale}-${width}.png`) });
  });
}
