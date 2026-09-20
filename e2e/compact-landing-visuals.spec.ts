import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { prepareStory, storyReady, expectUsableTarget, expectNoOverflow } from "./landing-contract";

const chapterIds = ["top","regions","story","features","naru","community","departure","closing"];

test.beforeEach(async ({ page }) => { await prepareStory(page); });

for (const theme of ["light", "dark"] as const) {
  test(`${theme}: restored sections retain responsive hierarchy, readable examples and usable CTAs`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(value => localStorage.setItem("wave-theme", value), theme);
    await page.goto("/"); await storyReady(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const width of [390, 960, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.locator("main section[id]").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
      for (const id of chapterIds) {
        if (id === "features" && !await page.locator("#features").isVisible()) await page.getByText("여행 도구 모두 보기", {exact:true}).click();
      const section = page.locator(`#${id}`);
        await section.locator("h1,h2").first().scrollIntoViewIfNeeded();
        await expect(section).toHaveAccessibleName(/\S/);
        const box = (await section.boundingBox())!;
        expect(box.width).toBeGreaterThan(150);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      }
      await expect(page.locator(".night-journey-tabs button")).toHaveCount(3);
      await expect(page.locator(".night-region-shortcuts button")).toHaveCount(5);
      await expect(page.locator(".simple-naru-example")).toContainText("대화 예시");
      for (const selector of [".landing-actions a", "#story .night-journey-input > .night-primary", "#naru .simple-text-link[href*=assistant]"]) {
        await expectUsableTarget(page.locator(selector));
      }
      await expectNoOverflow(page);
      expect((await new AxeBuilder({ page }).include(".landing-page").analyze()).violations).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

for (const locale of ["ko", "en"] as const) {
  test(`${locale}: skip navigation reaches the real hero and subsequent keyboard actions remain available`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/"); await storyReady(page);
    const skip = page.locator(".skip-link");
    await skip.focus(); await skip.press("Enter");
    await expect(page.locator("#top")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#landing-region")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", {name:locale === "en" ? "Find places" : "여행지 검색",exact:true})).toBeFocused();
    await page.keyboard.press("Tab");
    const explore = page.locator(".landing-actions a");
    await expect(explore).toBeFocused();
    await expect(explore).toHaveAccessibleName(locale === "en" ? "Explore places" : "여행지 둘러보기");
    await expect(explore).toHaveAttribute("href", "/planner");
    await expect(page.locator("#story .night-journey-input > .night-primary")).toHaveAttribute("href", /^\/planner\?region=/);
    await expect(page.locator("#naru .simple-text-link[href*=assistant]")).toHaveAccessibleName(locale === "en" ? "Chat with Naru" : "나루와 대화하기");
    await expect(page.locator("#naru .simple-text-link[href*=assistant]")).toHaveAttribute("href", "/planner?assistant=naru");
    for (const selector of [".wave-wordmark", ".wave-my-trips", "#story .night-journey-input > .night-primary", "#naru .simple-text-link[href*=assistant]"]) {
      await expectUsableTarget(page.locator(selector));
    }
    await expectNoOverflow(page);
  });
}
