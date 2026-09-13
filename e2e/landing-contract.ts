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
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

/** Do not pause startup timers before the streamed page has hydrated. */
export async function freshArrival(page: Page) {
  await prepareLandingMedia(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto("/");
  await storyReady(page);
  await expect(page.locator(".arrival-scene")).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  await expect(page.locator(".arrival-scene")).toBeVisible();
}

export async function expectUsableTarget(target: Locator) {
  await target.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await target.focus();
  await expect(target).toBeFocused();
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(await target.evaluate(node => {
    const r = node.getBoundingClientRect();
    return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  })).toBe(true);
}

export async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}

export const chapterIds = ["top", "regions", "story", "naru"];
export const chapterNames = {
  ko: ["처음", "지역", "이용 방법", "나루"],
  en: ["Welcome", "Regions", "How it works", "Naru"],
};
export const firstRegions = ["통영", "거제", "남해", "진주", "창원", "하동"];
export const allRegions = ["거창", "거제", "고성", "김해", "남해", "밀양", "사천", "산청", "양산", "의령", "진주", "창녕", "창원", "통영", "하동", "함안", "함양", "합천"];
