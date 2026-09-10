import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

async function prepare(page: Page, options: Parameters<typeof mockPlannerApi>[1] = {}) {
  await mockPlannerApi(page, options);
  await page.addInitScript(() => localStorage.setItem("wave-locale", "en"));
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await page.getByRole("button", { name: "Changwon", exact: true }).click();
  await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
  await page.getByRole("button", { name: /Nature and relaxation/ }).click();
  await page.getByRole("button", { name: "Find places →", exact: true }).click();
  await page.getByRole("button", { name: "경남도립미술관 Add to itinerary", exact: true }).click();
  await page.getByRole("button", { name: "용지호수공원 Add to itinerary", exact: true }).click();
}

for (const theme of ["light", "dark"] as const) {
  test(`English ${theme} itinerary keeps dates, order, source limits and saved IDs consistent`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("wave-theme", value), theme);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await prepare(page);
    const itinerary = page.getByRole("region", { name: "Itinerary by date", exact: true });
    await expect(itinerary).toBeVisible();
    await expect(itinerary).toContainText("shown in their original language");
    await expect(itinerary.locator('.day-place-copy b [lang="ko"]')).toHaveCount(2);
    await expect(itinerary.locator(".day-planner-explanation")).toContainText("straight-line distances");
    await itinerary.getByRole("button", { name: "경남도립미술관 move later in the same day", exact: true }).click();
    await expect(itinerary.getByRole("status").first()).toHaveText("경남도립미술관 moved later in the same day.");
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-trip-order-v1") || "{}").ids)).toEqual(["1002", "1001"]);
    await itinerary.getByLabel("경남도립미술관 trip date", { exact: true }).selectOption("2026-10-09");
    await expect(itinerary.getByRole("status").first()).toHaveText("경남도립미술관 moved to DAY 2.");
    await expect(itinerary.locator(".day-planner-grid article").nth(1)).toContainText("경남도립미술관");
    await expect(itinerary.getByRole("button", { name: "경남도립미술관 move earlier in the same day", exact: true })).toBeDisabled();
    await itinerary.getByLabel("Day starts at", { exact: true }).fill("08:30");
    await itinerary.getByRole("button", { name: "Save itinerary", exact: true }).click();
    await expect(itinerary.locator(".travel-book-archive-action [role=status]")).toContainText("Itinerary saved");
    await itinerary.getByText("Audio guide and travel journal", { exact: false }).first().click();
    await expect(itinerary.getByRole("button", { name: "Play", exact: true })).toBeDisabled();
    await itinerary.getByRole("button", { name: /Show transcript/ }).click();
    await expect(itinerary.locator(".transcript")).toContainText("No transcript was supplied");
    const residual = await itinerary.evaluate((el) => {
      const copy = el.cloneNode(true) as HTMLElement;
      copy.querySelectorAll('[lang="ko"], [role="status"]').forEach((node) => node.remove());
      return copy.textContent || "";
    });
    expect(residual).not.toMatch(/[가-힣]/);
    expect((await new AxeBuilder({ page }).include(".day-planner").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`itinerary-${theme}.png`) });
    await itinerary.locator(".itinerary-secondary-actions > summary").click();
    for (const width of [320, 960, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await itinerary.getByLabel("Day starts at", { exact: true }).focus();
      for (const control of await itinerary.locator('input,select,button').all()) {
        if (!await control.isVisible()) continue;
        const box = await control.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      for (const control of await itinerary.locator('.day-order-buttons button,.day-place-editor select').all()) {
        const fit = await control.evaluate((element) => {
          const style = getComputedStyle(element);
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d")!;
          context.font = style.font;
          const select = element instanceof HTMLSelectElement;
          const text = select ? element.selectedOptions[0].textContent || "" : element.textContent || "";
          const needed = context.measureText(text.trim()).width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + (select ? 24 : 0);
          // clientWidth rounds to an integer; text measurement is fractional.
          const available = element.getBoundingClientRect().width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth);
          return { text: text.trim(), available, needed, fits: needed <= available };
        });
        expect(fit.fits, JSON.stringify(fit)).toBe(true);
      }
      expect((await new AxeBuilder({ page }).include(".day-planner").analyze()).violations).toEqual([]);
      await page.screenshot({ path: test.info().outputPath(`itinerary-edit-${width}-${theme}.png`) });
      await itinerary.getByRole("button", { name: "Create shared link", exact: true }).focus();
      expect((await new AxeBuilder({ page }).include(".day-planner").analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: test.info().outputPath(`itinerary-save-${width}-${theme}.png`) });
    }
    await page.reload();
    await expect(itinerary.getByLabel("Day starts at", { exact: true })).toHaveValue("08:30");
    await expect(itinerary.locator(".day-planner-grid article").nth(1)).toContainText("경남도립미술관");
  });
}

test("changing locale updates an existing itinerary edit announcement without changing the trip", async ({ page }) => {
  await prepare(page);
  const itinerary = page.locator(".day-planner");
  await itinerary.getByRole("button", { name: "경남도립미술관 move later in the same day", exact: true }).click();
  await page.keyboard.press("Control+Home");
  const preferences = page.locator(".preference-controls:visible");
  await preferences.getByLabel("Open preferences", { exact: true }).click();
  await preferences.getByLabel("Language", { exact: true }).selectOption("ko");
  await expect(itinerary.getByRole("status").first()).toHaveText("경남도립미술관 순서를 뒤로 옮겼습니다.");
  await preferences.getByLabel("언어", { exact: true }).selectOption("en");
  await expect(itinerary.getByRole("status").first()).toHaveText("경남도립미술관 moved later in the same day.");
  await preferences.getByLabel("Language", { exact: true }).focus();
  await expect(preferences.getByLabel("Language", { exact: true })).toBeFocused();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-trip-order-v1") || "{}").ids)).toEqual(["1002", "1001"]);
});

test("optional audio loads on request and a missing module leaves itinerary editing usable", async ({ page }) => {
  let guideRequests = 0;
  page.on("request", (request) => { if (request.url().includes("AudioGuidePlayer")) guideRequests++; });
  await prepare(page);
  expect(guideRequests).toBe(0);
  await page.route("**/AudioGuidePlayer*", (route) => route.abort());
  const itinerary = page.locator(".day-planner");
  const toggle = itinerary.locator(".itinerary-secondary-actions > summary");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(itinerary.getByRole("status").filter({ hasText: "audio guide couldn't open" })).toBeVisible();
  await expect(toggle).toBeFocused();
  expect(guideRequests).toBeGreaterThan(0);
  await itinerary.getByLabel("Day starts at", { exact: true }).fill("10:30");
  await expect(itinerary.getByLabel("Day starts at", { exact: true })).toHaveValue("10:30");
});

test("an audio playback rejection offers the original transcript without an unhandled error", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => { HTMLMediaElement.prototype.play = async () => { throw new DOMException("Playback blocked", "NotAllowedError"); }; });
  await page.route("https://wave.test/audio-guide.mp3", (route) => route.fulfill({ status: 200, contentType: "audio/mpeg", body: "" }));
  await prepare(page, { audio: { title: "관광지", audioTitle: "공식 음성 해설", audioUrl: "https://wave.test/audio-guide.mp3", script: "관광지 해설 원문입니다.", playTime: "60" } });
  const itinerary = page.locator(".day-planner");
  await itinerary.locator(".itinerary-secondary-actions > summary").click();
  await itinerary.getByRole("button", { name: "Play", exact: true }).click();
  await expect(itinerary.getByRole("alert")).toContainText("Audio couldn't play");
  await expect(itinerary.locator(".guide-top")).toContainText("Playback unavailable");
  await expect(itinerary.locator(".transcript")).toHaveAttribute("lang", "ko");
  await expect(itinerary.locator(".transcript")).toHaveText("관광지 해설 원문입니다.");
  await expect(itinerary.getByRole("button", { name: "Play", exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});

test("an empty itinerary does not load the editor and a missing editor module is explained", async ({ page }) => {
  let editorRequests = 0;
  page.on("request", (request) => { if (request.url().includes("TripDayPlanner")) editorRequests++; });
  await mockPlannerApi(page);
  await page.addInitScript(() => localStorage.setItem("wave-locale", "en"));
  await page.goto("/planner");
  await expect(page.locator(".day-planner.empty")).toContainText("No places in your itinerary yet");
  expect(editorRequests).toBe(0);
  await page.route("**/TripDayPlanner*", (route) => route.abort());
  await page.getByRole("button", { name: "Changwon", exact: true }).click();
  await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
  await page.getByRole("button", { name: /Nature and relaxation/ }).click();
  await page.getByRole("button", { name: "Find places →", exact: true }).click();
  await page.getByRole("button", { name: "경남도립미술관 Add to itinerary", exact: true }).click();
  await expect(page.locator("#itinerary").getByRole("status").filter({ hasText: "itinerary editor couldn't open" })).toBeVisible();
  expect(editorRequests).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "경남도립미술관 Remove from itinerary", exact: true })).toBeEnabled();
});
