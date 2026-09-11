import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mockPublicShellApi } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  const photo = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({ contentType: "image/webp", body: photo }));
});

test("primary navigation remains visible while scrolling and utilities live below content", async ({ page }) => {
  await page.goto("/"); await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  const nav = page.locator(".wave-header");
  await page.evaluate(() => scrollTo({ top: 500, behavior: "instant" }));
  await expect(nav).toBeInViewport();
  await expect(nav.locator(".preference-controls,.help-button")).toHaveCount(0);
  const home = nav.locator(".wave-wordmark"); await home.focus(); await expect(home).toBeFocused();
  await expect(nav.getByRole("navigation").getByRole("link")).toHaveCount(3);
  for (const control of [home,nav.locator(".wave-my-trips")]) { const box = await control.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44); }
  await expect(page.locator(".wave-footer-tools .help-button")).toBeEnabled();
});

for (const width of [320, 390]) {
  test(`${width}px static Korean story is complete without explanation buttons, layout gaps or overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
    // Ignore only the observer visibility marker; retain every section identity and order.
    const classes = await page.locator("main > section").evaluateAll(nodes => nodes.map(node => Array.from(node.classList).filter(name => name !== "is-visible").join(" ")));
    expect(classes).toEqual(["landing-hero", "horizon-how", "region-story region-showcase", "horizon-account", "horizon-departure", "horizon-community", "landing-cta"]);
    await expect(page.locator("main > section details, .journey-stage-controls, .region-showcase-selection, .region-map-details")).toHaveCount(0);
    await expect(page.getByRole("button", {name:/풍경 재생|영상 일시정지|실제 여행 계획 살펴보기|자동 넘김/})).toHaveCount(0);
    await expect(page.locator(".landing-actions a[href='/planner']")).toHaveAccessibleName("여행 계획하기");
    // Text/image failure cannot create a section consisting only of an empty spacer.
    for (const section of await page.locator("main > section").all()) {
      const heading = (await section.getAttribute("id")) === "regions" ? section.locator(".selected-region strong") : section.locator("h1,h2").first();
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
      await expect.poll(() => heading.evaluate(node => getComputedStyle(node).opacity)).toBe("1");
      const padding = await section.evaluate(node => [getComputedStyle(node).paddingTop, getComputedStyle(node).paddingBottom].map(Number.parseFloat));
      for (const value of padding) expect(value).toBeLessThanOrEqual(128);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
    await expect(page.locator(".horizon-community")).not.toContainText(/작성 예시|실제 게시된 글이 아닙니다/);
    await expect(page.locator(".horizon-community input,.horizon-community form")).toHaveCount(0);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
