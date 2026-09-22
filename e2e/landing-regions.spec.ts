import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import { openLandingTools, prepareStory, storyReady, chapterIds, firstRegions, allRegions, expectUsableTarget, expectNoOverflow } from "./landing-contract";
import { regionNames } from "../lib/gyeongnam-region-names";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";
import AxeBuilder from "@axe-core/playwright";

test("regional entry: all 18 landing links and the planner selector use the same canonical regions", async ({ page }) => {
  await mockPlannerApi(page);
  await prepareStory(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await storyReady(page);
  const section = page.locator("#regions");
  const expand = section.getByRole("button", { name: "18개 지역 모두 보기", exact: true });
  await expect(expand).toBeEnabled();
  await expand.focus(); await expand.press("Space");
  const links = section.locator(".simple-region-link");
  await expect(links).toHaveCount(18);
  const destinations: string[] = [];
  for (const link of await links.all()) {
    const url = new URL((await link.getAttribute("href"))!, page.url());
    expect(url.origin).toBe(new URL(page.url()).origin);
    expect(url.pathname).toBe("/planner");
    const name = url.searchParams.get("region")!;
    expect([...url.searchParams]).toEqual([["region", name]]);
    destinations.push(name);
    await expect(link).toHaveAccessibleName(`${name} 여행지 보기`);
  }
  expect(destinations.sort()).toEqual([...allRegions].sort());
  await expect(section.locator("[data-region-boundary]")).toHaveCount(0);
  const destination = section.getByRole("link", { name: "거창 여행지 보기", exact: true });
  await expectUsableTarget(destination);
  const opened = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/wave" && url.searchParams.get("action") === "plan" && url.searchParams.get("region") === "거창";
  });
  await destination.press("Enter");
  await (await opened).finished();
  await expect(page).toHaveURL(url => url.pathname === "/planner" && url.searchParams.get("region") === "거창");
  const select = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(select).toHaveValue("거창");
  const options = await select.locator("option").evaluateAll(nodes => nodes.map(node => (node as HTMLOptionElement).value).filter(value => value && value !== "경남 전체"));
  expect(options.sort()).toEqual(destinations);
  await expect(page.locator(".simple-results h2")).toHaveText("거창 여행지");
  const changed = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/wave" && url.searchParams.get("action") === "plan" && url.searchParams.get("region") === "통영";
  });
  await select.focus(); await select.selectOption("통영");
  await (await changed).finished();
  await expect(select).toHaveValue("통영");
  await expect(select).toBeFocused();
  await expect(page).toHaveURL(url => url.pathname === "/planner" && url.searchParams.get("region") === "통영");
  await expect(page.locator(".simple-results h2")).toHaveText("통영 여행지");
  await expectNoOverflow(page);
});


test("landing: labelled itinerary and conversation examples preserve restored-section order without provider requests", async ({ page }) => {
  const writes: string[] = [], requests: string[] = [];
  page.on("request", request => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) writes.push(request.url());
    if (/\/api\/(wave|assistant|community)(?:[/?]|$)/.test(request.url())) requests.push(request.url());
  });
  await prepareStory(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await storyReady(page);
  expect(await page.locator("main section[id]").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
  await page.locator("#story").scrollIntoViewIfNeeded();
  await expect(page.locator(".night-journey-tabs button")).toHaveCount(3);
  await page.locator(".night-journey-tabs button").last().click();
  await expect(page.locator(".night-journey-preview")).toContainText("순서 바꾸기");
  await openLandingTools(page);
  await page.locator("#naru").scrollIntoViewIfNeeded();
  await expect(page.locator(".simple-naru-example")).toContainText("대화 예시");
  await expect(page.locator(".simple-naru-example").locator("input,button,form,textarea,[contenteditable=true]")).toHaveCount(0);
  expect(writes).toEqual([]); expect(requests).toEqual([]);
});

test("landing: reduced motion keeps every section readable through forward scrolling, return and reload", async ({ page }) => {
  await prepareStory(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/"); await storyReady(page);
  await openLandingTools(page);
  const planning = page.locator(".landing-actions a");
  await planning.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  for (const id of [...chapterIds, ...chapterIds.toReversed()]) {
    const section = page.locator(`#${id}`);
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator("h1,h2").first()).toBeVisible();
    await expect(section).toHaveAccessibleName(/\S/);
  }
  await expect(planning).toBeFocused();
  expect(await page.locator(".simple-region-grid").evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0);
  await page.reload(); await storyReady(page);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  await expect(page.locator(".arrival-scene")).toBeHidden();
  await expect(page.locator(".simple-region")).toHaveCount(firstRegions.length);
  await expectUsableTarget(planning);
});

for (const locale of ["ko", "en"] as const) for (const width of [320, 390, 601, 960, 1440]) {
  test(`landing: ${locale} regional links and original credits stay usable through keyboard expansion at ${width}px`, async ({ page }) => {
    const en = locale === "en";
    await prepareStory(page);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install();
    await page.goto("/"); await storyReady(page);
    const region = page.locator("#regions"), cards = region.locator(".simple-region");
    await expect(cards.locator("h3")).toHaveText(firstRegions.map(name => en ? regionNames[name] : name));
    await region.focus(); await page.keyboard.press("Tab");
    const first = cards.first().locator(".simple-region-link");
    await expect(first).toBeFocused();
    await expect(first).toHaveAccessibleName(en ? "Tongyeong places" : "통영 여행지 보기");
    const expand = region.getByRole("button", { name: en ? "View all 18 regions" : "18개 지역 모두 보기", exact: true });
    await expectUsableTarget(expand);
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expand.press("Space");
    await expect(cards).toHaveCount(18);
    const collapse = region.getByRole("button", { name: en ? "Show fewer regions" : "접기", exact: true });
    await expect(collapse).toBeFocused();
    await expect(collapse).toHaveAttribute("aria-expanded", "true");
    const destinations: string[] = [];
    for (const card of await cards.all()) {
      const link = card.locator(".simple-region-link");
      const url = new URL((await link.getAttribute("href"))!, page.url());
      expect(url.origin).toBe(new URL(page.url()).origin);
      expect(url.pathname).toBe("/planner");
      const name = url.searchParams.get("region")!;
      destinations.push(name);
      const photo = regionShowcaseAlbums[name][0];
      await expect(link).toHaveAccessibleName(`${en ? regionNames[name] : name} ${en ? "places" : "여행지 보기"}`);
      await expect(card.locator("img")).toHaveAttribute("src", photo.image);
      await expect(card.locator(".simple-region-link > div > span")).toHaveAttribute("lang", "ko");
      await expect(card.locator(".simple-region-credit,.simple-region-arrow")).toHaveCount(0);
    }
    expect(destinations.sort()).toEqual([...allRegions].sort());
    await page.emulateMedia({ reducedMotion: "reduce" });
    const held = cards.last().locator(".simple-region-link");
    await expectUsableTarget(held);
    const href = await held.getAttribute("href");
    await page.clock.fastForward(16_000);
    await expect(held).toBeFocused();
    await expect(held).toHaveAttribute("href", href!);
    await collapse.press("Space");
    await expect(cards).toHaveCount(firstRegions.length);
    await expect(region.getByRole("button", { name: en ? "View all 18 regions" : "18개 지역 모두 보기", exact: true })).toBeFocused();
    expect((await new AxeBuilder({ page }).include("#regions").analyze()).violations).toEqual([]);
    await expectNoOverflow(page);
  });
}
