import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test.beforeEach(async ({ page }) => { await mockPublicShellApi(page); });

test("first entry is a full viewport cinematic with immediately usable keyboard controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  await expect(intro).toBeVisible();
  await expect(intro.locator("video")).toHaveAttribute("src", "/media/wave-story/hero-water-loop.mp4");
  await expect(intro.locator(".arrival-wave-canvas")).toHaveAttribute("data-intro-phase", /wave|accessibility|wordmark/);
  await expect(intro.getByRole("button")).toHaveCount(1);
  expect(await intro.evaluate(node => {
    const r = node.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, viewport: [innerWidth, innerHeight], modal: node.matches(":modal") };
  })).toEqual({ x: 0, y: 0, width: page.viewportSize()!.width, height: page.viewportSize()!.height, viewport: [page.viewportSize()!.width, page.viewportSize()!.height], modal: true });
  await expect(intro.getByRole("link")).toHaveCount(0);
  expect(await intro.locator("video").evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
  const skip = intro.getByRole("button", { name: "소개로 건너뛰기" });
  await skip.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(skip).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await page.screenshot({ path: test.info().outputPath("fullscreen-cinematic.png") });
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
  await page.keyboard.press("Enter");
  await expect(intro).toBeHidden();
  await expect(page.locator("#landing-title")).toBeFocused();
  await expect(page.locator(".landing-hero .landing-actions a[href='/planner']")).toBeVisible();
});

test("a completed session stays on Landing after reload without replay controls or focus theft", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  await intro.getByRole("button", { name: "소개로 건너뛰기" }).click();
  await expect(page.locator("#landing-title")).toBeFocused();
  expect(await page.evaluate(() => sessionStorage.getItem("wave-arrival-session-v1"))).toBe("done");
  for (const mode of ["reduce", "no-preference", "reduce"] as const) {
    await page.reload();
    await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
    await expect(intro).toBeHidden();
    const cta = page.locator(".landing-actions a[href='/planner']");
    await cta.focus();
    await page.emulateMedia({ reducedMotion: mode });
    await expect(cta).toBeFocused();
    await expect(page.locator(".landing-hero button")).toHaveCount(0);
    await expect(cta).toHaveAttribute("href", "/planner");
  }
});

for (const preference of ["reduced", "legacy-full-with-os-reduced", "save-data"] as const) {
  test(`${preference} has a full-screen static intro without video download`, async ({ page }) => {
    const videoRequests: string[] = [];
    page.on("request", request => { if (request.url().endsWith(".mp4")) videoRequests.push(request.url()); });
    if (preference === "reduced") await page.emulateMedia({ reducedMotion: "reduce" });
    else if (preference === "legacy-full-with-os-reduced") {
      await page.addInitScript(() => localStorage.setItem("wave-motion", "full"));
      await page.emulateMedia({ reducedMotion: "reduce" });
    }
    else await page.addInitScript(() => Object.defineProperty(navigator, "connection", { value: Object.assign(new EventTarget(), { saveData: true }), configurable: true }));
    await page.goto("/");
    const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
    await expect(intro).toBeVisible();
    await expect(intro).toHaveAttribute("data-still", "true");
    await expect(intro.locator("video")).not.toHaveAttribute("src");
    await expect(intro.getByRole("heading", { name: "W.A.V.E" })).toBeVisible();
    await expect(intro.getByRole("button", { name: "소개로 건너뛰기" })).toBeEnabled();
    expect(videoRequests).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(intro).toBeHidden();
  });
}

test("failed media retains the brand, static scene and a working exit", async ({ page, browserName }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/media/wave-story/hero-water-loop.mp4", route => route.abort());
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  if (browserName === "webkit") {
    // Windows WebKit's media request bypassed this route in the retained trace.
    // Exercise a real decoder failure; Chromium retains the network-abort path.
    await expect(intro).toHaveAttribute("data-ready", "true");
    await expect(intro.locator("video")).toHaveAttribute("src", /hero-water-loop/);
    await intro.locator("video").evaluate((video: HTMLVideoElement) => {
      video.src = "data:video/mp4;base64,AA==";
      video.load();
    });
    await expect.poll(() => intro.locator("video").evaluate((video: HTMLVideoElement) => video.error?.code)).toBeTruthy();
  }
  await expect(intro.getByRole("status")).toContainText("영상을 불러오지 못해");
  await expect(intro.locator(".arrival-poster")).toBeVisible();
  await expect(intro.getByRole("heading", { name: "W.A.V.E" })).toBeVisible();
  await intro.getByRole("button", { name: "소개로 건너뛰기" }).click();
  await expect(page.locator("#landing-title")).toBeFocused();
});

test("media end hands off to the actual Hero, not another waiting screen", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  await expect.poll(() => intro.locator("video").evaluate((v: HTMLVideoElement) => Number.isFinite(v.duration) && v.duration > 0)).toBe(true);
  await intro.locator("video").evaluate((v: HTMLVideoElement) => { v.currentTime = v.duration - .1; });
  await expect(intro).toBeHidden();
  await expect(page.locator("#landing-title")).toBeFocused();
  await expect(page.locator(".landing-hero .landing-actions a[href='/planner']")).toHaveAttribute("href", "/planner");
});

test("runtime reduction keeps the single skip control and stops downloading video", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  const control = intro.locator("[data-intro-skip]");
  await expect(control).toHaveAccessibleName("소개로 건너뛰기");
  await control.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(control).toBeFocused();
  await expect(control).toBeEnabled();
  await expect(intro).toHaveAttribute("data-still", "true");
  await expect(intro.locator("video")).not.toHaveAttribute("src");
  await page.keyboard.press("Tab");
  await expect(control).toBeFocused();
  await expect(intro.locator("video")).not.toHaveAttribute("src");
  await page.keyboard.press("Escape");
  await expect(page.locator("#landing-title")).toBeFocused();
});

test("denied session storage still permits a keyboard exit and planning without replay controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => { Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("Storage denied", "SecurityError"); } }); });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  await intro.getByRole("button", { name: "소개로 건너뛰기" }).click();
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  await expect(intro).toBeHidden();
  await expect(page.locator("#landing-title")).toBeFocused();
  await expect(page.locator(".landing-hero button")).toHaveCount(0);
  await page.reload();
  await expect(intro).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(intro).toBeHidden();
  await expect(page.locator("#landing-title")).toBeFocused();
  await page.locator(".landing-actions a[href='/planner']").press("Enter");
  await expect(page).toHaveURL(/\/planner/);
});

test("legacy app motion values cannot suppress the canonical intro and preferences have no motion or replay controls", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("wave-motion", "calm"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  await expect(intro).toHaveAttribute("data-still", "false");
  await expect(intro.locator("video")).toHaveAttribute("src", "/media/wave-story/hero-water-loop.mp4");
  await intro.getByRole("button", { name: "소개로 건너뛰기" }).click();
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("wave-motion"))).toBeNull();
  await page.getByLabel("환경설정 열기").click();
  const preferences = page.locator(".preference-controls");
  await expect(preferences.getByRole("button", { name: /동작|인트로/ })).toHaveCount(0);
  await expect(preferences.getByLabel("언어", { exact: true })).toBeVisible();
  await page.getByLabel("환경설정 열기").click();
  await expect(page.locator(".landing-hero button")).toHaveCount(0);
  await expect(page.locator(".landing-hero canvas")).toHaveCount(0);
  await expect(page.locator(".landing-hero-copy")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
});

test("320px short screens keep the brand, copy and every intro control separate and readable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  for (const mode of ["reduce", "no-preference"] as const) {
    await page.emulateMedia({ reducedMotion: mode });
    if (mode === "no-preference") await expect(intro.locator("canvas")).toHaveAttribute("data-intro-phase", "wordmark");
    await expect(intro.locator("h2")).toHaveCSS("opacity", "1");
    const layout = await intro.evaluate(node => {
      const words = [...node.querySelectorAll(".arrival-brand > *")].map(item => item.getBoundingClientRect());
      const controls = [...node.querySelectorAll("button,a")].map(item => item.getBoundingClientRect());
      const overlap = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return {
        copyCovered: words.some(word => controls.some(control => overlap(word, control))),
        wordsOverlap: words.some((word, i) => words.some((other, j) => i !== j && overlap(word, other))),
        controlsFit: controls.every(r => r.x >= 0 && r.right <= innerWidth && r.y >= 0 && r.bottom <= innerHeight && r.width >= 44 && r.height >= 44),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(layout).toEqual({ copyCovered: false, wordsOverlap: false, controlsFit: true, overflow: false });
    await page.screenshot({ path: test.info().outputPath(`intro-320-${mode}.png`) });
  }
  await page.keyboard.press("Escape");
  await expect(intro).toBeHidden();
});
