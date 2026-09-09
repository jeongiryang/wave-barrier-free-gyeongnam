import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mockPublicShellApi } from "./fixtures";
import { regionShowcasePhotos } from "../features/landing/region-showcase-photos";

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
  await stage.scrollIntoViewIfNeeded();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  // Reset through the real pause/resume interaction at a fixed clock origin.
  await stage.hover();
  await expect(stage).toHaveAttribute("data-running", "false");
  await page.locator(".landing-header").hover();
  await expect(stage).toHaveAttribute("data-running", "true");
  await expect(stage).toHaveAttribute("data-active-region", "창원");
  await page.clock.fastForward(3999);
  await expect(stage).toHaveAttribute("data-active-region", "창원");
  await page.clock.fastForward(1);
  await expect(stage).toHaveAttribute("data-active-region", "하동");
  await expect(stage.locator(".selected-region strong")).toHaveText("하동");
  await expect(stage.locator("img")).toHaveAttribute("src", regionShowcasePhotos["하동"].image);
  await expect(stage.getByRole("link", { name: "하동 여행 만들기" })).toHaveAttribute("href", "/planner?region=" + encodeURIComponent("하동"));
  await expect(stage.locator(".selected-region")).toHaveAttribute("aria-live", "off");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(stored);
  expect(apiRequests).toBe(0);
});

test("keyboard selection stops rotation and keeps focus, photograph, map and destination aligned", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  const section = page.locator("#regions");
  const choice = section.getByRole("group", { name: "쇼케이스 지역 선택" }).getByRole("button", { name: "거제", exact: true });
  await expect(choice).toBeEnabled();
  await choice.focus();
  await choice.press("Enter");
  await expect(choice).toBeFocused();
  await page.clock.fastForward(16000);
  await expect(section.locator("[data-region-stage]")).toHaveAttribute("data-active-region", "거제");
  await expect(section.locator(".region-scene-photo img")).toHaveAttribute("src", regionShowcasePhotos["거제"].image);
  await expect(section.getByRole("button", { name: "지역 자동 넘김 재생" })).toBeVisible();
  await section.locator(".region-map-details > summary").click();
  await expect(section.locator('[data-region-boundary="거제"]')).toHaveAttribute("data-selected", "true");
  await expect(section.locator('[data-region-marker="거제"]')).toHaveAttribute("aria-pressed", "true");
  await expect(section.getByRole("link", { name: "거제 여행 만들기" })).toHaveAttribute("href", "/planner?region=" + encodeURIComponent("거제"));
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
  const link = stage.getByRole("link");
  await link.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.fastForward(12000);
  await expect(link).toBeFocused();
  await expect(stage).toHaveAttribute("data-running", "false");
  await expect(stage).toHaveAttribute("data-active-region", "창원");
  await expect(stage.getByRole("button", { name: "직접 골라보기" })).toBeDisabled();
  await expect(stage.locator("img")).toHaveCSS("animation-name", "none");
});

test("failed photographs retain the actual region, source-free empty state and working choices at 320px", async ({ page }) => {
  await page.route("https://tong.visitkorea.or.kr/**", route => route.abort());
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#regions");
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  const section = page.locator("#regions");
  await section.getByRole("group", { name: "쇼케이스 지역 선택" }).getByRole("button", { name: "남해", exact: true }).click();
  await expect(section.locator(".region-scene-photo img")).toHaveCount(0);
  await expect(section.locator(".region-scene-photo figcaption")).toContainText("관광사진을 불러오지 못했어요");
  await expect(section.getByRole("link", { name: "남해 여행 만들기" })).toHaveAttribute("href", "/planner?region=" + encodeURIComponent("남해"));
  expect(await section.locator(".region-showcase-selection button").evaluateAll(nodes => nodes.every(node => {
    const r = node.getBoundingClientRect(); return r.width >= 44 && r.height >= 44;
  }))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).include("#regions").analyze()).violations).toEqual([]);
});

test("distinct scene crops expand with scroll and OS reduction reveals every full visual", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  for (const [section, visual] of [[".manifesto", ".needs-portrait img"], [".possibility-scene", ".story-film > img"], [".departure-scene", ".departure-scene-image"]]) {
    const node = page.locator(section);
    await node.evaluate(el => scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight * .8, behavior: "instant" }));
    await expect.poll(() => node.evaluate(el => Number(getComputedStyle(el).getPropertyValue("--cinema-progress")))).toBeLessThan(.5);
    const before = await node.locator(visual).evaluate(el => getComputedStyle(el).clipPath);
    await node.evaluate(el => scrollTo({ top: el.getBoundingClientRect().top + scrollY - innerHeight * .2, behavior: "instant" }));
    await expect.poll(() => node.evaluate(el => Number(getComputedStyle(el).getPropertyValue("--cinema-progress")))).toBe(1);
    expect(await node.locator(visual).evaluate(el => getComputedStyle(el).clipPath)).not.toBe(before);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.locator("[data-cinematic]").evaluateAll(nodes => nodes.every(node => getComputedStyle(node).getPropertyValue("--cinema-rest").trim() === "0"))).toBe(true);
});
