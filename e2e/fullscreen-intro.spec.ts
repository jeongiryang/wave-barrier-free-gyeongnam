import { expect, test } from "@playwright/test";
import { freshArrival, prepareLandingMedia, storyReady, expectUsableTarget, expectNoOverflow } from "./landing-contract";

test("blocked application scripts leave readable content without an arrival overlay", async ({ page }) => {
  await prepareLandingMedia(page);
  await page.route(/\.(?:js|mjs|tsx)(?:\?|$)/, route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".arrival-scene")).toBeHidden();
  await expect(page.locator(".landing-actions a")).toBeVisible();
  await expect(page.locator(".landing-actions a")).toHaveAttribute("href", "/planner");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
  await page.clock.runFor(32);
  await expect(page.locator(".arrival-scene")).toBeHidden();
  expect(await page.locator(".arrival-scene").evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.runFor(2500);
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

test("failed arrival photography still finishes on time and leaves its source and planning link", async ({ page }) => {
  await page.route("**/media/horizon/hero-coast.jpg", route => route.abort());
  await freshArrival(page);
  const link = page.locator(".landing-actions a");
  await page.clock.runFor(10400);
  await expect(page.locator(".arrival-scene")).toBeHidden();
  await expect(page.locator(".landing-hero-landscape figcaption")).toContainText("사진을 불러오지 못했어요");
  await expect(page.locator(".landing-hero-landscape figcaption a").first()).toHaveAttribute("href", /^https:/);
  await expect(link).toHaveAttribute("href", "/planner");
});

test("a short 320px reduced-motion screen keeps the actual heading and planning action usable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await prepareLandingMedia(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("wave-motion", "calm"));
  await page.goto("/"); await storyReady(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectUsableTarget(page.locator(".landing-actions a"));
  await expect(page.locator(".arrival-scene button")).toBeHidden();
  await expect(page.getByRole("button", { name: /인트로|다시보기/ })).toHaveCount(0);
  await expectNoOverflow(page);
});
