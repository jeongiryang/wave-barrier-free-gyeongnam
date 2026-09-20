import { openSupportMenu } from "./support-menu";
import { expect, test, type Locator } from "@playwright/test";
import { chooseTripConditions, openItinerary, mockPlannerApi, mockPublicShellApi } from "./fixtures";

async function expectHighlightContains(spotlight: Locator, content: Locator) {
  await expect(spotlight).toBeVisible();
  await expect.poll(async () => {
    const area = await spotlight.boundingBox();
    const text = await content.boundingBox();
    if (!area || !text) return false;
    return text.x >= area.x && text.x + text.width <= area.x + area.width + 1
      && text.y >= area.y && text.y + text.height <= area.y + area.height + 1;
  }).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

for (const locale of ["ko", "en"] as const) for (const expanded of [false, true]) {
  test(`${locale} landing help follows visible scenes with extra tools ${expanded ? 'expanded' : 'closed'}`, async ({ page }) => {
    await mockPublicShellApi(page);
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.goto("/");
    if (expanded) await page.locator('.night-feature-details > summary').click();
    await openSupportMenu(page);
    const help = page.getByRole("button", { name: locale === "en" ? "Help" : "도움말", exact: true });
    await help.click();
    const dialog = page.getByRole("dialog");
    const active = page.locator('[data-help-tour-active="true"]');
    const scenes = expanded ? ["top", "regions", "story", "naru"] : ["top", "regions", "story"];
    for (const id of scenes) {
      await expect(active).toHaveAttribute("id", id);
      await expect(active).toBeVisible();
      await expect(page.locator(".help-tour-spotlight")).toBeVisible();
      if (id === "regions") {
        await expect(dialog).toContainText(locale === "en" ? "Choose a photograph" : "사진을 누르면");
        await expect(dialog).not.toContainText(locale === "en" ? "on the map" : "지도에서");
        await expectHighlightContains(page.locator(".help-tour-spotlight"), page.locator(".simple-region-grid .simple-region:first-child h3"));
        const header = await page.locator(".wave-header").boundingBox();
        const title = await page.locator(".simple-region-grid .simple-region:first-child h3").boundingBox();
        expect(title!.y).toBeGreaterThanOrEqual(header!.y + header!.height + 8);
      }
      await dialog.getByRole("button", { name: id === scenes.at(-1)
        ? (locale === "en" ? "Finish tour" : "투어 마치기")
        : (locale === "en" ? "Next area" : "다음 영역"), exact: true }).click();
    }
    await expect(dialog).toBeHidden();
    await expect(help).toBeFocused();
  });
}

for (const populated of [false, true]) {
  test(`planner help highlights usable content with ${populated ? "saved places" : "an empty itinerary"}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await mockPlannerApi(page, { plannerView: "overview" });
    await page.goto("/planner");
    if (populated) {
      await chooseTripConditions(page);
      await page.locator('.simple-place-row').first().locator('.simple-place-add').click();
    }
    await openSupportMenu(page);
    const help = page.getByRole("button", { name: "도움말", exact: true });
    await expect(page.locator('.simple-planner-tabs button')).toHaveCount(2);
    await expect(help).toBeEnabled();
    await help.focus();
    await expect(help).toBeInViewport();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    const spotlight = page.locator('.help-tour-spotlight');
    if (populated) {
      await dialog.getByRole('button', { name: '다음 영역', exact: true }).click();
      await expect(page.locator('#places[data-help-tour-active="true"]')).toBeVisible();
      await expectHighlightContains(spotlight, page.locator('.simple-place-row h3').first());
      await page.screenshot({ path: test.info().outputPath('help-places.png') });
      await dialog.getByRole('button', { name: '투어 마치기', exact: true }).click();
      const support = page.locator('.wave-support-menu');
      if (await support.getByRole('button', { name: /^(WAVE 이용 안내 메뉴|WAVE support menu)$/ }).getAttribute('aria-expanded') === 'true') await support.getByRole('button', { name: /^(WAVE 이용 안내 메뉴|WAVE support menu)$/ }).click();
      await openItinerary(page); await openSupportMenu(page); await help.click();
      await expect(page.locator('#itinerary[data-help-tour-active="true"]')).toBeVisible();
      await expectHighlightContains(spotlight, page.locator('.simple-timeboard h3').first());
    } else {
      await expect(page.locator('#conditions[data-help-tour-active="true"]')).toBeVisible();
      await expectHighlightContains(spotlight, page.locator('.simple-search-bar'));
      await expect(dialog.getByRole('button', { name: '투어 마치기', exact: true })).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
