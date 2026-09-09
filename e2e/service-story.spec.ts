import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

// Post-arrival Landing: fullscreen-intro.spec verifies the first-entry dialog.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

async function expectMediaCaptionUnobscured(page: Page) {
  for (const selector of [".landing-hero .story-media figcaption > span:first-child", ".landing-hero .story-media > figcaption button", ".landing-hero .story-media > figcaption [role=status]"]) {
    const item = page.locator(selector);
    if (selector.endsWith("[role=status]") && !(await item.textContent())) continue;
    // Measure occlusion after positioning, independently of the site's smooth scroll.
    await item.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
    const sample = await item.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const hits = [0.1, 0.5, 0.9].flatMap((x) => [0.1, 0.5, 0.9].map((y) => {
        const hit = document.elementFromPoint(rect.left + rect.width * x, rect.top + rect.height * y);
        return { covered: !node.contains(hit), tag: hit?.tagName, className: hit?.getAttribute("class") };
      }));
      return { rect: rect.toJSON(), hits, width: innerWidth };
    });
    expect(sample.hits.every((hit) => !hit.covered), `${selector} must not be covered: ${JSON.stringify(sample)}`).toBe(true);
  }
}

for (const locale of ["ko", "en"] as const) {
  test(`${locale}: service story keeps media optional, pauses at runtime and connects to planning`, async ({ page }) => {
    const en = locale === "en";
    const errors: string[] = [];
    const videoRequests: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("request", (request) => { if (request.url().endsWith(".mp4")) videoRequests.push(request.url()); });
    await mockPlannerApi(page);
    await page.addInitScript((language) => localStorage.setItem("wave-locale", language), locale);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const landing = page.locator(".landing-page");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    await expect(landing).toHaveCount(1);
    await expect(landing).toHaveClass(/motion-ready/);
    await expect(landing).toHaveAttribute("lang", locale);
    const player = page.locator(".landing-hero .story-media video");
    const control = page.locator(".landing-hero .story-media > figcaption button");
    await expect(player).not.toHaveAttribute("src");
    expect(videoRequests).toEqual([]);
    await expect(page.locator(".landing-hero .story-media figcaption")).toContainText(en ? "not a real destination" : "실제 관광지나 편의시설 정보가 아닙니다");
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await expectMediaCaptionUnobscured(page);
    }
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(player).toHaveJSProperty("paused", false);
    await expect(control).toBeFocused();
    await page.locator(".landing-cta").scrollIntoViewIfNeeded();
    await expect(player).toHaveJSProperty("paused", true);
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(player).toHaveJSProperty("paused", false);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(player).toHaveJSProperty("paused", true);
    await expect(control).toHaveAttribute("aria-pressed", "false");
    await expect(control).toBeFocused();
    expect(videoRequests.length).toBeGreaterThan(0);
    expect(new Set(videoRequests)).toEqual(new Set([new URL("/media/wave-story/hero-water-loop.mp4", page.url()).href]));
    const sourceDetails = page.locator(".journey-scene-copy .journey-source-details");
    await sourceDetails.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(sourceDetails).toHaveAttribute("open");
    await expect(sourceDetails.locator("p").first()).toBeVisible();
    await expect(sourceDetails).toContainText(en ? "not an accessibility certification" : "접근성을 인증하지 않아요");
    await page.keyboard.press("Enter");
    await expect(sourceDetails).not.toHaveAttribute("open");
    await expect(sourceDetails.locator("summary")).toBeFocused();

    const sourceLink = page.locator('.landing-cta a[href="#journey-record-source"]');
    await expect(sourceLink).toHaveAccessibleName(en ? "View this example's sources and retrieval time" : "시연 출처와 조회 시각 보기");
    await sourceLink.focus();
    expect(await sourceLink.evaluate(link => link.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Enter");
    await expect(sourceDetails).toHaveAttribute("open");
    await expect(sourceDetails.locator("summary")).toBeFocused();
    await expect(sourceDetails.locator("p").first()).toBeVisible();
    await expect(sourceDetails).toContainText("02:26:57");
    await expect(sourceDetails).toContainText(en ? "not the facility update date" : "시설 갱신일이 아니에요");
    await expect(page.locator('.landing-cta > a[href="/planner"]')).toHaveCount(1);
    await page.keyboard.press("Enter");
    await expect(sourceDetails).not.toHaveAttribute("open");

    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await expectMediaCaptionUnobscured(page);
      const planning = page.locator(".landing-actions a");
      await planning.focus();
      await expect(planning).toBeFocused();
      expect(await planning.evaluate((link) => {
        const rect = link.getBoundingClientRect();
        return rect.height >= 44 && link.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      })).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.locator(".journey-scene").scrollIntoViewIfNeeded();
      await expect(page.locator(".journey-scene-stops strong")).toHaveText(en ? ["Junam Reservoir", "Daesan Flowerland"] : ["주남저수지 철새도래지", "대산플라워랜드"]);
      expect(await page.locator(".journey-scene-stops li").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-place-id")))).toEqual(["126117", "2758443"]);
      await expect(page.locator(".journey-scene figcaption")).toContainText(en ? "Actual Korean screens recorded on 9 September 2026" : "2026년 9월 9일 실제 한국어 화면");
      if (en) {
        for (const selector of [".landing-hero-copy", ".journey-scene", ".product-story-copy", ".landing-community-copy", ".landing-cta"]) {
          const text = await page.locator(selector).allInnerTexts();
          expect(text.join(" ")).not.toMatch(/[가-힣]/);
        }
      }
      await page.locator(".landing-hero").screenshot({ path: test.info().outputPath(`story-${locale}-${width}.png`) });
      expect((await new AxeBuilder({ page }).include(".landing-hero").include(".journey-scene").analyze()).violations).toEqual([]);
    }
    await page.locator(".landing-actions a").click();
    await expect(page).toHaveURL(/\/planner$/);
    expect(errors).toEqual([]);
  });

  test(`${locale}: failed media leaves a stable keyboard control and usable planning link`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mockPublicShellApi(page);
    await page.addInitScript((language) => localStorage.setItem("wave-locale", language), locale);
    await page.route("**/media/wave-story/*.webp", (route) => route.abort());
    await page.route("**/media/wave-story/*.mp4", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    await expect(page.locator(".landing-page")).toHaveCount(1);
    await expect(page.locator(".landing-page")).toHaveClass(/motion-ready/);
    const control = page.locator(".landing-hero .story-media > figcaption button");
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".landing-hero .story-media > figcaption [role=status]")).toContainText(locale === "en" ? "unavailable" : "불러오지 못했어요");
    await expect(control).toBeFocused();
    await expect(control).toHaveAttribute("aria-disabled", "true");
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await expectMediaCaptionUnobscured(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
    await expect(page.locator(".landing-actions a")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("data saving prevents scenery downloads and preserves content and keyboard focus", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith(".mp4")) requests.push(request.url()); });
  await mockPublicShellApi(page);
  await page.addInitScript(() => {
    const connection = Object.assign(new EventTarget(), { saveData: true });
    Object.defineProperty(navigator, "connection", { configurable: true, value: connection });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  await expect(page.locator(".landing-page")).toHaveCount(1);
  const control = page.locator(".landing-hero .story-media > figcaption button");
  const player = page.locator(".landing-hero .story-media video");
  await control.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  const hit = await control.boundingBox();
  expect(hit).not.toBeNull();
  // aria-disabled stays focusable; exercise a real pointer, without force-clicking it.
  await page.mouse.click(hit!.x + hit!.width / 2, hit!.y + hit!.height / 2);
  await expect(control).toBeFocused();
  await expect(control).toHaveAttribute("aria-disabled", "true");
  await expect(control).toHaveAttribute("aria-pressed", "false");
  await expect(player).not.toHaveAttribute("src");
  await expect(player).toHaveJSProperty("paused", true);
  await expect(page.locator(".landing-hero .story-media > figcaption [role=status]")).toContainText("데이터 절약");
  await expect(page.locator(".landing-hero .story-media img")).toBeVisible();
  await expect(page.locator(".landing-actions a")).toBeVisible();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expectMediaCaptionUnobscured(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.locator(".landing-hero").screenshot({ path: test.info().outputPath(`save-data-${width}.png`) });
  }
  expect(requests).toEqual([]);
});

for (const connectionMode of ["available", "unsupported"] as const) {
  test(`${connectionMode} data-saving API allows explicit scenery playback without automatic resume`, async ({ page }) => {
    await mockPublicShellApi(page);
    await page.addInitScript((mode) => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: mode === "available" ? Object.assign(new EventTarget(), { saveData: false }) : undefined,
      });
    }, connectionMode);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    await expect(page.locator(".landing-page")).toHaveCount(1);
    const control = page.locator(".landing-hero .story-media > figcaption button");
    const player = page.locator(".landing-hero .story-media video");
    await expect(player).not.toHaveAttribute("src");
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(player).toHaveJSProperty("paused", false);
    await expect(control).toHaveAttribute("aria-pressed", "true");
    if (connectionMode === "available") {
      await page.evaluate(() => {
        const connection = (navigator as Navigator & { connection: EventTarget & { saveData: boolean } }).connection;
        connection.saveData = true;
        connection.dispatchEvent(new Event("change"));
      });
      await expect(player).toHaveJSProperty("paused", true);
      await expect(player).not.toHaveAttribute("src");
      await expect(control).toHaveAttribute("aria-disabled", "true");
      await expect(control).toBeFocused();
      await page.evaluate(() => {
        const connection = (navigator as Navigator & { connection: EventTarget & { saveData: boolean } }).connection;
        connection.saveData = false;
        connection.dispatchEvent(new Event("change"));
      });
      await expect(control).toHaveAttribute("aria-disabled", "false");
      await expect(control).toHaveAttribute("aria-pressed", "false");
      await expect(player).toHaveJSProperty("paused", true);
      await expect(player).not.toHaveAttribute("src");
      await expect(control).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(player).toHaveJSProperty("paused", false);
    }
  });
}

for (const locale of ["ko", "en"] as const) {
  for (const preference of ["system", "legacy-full"] as const) {
    test(`${locale}: initial ${preference} reduced motion keeps media static without moving focus`, async ({ page }) => {
      const requests: string[] = [];
      page.on("request", (request) => { if (request.url().endsWith(".mp4")) requests.push(request.url()); });
      await mockPublicShellApi(page);
      await page.addInitScript(({ locale, preference }) => {
        localStorage.setItem("wave-locale", locale);
        if (preference === "legacy-full") localStorage.setItem("wave-motion", "full");
      }, { locale, preference });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
      await expect(page.locator(".landing-page")).toHaveCount(1);
      const control = page.locator(".landing-hero .story-media > figcaption button");
      await expect(control).toHaveAttribute("aria-disabled", "true");
      await control.focus();
      await page.keyboard.press("Enter");
      await expect(control).toBeFocused();
      await expect(control).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator(".landing-hero .story-media video")).not.toHaveAttribute("src");
      await expect(page.locator(".landing-hero .story-media > figcaption [role=status]")).toContainText(locale === "en" ? "stays still" : "정지된 풍경");
      expect(requests).toEqual([]);
    });
  }
}
