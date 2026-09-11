import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mockPublicShellApi } from "./fixtures";
import { landingRegions } from "../features/landing/content";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";

test.beforeEach(async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  // A decoded local image isolates UI timing from the KTO image host. Real photos
  // are separately inspected in the local visual checkpoint, never inferred here.
  const image = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({ contentType: "image/webp", body: image }));
});

test("regional names, photographs and trip links advance after the complete album, never editing a trip", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let apiRequests = 0;
  page.on("request", request => { if (request.url().includes("action=photo")) apiRequests++; });
  await page.clock.install({ time: new Date("2026-09-10T10:00:00Z") });
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  // Pause at a fixed future point while the album is still offscreen. A target
  // of Date.now() + 100 races the next browser round trip on a busy CI runner.
  await page.clock.pauseAt(new Date("2026-09-10T11:00:00Z"));
  const stage = page.locator("[data-region-stage]");
  // Storage enumeration order is browser-defined; compare every key and value.
  const stored = await page.evaluate(() => ({ ...localStorage }));
  await page.locator("#regions").evaluate(el => scrollTo({top: scrollY + el.getBoundingClientRect().top - 80, behavior: "instant"}));
  await page.clock.runFor(100);
  // Reading the scene stops rotation until the explicit resume action.
  await page.locator(".selected-region strong").hover();
  await expect(stage).toHaveAttribute("data-running", "false");
  await page.mouse.move(0, 0);
  await expect(stage).toHaveAttribute("data-running", "false");
  await stage.locator(".region-rotation-control").press("Enter");
  await expect(stage).toHaveAttribute("data-running", "true");
  await expect(stage).toHaveAttribute("data-active-region", "창원");
  await expect(stage.locator(".region-photo-album")).toHaveAttribute("data-photo-index", "0");
  await page.clock.fastForward(3999);
  await expect(stage).toHaveAttribute("data-active-region", "창원");
  await expect(stage.locator(".region-photo-album")).toHaveAttribute("data-photo-index", "0");
  await page.clock.fastForward(1);
  for (let index = 1; index < regionShowcaseAlbums["창원"].length; index++) {
    await expect(stage).toHaveAttribute("data-active-region", "창원");
    await expect(stage.locator(".region-photo-album")).toHaveAttribute("data-photo-index", String(index));
    await expect(stage.locator(".region-featured-card .region-scene-photo img")).toHaveAttribute("src", regionShowcaseAlbums["창원"][index].image);
    await expect(stage.getByRole("link", { name: "이 지역으로 여행 시작" })).toHaveAttribute("href", "/planner?region=" + encodeURIComponent("창원"));
    await page.clock.fastForward(4000);
  }
  await expect(stage).toHaveAttribute("data-active-region", "하동");
  await expect(stage.locator(".selected-region small")).toHaveText("하동");
  expect(await stage.locator(".region-featured-card img").evaluateAll(nodes => nodes.map(node => node.getAttribute("src")))).toEqual([regionShowcaseAlbums["하동"][0].image]);
  await expect(stage.getByRole("link", { name: "이 지역으로 여행 시작" })).toHaveAttribute("href", "/planner?region=" + encodeURIComponent("하동"));
  await expect(stage.locator(".selected-region")).toHaveAttribute("aria-live", "off");
  expect(await page.evaluate(() => ({ ...localStorage }))).toStrictEqual(stored);
  expect(apiRequests).toBe(0);
});

test("keyboard arrows stop rotation, preserve focus and match all 18 destination photos and links", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  const section = page.locator("#regions");
  const choice = section.getByRole("button", { name: "다음 지역", exact: true });
  await expect(choice).toBeEnabled();
  await choice.focus();
  const start = landingRegions.findIndex(region => region.name === "창원");
  for (let offset = 1; offset <= 18; offset++) {
    const name = landingRegions[(start + offset) % 18].name;
    await choice.press("Enter");
    await expect(choice).toBeFocused();
    await expect(section.locator("[data-region-stage]")).toHaveAttribute("data-active-region", name);
    expect(await section.locator(".region-featured-card .region-scene-photo img").evaluateAll(nodes => nodes.map(node => node.getAttribute("src")))).toEqual([regionShowcaseAlbums[name][0].image]);
    await expect(section.getByRole("link", { name: "이 지역으로 여행 시작" })).toHaveAttribute("href", "/planner?region=" + encodeURIComponent(name));
  }
  await page.clock.fastForward(16000);
  await expect(section.locator("[data-region-stage]")).toHaveAttribute("data-active-region", "창원");
  await expect(section.locator("[data-region-stage]")).toHaveAttribute("data-running", "false");
  await expect(section.locator(".region-arrows").getByRole("button")).toHaveCount(3);
  await expect(section.getByRole("button", { name: "지역 자동 전환 재개" })).toBeEnabled();
  await section.getByRole("button", {name:"이전 지역"}).press("Enter");
  await expect(section.locator("[data-region-stage]")).toHaveAttribute("data-active-region", "김해");
});

test("reduced motion and offscreen chapters do not auto-rotate; runtime reduction preserves focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  const stage = page.locator("[data-region-stage]");
  await page.clock.fastForward(12000);
  await expect(stage).toHaveAttribute("data-active-region", "창원");
  await stage.scrollIntoViewIfNeeded();
  const link = stage.getByRole("link", { name: "이 지역으로 여행 시작" });
  await link.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.fastForward(12000);
  await expect(link).toBeFocused();
  await expect(stage).toHaveAttribute("data-running", "false");
  await expect(stage).toHaveAttribute("data-active-region", "창원");
  await expect(stage.getByRole("button", { name: "다음 지역" })).toBeEnabled();
  for (const img of await stage.locator("img").all()) await expect(img).toHaveCSS("animation-name", "none");
});

test("failed photographs retain the actual region, source-preserving empty state and working choices at 320px", async ({ page }) => {
  await page.route("https://tong.visitkorea.or.kr/**", route => route.abort());
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#regions");
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  const section = page.locator("#regions");
  await section.getByRole("button", { name: "다음 지역", exact: true }).click();
  await expect(section.locator(".region-featured-card .region-scene-photo img")).toHaveCount(0);
  for (const caption of await section.locator(".region-featured-card .region-scene-photo figcaption").all()) await expect(caption).toContainText("사진을 불러오지 못했어요");
  await expect(section.getByRole("link", { name: "이 지역으로 여행 시작" })).toHaveAttribute("href", "/planner?region=" + encodeURIComponent("하동"));
  expect(await section.locator(".region-arrows button").evaluateAll(nodes => nodes.every(node => {
    const r = node.getBoundingClientRect(); return r.width >= 44 && r.height >= 44;
  }))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include("#regions").analyze()).violations).toEqual([]);
});

test("landscape cards scroll inside the viewport and neighbour selection opens its full album", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  const stage = page.locator("[data-region-stage]");
  await stage.scrollIntoViewIfNeeded();
  await expect(stage.locator(".region-landscape-card")).toHaveCount(3);
  await expect(stage.locator(".region-neighbour-card figcaption a")).toHaveCount(2);
  const rail = stage.locator(".region-card-rail");
  const scrollable = page.viewportSize()!.width <= 1100 || await page.locator("#regions").getAttribute("data-film") === "true";
  expect(await rail.evaluate(el => el.scrollWidth > el.clientWidth + 1)).toBe(scrollable);
  await stage.getByRole("button", {name:"하동 풍경 살펴보기"}).press("Enter");
  await expect(stage).toHaveAttribute("data-active-region", "하동");
  await expect(stage).toHaveAttribute("data-running", "false");
  await expect(stage.locator(".region-photo-album")).toHaveAttribute("data-photo-count", String(regionShowcaseAlbums["하동"].length));
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator("[data-cinematic]").evaluateAll(nodes => nodes.every(node => getComputedStyle(node).getPropertyValue("--cinema-rest").trim() === "0"))).toBe(true);
});
