import { expect, test, type Page } from "@playwright/test";
import { arrivalPlaybackReady, freshArrival, prepareLandingMedia, storyReady, expectUsableTarget, expectNoOverflow } from "./landing-contract";
import { openSupportMenu } from "./support-menu";
import { INTRO_DURATION_MS } from '../features/landing/intro/wave-timing';

async function dismissExpectedDevelopmentError(page: Page, message: RegExp) {
  // Vinext dev reports even errors caught by our boundary. Dismiss only its
  // verified injected-failure overlay, never application UI or unrelated errors.
  const overlay = page.getByTestId('vinext-dev-error-overlay');
  if (await overlay.isVisible()) {
    await expect(overlay).toContainText(message);
    await overlay.getByTestId('vinext-dev-error-close').click();
    await expect(overlay).toBeHidden();
  }
}

test("replaying a completed intro starts opaque instead of revealing the page underneath", async ({ page }) => {
  await freshArrival(page);
  const scene = page.locator(".arrival-scene");
  await arrivalPlaybackReady(page);
  await page.clock.fastForward(INTRO_DURATION_MS + 100);
  await expect(scene).toBeHidden();
  await openSupportMenu(page);
  await page.getByRole("button", { name: "인트로 다시 보기", exact: true }).click();
  await expect(scene).toBeVisible();
  // Do not retry this assertion: a fade from transparent eventually reaches 1
  // but still exposes the underlying heading at the beginning of the replay.
  expect(await scene.evaluate(node => getComputedStyle(node).opacity)).toBe("1");
  await page.keyboard.press("Escape");
  await expect(scene).toBeHidden();
});

test("blocked application scripts leave readable content without an arrival overlay", async ({ page }) => {
  await prepareLandingMedia(page);
  await page.route(/\.(?:js|mjs|tsx)(?:\?|$)/, route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".arrival-scene")).toBeHidden();
  await expect(page.locator(".landing-actions a")).toBeVisible();
  await expect(page.locator(".landing-actions a")).toHaveAttribute("href", "/planner");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test('pause, all seven scene controls and keyboard containment remain usable without silently ending the intro', async ({ page }) => {
  await freshArrival(page);
  await arrivalPlaybackReady(page);
  const scene = page.locator('.arrival-scene'), animation = scene.locator('.wave-intro');
  await scene.getByRole('button', { name: '일시정지', exact: true }).click();
  // Scene preparation and font loading can already consume several stages
  // before arrivalPlaybackReady freezes elapsed time on a slow CI renderer.
  // Use the public controls to establish the first stage, never assume it.
  const previous = scene.getByRole('button', { name: '이전 장면', exact: true });
  for (let step = 0; step < 6 && await previous.isEnabled(); step++) await previous.click();
  await expect(previous).toBeDisabled();
  const progress = scene.locator('[aria-live=polite]').last();
  await expect(progress).toContainText('1 / 7');
  const pausedAt = await animation.getAttribute('data-time-ms');
  await page.clock.fastForward(INTRO_DURATION_MS + 1000);
  await expect(scene).toBeVisible();
  await expect(animation).toHaveAttribute('data-time-ms', pausedAt!);
  for (let stage = 2; stage <= 7; stage++) {
    await scene.getByRole('button', { name: '다음 장면', exact: true }).click();
    await expect(progress).toContainText(`${stage} / 7`);
  }
  await expect(scene.getByRole('button', { name: '다음 장면', exact: true })).toBeDisabled();
  await expect(progress).toContainText('모두의 발걸음이 닿는 경상남도');
  const finalTime = Number(await animation.getAttribute('data-time-ms'));
  await scene.getByRole('button', { name: '이전 장면', exact: true }).click();
  await expect(progress).toContainText('6 / 7');
  await expect.poll(async () => Number(await animation.getAttribute('data-time-ms'))).toBeLessThan(finalTime);
  await scene.getByRole('button', { name: '건너뛰기', exact: true }).focus();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('.arrival-scene')))).toBe(true);
  await scene.getByRole('button', { name: '재생', exact: true }).click();
  await page.clock.fastForward(4000);
  await expect(scene).toBeHidden();
  await expect(page.locator('#top')).toBeFocused();
  await expect(page.locator(':modal')).toHaveCount(0);
});

test('failed intro module never blocks the page or leaves a modal focus trap', async ({ page }) => {
  let blocked = 0;
  await page.route(/(?:\/features\/landing\/intro\/wave-intro\.(?:tsx|js)|\/assets\/wave-intro-[^/]+\.js)(?:\?|$)/, route => { blocked++; return route.abort(); });
  await freshArrival(page);
  await expect.poll(() => blocked, 'The actual intro module must be blocked in dev and built previews').toBeGreaterThan(0);
  await page.clock.fastForward(8000);
  await expect(page.locator('.arrival-scene')).toBeHidden();
  await expect(page.locator(':modal')).toHaveCount(0);
  await dismissExpectedDevelopmentError(page, /Failed to fetch dynamically imported module/);
  await expectUsableTarget(page.locator('.landing-actions a'));
});

test("without JavaScript the browser requirement remains readable without a covering scene", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(test.info().project.use.baseURL + "/");
    await expect(page.locator(".arrival-scene")).toBeHidden();
    await expect(page.locator("noscript p")).toBeVisible();
    await expect(page.locator("noscript p")).toContainText("JavaScript를 허용해 주세요");
  } finally { await context.close(); }
});

for (const legacyFull of [false, true]) {
  test(`initial OS reduction skips arrival even with legacy full motion ${legacyFull}`, async ({ page }) => {
    await prepareLandingMedia(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (legacyFull) await page.addInitScript(() => localStorage.setItem("wave-motion", "full"));
    const media: string[] = [];
    page.on("request", request => { if (/\.mp4(?:\?|$)/.test(request.url())) media.push(request.url()); });
    await page.goto("/"); await storyReady(page);
    await expect(page.locator(".arrival-scene")).toBeHidden();
    await expect(page.locator(":modal, [inert]:not(.horizon-chapter-backdrops > [aria-hidden=true]):not(.arrival-picture)")).toHaveCount(0);
    await expectUsableTarget(page.locator(".landing-actions a"));
    await expect(page.locator(".landing-hero video")).toHaveCount(0);
    expect(media).toEqual([]);
  });
}

test("runtime OS reduction ends the active arrival and restores the page", async ({ page }) => {
  await freshArrival(page);
  const link = page.locator(".landing-actions a");
  await expect(page.locator(".arrival-scene").getByRole("button", { name: "건너뛰기" })).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  // CSS hides the scene before the queued media-change handler closes it.
  // Observe actual modal cleanup before changing the OS setting again.
  await expect.poll(async () => {
    await page.clock.runFor(32);
    return page.locator(".arrival-scene").evaluate((node: HTMLDialogElement) => node.open);
  }).toBe(false);
  await expect(page.locator("html")).toHaveAttribute("data-intro-seen", "1");
  await expect(page.locator(".arrival-scene")).toBeHidden();
  expect(await page.locator(".arrival-scene").evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.fastForward(2500);
  await expect(page.locator(".arrival-scene")).toBeHidden();
  await expectUsableTarget(link);
});

for (const denied of ["read", "write"] as const) {
  test(`denied session storage ${denied} cannot block keyboard browsing or reload`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(mode => {
      if (mode === "read") Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("Storage denied", "SecurityError"); } });
      else {
        const setItem = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) {
          if (this === window.sessionStorage && key === "wave-arrival-session-v1") throw new DOMException("Storage denied", "SecurityError");
          setItem.call(this, key, value);
        };
      }
    }, denied);
    await freshArrival(page);
    const link = page.locator(".landing-actions a");
    await page.keyboard.press("Escape");
    await expect(page.locator(".arrival-scene")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.dataset.introSeen)).toBe("1");
    expect(await page.evaluate(() => document.activeElement?.closest(".arrival-scene"))).toBeNull();
    await page.clock.resume();
    await page.reload(); await storyReady(page);
    // Denied persistence may replay, but the page remains immediately operable.
    await expect(page.locator(".arrival-scene")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".arrival-scene")).toBeHidden();
    await expectUsableTarget(link);
    expect(errors).toEqual([]);
    await link.press("Enter"); await expect(page).toHaveURL(url => url.pathname === "/planner");
  });
}

test("unavailable WebGL exits within the bounded watchdog and restores planning", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await freshArrival(page);
  const link = page.locator(".landing-actions a");
  await page.clock.fastForward(8000);
  await expect(page.locator(".arrival-scene")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(link).toHaveAttribute("href", "/planner");
  await dismissExpectedDevelopmentError(page, /Error creating WebGL context/);
  await expectUsableTarget(link);
});

test("a short 320px reduced-motion screen keeps the actual heading and planning action usable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await prepareLandingMedia(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("wave-motion", "calm"));
  await page.goto("/"); await storyReady(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectUsableTarget(page.locator(".landing-actions a"));
  await expect(page.locator(".arrival-scene")).toBeHidden();
  await expect(page.getByRole("button", { name: /인트로|다시보기/ })).toHaveCount(0);
  await expectNoOverflow(page);
});
