import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

async function openImage(page: Page, en = false, theme = "light") {
  await mockPlannerApi(page);
  await page.addInitScript((value) => localStorage.setItem("wave-theme", value), theme);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await expect(page.locator(".map-provider-badge.osm")).toBeVisible();
  if (en) {
    await page.keyboard.press("Control+Home");
    const preferences = page.locator(".preference-controls:visible");
    await preferences.getByLabel("환경설정 열기", { exact: true }).click();
    await preferences.getByLabel("언어", { exact: true }).selectOption("en");
    await preferences.getByLabel("Open preferences", { exact: true }).click();
  }
  await page.locator('.map-command-bar button[aria-controls="map-panel-export"]').click();
  return page.locator("#map-panel-export");
}

test("failed image encoding is reported without claiming the file was saved", async ({ page }) => {
  const panel = await openImage(page);
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = (callback) => callback(null); });
  const button = panel.getByRole("button", { name: /PNG/ });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("status")).toContainText("이미지를 만들지 못했습니다.");
  await expect(page.locator(".map-provider-badge")).not.toContainText("저장했습니다");
  await expect(button).toBeFocused();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
});

for (const en of [false, true]) for (const theme of ["light", "dark"]) test(`image retries and downloads remain accessible in ${en ? "English" : "Korean"} ${theme}`, async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const panel = await openImage(page, en, theme);
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    const state = { count: 0, release: () => undefined as void };
    Object.assign(window, { imageFixture: state });
    HTMLCanvasElement.prototype.toBlob = function (...args) {
      state.count++;
      if (state.count === 1) state.release = () => args[0](null);
      else original.apply(this, args);
    };
  });
  const button = panel.getByRole("button", { name: /PNG/ });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-disabled", "true");
  await expect(panel.getByRole("status")).toHaveText(en ? "Preparing the image." : "이미지를 준비하고 있습니다.");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => (window as unknown as { imageFixture: { count: number } }).imageFixture.count)).toBe(1);
  await page.evaluate(() => (window as unknown as { imageFixture: { release: () => void } }).imageFixture.release());
  await expect(panel.getByRole("status")).toContainText(en ? "The image could not be created." : "이미지를 만들지 못했습니다.");
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute("aria-disabled", "false");
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  const file = await download;
  expect(file.suggestedFilename()).toBe("wave-route-map.png");
  await file.saveAs(testInfo.outputPath(`journey-${en ? "en" : "ko"}.png`));
  expect(await file.failure()).toBeNull();
  await expect(panel.getByRole("status")).toContainText(en ? "The image download has started." : "이미지 다운로드를 시작했습니다.");
  await expect(button).toBeFocused();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
  for (const width of [320, 390, 768, 960, 1366, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await button.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const box = await button.boundingBox();
    const drawer = await panel.boundingBox();
    expect(drawer!.width, `readable image drawer at ${width}px`).toBeGreaterThanOrEqual(Math.min(width - 70, 260));
    expect(await panel.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    const coveredByMapControls = await panel.evaluate((element) => {
      const drawer = element.getBoundingClientRect();
      return [...document.querySelectorAll(".leaflet-control-zoom a")].some((control) => {
        const box = control.getBoundingClientRect();
        const x = box.x + box.width / 2, y = box.y + box.height / 2;
        return x > drawer.left && x < drawer.right && y > Math.max(drawer.top, 96) && y < Math.min(drawer.bottom, innerHeight - 100)
          && Boolean(document.elementFromPoint(x, y)?.closest(".leaflet-control-zoom"));
      });
    });
    expect(coveredByMapControls, "map zoom controls must not cover the image drawer").toBe(false);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect((await new AxeBuilder({ page }).include("#map-panel-export").analyze()).violations).toEqual([]);
    if ([390, 960, 1366, 1440].includes(width)) await panel.screenshot({ path: testInfo.outputPath(`image-panel-${width}.png`) });
  }
  expect(errors).toEqual([]);
});

test("native share failure remains readable from the toolbar and can be retried without duplicate requests", async ({ page }) => {
  const panel = await openImage(page);
  await panel.getByRole("button", { name: "이미지 저장 닫기", exact: true }).click();
  await page.evaluate(() => {
    const state = { calls: 0, release: () => undefined as void };
    Object.assign(window, { shareFixture: state });
    Object.defineProperty(navigator, "share", { configurable: true, value: () => {
      state.calls++;
      return new Promise<void>((_resolve, reject) => { state.release = () => reject(new DOMException("denied", "NotAllowedError")); });
    } });
  });
  const share = page.locator(".map-command-bar").getByRole("button", { name: "↗ 페이지 링크", exact: true });
  await share.focus();
  await page.keyboard.press("Enter");
  await expect(share).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => (window as unknown as { shareFixture: { calls: number } }).shareFixture.calls)).toBe(1);
  await page.evaluate(() => (window as unknown as { shareFixture: { release: () => void } }).shareFixture.release());
  const status = page.locator(".map-provider-badge");
  await expect(status).toContainText("페이지 링크를 공유하지 못했습니다.");
  await expect(share).toBeFocused();
  for (const width of [320, 390, 768, 1366]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await status.locator("strong").evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }
  await page.evaluate(() => { Object.defineProperty(navigator, "share", { configurable: true, value: async () => undefined }); });
  await share.focus();
  await page.keyboard.press("Enter");
  await expect(status).toContainText("브라우저에서 페이지 링크 공유를 처리했습니다.");
  await expect(share).toBeFocused();
});

for (const en of [false, true]) for (const failure of ["denied", "missing", "cancelled"]) test(`page link ${failure} has accurate feedback and can retry in ${en ? "English" : "Korean"}`, async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const panel = await openImage(page, en);
  await page.evaluate((kind) => {
    Object.defineProperty(navigator, "share", { configurable: true, value: kind === "cancelled" ? async () => { throw new DOMException("cancelled", "AbortError"); } : undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: kind === "missing" ? undefined : { writeText: async () => { throw new DOMException("denied", "NotAllowedError"); } } });
  }, failure);
  const share = panel.getByRole("button", { name: en ? "Share page link ↗" : "페이지 링크 공유하기 ↗", exact: true });
  await share.focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("status")).toContainText(failure === "cancelled"
    ? en ? "Page link sharing was cancelled." : "페이지 링크 공유를 취소했습니다."
    : en ? "The page link could not be shared." : "페이지 링크를 공유하지 못했습니다.");
  await expect(share).toBeFocused();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => { Object.assign(window, { copiedPageLink: value }); } } });
  });
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("status")).toContainText(en ? "The page link was copied." : "페이지 주소를 복사했습니다.");
  expect(await page.evaluate(() => (window as unknown as { copiedPageLink: string }).copiedPageLink)).toBe(page.url());
  await expect(panel).toContainText(en ? "does not include your saved itinerary" : "저장한 일정이 포함되지 않습니다");
  await expect(share).toBeFocused();
  expect(errors).toEqual([]);
});
