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

test("scroll direction reveals navigation without hiding focused or open preferences", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  const nav = page.locator(".landing-header");
  const top = () => nav.evaluate(el => el.getBoundingClientRect().bottom);
  await page.evaluate(() => scrollTo({ top: 500, behavior: "instant" }));
  await expect.poll(top).toBeLessThan(0);
  await page.evaluate(() => scrollBy({ top: -2, behavior: "instant" }));
  await expect.poll(top).toBeGreaterThan(44);
  // Native <summary> is exposed as a disclosure by Chromium, not an ARIA button.
  const preferences = nav.getByLabel("환경설정 열기", { exact: true });
  await expect(preferences).toHaveAccessibleName("환경설정 열기");
  expect(await preferences.evaluate(node => node.tagName)).toBe("SUMMARY");
  await preferences.focus();
  await preferences.press("Enter");
  await expect(nav.locator("details.preference-controls")).toHaveAttribute("open", "");
  await page.evaluate(() => scrollBy({ top: 300, behavior: "instant" }));
  await expect(preferences).toBeFocused();
  await expect.poll(top).toBeGreaterThan(44);
  await page.keyboard.press("Escape");
  await expect(preferences).toBeFocused();
  await page.evaluate(() => scrollBy({ top: 80, behavior: "instant" }));
  await expect.poll(top).toBeGreaterThan(44);
  for (const control of [preferences, nav.getByRole("button", { name: "도움말", exact: true })]) {
    const bounds = await control.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }
});

for (const width of [320, 390]) {
  test(`${width}px static Korean story is complete without explanation buttons, layout gaps or overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
    // Ignore only the observer visibility marker; retain every section identity and order.
    const classes = await page.locator("main > section").evaluateAll(nodes => nodes.map(node => Array.from(node.classList).filter(name => name !== "is-visible").join(" ")));
    expect(classes).toEqual(["landing-hero", "region-story region-showcase", "horizon-how", "horizon-account", "horizon-departure", "horizon-community", "landing-cta"]);
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
