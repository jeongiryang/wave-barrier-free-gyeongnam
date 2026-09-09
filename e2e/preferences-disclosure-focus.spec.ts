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
    const details = page.locator(".preference-controls:visible");
    await expect(details).toHaveAttribute("aria-busy", "false");
    const trigger = details.locator("summary");
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
    await expect(page.getByRole("link", { name: locale === "ko" ? "로그인" : "Log in", exact: true })).toBeFocused();
    await expect(details).not.toHaveAttribute("open", "");
    await expect(details.locator(".preference-panel")).toBeHidden();

    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await expect(details.getByRole("combobox")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(details.locator(".preference-panel")).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`preferences-focus-${locale}-${width}.png`) });
  });
}
