import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockPublicShellApi(page);
  // First-entry behavior is covered in fullscreen-intro.spec; begin this scene after arrival.
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

test("v1 and v2 media are visible scenes and the silent remix only loads on a keyboard action", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => { if (request.url().endsWith(".mp4")) requests.push(request.url()); });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  await expect(page.locator(".needs-portrait img")).toHaveAttribute("src", "/media/wave-story/planning-together-v1.webp");
  const film = page.locator(".story-film");
  await film.scrollIntoViewIfNeeded();
  await expect(film.locator("img")).toHaveAttribute("src", "/media/wave-story/garden-discovery-v2.webp");
  await expect.poll(() => film.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(film.locator("figcaption")).toContainText("실제 관광지나 편의시설 정보가 아닙니다");
  await expect(page.locator(".closing-horizon")).toHaveCSS("background-image", /harbor-night-v2\.webp/);
  expect(requests).toEqual([]);
  const control = film.getByRole("button");
  await expect(control).toHaveAccessibleName("20초 소개 영상 보기");
  const video = film.locator("video");
  await control.focus();
  await page.keyboard.press("Enter");
  await expect(video).toHaveJSProperty("paused", false);
  await expect(control).toHaveAccessibleName("소개 영상 일시정지");
  await expect(control).toBeFocused();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => Math.round(v.duration))).toBe(20);
  expect(await video.evaluate((v: HTMLVideoElement) => v.muted && !v.loop)).toBe(true);
  expect(new Set(requests)).toEqual(new Set([new URL("/media/wave-story/story-film-v2.mp4", page.url()).href]));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(video).toHaveJSProperty("paused", true);
  await expect(control).toBeFocused();
  await expect(control).toHaveAttribute("aria-disabled", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("data saving does not fetch the remix, and media failure leaves the whole scene usable", async ({ page }) => {
  let videoRequests = 0;
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { value: Object.assign(new EventTarget(), { saveData: true }), configurable: true }));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/media/wave-story/story-film-v2.mp4", route => { videoRequests++; return route.abort(); });
  await page.goto("/");
  const film = page.locator(".story-film");
  const control = film.getByRole("button", { name: "20초 소개 영상 보기" });
  await control.focus();
  await expect(control).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Enter");
  expect(videoRequests).toBe(0);
  await expect(film.locator("video")).not.toHaveAttribute("src");
  await page.evaluate(() => {
    const connection = (navigator as Navigator & { connection: EventTarget & { saveData: boolean } }).connection;
    connection.saveData = false;
    connection.dispatchEvent(new Event("change"));
  });
  await expect(control).toHaveAttribute("aria-disabled", "false");
  await page.keyboard.press("Enter");
  await expect(film.getByRole("status")).toContainText("영상을 불러오지 못했어요");
  await expect(film.locator("img")).toBeVisible();
  await expect(control).toBeFocused();
  await expect(control).toHaveAttribute("aria-disabled", "true");
  expect(videoRequests).toBe(1);
  await expect(page.getByRole("link", { name: "실제 여행 계획 살펴보기" })).toHaveAttribute("href", "#journey-scene-title");
});
