import { test, expect } from "@playwright/test";
import { regionShowcaseAlbums, regionShowcasePhotos } from "../features/landing/region-showcase-photos";
import { prepareStory, storyReady, firstRegions } from "./landing-contract";

for (const saveData of [false, true]) test(`saveData=${saveData}: collapsed choices load covers and visible map thumbnails, never speculative albums`, async ({ page }) => {
  await prepareStory(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(value => Object.defineProperty(navigator, "connection", { configurable: true, value: Object.assign(new EventTarget(), { saveData: value }) }), saveData);
  const requested = new Set<string>();
  const photoApiRequests: string[] = [];
  const photoMethods: string[] = [];
  page.on("request", request => { const url = new URL(request.url()); if (url.pathname === "/api/wave" && url.searchParams.get("action") === "photo") { photoApiRequests.push(request.url()); photoMethods.push(request.method()); } });
  page.on("request", request => { if (request.resourceType() === "image") requested.add(request.url()); });
  const allPhotos = new Set(Object.values(regionShowcaseAlbums).flat().map(photo => photo.image));
  const firstCovers = new Set(firstRegions.map(name => regionShowcaseAlbums[name][0].image));
  await page.goto("/"); await storyReady(page);
  const cards = page.locator(".simple-region");
  await expect(cards).toHaveCount(firstRegions.length);
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(card.locator("img")).toHaveAttribute("loading", "lazy");
  }
  const loadedPhotos = [...requested].filter(url => allPhotos.has(url));
  const mapCovers = new Set(["거창", "창녕", "산청", "하동", "김해", "통영"].map(name => regionShowcasePhotos[name].image));
  const storyCovers = new Set(['통영', '거제', '하동'].map(name => regionShowcasePhotos[name].image));
  for (const cover of firstCovers) expect(loadedPhotos).toContain(cover);
  // The adjacent approved SVG map enters the lazy-loading margin on desktop.
  // Map thumbnails and the adjacent itinerary cards are rendered covers,
  // not speculative album slides.
  for (const url of loadedPhotos.filter(url => !firstCovers.has(url))) {
    expect(mapCovers.has(url) || storyCovers.has(url), url).toBe(true);
    // React may start an image request before the lazy SVG commit completes.
    await expect.poll(() => page.locator(".night-journey-map svg image,.night-itinerary-cards img").evaluateAll(images => images.map(image => image.getAttribute("href") || image.getAttribute("src"))), { message: url }).toContain(url);
  }
  // The approved map requests one representative photo for each rendered
  // region. This is distinct from speculatively downloading album slides.
  const assertMapPhotoReads = async () => {
    const names = await page.locator('.night-journey-map [data-region-photo]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-region-photo')));
    const regions = photoApiRequests.map(value => new URL(value).searchParams.get('region'));
    expect(regions.every(region => names.includes(region))).toBe(true);
    expect(new Set(regions).size).toBe(regions.length);
    expect(photoMethods.every(method => method === 'GET')).toBe(true);
    for (const value of photoApiRequests) expect([...new URL(value).searchParams.keys()].sort()).toEqual(['action', 'region']);
  };
  await assertMapPhotoReads();
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
  await assertMapPhotoReads();
});
