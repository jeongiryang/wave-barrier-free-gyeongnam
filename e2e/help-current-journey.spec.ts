import { openSupportMenu } from "./support-menu";
import { expect, test, type Locator } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";

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

for (const locale of ["ko", "en"] as const) {
  test(`${locale} landing help follows the visible photo, chapters and companion scenes`, async ({ page }) => {
    await mockPublicShellApi(page);
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.goto("/");
    await openSupportMenu(page);
    const help = page.getByRole("button", { name: locale === "en" ? "Help" : "도움말", exact: true });
    await help.click();
    const dialog = page.getByRole("dialog");
    const active = page.locator('[data-help-tour-active="true"]');
    for (const id of ["top", "regions", "story", "recommendation", "closing"]) {
      await expect(active).toHaveAttribute("id", id);
      await expect(page.locator(".help-tour-spotlight")).toBeVisible();
      if (id === "regions") {
        await expect(dialog).toContainText(locale === "en" ? "photograph buttons" : "사진 선택 버튼");
        await expect(dialog).not.toContainText(locale === "en" ? "on the map" : "지도에서");
        await expectHighlightContains(page.locator(".help-tour-spotlight"), page.locator("#region-current strong"));
        const header = await page.locator(".wave-header").boundingBox();
        const title = await page.locator("#region-current strong").boundingBox();
        expect(title!.y).toBeGreaterThanOrEqual(header!.y + header!.height + 8);
      }
      if (id === "recommendation") {
        await expect(dialog).toContainText(locale === "en" ? "KakaoTalk sharing" : "카카오톡 공유");
        await expect(dialog.getByRole("link")).toHaveAttribute("href", "/guide");
      }
      await dialog.getByRole("button", { name: id === "closing"
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
      await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
      await expect(page.locator(".day-planner .date-range-fields")).toBeVisible();
    }
    await openSupportMenu(page);
    const help = page.getByRole("button", { name: "도움말", exact: true });
    await expect(page.locator(".journey-stage-stream")).toHaveAttribute("data-view", "overview");
    await expect(help).toBeEnabled();
    await help.focus();
    await expect(help).toBeInViewport();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "다음 영역", exact: true }).click();
    await expect(page.locator('#places[data-help-tour-active="true"]')).toBeVisible();
    const spotlight = page.locator(".help-tour-spotlight");
    const placeTitle = page.locator(populated ? ".place-card h3" : ".place-empty h3").first();
    await expectHighlightContains(spotlight, placeTitle);
    expect((await spotlight.boundingBox())!.height).toBeGreaterThan(100);
    await page.screenshot({ path: test.info().outputPath(`help-places-${populated}.png`) });
    if (test.info().project.name === "desktop-chromium") {
      await page.setViewportSize({ width: 960, height: 960 });
      await expectHighlightContains(spotlight, placeTitle);
      await page.screenshot({ path: test.info().outputPath(`help-places-${populated}-960.png`) });
    }
    await dialog.getByRole("button", { name: "다음 영역", exact: true }).click();
    await expect(page.locator('#itinerary[data-help-tour-active="true"]')).toBeVisible();
    await expectHighlightContains(spotlight, page.locator(populated ? ".day-planner .date-range-fields" : ".itinerary-empty-state h3"));
    await page.keyboard.press("Escape");
    await expect(help).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
