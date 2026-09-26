import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";
import { chapterIds, openLandingTools, storyReady } from "./landing-contract";
import { mockAwardHero } from './landing-photo-fixture';


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
  await mockAwardHero(page);
  await page.route("**/api/community/posts?**", route => route.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
  const widths = test.info().project.name.includes("mobile") ? [280, 390] : [960, 1440];
  {
    const width = widths[size];
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await storyReady(page);
    for (const id of chapterIds) {
      if (id === "naru") await openLandingTools(page);
      const scene = page.locator(`#${id}`);
      await scene.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
      await expect(scene).toBeVisible();
      expect((await new AxeBuilder({ page }).include(`#${id}`).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await scene.screenshot({ path: test.info().outputPath(`${id}-${theme}-${width}.png`) });
    }
    await expect(page.locator(".night-journey-tabs button")).toHaveCount(3);
    await expect(page.locator(".simple-naru-example")).toContainText("대화 예시");
    await page.goto("/planner");
    const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
    await expect(region).toBeEnabled();
    await expect(region).toHaveValue("");
    const regionCards = page.locator(".simple-region-entry .simple-region-link");
    await expect(regionCards).toHaveCount(6);
    await expect(page.locator('.simple-region-entry [aria-pressed="true"]')).toHaveCount(0);
    await page.getByRole("button", { name: "전체 18개 지역", exact: true }).click();
    await expect(regionCards).toHaveCount(18);
    expect((await new AxeBuilder({ page }).include("#planner").analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`region-${theme}-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "통영 지역 선택", exact: true }).click();
    await expect(region).toHaveValue("통영");
    await expect(page.locator(".simple-place-row")).toHaveCount(2);
    const activity = page.getByRole("group", { name: "하고 싶은 활동", exact: true }).getByRole("button").first();
    await activity.click();
    await expect(activity).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "필요한 편의", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "필요한 편의", exact: true });
    await expect(picker.getByRole("heading", { name: "필요한 편의", exact: true })).toBeFocused();
    await picker.getByRole("checkbox", { name: "접근로", exact: true }).check();
    await expect(picker.getByRole("checkbox", { checked: true })).toHaveCount(1);
    // A checkbox is a reviewable draft; opening and editing this dialog must
    // not persist personal facility needs before the explicit apply action.
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]"))).toEqual([]);
    expect((await new AxeBuilder({ page }).include(".simple-facility-picker").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`facilities-${theme}-${width}.png`), fullPage: true });
    await picker.getByRole("button", { name: "적용 · 1개", exact: true }).click();
    await expect(picker).toHaveCount(0);
    await expect(page.getByRole("button", { name: "필요한 편의 · 1개", exact: true })).toBeFocused();
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]"))).toEqual(["route"]);
    await page.goto("/community");
    await expect(page.getByText("아직 등록된 후기나 질문이 없습니다.", { exact: true })).toBeVisible();
    await expect(page.locator(".night-story-card")).toHaveCount(0);
    if (width >= 390) {
      // The full-height introduction precedes the board. Its primary action
      // remains keyboard reachable and fully visible when scrolled into view.
      const action = page.locator(".night-community-toolbar .night-primary");
      await action.scrollIntoViewIfNeeded();
      const write = await action.boundingBox();
      expect(write!.y).toBeGreaterThanOrEqual(0);
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
  await mockAwardHero(page);
  await page.goto("/");
  await storyReady(page);
  await expect(page.locator(".landing-page")).toHaveAttribute("lang", "en");
  await expect(page.locator(".landing-opening .award-panorama img")).toHaveAttribute("alt", "");
  const landingCards = page.locator('#regions .simple-region-link');
  await expect(landingCards).toHaveCount(5);
  await expect(landingCards.locator('span[lang="ko"]')).toHaveCount(5);
  const shownPhotos = await landingCards.locator('img').evaluateAll(nodes => nodes.map(node => node.getAttribute('src')!));
  await expect(page.locator("#community h2")).toHaveText("Travel brings people together.");
  expect(await page.locator("#community .night-discover-photos span").first().evaluate(node => node.closest("[lang]")?.getAttribute("lang"))).toBe("ko");
  await page.goto("/planner");
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toBeEnabled();
  const cards = page.locator(".simple-region-entry .simple-region");
  await expect(cards).toHaveCount(6);
  expect(await cards.locator("h3").allTextContents()).toEqual(["통영", "거제", "남해", "진주", "창원", "하동"]);
  // Decorative photos keep Korean place-name boundaries; their original
  // author and source are available on the shared credits page.
  expect(await cards.locator("img").evaluateAll(nodes => nodes.every(node => node.getAttribute("alt") === ""))).toBe(true);
  expect(await cards.locator(".simple-region-link").evaluateAll(nodes => nodes.every(node => node.closest("[lang]")?.getAttribute("lang") === "ko"))).toBe(true);
  await expect(page.getByRole("button", { name: "All 18 regions", exact: true })).toBeVisible();
  await page.goto("/community");
  await expect(page.locator(".night-community-toolbar")).toBeVisible();
  expect(await page.locator(".night-community-toolbar").evaluate(node => node.closest("[lang]")?.getAttribute("lang"))).toBe("ko");
  await page.locator('.wave-balanced-footer a[href="/policies#content-credits"]').click();
  for (const src of shownPhotos) {
    const credit = page.locator('#regional-photo-credits li').filter({ has: page.locator(`img[src="${src}"]`) });
    await expect(credit).toContainText('저작자:');
    await expect(credit).toContainText('제공: ⓒ한국관광공사');
    await expect(credit.locator(`a[href="${src}"]`)).toHaveAttribute('rel', 'noopener noreferrer');
  }
});
