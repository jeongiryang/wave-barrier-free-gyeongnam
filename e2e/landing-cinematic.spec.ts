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

test("regional names, photographs and trip links rotate together after four seconds, never editing a trip", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let apiRequests = 0;
  page.on("request", request => { if (request.url().includes("action=photo")) apiRequests++; });
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  const stage = page.locator("[data-region-stage]");
  const stored = await page.evaluate(() => JSON.stringify(localStorage));
  await page.locator("#regions").evaluate(el => scrollTo({top: scrollY + el.getBoundingClientRect().top - 80, behavior: "instant"}));
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  // Reset through the real pause/resume interaction at a fixed clock origin.
  await page.locator(".selected-region strong").hover();
  await expect(stage).toHaveAttribute("data-running", "false");
  await page.mouse.move(0, 0);
  await expect(stage).toHaveAttribute("data-running", "true");
  await expect(stage).toHaveAttribute("data-active-region", "창원");
  await page.clock.fastForward(3999);
  await expect(stage).toHaveAttribute("data-active-region", "창원");
  await page.clock.fastForward(1);
  await expect(stage).toHaveAttribute("data-active-region", "하동");
  await expect(stage.locator(".selected-region strong")).toHaveText("하동");
  expect(await stage.locator("img").evaluateAll(nodes => nodes.map(node => node.getAttribute("src")))).toEqual([regionShowcaseAlbums["하동"][0].image]);
  await expect(stage.getByRole("link", { name: "이 지역으로 여행 시작" })).toHaveAttribute("href", "/planner?region=" + encodeURIComponent("하동"));
  await expect(stage.locator(".selected-region")).toHaveAttribute("aria-live", "off");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(stored);
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
    expect(await section.locator(".region-scene-photo img").evaluateAll(nodes => nodes.map(node => node.getAttribute("src")))).toEqual([regionShowcaseAlbums[name][0].image]);
    await expect(section.getByRole("link", { name: "이 지역으로 여행 시작" })).toHaveAttribute("href", "/planner?region=" + encodeURIComponent(name));
  }
  await page.clock.fastForward(16000);
  await expect(section.locator("[data-region-stage]")).toHaveAttribute("data-active-region", "창원");
  await expect(section.locator("[data-region-stage]")).toHaveAttribute("data-running", "false");
  await expect(section.locator(".region-arrows").getByRole("button")).toHaveCount(2);
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
  await expect(section.locator(".region-scene-photo img")).toHaveCount(0);
  for (const caption of await section.locator(".region-scene-photo figcaption").all()) await expect(caption).toContainText("사진을 불러오지 못했어요");
  await expect(section.getByRole("link", { name: "이 지역으로 여행 시작" })).toHaveAttribute("href", "/planner?region=" + encodeURIComponent("하동"));
  expect(await section.locator(".region-arrows button").evaluateAll(nodes => nodes.every(node => {
    const r = node.getBoundingClientRect(); return r.width >= 44 && r.height >= 44;
  }))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include("#regions").analyze()).violations).toEqual([]);
});

test("frames reach both viewport edges, reverse on scroll and remain fully open with OS reduction", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  for (const selector of [".region-showcase-stage"]) {
    const node = page.locator(selector);
    const visual = node;
    await node.evaluate(el => scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight * .8, behavior: "instant" }));
    await expect.poll(() => node.evaluate(el => Number(getComputedStyle(el).getPropertyValue("--cinema-progress")))).toBeLessThan(.5);
    const before = await visual.evaluate(el => getComputedStyle(el).clipPath);
    await node.evaluate(el => scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight * .2, behavior: "instant" }));
    await expect.poll(() => node.evaluate(el => Number(getComputedStyle(el).getPropertyValue("--cinema-progress")))).toBe(1);
    const box = await visual.boundingBox();
    expect(box!.x).toBe(0);
    expect(box!.width).toBe(page.viewportSize()!.width);
    expect(await visual.evaluate(el => getComputedStyle(el).borderRadius)).toBe("0px");
    expect(await visual.evaluate(el => getComputedStyle(el).clipPath)).not.toBe(before);
    await node.evaluate(el => scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight * .8, behavior: "instant" }));
    await expect.poll(() => visual.evaluate(el => getComputedStyle(el).clipPath)).toBe(before);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator("[data-cinematic]").evaluateAll(nodes => nodes.every(node => getComputedStyle(node).getPropertyValue("--cinema-rest").trim() === "0"))).toBe(true);
});
