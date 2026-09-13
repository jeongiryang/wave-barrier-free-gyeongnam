import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import { prepareStory, storyReady, chapterIds, firstRegions, allRegions, expectUsableTarget, expectNoOverflow } from "./landing-contract";
import { regionNames } from "../lib/gyeongnam-region-names";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";
import AxeBuilder from "@axe-core/playwright";

test("실제 경계와 18개 텍스트 선택 대안은 같은 지역을 가리킨다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  const section = page.locator(".region-picker");
  await section.scrollIntoViewIfNeeded();
  await section.locator(".region-map-disclosure summary").click();
  const surface = section.locator("svg");
  await expect(surface).toHaveAttribute("viewBox", "0 0 800 814");
  const shapes = surface.locator("[data-region-boundary]");
  const markers = section.locator(".region-picker-list button:not(:first-child)");
  await expect(shapes).toHaveCount(18);
  await expect(markers).toHaveCount(18);
  const expectedNames = ["거창", "합천", "창녕", "밀양", "양산", "함양", "산청", "의령", "함안", "김해", "창원", "하동", "진주", "사천", "고성", "남해", "통영", "거제"];
  expect((await markers.allTextContents()).map(value => value.trim()).sort()).toEqual([...expectedNames].sort());
  expect((await shapes.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-region-boundary")))).sort()).toEqual([...expectedNames].sort());
  await expect(surface.locator('[data-selected="true"]')).toHaveCount(0);
  await expect(section.locator('[data-region-marker] svg, [data-region-marker] img')).toHaveCount(0);
  await expect(page.locator('img[src*="wikimedia.org"]')).toHaveCount(0);
  const positions = await shapes.evaluateAll((nodes) => {
    const measured: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const node of nodes) {
      const box = (node as SVGGraphicsElement).getBBox();
      measured[node.getAttribute("data-region-boundary") || ""] = { x: box.x+box.width/2, y: box.y+box.height/2, width: box.width, height: box.height };
    }
    return measured;
  });
  for (const position of Object.values(positions)) {
    expect(position.width).toBeGreaterThan(0); expect(position.height).toBeGreaterThan(0);
    expect(position.x).toBeGreaterThan(0); expect(position.x).toBeLessThan(800);
    expect(position.y).toBeGreaterThan(0); expect(position.y).toBeLessThan(814);
  }
  expect(positions["거창"].x).toBeLessThan(positions["합천"].x);
  expect(positions["합천"].x).toBeLessThan(positions["창녕"].x);
  expect(positions["창녕"].x).toBeLessThan(positions["양산"].x);
  expect(positions["거창"].y).toBeLessThan(positions["남해"].y);
  const geochang = markers.filter({ hasText: "거창" });
  await geochang.focus(); await geochang.press("Enter");
  await expect(geochang).toBeFocused();
  await expect(geochang).toHaveAttribute("aria-pressed", "true");
  await expect(surface.locator('[data-region-boundary="거창"]')).toHaveAttribute("data-selected", "true");
  await expect(section.locator("svg text")).toHaveText("거창");
});


test("landing: labelled itinerary and conversation examples preserve four-section order without provider requests", async ({ page }) => {
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
  await expect(page.locator(".simple-product-preview")).toContainText("화면 예시");
  await page.locator("#naru").scrollIntoViewIfNeeded();
  await expect(page.locator(".simple-naru-example")).toContainText("대화 예시");
  await expect(page.locator(".simple-product-preview,.simple-naru-example").locator("input,button,form,textarea,[contenteditable=true]")).toHaveCount(0);
  expect(writes).toEqual([]); expect(requests).toEqual([]);
});

test("landing: reduced motion keeps every section readable through forward scrolling, return and reload", async ({ page }) => {
  await prepareStory(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/"); await storyReady(page);
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
  await expect(page.locator(".simple-region")).toHaveCount(6);
  await expectUsableTarget(planning);
});

for (const locale of ["ko", "en"] as const) for (const width of [320, 390, 1440]) {
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
      const credit = card.locator(".simple-region-credit");
      await expect(credit).toHaveAttribute("href", photo.image);
      await expect(credit).toHaveAccessibleName(`${photo.title} 사진 원본, 새 탭`);
      expect(await credit.evaluate(node => node.closest("[lang]")?.getAttribute("lang"))).toBe("ko");
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
    await expect(cards).toHaveCount(6);
    await expect(region.getByRole("button", { name: en ? "View all 18 regions" : "18개 지역 모두 보기", exact: true })).toBeFocused();
    expect((await new AxeBuilder({ page }).include("#regions").analyze()).violations).toEqual([]);
    await expectNoOverflow(page);
  });
}
