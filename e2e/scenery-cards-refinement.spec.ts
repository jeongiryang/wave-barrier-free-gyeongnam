import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockPlannerApi } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await mockPlannerApi(page);
  await page.route("**/api/community/posts**", route => route.fulfill({json:{posts:[],page:1,hasMore:false}}));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

test("WAVE starter stories open their full articles and leave member search intact", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", request => {if(!["GET","HEAD","OPTIONS"].includes(request.method())) writes.push(request.url());});
  await page.goto("/community");
  await expect(page.locator(".community-editorial-grid > article")).toHaveCount(3);
  await expect(page.locator(".community-story-author")).toHaveText(["WAVE","WAVE","WAVE"]);
  const links = await page.locator(".community-story-read").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")!));
  for(const href of links) {
    await page.goto(href);
    await expect(page.locator(".community-travel-article h1")).toBeVisible();
    await expect(page.locator(".community-article-body > p")).toHaveCount(3);
    await expect(page.locator(".community-travel-article .editorial-photo a").first()).toHaveAttribute("href", /^https:\/\/commons.wikimedia.org/);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  }
  await page.goto("/community?placeId=1001&placeName=미술관&region=창원");
  await expect(page.locator(".community-travel-stories")).toHaveCount(0);
  await expect(page.locator(".community-place-filter")).toContainText("미술관");
  expect(writes).toEqual([]);
});

test("compact headers keep every navigation link and recover keyboard focus", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  for(const path of ["/","/planner","/travel-book","/community"]) {
    await page.goto(path);
    const menu=page.locator(".wave-header");
    await expect(menu.getByRole("navigation").getByRole("link")).toHaveCount(3);
    for(const href of ["/planner","/travel-book","/community"]) { const link=menu.locator(`a[href='${href}']`); await expect(link).toBeVisible(); await link.focus(); await expect(link).toBeFocused(); }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("saved-trip imagery and actions fit narrow, split and desktop viewports", async ({page})=>{
  await page.goto("/travel-book");
  await expect(page.locator(".travel-book-landscapes img")).toHaveCount(2);
  for(const width of [320,390,960,1440]) {
    await page.setViewportSize({width,height:900});
    for(const element of await page.locator(".travel-book-paths a").all()) {
      const box=await element.boundingBox();expect(box!.width).toBeGreaterThan(44);expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});
