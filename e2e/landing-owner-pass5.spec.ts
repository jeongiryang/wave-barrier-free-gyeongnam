import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { mockPublicShellApi } from "./fixtures";
import { landingSections } from "../features/landing/sections";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";

async function ready(page: Page) {
  // The streamed server shell is replaced by one hydrated landing. Wait for that
  // existing lifecycle contract before reading controls or persistent state.
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  await expect(page.locator(".landing-page")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("wave-locale"))).toBe("ko");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("wave-theme"))).toBe("light");
  await page.evaluate(() => document.fonts.ready);
}

test.beforeEach(async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  const bitmap = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({ contentType:"image/webp", body:bitmap }));
});

test("Hero copy moves line by line, holds CTA geometry, without pause UI and respects OS reduction", async ({ page }) => {
  await page.clock.install(); await page.goto("/"); await ready(page);
  const sequence = page.locator(".hero-copy-sequence");
  await expect(sequence).toHaveAttribute("data-running","true");
  await expect(sequence).toHaveAttribute("data-phrase","0");
  const name = "가고 싶은 곳으로. 우리의 속도로.";
  await expect(page.getByRole("heading",{level:1})).toHaveAccessibleName(name);
  const cta=page.locator(".landing-actions a[href='/planner']"); const before=await cta.boundingBox();
  await page.clock.fastForward(6500); await expect(sequence).toHaveAttribute("data-phrase","1");
  await expect(page.locator(".hero-phrase[data-active=true]")).toContainText("필요한 시설을 살펴보고,");
  await page.clock.fastForward(900);
  expect(await cta.boundingBox()).toEqual(before);
  await expect(cta).toHaveAttribute("href","/planner"); await expect(cta).toHaveAccessibleName("여행 계획하기");
  await expect(page.getByRole("button",{name:/문구.*멈추/})).toHaveCount(0);
  await cta.focus(); await page.mouse.move(0,0); await page.clock.fastForward(6500);
  await expect(sequence).toHaveAttribute("data-phrase","2"); await expect(cta).toBeFocused();
  await expect(page.getByRole("heading",{level:1})).toHaveAccessibleName(name);
  await page.clock.fastForward(6500); await expect(sequence).toHaveAttribute("data-phrase","0");
  await expect(sequence).toHaveAttribute("data-running","false");
  await page.clock.fastForward(60000); await expect(sequence).toHaveAttribute("data-phrase","0");
  await page.locator("#community").evaluate(node=>node.scrollIntoView({behavior:"instant"}));
  await page.locator("#top").evaluate(node=>node.scrollIntoView({behavior:"instant"}));
  await page.clock.fastForward(20000); await expect(sequence).toHaveAttribute("data-running","false");
  await page.emulateMedia({reducedMotion:"reduce"}); await expect(sequence).toHaveAttribute("data-phrase","0"); await expect(sequence).toHaveAttribute("data-running","false");
  await expect(cta).toBeFocused(); expect(await cta.boundingBox()).toEqual(before);
});

test("Hero pauses offscreen and in hidden tabs, and runtime reduction returns to the first phrase", async ({page}) => {
  await page.clock.install(); await page.goto("/"); await ready(page);
  const copy=page.locator(".hero-copy-sequence");
  await expect(copy).toHaveAttribute("data-running","true");
  await page.locator("#community").evaluate(node=>node.scrollIntoView({behavior:"instant"}));
  await expect(copy).toHaveAttribute("data-running","false");
  await page.clock.fastForward(20000); await expect(copy).toHaveAttribute("data-phrase","0");
  await page.locator("#top").evaluate(node=>node.scrollIntoView({behavior:"instant"}));
  await expect(copy).toHaveAttribute("data-running","true");
  // Deterministic visibility event contract; separate from actual browser/OS inspection.
  await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"));});
  await expect(copy).toHaveAttribute("data-running","false");
  await page.clock.fastForward(20000); await expect(copy).toHaveAttribute("data-phrase","0");
  await page.evaluate(()=>{delete (document as unknown as {hidden?:boolean}).hidden;document.dispatchEvent(new Event("visibilitychange"));});
  await expect(copy).toHaveAttribute("data-running","true");
  await page.clock.fastForward(6500); await expect(copy).toHaveAttribute("data-phrase","1");
  const cta=page.locator(".landing-actions a[href='/planner']");
  await cta.focus();
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(cta).toBeFocused();
  await expect(copy).toHaveAttribute("data-phrase","0");
  await expect(copy).toHaveAttribute("data-running","false");
  await expect(page.locator(".landing-hero button")).toHaveCount(0);
});

test("current section registry, desktop rail and mobile native selector stay in sync without trapping scroll", async ({ page }) => {
  await page.emulateMedia({reducedMotion:"reduce"}); await page.goto("/"); await ready(page);
  expect(await page.locator("main > section").evaluateAll(nodes=>nodes.map(node=>node.id))).toEqual(landingSections.map(s=>s.id));
  await expect(page.locator(".story-progress")).toBeVisible();
  await page.evaluate(()=>history.replaceState({...history.state,storyTestMarker:"preserve"},""));
  if (page.viewportSize()!.width > 1280) {
    await expect(page.locator("#story-progress-list a")).toHaveCount(7);
    for (const link of await page.locator("#story-progress-list a").all()) await expect(link).toBeVisible();
    await expect(page.getByRole("button",{name:"소개 섹션 목록"})).toHaveCount(0);
    await page.locator("#story-progress-list a[href='#community']").press("Enter");
    await expect(page.locator("#community")).toBeFocused();
    await expect(page.locator("#story-progress-list a[aria-current]")).toHaveAttribute("href","#community");
  } else {
    const select=page.getByLabel("소개 섹션으로 이동"); await select.selectOption("5");
    await expect(page.locator("#community")).toBeFocused(); await expect(select).toHaveValue("5");
  }
  expect(await page.evaluate(()=>history.state.storyTestMarker)).toBe("preserve");
  await expect(page.locator(".itinerary-chapter,.map-chapter,.story-expansion,#journey-record-source")).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText("걱정은 덜고");
});

test("scroll chapters and community invitation preserve sources, links and user state without writes", async ({ page }) => {
  const writes:string[]=[]; const requests:string[]=[];
  page.on("request",request=> {requests.push(request.url()); if(!["GET","HEAD","OPTIONS"].includes(request.method())) writes.push(request.url());});
  await page.goto("/"); await ready(page);
  const storage=await page.evaluate(()=>({ ...localStorage }));
  for(let index=0;index<3;index++) {
    await page.locator(".horizon-chapter-copy").nth(index).evaluate(node=>node.scrollIntoView({block:"center",behavior:"instant"}));
    await expect(page.locator(".horizon-chapters")).toHaveAttribute("data-active-chapter",String(index));
    await expect(page.locator('.horizon-chapter-backdrops > div[data-active="true"]')).toHaveCount(1);
    await expect(page.locator('.horizon-chapter-backdrops > div[inert]')).toHaveCount(2);
  }
  await expect(page.locator(".needs-demo,.community-demo")).toHaveCount(0);
  await expect(page.locator(".horizon-account-links a")).toHaveCount(2);
  await expect(page.locator(".horizon-community-photos img")).toHaveCount(2);
  await expect(page.locator('.horizon-community-copy a')).toHaveAttribute("href","/community");
  expect(writes).toEqual([]); expect(requests.filter(url=>/timeline-|ocean-expand|journey-sequence|hero-water-loop/.test(url))).toEqual([]);
  expect(await page.evaluate(()=>({ ...localStorage }))).toStrictEqual(storage);
});

test("every region retains its exact original source, author and named link, including image failure", async ({ page }) => {
  await page.emulateMedia({reducedMotion:"reduce"}); await page.goto("/#regions"); await ready(page);
  const stage=page.locator('[data-region-stage]');
  for(let index=0;index<18;index++) {
    const region=(await stage.getAttribute("data-active-region"))!; const photos=regionShowcaseAlbums[region];
    expect(photos.length).toBeGreaterThanOrEqual(2);
    expect(new Set(photos.map(photo=>photo.image)).size).toBe(photos.length);
    await expect(stage.locator(".region-featured-card .region-scene-photo")).toHaveCount(1);
    for (let photoIndex=0;photoIndex<photos.length;photoIndex++) {
      const photo=photos[photoIndex];
      const button=stage.getByRole("button",{name:`${photo.title} · 사진 보기`,exact:true});
      await button.press("Enter"); await expect(button).toBeFocused(); await expect(button).toHaveAttribute("aria-pressed","true");
      await expect(stage.locator(".selected-region strong")).toHaveText(photo.title);
      await expect(stage.locator(".region-featured-card .region-scene-photo img")).toHaveAttribute("src",photo.image);
      const figure=stage.locator(".region-featured-card .region-scene-photo");
      const credit=figure.locator("figcaption a"); await expect(credit).toHaveAttribute("href",photo.image);
      if (photo.photographer) await expect(figure.locator("figcaption")).toContainText(photo.photographer);
      await expect(credit).toHaveAccessibleName(`${photo.title} · 사진 원본, 새 탭`);
      await expect(credit).toHaveCSS("text-decoration-line","underline");
    }
    await expect(stage.locator(".region-showcase-counter")).toHaveCount(0);
    await stage.getByRole("button",{name:"다음 지역"}).press("Enter");
  }
  await page.goto("/policies#content-credits"); await expect(page.getByRole("heading",{name:"콘텐츠 출처 및 이용안내"})).toBeVisible();
  await expect(page.locator("#regional-photo-credits li")).toHaveCount(Object.values(regionShowcaseAlbums).flat().length);
});

for(const width of [320,390]) test(`${width}px static and data-saving story keeps complete chapters without motion, overflow or axe violations`,async({page})=>{
  await page.setViewportSize({width,height:844});
  await page.addInitScript(()=>Object.defineProperty(navigator,"connection",{configurable:true,value:{saveData:true,addEventListener(){},removeEventListener(){}}}));
  await page.goto("/"); await ready(page); await expect(page.locator(".hero-copy-sequence")).toHaveAttribute("data-still","true");
  for(const section of landingSections) {
    await page.locator(`#${section.id}`).scrollIntoViewIfNeeded();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  }
  await expect(page.locator(".horizon-chapter-copy")).toHaveCount(3);
  await expect(page.locator(".horizon-community-photos img")).toHaveCount(2);
  await expect(page.locator(".horizon-community input,.horizon-community form")).toHaveCount(0);
  await page.emulateMedia({reducedMotion:"reduce"}); expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});

test("the new photo and product chapters retain readable dark-mode composition", async ({page}) => {
  await page.addInitScript(() => localStorage.setItem("wave-theme", "dark"));
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
  for (const section of ["story","recommendation","community"]) {
    await page.locator(`#${section}`).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(page.viewportSize()!.width);
  }
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
});

test("regional photographs warm only the adjacent album on visibility, never all eighteen", async ({page}) => {
  const requested=new Set<string>();
  page.on("request", request=>{ if(request.url().startsWith("https://tong.visitkorea.or.kr/")) requested.add(request.url()); });
  await page.clock.install(); await page.goto("/"); await ready(page);
  const next=regionShowcaseAlbums["하동"].map(photo=>photo.image);
  expect(next.some(url=>requested.has(url))).toBe(false);
  await page.locator("#regions").scrollIntoViewIfNeeded();
  await expect.poll(()=>next.every(url=>requested.has(url))).toBe(true);
  await expect(page.locator(".region-photo-album img")).toHaveCount(1);
  for(const img of await page.locator(".region-photo-album img").all()) await expect(img).toHaveAttribute("loading","lazy");
  const distant=regionShowcaseAlbums["거창"].concat(regionShowcaseAlbums["밀양"]).map(photo=>photo.image);
  expect(distant.some(url=>requested.has(url))).toBe(false);
});

test("data saving disables speculative adjacent-region photography requests", async ({page}) => {
  const requested=new Set<string>();
  page.on("request",request=>requested.add(request.url()));
  await page.addInitScript(()=>Object.defineProperty(navigator,"connection",{configurable:true,value:{saveData:true,addEventListener(){},removeEventListener(){}}}));
  await page.clock.install(); await page.goto("/#regions"); await ready(page);
  await page.locator("#regions").scrollIntoViewIfNeeded();
  await page.clock.fastForward(12000);
  expect(regionShowcaseAlbums["하동"].some(photo=>requested.has(photo.image))).toBe(false);
  await expect(page.locator("[data-region-stage]")).toHaveAttribute("data-active-region","창원");
});
