import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

async function prepare(page: Page, en: boolean, theme: string, configure?: () => Promise<void>) {
  await page.setViewportSize({ width: test.info().project.name === "mobile-chromium" ? 390 : 1366, height: 844 });
  await mockPlannerApi(page);
  await configure?.();
  await page.addInitScript(({ en, theme }) => {
    localStorage.setItem("wave-locale", en ? "en" : "ko");
    localStorage.setItem("wave-theme", theme);
  }, { en, theme });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner");
  await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>(".journey-mode-toggle button")?.disabled);
  await page.getByRole("group", { name: en ? "Choose a region" : "여행 지역 선택", exact: true }).getByRole("button", { name: en ? "Changwon" : "창원", exact: true }).click();
  await page.getByRole("button", { name: en ? /Wheelchair facilities/ : /휠체어 편의시설/ }).click();
  await page.getByRole("button", { name: en ? /Nature and relaxation/ : /자연·휴양 공원/ }).click();
  await page.getByRole("button", { name: en ? "Find places →" : "여행지 찾기 →", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
}

for (const en of [false, true]) for (const theme of ["light", "dark"]) {
  test(`photo and body region label stay legible with a white photo ${en ? "English" : "Korean"} ${theme}`, async ({ page }) => {
    await prepare(page, en, theme, async () => {
      await page.route("https://wave.test/museum.svg", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><path fill="white" d="M0 0h800v600H0z"/></svg>' }));
    });
    const photo = page.locator(".place-card .place-visual").first();
    const image = photo.locator("img");
    await expect(image).toBeAttached();
    await photo.scrollIntoViewIfNeeded();
    await expect(image).toBeVisible();
    const region = page.locator(".place-card .place-region").first();
    await expect(region).toHaveText("창원");
    await expect(region).toHaveAttribute("lang", "ko");
    expect((await region.boundingBox())!.y).toBeGreaterThanOrEqual((await photo.boundingBox())!.y + (await photo.boundingBox())!.height);
    const contrast = await region.evaluate(element => {
      const style = getComputedStyle(element);
      const parse = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
      const fg = parse(style.color), bg = parse(style.backgroundColor);
      const luminance = (rgb: number[]) => rgb.slice(0, 3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
      const background = bg.slice(0, 3).map(v => v * (bg[3] ?? 1) + 255 * (1 - (bg[3] ?? 1)));
      const f = luminance(fg), b = luminance(background);
      return (Math.max(f, b) + .05) / (Math.min(f, b) + .05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);
    await expect(image).toHaveAttribute("alt", en ? "경남도립미술관" : "경남도립미술관 관광사진");
    await expect(image).toHaveAttribute("lang", "ko");
    expect((await new AxeBuilder({ page }).include(".place-carousel").analyze()).violations).toEqual([]);
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
    const card = page.locator(".place-card").first();
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
    await card.getByRole("button", { name: en ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가", exact: true }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
    expect((await new AxeBuilder({ page }).include(".place-carousel").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(pageErrors).toEqual([]);
  });
}
