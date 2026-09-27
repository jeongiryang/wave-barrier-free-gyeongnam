import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";
import { arrivalPlaybackReady, pauseCurrentClock, expectUsableTarget } from './landing-contract';
import { waveSelectNative } from './wave-select-fixture';
import { INTRO_DURATION_MS } from '../features/landing/intro/wave-timing';
import { awardHeroImage, mockAwardHero } from './landing-photo-fixture';

const firstRegions = ["통영", "거제", "남해", "하동", "산청"];
const allRegions = ["거창", "거제", "고성", "김해", "남해", "밀양", "사천", "산청", "양산", "의령", "진주", "창녕", "창원", "통영", "하동", "함안", "함양", "합천"];

async function prepare(page: Page) {
  await mockPublicShellApi(page);
  // Only provider responses and remote photograph bytes are synthetic. The real
  // local page, source URLs, links and browser interactions remain under test.
  await mockPlannerApi(page, { preserveView: true });
  await mockAwardHero(page);
}

async function freshAnimatedArrival(page: Page) {
  await prepare(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install({ time: new Date("2026-09-13T00:00:00Z") });
  await page.goto("/");
  // Let the real streamed document finish hydration before freezing timers;
  // otherwise the app's startup handoff cannot reveal the interactive page.
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  await expect(page.locator(".arrival-scene")).toBeVisible();
  await pauseCurrentClock(page);
  await expect(page.locator(".arrival-scene")).toBeVisible();
}

test("approved arrival completes its 12.731-second playback and exposes keyboard dismissal", async ({ page }) => {
  await freshAnimatedArrival(page);
  const scene = page.locator(".arrival-scene");
  const action = page.locator(".landing-hero-split").getByRole("button", { name: "여행지 검색", exact: true });
  await expect(scene).toHaveAttribute("open", "");
  await arrivalPlaybackReady(page);
  await expect(scene.locator('img, video')).toHaveCount(0);
  await expect(scene.getByRole('button')).toHaveCount(1);
  await expect(scene.getByRole("button", { name: "건너뛰기" })).toBeFocused();
  const elapsed = Number(await scene.locator('.wave-intro').getAttribute('data-time-ms'));
  // Production advances its timeline by performance elapsed time. Jump to the
  // boundary without synthesizing hundreds of expensive WebGL frames in CI.
  await page.clock.fastForward(INTRO_DURATION_MS - elapsed - 100);
  await expect(scene).toBeVisible();
  await page.clock.runFor(200);
  await expect(scene).toBeHidden();
  await action.focus(); await expect(action).toBeFocused();
  expect(await page.evaluate(() => sessionStorage.getItem("wave-arrival-session-v1"))).toBe("done");
  await page.clock.resume();
  await page.reload();
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  await expect(page.locator(".landing-hero-split")).toBeVisible();
  await pauseCurrentClock(page);
  await page.clock.fastForward(INTRO_DURATION_MS + 100);
  await expect(scene).toBeHidden();
});

test("the skip action exposes the real planning link", async ({ page }) => {
  await freshAnimatedArrival(page);
  await page.locator(".arrival-scene").getByRole("button", { name: "건너뛰기" }).click();
  await page.locator(".landing-hero-split").getByRole("button", { name: "여행지 검색", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/planner");
  expect(await page.evaluate(() => sessionStorage.getItem("wave-arrival-session-v1"))).toBe("done");
});

test("keyboard users can dismiss the arrival with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await freshAnimatedArrival(page);
  await page.keyboard.press("Escape");
  await expect(page.locator(".arrival-scene")).toBeHidden();
  const action = page.locator(".landing-hero-split").getByRole("button", { name: "여행지 검색", exact: true });
  await action.focus(); await expect(action).toBeFocused();
});

for (const width of [1440, 960, 390]) test(`${width}px reduced motion keeps the photographic hero and all eighteen region choices usable`, async ({ page }, info) => {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 960 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepare(page);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  // Keyboard events sent to the streamed HTML before React loads are not replayed.
  // Wait for the real interactive page, as the animated-arrival cases do above.
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  await expect(page.locator('.arrival-scene')).toBeVisible();
  await page.locator('.arrival-scene').getByRole('button', { name: '건너뛰기', exact: true }).press('Enter');
  await expect(page.locator(".arrival-scene")).toBeHidden();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const hero = page.locator(".landing-hero-split"), copy = hero.locator(".landing-hero-copy"), scenery = page.locator('.scenic-background-home'), photograph = scenery.locator('.award-panorama');
  await expect(copy).toBeVisible();
  const search = hero.locator('.night-hero-search');
  const region = search.getByRole('combobox', { name: '어디로 떠나고 싶으세요?', exact: true });
  const planning = search.getByRole('button', { name: '여행지 검색', exact: true });
  await expect(search).toHaveAttribute('action', '/planner');
  await expect(planning).toHaveAttribute('type', 'submit');
  await expect(waveSelectNative(region)).toHaveAttribute('name', 'region');
  await expectUsableTarget(region);
  await region.press('ArrowDown');
  const menu = page.getByRole('listbox', { name: '어디로 떠나고 싶으세요?', exact: true });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(region).toBeFocused();
  await expect(region).toHaveText('거제');
  await expect(waveSelectNative(region)).toHaveValue('거제');
  await page.keyboard.press('Tab');
  await expect(planning).toBeFocused();
  await expectUsableTarget(planning);
  expect((await new AxeBuilder({ page }).include('.night-hero-search').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await expect(scenery).toHaveCSS('position', 'fixed');
  await expect(photograph.locator("img")).toBeVisible();
  await expect.poll(() => photograph.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const copyBox = (await copy.boundingBox())!, photoBox = (await photograph.boundingBox())!;
  expect(copyBox.width).toBeGreaterThan(0);
  expect(photoBox.width).toBeGreaterThan(0);
  expect(photoBox.x).toBeGreaterThanOrEqual(0);
  expect(photoBox.x + photoBox.width).toBeLessThanOrEqual(width + 1);
  await expect(photograph.locator("img")).toHaveAttribute("src", awardHeroImage);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath(`simple-hero-${width}.png`) });

  // Complete the submitted form with the keyboard, then inspect the independent
  // eighteen-region gallery on a fresh landing render.
  await planning.press('Enter');
  await expect(page).toHaveURL(url => url.pathname === '/planner' && url.searchParams.get('region') === '거제');
  await expect(waveSelectNative(page.getByRole('combobox', { name: '여행 지역', exact: true }))).toHaveValue('거제');
  await page.goto('/');
  await expect(search).toBeVisible();

  const grid = page.locator(".simple-region-grid"), cards = grid.locator("article");
  await expect(cards).toHaveCount(firstRegions.length);
  await expect(cards.locator("h3")).toHaveText(firstRegions);
  const expand = page.getByRole("button", { name: "18개 지역 모두 보기", exact: true });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expect(expand).toHaveAttribute("aria-controls", await grid.getAttribute("id") as string);
  await expect(expand).toBeEnabled();
  await expand.focus();
  await expect(expand).toBeFocused();
  await expand.press("Enter");
  await expect(cards).toHaveCount(18);
  expect((await cards.locator("h3").allTextContents()).sort()).toEqual([...allRegions].sort());
  const collapse = page.getByRole("button", { name: "접기", exact: true });
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  await expect(collapse).toBeFocused();

  for (const card of await cards.all()) {
    const name = await card.locator("h3").innerText();
    const photo = regionShowcaseAlbums[name][0];
    const link = card.getByRole("link", { name: `${name} 여행지 보기`, exact: true });
    const image = link.locator("img");
    const destination = new URL((await link.getAttribute("href"))!, page.url());
    expect(destination.origin).toBe(new URL(page.url()).origin);
    expect(destination.pathname).toBe("/planner");
    expect([...destination.searchParams]).toEqual([["region", name]]);
    await expect(image).toHaveAttribute("src", photo.image);
    await expect(card.locator(".simple-region-culture,.declining-region-notice,.simple-region-arrow")).toHaveCount(0);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const bounds = await card.evaluate(node => {
      const card = node.querySelector(".simple-region-link")!.getBoundingClientRect(), image = node.querySelector("img")!.getBoundingClientRect();
      return { height: card.height, left: Math.abs(card.left - image.left), top: Math.abs(card.top - image.top), width: Math.abs(card.width - image.width), heightGap: Math.abs(card.height - image.height) };
    });
    expect(bounds.height).toBeGreaterThan(100);
    for (const gap of [bounds.left, bounds.top, bounds.width, bounds.heightGap]) expect(gap, `${name}: image must fill its own card`).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect(await grid.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0);
  await grid.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath(`simple-regions-${width}.png`) });
  await collapse.click();
  await expect(cards).toHaveCount(firstRegions.length);
  await expect(cards.locator("h3")).toHaveText(firstRegions);
  await expect(page.getByRole("button", { name: "18개 지역 모두 보기", exact: true })).toBeFocused();
  expect(errors).toEqual([]);
  await cards.first().getByRole("link", { name: "통영 여행지 보기", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/planner" && url.searchParams.get("region") === "통영");
});
