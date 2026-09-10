import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { prepareStory, storyReady, expectUsableTarget, chapterIds, chapterNames } from "./landing-contract";

test.beforeEach(async ({ page }) => { await prepareStory(page); });

for (const theme of ["light", "dark"] as const) {
  test(`${theme} chapters retain meaningful visuals, responsive hierarchy and keyboard CTAs`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(value => localStorage.setItem("wave-theme", value), theme);
    await page.goto("/"); await storyReady(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const width of [390, 768, 960, 1366, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.locator("main > section").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
      for (const id of chapterIds) {
        const section = page.locator(`#${id}`); await section.scrollIntoViewIfNeeded();
        await expect(section).toHaveAccessibleName(/\S/);
        const bounds = await section.boundingBox();
        expect(bounds!.width).toBeGreaterThan(150);
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      }
      await expect(page.locator(".horizon-chapter-copy")).toHaveCount(3);
      await expect(page.locator(".horizon-community-photos img")).toHaveCount(2);
      await expect(page.locator(".horizon-account-photo img")).toHaveAttribute("src", "/media/horizon/coastal-park.jpg");
      await expect(page.locator(".region-scene-photo figcaption a")).toHaveAccessibleName(/사진 원본/);
      for (const selector of [".landing-actions a[href='/planner']", '.landing-cta > a[href="/planner"]']) await expectUsableTarget(page.locator(selector));
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.locator("#community").scrollIntoViewIfNeeded();
      await page.locator("#community").screenshot({ path: test.info().outputPath(`community-${width}-${theme}.png`) });
      expect((await new AxeBuilder({ page }).include("#story").include("#community").analyze()).violations).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

for (const locale of ["ko", "en"] as const) {
  test(`${locale}: all seven chapter links and the mobile selector transfer keyboard focus`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/"); await storyReady(page);
    const links = page.locator("#story-progress-list a");
    await expect(links).toHaveCount(7);
    await expect(links.locator("span")).toHaveText(chapterNames[locale]);
    for (let index = 0; index < 7; index++) {
      const link = links.nth(index);
      await expect(link).toHaveAttribute("href", `#${chapterIds[index]}`);
      await expectUsableTarget(link);
      await page.keyboard.press("Enter");
      await expect(page.locator(`#${chapterIds[index]}`)).toBeFocused();
      await expect(link).toHaveAttribute("aria-current", "location");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const select = page.getByLabel(locale === "en" ? "Jump to an introduction section" : "소개 섹션으로 이동");
    await expect(select.locator("option")).toHaveCount(7);
    await expectUsableTarget(select);
    for (let index = 0; index < 7; index++) {
      await select.selectOption(String(index));
      await expect(page.locator(`#${chapterIds[index]}`)).toBeFocused();
      await expect(select).toHaveValue(String(index));
    }
    await expect(page.locator(".landing-actions a[href='/planner']")).toHaveAccessibleName(locale === "en" ? "Plan my trip" : "여행 계획하기");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}
