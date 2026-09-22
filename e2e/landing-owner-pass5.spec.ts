import { test, expect } from "@playwright/test";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";
import { openLandingTools, prepareStory, storyReady, chapterIds, firstRegions } from "./landing-contract";

test.beforeEach(async ({ page }) => { await prepareStory(page); });

test("the restored-section registry matches actual reading order without replacing history or saved trip state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await storyReady(page);
  const sections = page.locator("main section[id]");
  expect(await sections.evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
  // Chapter labels are navigation shorthand. Check the actual reading headings
  // and their section associations independently of that shorthand.
  const headings = [/더 넓은 세상을/, "경남, 모두의 여행지", /당신만의\s*여행을 설계하세요/, /여행이\s*사람을 연결합니다/, /여행을 더 편하게/, "나루에게 말해보세요", "WAVE로 할 수 있는 일", /다음 풍경에서\s*만나요/];
  await openLandingTools(page);
  for (const [index, id] of chapterIds.entries()) {
    const section = page.locator(`#${id}`);
    const heading = section.locator("h1,h2").first();
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText(headings[index]);
    await expect(section).toHaveAttribute("aria-labelledby", await heading.getAttribute("id") as string);
  }
  await page.evaluate(() => history.replaceState({ ...history.state, storyTestMarker: "preserve" }, "", location.href));
  await expect.poll(() => page.evaluate(() => [localStorage.getItem("wave-locale"), localStorage.getItem("wave-theme")])).toEqual(["ko", "light"]);
  const state = await page.evaluate(() => ({ ...localStorage }));
  for (const id of [...chapterIds].reverse()) await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "18개 지역 모두 보기", exact: true }).click();
  await page.getByRole("button", { name: "접기", exact: true }).click();
  expect(await page.evaluate(() => history.state.storyTestMarker)).toBe("preserve");
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(state);
});

test("the travel narrative and labelled Naru example remain free of provider requests or trip writes", async ({ page }) => {
  const writes: string[] = [], requests: string[] = [];
  page.on("request", request => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) writes.push(request.url());
    if (/\/api\/(wave|assistant|community)(?:[/?]|$)/.test(request.url())) requests.push(request.url());
  });
  await page.goto("/"); await storyReady(page);
  await expect.poll(() => page.evaluate(() => [localStorage.getItem("wave-locale"), localStorage.getItem("wave-theme")])).toEqual(["ko", "light"]);
  const state = await page.evaluate(() => ({ ...localStorage }));
  const narrative = page.locator(".night-journey-tabs button"), conversation = page.locator(".simple-naru-example");
  await expect(narrative).toHaveCount(3);
  await narrative.last().click();
  await expect(page.locator(".night-journey-preview")).toContainText("순서 바꾸기");
  await narrative.nth(1).click();
  await expect(page.locator(".night-journey-input")).toContainText("아직 확인이 필요한 항목");
  await openLandingTools(page);
  await conversation.scrollIntoViewIfNeeded();
  await expect(conversation).toHaveAttribute("aria-label", "대화 예시");
  await expect(conversation).toContainText("대화 예시");
  await expect(conversation).toContainText("90분");
  await expect(conversation).toContainText("되돌리기");
  await expect(conversation.locator("input,textarea,button,form,[contenteditable=true]")).toHaveCount(0);
  await expect(page.locator(".landing-naru-usecases button")).toHaveCount(6);
  await expect(page.locator(".night-journey-input > .night-primary")).toHaveAttribute("href", /^\/planner\?region=/);
  await expect(page.locator("#naru .simple-text-link[href*=assistant]")).toHaveAttribute("href", "/planner?assistant=naru");
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(state);
  expect(writes).toEqual([]);
  expect(requests).toEqual([]);
});

test("all eighteen regional cards retain the exact original photo and destination", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await storyReady(page);
  await expect(page.locator(".simple-region h3")).toHaveText(firstRegions);
  await page.getByRole("button", { name: "18개 지역 모두 보기", exact: true }).click();
  for (const card of await page.locator(".simple-region").all()) {
    const name = await card.locator("h3").innerText(), photo = regionShowcaseAlbums[name][0];
    await expect(card.locator("img")).toHaveAttribute("src", photo.image);
    await expect(card.locator(".simple-region-link")).toHaveAttribute("href", "/planner?region=" + encodeURIComponent(name));
    await expect(card.locator(".simple-region-link > div > span")).toHaveAttribute("lang", "ko");
    await expect(card.locator(".simple-region-culture,.declining-region-notice,.simple-region-arrow")).toHaveCount(0);
  }
  await page.goto("/policies#content-credits");
  await expect(page.getByRole("heading", { name: "콘텐츠 출처 및 이용안내" })).toBeVisible();
  await expect(page.locator("#regional-photo-credits li")).toHaveCount(Object.values(regionShowcaseAlbums).flat().length);
});
