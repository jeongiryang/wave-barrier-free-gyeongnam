import { test, expect } from "@playwright/test";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";
import { prepareStory, storyReady, firstRegions } from "./landing-contract";

for (const saveData of [false, true]) test(`saveData=${saveData}: collapsed choices download only their six covers and never speculative albums`, async ({ page }) => {
  await prepareStory(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(value => Object.defineProperty(navigator, "connection", { configurable: true, value: Object.assign(new EventTarget(), { saveData: value }) }), saveData);
  const requested = new Set<string>();
  page.on("request", request => { if (request.resourceType() === "image") requested.add(request.url()); });
  const allPhotos = new Set(Object.values(regionShowcaseAlbums).flat().map(photo => photo.image));
  const firstCovers = new Set(firstRegions.map(name => regionShowcaseAlbums[name][0].image));
  await page.goto("/"); await storyReady(page);
  const cards = page.locator(".simple-region");
  await expect(cards).toHaveCount(6);
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(card.locator("img")).toHaveAttribute("loading", "lazy");
  }
  expect([...requested].filter(url => allPhotos.has(url)).sort()).toEqual([...firstCovers].sort());
  const expand = page.getByRole("button", { name: "18개 지역 모두 보기", exact: true });
  // The region control is disabled until its own hydration completes.
  await expect(expand).toBeEnabled();
  await expand.focus();
  await expect(expand).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(cards).toHaveCount(18);
  await expect(page.getByRole("button", { name: "접기", exact: true })).toBeFocused();
  const last = cards.last();
  await last.scrollIntoViewIfNeeded();
  await expect.poll(() => last.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  const allCovers = new Set(Object.values(regionShowcaseAlbums).map(photos => photos[0].image));
  expect([...requested].filter(url => allPhotos.has(url)).every(url => allCovers.has(url))).toBe(true);
  expect(requested.has((await last.locator("img").getAttribute("src"))!)).toBe(true);
  await page.getByRole("button", { name: "접기", exact: true }).press("Enter");
  await expect(cards.locator("h3")).toHaveText(firstRegions);
});
