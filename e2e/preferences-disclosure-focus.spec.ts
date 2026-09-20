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
    // 접근성 설정이 늘어나도 계약이 깨지지 않도록, 초점 대상 개수를 고정하지 않고 패널 안의 초점 가능한 요소를 실제로 질의해 마지막 컨트롤을 기준으로 검사한다.
    // Native radio groups have one Tab stop; arrow keys reach the other choices.
    const panelFocusable = details.locator('.preference-panel').locator('a[href], button:not([disabled]), select, input:not([disabled]):not([type="radio"]), input[type="radio"]:checked, textarea, [tabindex]:not([tabindex="-1"])');
    await page.keyboard.press("Tab");
    await expect(panelFocusable.first()).toBeFocused();
    await expect(details.getByRole("combobox")).toBeFocused();
    const themeToggle = details.getByRole("button", { name: locale === "ko" ? "다크모드" : "Dark mode", exact: true });
    await themeToggle.focus();
    await expect(themeToggle).toBeFocused();
    await page.keyboard.press("Space");
    await expect(details.getByRole("button", { name: locale === "ko" ? "라이트모드" : "Light mode", exact: true })).toBeFocused();
    const appearance = details.getByRole("button", { name: locale === "ko" ? "라이트모드" : "Light mode", exact: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
    await expect(details.locator(".motion-toggle")).toHaveCount(0);
    await expect(appearance).toBeFocused();
    // Count the current Tab stops after presentation updates. CI captured a
    // checked attribute before the radio's live checked property settled;
    // caching that earlier count omitted a stop from the later keyboard walk.
    await expect(details.locator('input[type="radio"][value="standard"]')).toBeChecked();
    await expect(details.locator('input[type="radio"]:checked')).toHaveCount(1);
    const panelFocusableCount = await panelFocusable.count();
    expect(panelFocusableCount, 'The preferences panel must expose at least one focusable control').toBeGreaterThan(0);
    await panelFocusable.first().focus();
    for (let index = 1; index < panelFocusableCount; index += 1) {
      await page.keyboard.press("Tab");
      await expect(panelFocusable.nth(index), 'Focus must stay inside the preferences panel until its last control').toBeFocused();
    }
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
          const range = document.createRange(); range.selectNodeContents(element.querySelector(":scope > span") ?? element);
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
