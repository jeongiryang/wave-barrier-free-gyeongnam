import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";
import { storyReady } from './landing-contract';
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

async function freshEntry(page: Page) {
  await prepare(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await storyReady(page);
  await expect(page.locator("#arrival-boot,.arrival-scene,.wave-intro")).toHaveCount(0);
}

test("first visit and reload expose the planning link immediately", async ({ page }) => {
  await freshEntry(page);
  const action = page.locator(".landing-hero-split").getByRole("link", { name: "여행지 둘러보기", exact: true });
  await expect(action).toBeVisible();
  await action.focus(); await expect(action).toBeFocused();
  expect(await page.evaluate(() => sessionStorage.getItem("wave-arrival-session-v1"))).toBeNull();
  await page.reload();
  await storyReady(page);
  await expect(page.locator(".arrival-scene")).toHaveCount(0);
  await expect(action).toBeVisible();
});

test("the planning link works without skipping an intro", async ({ page }) => {
  await freshEntry(page);
  await page.locator(".landing-hero-split").getByRole("link", { name: "여행지 둘러보기", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/planner");
  expect(await page.evaluate(() => sessionStorage.getItem("wave-arrival-session-v1"))).toBeNull();
});

test("mobile keyboard users can enter planning without an arrival dialog", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await freshEntry(page);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const action = page.locator(".landing-hero-split").getByRole("link", { name: "여행지 둘러보기", exact: true });
  await action.focus(); await expect(action).toBeFocused();
  await action.press("Enter");
  await expect(page).toHaveURL(url => url.pathname === "/planner");
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
  await expect(page.locator(".arrival-scene")).toBeHidden();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const hero = page.locator(".landing-hero-split"), copy = hero.locator(".landing-hero-copy"), photograph = page.locator(".landing-opening .award-panorama");
  await expect(copy).toBeVisible();
  const planning = page.locator('.landing-actions a');
  // Hydration can precede Vite's client stylesheet handoff. Wait for the
  // required paint, then inspect its colors; a missing gradient still fails.
  await expect(planning).toHaveCSS('background-image', /linear-gradient\(/);
  const gradient = await planning.evaluate(node => getComputedStyle(node).backgroundImage);
  expect(gradient).toContain('linear-gradient');
  expect(gradient).toContain('rgb(45, 107, 183)');
  expect(gradient).toContain('rgb(110, 49, 220)');
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
