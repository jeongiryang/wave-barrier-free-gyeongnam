import { test, expect } from "@playwright/test";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";
import { prepareStory, storyReady, chapterIds, firstRegions } from "./landing-contract";

test.beforeEach(async ({ page }) => { await prepareStory(page); });

test("the restored-section registry matches actual reading order without replacing history or saved trip state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await storyReady(page);
  const sections = page.locator("main section[id]");
  expect(await sections.evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
  // Chapter labels are navigation shorthand. Check the actual reading headings
  // and their section associations independently of that shorthand.
  const headings = [
    /경남 여행지를 찾고\s*일정을 짜보세요/,
    /멀게 느껴졌던 여행을,?\s*조금 더 가까이/, "지역으로 둘러보기", "나루에게 말해보세요",
    /마음은 가볍게\s*준비는 한 번 더/, /당신이 남긴 장면이\s*다음 여행의 시작/, /다음 풍경에서\s*만나요/,
  ];
  await expect(sections.locator("h1,h2")).toHaveText(headings);
  for (const [index, id] of chapterIds.entries()) {
    const section = page.locator(`#${id}`);
    const heading = section.getByRole("heading", { level: index === 0 ? 1 : 2 });
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
  const narrative = page.locator(".horizon-chapter-copy"), conversation = page.locator(".simple-naru-example");
  await expect(narrative).toHaveCount(3);
  await narrative.last().scrollIntoViewIfNeeded();
  await expect(narrative.last()).toContainText("날짜와 방문 순서를 정해");
  await expect(narrative.nth(1)).toContainText("확인되지 않은 정보도 따로 알려드려요");
  await conversation.scrollIntoViewIfNeeded();
  await expect(conversation).toHaveAttribute("aria-label", "대화 예시");
  await expect(conversation).toContainText("대화 예시");
  await expect(conversation).toContainText("90분");
  await expect(conversation).toContainText("되돌리기");
  await expect(conversation.locator("input,textarea,button,form,[contenteditable=true]")).toHaveCount(0);
  await expect(page.locator(".landing-naru-usecases button")).toHaveCount(6);
  await expect(page.locator("#story .horizon-text-link")).toHaveAttribute("href", "/planner");
  await expect(page.locator("#naru .simple-text-link[href*=assistant]")).toHaveAttribute("href", "/planner?assistant=naru");
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
