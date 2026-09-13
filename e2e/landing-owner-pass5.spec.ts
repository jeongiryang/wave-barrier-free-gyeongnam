import { test, expect } from "@playwright/test";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";
import { prepareStory, storyReady, chapterIds, chapterNames, firstRegions } from "./landing-contract";

test.beforeEach(async ({ page }) => { await prepareStory(page); });

test("the four-section registry matches actual reading order without replacing history or saved trip state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await storyReady(page);
  await expect(page.locator("main section[id]").locator("h1,h2")).toHaveText(chapterNames.ko);
  expect(await page.locator("main section[id]").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
  await page.evaluate(() => history.replaceState({ ...history.state, storyTestMarker: "preserve" }, "", location.href));
  await expect.poll(() => page.evaluate(() => [localStorage.getItem("wave-locale"), localStorage.getItem("wave-theme")])).toEqual(["ko", "light"]);
  const state = await page.evaluate(() => ({ ...localStorage }));
  for (const id of [...chapterIds].reverse()) await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "18개 지역 모두 보기", exact: true }).click();
  await page.getByRole("button", { name: "접기", exact: true }).click();
  expect(await page.evaluate(() => history.state.storyTestMarker)).toBe("preserve");
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(state);
});

test("the itinerary and Naru examples stay explicitly labelled, noninteractive and free of provider requests or writes", async ({ page }) => {
  const writes: string[] = [], requests: string[] = [];
  page.on("request", request => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) writes.push(request.url());
    if (/\/api\/(wave|assistant|community)(?:[/?]|$)/.test(request.url())) requests.push(request.url());
  });
  await page.goto("/"); await storyReady(page);
  await expect.poll(() => page.evaluate(() => [localStorage.getItem("wave-locale"), localStorage.getItem("wave-theme")])).toEqual(["ko", "light"]);
  const state = await page.evaluate(() => ({ ...localStorage }));
  const itinerary = page.locator(".simple-product-preview"), conversation = page.locator(".simple-naru-example");
  await itinerary.scrollIntoViewIfNeeded();
  await expect(itinerary).toHaveAttribute("aria-label", "일정 화면 예시");
  await expect(itinerary).toContainText("화면 예시");
  await expect(itinerary.locator(".preview-stop time")).toHaveText(["10:00", "11:30"]);
  await conversation.scrollIntoViewIfNeeded();
  await expect(conversation).toHaveAttribute("aria-label", "대화 예시");
  await expect(conversation).toContainText("대화 예시");
  await expect(conversation).toContainText("90분");
  await expect(conversation).toContainText("되돌리기");
  await expect(page.locator(".simple-product-preview,.simple-naru-example").locator("input,textarea,button,form,[contenteditable=true]")).toHaveCount(0);
  await expect(page.locator("#story .simple-text-link")).toHaveAttribute("href", "/planner");
  await expect(page.locator("#naru .simple-text-link")).toHaveAttribute("href", "/planner?assistant=naru");
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(state);
  expect(writes).toEqual([]);
  expect(requests).toEqual([]);
});

test("all eighteen regional cover photographs retain the exact original, author and safe named source link", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await storyReady(page);
  await expect(page.locator(".simple-region h3")).toHaveText(firstRegions);
  await page.getByRole("button", { name: "18개 지역 모두 보기", exact: true }).click();
  for (const card of await page.locator(".simple-region").all()) {
    const name = await card.locator("h3").innerText(), photo = regionShowcaseAlbums[name][0];
    await expect(card.locator("img")).toHaveAttribute("src", photo.image);
    await expect(card.locator(".simple-region-link")).toHaveAttribute("href", "/planner?region=" + encodeURIComponent(name));
    await expect(card.locator(".simple-region-link > div > span")).toHaveAttribute("lang", "ko");
    const credit = card.locator(".simple-region-credit");
    await expect(credit).toHaveAttribute("href", photo.image);
    await expect(credit).toHaveAttribute("target", "_blank");
    await expect(credit).toHaveAttribute("rel", /noopener/);
    await expect(credit).toHaveAttribute("rel", /noreferrer/);
    await expect(credit).toHaveAccessibleName(`${photo.title} 사진 원본, 새 탭`);
    await expect(credit).toContainText(photo.photographer || "한국관광공사");
    await expect(credit).toHaveCSS("text-decoration-line", "underline");
  }
  await page.goto("/policies#content-credits");
  await expect(page.getByRole("heading", { name: "콘텐츠 출처 및 이용안내" })).toBeVisible();
  await expect(page.locator("#regional-photo-credits li")).toHaveCount(Object.values(regionShowcaseAlbums).flat().length);
});
