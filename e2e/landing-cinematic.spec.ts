import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";
import { prepareStory, storyReady, firstRegions, expectUsableTarget, expectNoOverflow } from "./landing-contract";

test.beforeEach(async ({ page }) => { await prepareStory(page); });

test("browsing and expanding photographs cannot rotate destinations, query a trip or modify saved state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  const requests: string[] = [], writes: string[] = [];
  page.on("request", request => {
    if (/\/api\/(wave|assistant|community)(?:[/?]|$)/.test(request.url())) requests.push(request.url());
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) writes.push(request.url());
  });
  await page.goto("/"); await storyReady(page);
  // Initial preference persistence is unrelated to browsing a destination.
  await expect.poll(() => page.evaluate(() => [localStorage.getItem("wave-locale"), localStorage.getItem("wave-theme")])).toEqual(["ko", "light"]);
  const stored = await page.evaluate(() => ({ ...localStorage }));
  const cards = page.locator(".simple-region");
  await expect(cards.locator("h3")).toHaveText(firstRegions);
  const initial = await cards.locator(".simple-region-link").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
  await page.locator("#regions").scrollIntoViewIfNeeded();
  await page.clock.fastForward(60_000);
  expect(await cards.locator(".simple-region-link").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")))).toEqual(initial);
  const expand = page.getByRole("button", { name: "18개 지역 모두 보기", exact: true });
  await expect(expand).toBeEnabled();
  await expand.press("Enter");
  await expect(cards).toHaveCount(18);
  await expect(page.getByRole("button", { name: "접기", exact: true })).toBeFocused();
  const last = cards.last().locator(".simple-region-link");
  await last.focus();
  const selectedHref = await last.getAttribute("href");
  await page.clock.fastForward(60_000);
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("href", selectedHref!);
  expect(await page.evaluate(() => ({ ...localStorage }))).toStrictEqual(stored);
  expect(requests).toEqual([]);
  expect(writes).toEqual([]);
});

for (const locale of ["ko", "en"] as const) {
  test(`${locale}: failure of one photograph retains its destination and credit without hiding a neighbouring photo`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    const failedPhoto = regionShowcaseAlbums["통영"][0];
    await page.route(failedPhoto.image, route => route.abort());
    await page.goto("/"); await storyReady(page);
    const failed = page.locator(".simple-region").nth(0), next = page.locator(".simple-region").nth(1);
    await failed.scrollIntoViewIfNeeded();
    await expect.poll(() => failed.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 0)).toBe(true);
    await expect(failed.locator("img")).toHaveCSS("opacity", "0");
    await expect(failed.locator("h3")).toHaveText(locale === "en" ? "Tongyeong" : "통영");
    await expect(failed.locator(".simple-region-credit")).toHaveAttribute("href", failedPhoto.image);
    await expectUsableTarget(failed.locator(".simple-region-link"));
    await expectUsableTarget(failed.locator(".simple-region-credit"));
    await next.scrollIntoViewIfNeeded();
    await expect.poll(() => next.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(next.locator("img")).toHaveCSS("opacity", "1");
    await expect(next.locator(".simple-region-credit")).toHaveAttribute("href", regionShowcaseAlbums["거제"][0].image);
    expect((await new AxeBuilder({ page }).include("#regions").analyze()).violations).toEqual([]);
    await expectNoOverflow(page);
  });
}

test("all failed regional photographs leave eighteen separate keyboard destinations and credits at 320px", async ({ page }) => {
  await page.route("https://tong.visitkorea.or.kr/**", route => route.abort());
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await storyReady(page);
  const expand = page.getByRole("button", { name: "18개 지역 모두 보기", exact: true });
  await expect(expand).toBeEnabled();
  await expand.focus();
  await expect(expand).toBeFocused();
  await page.keyboard.press("Enter");
  const cards = page.locator(".simple-region");
  await expect(cards).toHaveCount(18);
  await expect(page.getByRole("button", { name: "접기", exact: true })).toBeFocused();
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator("h3")).toBeVisible();
    await expect.poll(() => card.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 0)).toBe(true);
    await expectUsableTarget(card.locator(".simple-region-link"));
    await expectUsableTarget(card.locator(".simple-region-credit"));
    const heading = (await card.locator("h3").boundingBox())!, credit = (await card.locator(".simple-region-credit").boundingBox())!;
    expect(heading.y + heading.height).toBeLessThanOrEqual(credit.y);
    await expectNoOverflow(page);
  }
  expect((await new AxeBuilder({ page }).include("#regions").analyze()).violations).toEqual([]);
  const lastLink = cards.last().locator(".simple-region-link"), href = (await lastLink.getAttribute("href"))!;
  await lastLink.press("Enter");
  await expect(page).toHaveURL(new URL(href, test.info().project.use.baseURL as string).href);
});
