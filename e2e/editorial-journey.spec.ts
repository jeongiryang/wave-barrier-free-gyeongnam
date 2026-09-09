import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

for (const theme of ["light", "dark"]) for (const size of [0, 1]) test(`editorial introduction and working pages remain readable in ${theme}, size ${size}`, async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.addInitScript(theme => {
    sessionStorage.setItem("wave-arrival-session-v1", "done");
    localStorage.setItem("wave-theme", theme);
  }, theme);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const bitmap = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({ contentType: "image/webp", body: bitmap }));
  await page.route("**/api/community/posts?**", route => route.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
  const widths = test.info().project.name.includes("mobile") ? [280, 390] : [960, 1440];
  {
    const width = widths[size];
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    for (const id of ["story", "community"]) {
      const scene = page.locator(`#${id}`);
      await scene.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
      await expect(scene).toBeVisible();
      expect((await new AxeBuilder({ page }).include(`#${id}`).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await scene.screenshot({ path: test.info().outputPath(`${id}-${theme}-${width}.png`) });
    }
    await expect(page.locator("main")).not.toContainText(/작성 예시|실제 게시된 글이 아닙니다|다시보기/);
    await page.goto("/planner");
    await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
    await expect(page.locator('.region-picker-list [aria-pressed="true"]')).toHaveCount(0);
    await expect(page.locator(".planner-destination-caption strong")).toHaveText("경남");
    await expect(page.locator(".region-picker-list button")).toHaveCount(19);
    expect((await new AxeBuilder({ page }).include("#planner").analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`region-${theme}-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "통영", exact: true }).click();
    await expect(page.locator(".planner-destination-caption strong")).toHaveText("통영");
    await page.locator(".condition-actions button").click();
    await expect(page.getByRole("heading", { name: "어떤 편의가 필요할까요?", exact: true })).toBeFocused();
    await page.locator(".profile-card").first().click();
    await expect(page.locator(".profile-card.active")).toHaveCount(1);
    expect((await new AxeBuilder({ page }).include("#planner").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`facilities-${theme}-${width}.png`), fullPage: true });
    await page.goto("/community");
    await expect(page.locator(".community-state")).toContainText("아직 등록된");
    if (width >= 390) {
      // The board's primary action must be reachable in the first viewport;
      // an inherited display headline previously pushed it below the fold.
      const write = await page.locator(".community-toolbar .community-write").boundingBox();
      expect(write!.y + write!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    }
    expect((await new AxeBuilder({ page }).include(".community-page").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`board-${theme}-${width}.png`), fullPage: true });
  }
});

test("English travel pages identify original Korean photography and community copy", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    sessionStorage.setItem("wave-arrival-session-v1", "done");
    localStorage.setItem("wave-locale", "en");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const bitmap = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({ contentType: "image/webp", body: bitmap }));
  await page.goto("/");
  await expect(page.locator(".landing-page")).toHaveAttribute("lang", "en");
  await expect(page.locator(".destination-panorama img")).toHaveAttribute("lang", "ko");
  await expect(page.locator(".destination-panorama figcaption a span")).toHaveAttribute("lang", "ko");
  await expect(page.locator(".destination-panorama figcaption a")).toContainText("Source:");
  await page.goto("/planner");
  await expect(page.locator(".region-picker-list")).toHaveAccessibleName("Choose a region");
  await expect(page.locator(".planner-destination-image img")).toHaveAttribute("lang", "ko");
  await expect(page.locator(".planner-destination-caption strong")).toHaveText("Gyeongnam");
  await page.goto("/community");
  await expect(page.locator(".community-editorial")).toHaveAttribute("lang", "ko");
  await expect(page.locator(".community-editorial h1")).toContainText("다녀온 이야기");
});
