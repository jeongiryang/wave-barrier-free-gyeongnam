import { expect, test, type Locator } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

async function contrast(button: Locator) {
  return button.evaluate(element => {
    const luminance = (value: string) => {
      const rgb = (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map(channel => {
        const s = channel / 255;
        return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
      });
      return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    const style = getComputedStyle(element);
    const foreground = luminance(style.color), background = luminance(style.backgroundColor);
    return (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
  });
}

for (const locale of ["ko", "en"] as const) for (const theme of ["light", "dark"] as const) {
  test(`${locale} ${theme} photo card save controls have readable icons and keyboard focus`, async ({ page }) => {
    const en = locale === "en";
    await page.setViewportSize({ width: test.info().project.name === "mobile-chromium" ? 320 : 1366, height: 768 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.addInitScript(({ locale, theme }) => {
      localStorage.setItem("wave-locale", locale);
      localStorage.setItem("wave-theme", theme);
    }, { locale, theme });
    await page.goto("/planner");
    await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
    await page.getByRole("button", { name: "창원 지역 선택", exact: true }).click();
    await page.getByRole("button", { name: en ? /Nature and relaxation/ : /자연·휴양/ }).click();
    await page.locator(".condition-actions").getByRole("button", { name: en ? "Choose facilities" : "필요한 편의 선택", exact: true }).click();
    await page.getByRole("button", { name: en ? /Wheelchair facilities/ : /휠체어 편의시설/ }).click();
    await page.locator(".condition-actions").getByRole("button", { name: en ? "Find places →" : "여행지 둘러보기 →", exact: true }).click();
    await expect(page.locator(".place-carousel article")).toHaveCount(2);
    const previous = page.locator(".place-card .reference-heart").first();
    const next = page.locator(".place-card .place-actions .primary").first();
    for (const button of [previous, next]) {
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      expect(await contrast(button)).toBeGreaterThanOrEqual(4.5);
      const size = await button.boundingBox();
      expect(size?.width).toBeGreaterThanOrEqual(44);
      expect(size?.height).toBeGreaterThanOrEqual(44);
    }
    await previous.focus();
    await expect(previous).toBeFocused();
    await previous.press("Tab");
    await expect(next).toBeFocused();
    expect(await next.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe("none");
    await next.press("Enter");
    await expect(next).toBeFocused();
    await expect(page).toHaveURL(/#places$/);
    await next.hover();
    await expect.poll(() => contrast(next)).toBeGreaterThanOrEqual(4.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await test.info().attach("control-contrast", {
      body: Buffer.from(JSON.stringify({ locale, theme, previous: await contrast(previous), nextHover: await contrast(next) })),
      contentType: "application/json",
    });
    await page.screenshot({ path: test.info().outputPath(`carousel-${locale}-${theme}.png`) });
  });
}
