import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openLandingTools, prepareStory, storyReady, chapterIds, expectNoOverflow, expectUsableTarget } from "./landing-contract";

test.beforeEach(async ({ page }) => { await prepareStory(page); });

test("navigation scrolls in document flow and remains available on keyboard focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await storyReady(page);
  const nav = page.locator(".wave-header");
  await expect(nav).toHaveCSS("position", "relative");
  const top = (await nav.boundingBox())!;
  expect(top.x).toBe(0);
  expect(top.width).toBe(page.viewportSize()!.width);
  const hero = (await page.locator(".landing-hero-split").boundingBox())!;
  expect(hero.y).toBeGreaterThanOrEqual(top.y + top.height);
  for (const offset of [500, 460, 350, 900]) {
    await page.evaluate(top => scrollTo({ top, behavior: "instant" }), offset);
    const box = (await nav.boundingBox())!;
    expect(Math.abs(box.y + offset - top.y)).toBeLessThanOrEqual(1);
    await expect(nav).toHaveCSS("transform", "none");
  }
  const home = nav.locator(".wave-wordmark");
  await home.focus(); await expect(home).toBeFocused();
  await expect(nav).toBeInViewport();
  await expect(nav.getByRole("navigation").getByRole("link")).toHaveText(page.viewportSize()!.width <= 600 ? ["여행 설계", "축제", "커뮤니티"] : ["서비스 소개", "여행 설계", "축제", "커뮤니티"]);
  await expectUsableTarget(home);
  if (page.viewportSize()!.width <= 600) { await openSupportMenu(page); await expectUsableTarget(nav.locator(".mobile-menu-link[href='/travel-book']")); }
  else await expectUsableTarget(nav.locator(".wave-my-trips"));
});

for (const width of [320, 390]) {
  test(`${width}px static story remains complete under ordinary vertical scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/"); await storyReady(page);
    expect(await page.locator("main section[id]").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
    for (const id of chapterIds) {
      if (id === "naru") await openLandingTools(page);
      const section = page.locator(`#${id}`), heading = section.locator("h1,h2").first();
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
      await expect(section).toHaveAccessibleName(/\S/);
      await expectNoOverflow(page);
    }
    await expect(page.locator(".night-journey-tabs button")).toHaveCount(3);
    const example = page.locator(".simple-naru-example");
    await expect(example.locator("input")).toHaveCount(0);
    await expect(example.getByRole("button")).toHaveCount(1);
    await expect(example.locator(".example-duration strong")).toHaveText("60분");
    const apply = example.getByRole("button", { name: "예시 일정에 적용", exact: true });
    await expectUsableTarget(apply);
    await apply.press("Enter");
    await expect(example.locator(".example-duration strong")).toHaveText("90분");
    await expect(example.locator('[aria-live="polite"]')).toHaveText("예시 일정에 90분 체류를 적용했어요.");
    await example.getByRole("button", { name: "되돌리기", exact: true }).press("Enter");
    await expect(example.locator(".example-duration strong")).toHaveText("60분");
    await expectUsableTarget(page.locator(".night-hero-search button[type=submit]"));
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}
