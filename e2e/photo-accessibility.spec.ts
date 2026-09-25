import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

async function prepare(page: Page, en: boolean, theme: string, configure?: () => Promise<void>) {
  await page.setViewportSize({ width: test.info().project.name === "mobile-chromium" ? 390 : 1366, height: 844 });
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  await configure?.();
  await page.addInitScript(({ en, theme }) => {
    localStorage.setItem("wave-locale", en ? "en" : "ko");
    localStorage.setItem("wave-theme", theme);
  }, { en, theme });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner");
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await expect(page.locator(".simple-results > .simple-place-list article")).toHaveCount(2);
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
}

for (const en of [false, true]) for (const theme of ["light", "dark"]) {
  test(`photo and body region label stay legible with a white photo ${en ? "English" : "Korean"} ${theme}`, async ({ page }) => {
    await prepare(page, en, theme, async () => {
      await page.route("https://wave.test/museum.svg", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><path fill="white" d="M0 0h800v600H0z"/></svg>' }));
    });
    const photo = page.locator(".simple-place-row .simple-place-photo").first();
    const image = photo.locator("img");
    await expect(image).toBeAttached();
    await photo.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    const region = page.locator(".simple-place-row .simple-place-city").first();
    await expect(region).toHaveText("창원");
    await expect(region).toHaveAttribute("lang", "ko");
    const photoBounds = (await photo.boundingBox())!, regionBounds = (await region.boundingBox())!;
    // Full-background cards place the region label over the photograph.
    expect(regionBounds.x).toBeGreaterThanOrEqual(photoBounds.x);
    expect(regionBounds.y).toBeGreaterThanOrEqual(photoBounds.y);
    expect(regionBounds.x + regionBounds.width).toBeLessThanOrEqual(photoBounds.x + photoBounds.width + 1);
    expect(regionBounds.y + regionBounds.height).toBeLessThanOrEqual(photoBounds.y + photoBounds.height + 1);
    const foreground = await region.evaluate(element => getComputedStyle(element).color);
    // Sample the rendered background, including the photo and its pseudo-element
    // scrim. An ancestry-only CSS calculation misses those painted layers.
    const background = await region.screenshot({ style: '.simple-place-city { color: transparent !important; text-shadow: none !important; }' });
    const contrast = await page.evaluate(async ({ foreground, screenshot }) => {
      const bitmap = new Image(); bitmap.src = `data:image/png;base64,${screenshot}`; await bitmap.decode();
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d')!; context.drawImage(bitmap, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const fg = (foreground.match(/[\d.]+/g) || []).map(Number);
      const luminance = (rgb: number[]) => rgb.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
      const f = luminance(fg); let minimum = Infinity;
      for (let i = 0; i < pixels.length; i += 4) {
        const b = luminance([pixels[i], pixels[i + 1], pixels[i + 2]]);
        minimum = Math.min(minimum, (Math.max(f, b) + .05) / (Math.min(f, b) + .05));
      }
      return minimum;
    }, { foreground, screenshot: background.toString('base64') });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await expect(image).toHaveAttribute("alt", en ? "경남도립미술관" : "경남도립미술관 관광사진");
    await expect(image).toHaveAttribute("lang", "ko");
    expect((await new AxeBuilder({ page }).include(".simple-results").analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`photo-${en ? "en" : "ko"}-${theme}.png`) });
  });

  for (const state of ["empty", "error"] as const) test(`photo ${state} keeps localized status and itinerary action ${en ? "English" : "Korean"} ${theme}`, async ({ page }) => {
    const pageErrors: string[] = []; page.on("pageerror", error => pageErrors.push(error.message));
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const queries: string[] = [];
    await prepare(page, en, theme, async () => {
      // A successful HTTP response with invalid image bytes exercises the browser's real decode error.
      await page.route("https://wave.test/museum.svg", route => route.fulfill({ contentType: "image/svg+xml", body: "invalid image" }));
      await page.route("**/api/wave?*", async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("action") !== "spot-photo") return route.fallback();
      if (url.searchParams.get("contentId") !== "1001") return route.fallback();
      queries.push(url.searchParams.get("contentId") || "");
      await gate;
      return route.fulfill({ status: state === "error" ? 503 : 200, contentType: "application/json", body: JSON.stringify({ image: "", status: "empty" }) });
      });
    });
    const card = page.locator(".simple-place-row").first();
    await card.scrollIntoViewIfNeeded();
    const status = card.getByRole("status");
    try {
      await expect(status).toHaveAccessibleName(en ? "Loading official photo" : "경남도립미술관 관광사진 불러오는 중");
      await expect(status).toHaveAttribute("lang", en ? "en" : "ko");
    } finally { release(); }
    const fallback = card.locator(".smart-image-fallback");
    await expect(fallback.locator("small")).toHaveText(en ? "Official photo unavailable" : "공식 사진을 확인할 수 없어요");
    await expect(fallback.locator("small")).toHaveAttribute("lang", en ? "en" : "ko");
    await expect(fallback.locator("b")).toHaveAttribute("lang", "ko");
    await expect(fallback.locator(":scope > span > span").first()).toHaveAttribute("lang", "ko");
    await expect(fallback.locator(":scope > span > span").nth(1)).toHaveAttribute("lang", en ? "en" : "ko");
    await expect(fallback.locator("img")).toHaveCount(0);
    expect(queries).toEqual(["1001"]);
    await expect(fallback).not.toContainText(en ? "여행" : "Official photo");
    await card.getByRole("button", { name: en ? "경남도립미술관 add to itinerary" : "경남도립미술관 일정에 담기", exact: true }).click();
    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values);
    expect(JSON.parse(draft["wave-saved-places"] || "[]")).toEqual(["1001"]);
    expect(JSON.parse(draft["wave-trip-schedule-v1"] || "{}").travelStart || "").toBe("");
    expect((await new AxeBuilder({ page }).include(".simple-results").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(pageErrors).toEqual([]);
  });
}
