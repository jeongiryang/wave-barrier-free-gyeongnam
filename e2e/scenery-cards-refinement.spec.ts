import { openSupportMenu } from "./support-menu";
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
  await expect(page.getByText('아직 등록된 후기나 질문이 없습니다.', { exact: true })).toBeVisible();
  await expect(page.locator('.night-story-card')).toHaveCount(0);
  // Retained guide articles still preserve their original attribution.
  await page.locator("details.community-guides > summary").click();
  const links = await page.locator(".community-travel-stories h3 a").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")!));
  expect(links).toHaveLength(3);
  for(const href of links) {
    await page.goto(href);
    await expect(page.locator(".community-travel-article h1")).toBeVisible();
    await expect(page.locator(".community-article-body > p")).toHaveCount(3);
    await expect(page.locator(".community-travel-article .editorial-photo a").first()).toHaveAttribute("href", /^https:\/\/commons.wikimedia.org/);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  }
  await page.goto("/community?placeId=1001&placeName=미술관&region=창원");
  await expect(page.locator("details.community-guides")).not.toHaveAttribute("open", "");
  await expect(page.locator(".community-travel-stories")).toBeHidden();
  await expect(page.locator(".community-place-filter")).toContainText("미술관");
  expect(writes).toEqual([]);
});

test("compact headers keep every navigation link and recover keyboard focus", async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  for(const path of ["/","/planner","/travel-book","/community"]) {
    await page.goto(path);
    const menu=page.locator(".wave-header");
    await expect(menu.getByRole("navigation").getByRole("link")).toHaveText(["여행 설계", "축제", "커뮤니티"]);
    for(const href of ["/","/planner","/festivals","/community"]) { const link=href === "/" ? menu.getByRole("link", { name: "WAVE 홈", exact: true }) : menu.getByRole("navigation").locator(`a[href='${href}']`); await expect(link).toBeVisible(); await link.focus(); await expect(link).toBeFocused(); }
    await openSupportMenu(page); const archive = menu.locator(".mobile-menu-link[href='/travel-book']"); await expect(archive).toBeVisible(); await archive.focus(); await expect(archive).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
});

test("saved-trip heading and actions fit narrow, split and desktop viewports", async ({page})=>{
  await page.goto("/travel-book");
  await expect(page.getByRole('heading', { name: '내 여행', exact: true })).toBeVisible();
  await expect(page.locator(".travel-book-landscapes img")).toHaveCount(0);
  for(const width of [320,390,960,1440]) {
    await page.setViewportSize({width,height:900});
    for(const element of await page.locator(".travel-book-task-heading a,.travel-book-task-heading button").all()) {
      const box=await element.boundingBox();expect(box!.width).toBeGreaterThan(44);expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});
