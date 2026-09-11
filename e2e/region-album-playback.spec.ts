import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mockPublicShellApi } from "./fixtures";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";

test("automatic showcase finishes each region's album and manual selection stops rotation", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  const bitmap = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({ body: bitmap, contentType: "image/webp" }));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  await page.mouse.move(-10, -10);
  await page.locator("#regions").evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
  const stage = page.locator("[data-region-stage]");
  await expect(stage).toHaveAttribute("data-running", "true");
  const firstRegion = (await stage.getAttribute("data-active-region"))!;
  const album = regionShowcaseAlbums[firstRegion];
  for (const [index, photo] of album.entries()) {
    await expect(stage).toHaveAttribute("data-active-region", firstRegion);
    await expect(stage.locator(".region-photo-album")).toHaveAttribute("data-photo-index", String(index));
    await expect(stage.locator(".region-featured-card .region-scene-photo img")).toHaveAttribute("src", photo.image);
    await expect(stage.locator(".region-featured-card .region-scene-photo figcaption a")).toHaveAttribute("href", photo.image);
    await page.clock.fastForward(4000);
  }
  await expect(stage).not.toHaveAttribute("data-active-region", firstRegion);
  await expect(stage.locator(".region-photo-album")).toHaveAttribute("data-photo-index", "0");
  const nextRegion = (await stage.getAttribute("data-active-region"))!;
  const photo = regionShowcaseAlbums[nextRegion][1];
  const choice = stage.getByRole("button", { name: `${photo.title} · 사진 보기`, exact: true });
  await choice.press("Enter");
  await expect(choice).toBeFocused();
  await expect(stage).toHaveAttribute("data-running", "false");
  await page.clock.fastForward(60000);
  await expect(stage).toHaveAttribute("data-active-region", nextRegion);
  await expect(stage.locator(".region-photo-album")).toHaveAttribute("data-photo-index", "1");
  await expect(choice).toBeFocused();
});
