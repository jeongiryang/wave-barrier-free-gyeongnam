import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

const stages = ["conditions", "evidence", "schedule", "route", "adapt", "save", "community"];
const meanings = ["지역과 필요한 편의", "확인·미확인·불일치", "날짜별", "모든 인접 이동 구간", "비가 예상되면", "이 기기에", "공식 정보와 구분"];

for (const theme of ["light", "dark"] as const) {
  test(`compact ${theme} stories retain meaningful visuals, responsive hierarchy and keyboard CTAs`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await mockPublicShellApi(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((value) => localStorage.setItem("wave-theme", value), theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator("button[data-region-marker]")).toHaveCount(18);
    await expect(page.locator(".product-preview").first()).toBeHidden();
    await expect(page.locator(".community-live-preview")).toBeHidden();

    for (const width of [390, 768, 1366, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      const diagrams = page.locator(".compact-journey-visual");
      await expect(diagrams).toHaveCount(7);
      for (let index = 0; index < stages.length; index++) {
        const figure = page.locator(`[data-journey="${stages[index]}"]`);
        await figure.scrollIntoViewIfNeeded();
        await expect(figure.getByRole("img")).toHaveAccessibleName(new RegExp(meanings[index]));
        await expect(figure.locator("figcaption")).toContainText(meanings[index]);
        const bounds = await figure.boundingBox();
        expect(bounds!.width).toBeGreaterThan(150);
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        const drawing = await figure.locator("svg").boundingBox();
        expect(drawing!.height).toBeGreaterThanOrEqual(96);
        expect(drawing!.height).toBeLessThanOrEqual(132);
        expect(await figure.locator("svg").evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
      }
      const rows = await page.locator(".product-story").evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
      const expectedColumns = width <= 600 ? 1 : width <= 960 ? 2 : 3;
      expect(new Set(rows).size).toBe(6 / expectedColumns);
      const links = page.locator(".product-story-copy > a");
      await expect(links).toHaveCount(6);
      await links.first().focus();
      for (let index = 0; index < 6; index++) {
        await expect(links.nth(index)).toBeFocused();
        const bounds = await links.nth(index).boundingBox();
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
        if (index < 5) await page.keyboard.press("Tab");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.locator(".product-stories").screenshot({ path: test.info().outputPath(`compact-${width}-${theme}.png`) });
      await page.locator(".landing-community").scrollIntoViewIfNeeded();
      await page.locator(".landing-community").screenshot({ path: test.info().outputPath(`community-${width}-${theme}.png`) });
      expect((await new AxeBuilder({ page }).include(".product-stories").include(".landing-community").analyze()).violations).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}
