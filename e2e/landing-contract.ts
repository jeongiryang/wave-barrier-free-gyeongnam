import { expect, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mockPublicShellApi } from "./fixtures";

/** Real page behavior with deterministic, decoded tourism photograph bytes. */
export async function prepareLandingMedia(page: Page) {
  await mockPublicShellApi(page);
  const bitmap = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({ contentType: "image/webp", body: bitmap }));
}

/** Post-arrival only. Fresh-entry suites exercise the real nonblocking scene. */
export async function prepareStory(page: Page) {
  await prepareLandingMedia(page);
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
}

export async function storyReady(page: Page) {
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  // hydrateRoot is scheduled before the streamed document's visible handoff.
  // Require uniqueness and visibility together rather than accepting the hidden
  // server copy just before React mounts the interactive page.
  await page.waitForFunction(() => {
    const pages = document.querySelectorAll<HTMLElement>(".landing-page");
    if (pages.length !== 1) return false;
    const box = pages[0].getBoundingClientRect();
    return box.width > 0 && box.height > 0 && getComputedStyle(pages[0]).visibility !== "hidden";
  });
  await expect(page.locator(".landing-page.simple-landing")).toHaveCount(1);
  await expect(page.locator(".landing-page")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** Freeze wall time before pausing so protocol latency cannot make the target stale.
 * Restore advancing Date semantics after timers have stopped; rAF elapsed time is unchanged. */
export async function pauseCurrentClock(page: Page) {
  const now = new Date(await page.evaluate(() => Date.now()));
  await page.clock.setFixedTime(now);
  await page.clock.pauseAt(now);
  await page.clock.setSystemTime(now);
}

/** Do not pause startup timers before the streamed page has hydrated. */
export async function freshArrival(page: Page) {
  await prepareLandingMedia(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto("/");
  await storyReady(page);
  await expect(page.locator(".arrival-scene")).toBeVisible();
  await pauseCurrentClock(page);
  await expect(page.locator(".arrival-scene")).toBeVisible();
}

/** The WebGL renderer starts its clock only after its scene is ready. */
export async function arrivalPlaybackReady(page: Page) {
  await page.clock.resume();
  // Observe the first frame in the browser: repeated protocol reads can consume
  // the readiness deadline while software WebGL is rendering. Keep the same
  // positive playback-time condition and the existing eight-second bound.
  await page.waitForFunction(
    () => Number(document.querySelector('.wave-intro')?.getAttribute('data-time-ms')) > 0,
    undefined,
    { timeout: 8_000 },
  );
  await pauseCurrentClock(page);
  await expect(page.locator('.arrival-scene')).toBeVisible();
  await expect(page.locator('.wave-intro canvas')).toBeVisible();
}

export async function expectUsableTarget(target: Locator) {
  await expect(target).toBeEnabled();
  await target.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await target.focus();
  await expect(target).toBeFocused();
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  // DOMRect subtraction can report 43.999969 for a computed 44px target.
  // Round only floating-point noise; a real subpixel deficit still fails.
  expect(Math.round(box!.height * 1000) / 1000).toBeGreaterThanOrEqual(44);
  expect(Math.round(box!.width * 1000) / 1000).toBeGreaterThanOrEqual(44);
  expect(await target.evaluate(node => {
    const r = node.getBoundingClientRect();
    return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  })).toBe(true);
}

export async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}

export const chapterIds = ["top", "regions", "story", "community", "departure", "naru", "features", "closing"];
export const chapterNames = {
  ko: ["처음", "이용 방법", "할 수 있는 일", "지역", "나루", "출발 전", "커뮤니티", "여행 시작"],
  en: ["Welcome", "How it works", "What you can do", "Regions", "Naru", "Before you go", "Community", "Plan a trip"],
};
export const firstRegions = ["통영", "거제", "남해", "하동", "산청"];
export const allRegions = ["거창", "거제", "고성", "김해", "남해", "밀양", "사천", "산청", "양산", "의령", "진주", "창녕", "창원", "통영", "하동", "함안", "함양", "합천"];

/** Optional tools remain reachable through the visitor-facing disclosure. */
export async function openLandingTools(page: Page) {
  const details = page.locator('.night-feature-details');
  if (await details.getAttribute('open') === null) await details.locator(':scope > summary').click();
  await expect(details).toHaveAttribute('open', '');
}
