import { expect, test } from "@playwright/test";
import { prepareStory, storyReady, expectUsableTarget } from "./landing-contract";

test.beforeEach(async ({ page }) => { await prepareStory(page); });

test("brand artwork remains visible while the retired remix never downloads", async ({ page }) => {
  const videos: string[] = [];
  page.on("request", request => { if (request.url().endsWith(".mp4")) videos.push(request.url()); });
  await page.goto("/"); await storyReady(page);
  const portrait = page.locator(".horizon-account-photo img");
  await portrait.scrollIntoViewIfNeeded();
  await expect(portrait).toHaveAttribute("src", "/media/horizon/coastal-park.jpg");
  await expect.poll(() => portrait.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(page.locator(".closing-horizon img")).toHaveAttribute("src", "/media/horizon/hero-coast.jpg");
  await expect(page.locator(".story-film")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".horizon-chapter-copy")).toHaveCount(3);
  await expectUsableTarget(page.locator('.landing-cta > a[href="/planner"]'));
  expect(videos).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("data saving and failed artwork retain the story and keyboard exit to planning", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => { if (request.url().endsWith(".mp4")) requests.push(request.url()); });
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { value: Object.assign(new EventTarget(), { saveData: true }), configurable: true }));
  await page.route("**/media/horizon/*.jpg", route => route.abort());
  await page.goto("/"); await storyReady(page);
  await expect(page.locator(".landing-hero .story-media img")).toHaveCount(0);
  await expect(page.locator(".hero-copy-sequence")).toHaveAttribute("data-still", "true");
  const cta = page.locator(".landing-actions a[href='/planner']"); await expectUsableTarget(cta);
  await page.evaluate(() => {
    const connection = (navigator as Navigator & { connection: EventTarget & { saveData: boolean } }).connection;
    connection.saveData = false; connection.dispatchEvent(new Event("change"));
  });
  await expect(cta).toBeFocused();
  await expect(page.locator(".landing-hero video, .story-film")).toHaveCount(0);
  await expect(cta).toHaveAttribute("href", "/planner");
  expect(requests).toEqual([]);
});
