import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";
import { horizonPhotos } from "../features/landing/horizon-photos";

const firstRegions = ["통영", "거제", "남해", "진주", "창원", "하동"];
const allRegions = ["거창", "거제", "고성", "김해", "남해", "밀양", "사천", "산청", "양산", "의령", "진주", "창녕", "창원", "통영", "하동", "함안", "함양", "합천"];

async function prepare(page: Page) {
  await mockPublicShellApi(page);
  // Only provider responses and remote photograph bytes are synthetic. The real
  // local page, source URLs, links and browser interactions remain under test.
  await mockPlannerApi(page, { preserveView: true });
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
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  await expect(page.locator(".arrival-scene")).toBeVisible();
}

test("arrival finishes within twelve seconds and exposes a keyboard dismissal", async ({ page }) => {
  await freshAnimatedArrival(page);
  const scene = page.locator(".arrival-scene");
  const action = page.locator(".landing-hero-split").getByRole("link", { name: "여행지 둘러보기", exact: true });
  await expect(scene).toHaveAttribute("open", "");
  await expect(scene).toContainText("모두의 여행이 같은 출발선에 설 수 있도록");
  await expect(scene.getByRole("button", { name: "건너뛰기" })).toBeFocused();
  await page.clock.runFor(10_400);
  await expect(scene).toBeHidden();
  await action.focus(); await expect(action).toBeFocused();
  expect(await page.evaluate(() => sessionStorage.getItem("wave-arrival-session-v1"))).toBe("done");
  await page.clock.resume();
  await page.reload();
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  await expect(page.locator(".landing-hero-split")).toBeVisible();
  await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 100));
  await page.clock.runFor(10_400);
  await expect(scene).toBeHidden();
});

test("the skip action exposes the real planning link", async ({ page }) => {
  await freshAnimatedArrival(page);
  await page.locator(".arrival-scene").getByRole("button", { name: "건너뛰기" }).click();
  await page.locator(".landing-hero-split").getByRole("link", { name: "여행지 둘러보기", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/planner");
  expect(await page.evaluate(() => sessionStorage.getItem("wave-arrival-session-v1"))).toBe("done");
});

test("keyboard users can dismiss the arrival with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await freshAnimatedArrival(page);
  await page.keyboard.press("Escape");
  await expect(page.locator(".arrival-scene")).toBeHidden();
  const action = page.locator(".landing-hero-split").getByRole("link", { name: "여행지 둘러보기", exact: true });
  await action.focus(); await expect(action).toBeFocused();
});

for (const width of [1440, 390]) test(`${width}px reduced motion keeps the split hero and all eighteen region choices usable`, async ({ page }, info) => {
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
  const hero = page.locator(".landing-hero-split"), copy = hero.locator(".landing-hero-copy"), photograph = hero.locator(".landing-hero-landscape");
  await expect(copy).toBeVisible();
  await expect(photograph.locator("img")).toBeVisible();
  await expect.poll(() => photograph.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  const copyBox = (await copy.boundingBox())!, photoBox = (await photograph.boundingBox())!;
  if (width === 1440) expect(copyBox.x + copyBox.width).toBeLessThan(photoBox.x);
  else expect(copyBox.y + copyBox.height).toBeLessThan(photoBox.y);
  await expect(photograph.getByRole("link", { name: /사진 원본/ })).toHaveAttribute("href", horizonPhotos.coast.sourceUrl);
  await expect(photograph).toContainText(horizonPhotos.coast.photographer);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath(`simple-hero-${width}.png`) });

  const grid = page.locator(".simple-region-grid"), cards = grid.locator("article");
  await expect(cards).toHaveCount(6);
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
    const image = link.locator("img"), credit = card.getByRole("link", { name: `${photo.title} 사진 원본, 새 탭`, exact: true });
    const destination = new URL((await link.getAttribute("href"))!, page.url());
    expect(destination.origin).toBe(new URL(page.url()).origin);
    expect(destination.pathname).toBe("/planner");
    expect([...destination.searchParams]).toEqual([["region", name]]);
    await expect(image).toHaveAttribute("src", photo.image);
    await expect(credit).toHaveAttribute("href", photo.image);
    await expect(credit).toContainText(photo.photographer || "한국관광공사");
    await expect(credit).toHaveAttribute("rel", /noopener/);
    await expect(credit).toHaveAttribute("rel", /noreferrer/);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const bounds = await card.evaluate(node => {
      const card = node.getBoundingClientRect(), image = node.querySelector("img")!.getBoundingClientRect();
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
  await expect(cards).toHaveCount(6);
  await expect(cards.locator("h3")).toHaveText(firstRegions);
  await expect(page.getByRole("button", { name: "18개 지역 모두 보기", exact: true })).toBeFocused();
  expect(errors).toEqual([]);
  await cards.first().getByRole("link", { name: "통영 여행지 보기", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/planner" && url.searchParams.get("region") === "통영");
});
