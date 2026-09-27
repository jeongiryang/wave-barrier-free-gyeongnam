import { test, expect } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';
test.use({ storageState:{cookies:[],origins:[]} });
test.beforeEach(async({page})=>{await page.addInitScript(()=>sessionStorage.setItem('wave-arrival-session-v1','done'));});
for (const width of [390,960,1440]) test(`story controls and common icons ${width}`, async({page}, testInfo)=>{
 await page.setViewportSize({width,height:900});
 await page.emulateMedia({reducedMotion:'reduce'});
 await mockPlannerApi(page);
 await page.goto('/');
 const chat=page.locator('.wave-chat-demo');
 await chat.scrollIntoViewIfNeeded();
 await expect(chat).toHaveAttribute('data-frame','5');
 await expect(chat.locator('.preview-pages,.preview-typing')).toHaveCount(0);
 await expect(chat.locator('.preview-answer')).toHaveCount(3);
 await expect(chat.locator('aside')).toContainText('통영');
 await expect(chat.locator('aside')).toBeVisible();
 await page.locator('#story').scrollIntoViewIfNeeded();
 const demo=page.locator('.wave-journey-demo');
 await demo.getByRole('button',{name:'거제',exact:true}).click();
 await demo.getByRole('button',{name:'거제 바람의 언덕 예시 일정에 담기'}).click();
 await expect(demo).toHaveAttribute('data-stage','1');
 await demo.getByRole('button',{name:'예시 지도에서 확인',exact:true}).click();
 await expect(demo).toHaveAttribute('data-stage','2');
 await expect(demo.getByRole('link',{name:'거제 여행 만들기'})).toHaveAttribute('href','/planner?region=%EA%B1%B0%EC%A0%9C');
 await expect(demo.locator('.journey-art')).toHaveJSProperty('naturalWidth',1536);
 await page.screenshot({path:testInfo.outputPath(`story-${width}.png`)});
 const example=page.locator('.simple-naru-example');
 await example.getByRole('button',{name:'예시 일정에 적용',exact:true}).click();
 await expect(example.locator('.example-duration strong:not(.example-proposed)')).toHaveText('90분');
 await example.getByRole('button',{name:'되돌리기',exact:true}).click();
 await expect(example.locator('.example-duration strong:not(.example-proposed)')).toHaveText('60분');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.goto('/planner');
 const gallery=page.locator('.simple-region-discovery');
 await gallery.scrollIntoViewIfNeeded();
 await expect(gallery.locator('.simple-region-metadata')).toHaveCount(0);
 const card=gallery.locator('.simple-region').first();
 expect(await card.evaluate(e=>e.getBoundingClientRect().height)).toBeLessThan(260);
 await expect(page.locator('.naru-story-actions')).toHaveCount(0);
 await page.locator('.simple-footer').scrollIntoViewIfNeeded();
 await expect(page.getByRole('button',{name:'WAVE 여행 가이드 나루와 대화 열기'})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath(`planner-icons-${width}.png`)});
});
test('conversation reveals one message each second with its link in the header',async({page})=>{
 await page.clock.install();
 await page.goto('/');const chat=page.locator('.wave-chat-demo');await chat.scrollIntoViewIfNeeded();
 await expect(chat.locator('header a')).toHaveText('나루와 내 여행 만들기');
 await expect(chat.locator('header button,footer')).toHaveCount(0);
 await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
 const initial=Number(await chat.getAttribute('data-frame'));
 expect(await chat.locator('.preview-question').count()).toBe(Math.floor(initial/2)+1);
 expect(await chat.locator('.preview-answer').count()).toBe(Math.floor((initial+1)/2));
 await page.clock.runFor(1000);
 const next=(initial+1)%6;
 await expect(chat).toHaveAttribute('data-frame',String(next));
 expect(await chat.locator('.preview-answer').count()).toBe(Math.floor((next+1)/2));

});
test('festival icon sort still opens below and keeps selected option',async({page})=>{
 await mockPlannerApi(page);await page.goto('/festivals');
 expect(await page.getByRole('button',{name:'목록형으로 보기'}).locator('svg').evaluate(e=>e.getBoundingClientRect().width)).toBe(20);
 const sort=page.getByRole('combobox',{name:'축제 정렬'});
 // This case measures the enhanced listbox, after the usable SSR native field
 // has handed off to its custom trigger. Keep the real menu interaction.
 await expect(sort).toHaveJSProperty('tagName','BUTTON');await sort.click();
 const menu=page.getByRole('listbox',{name:'축제 정렬'});await expect(menu).toBeVisible();
 const a=await sort.boundingBox(),b=await menu.boundingBox();expect(b!.y).toBeGreaterThanOrEqual(a!.y+a!.height);
 await menu.getByRole('option',{name:'이름순',exact:true}).click();await expect(sort).toHaveAttribute('title','축제 정렬: 이름순');
 await expect(menu).toHaveCount(0);await expect(sort).toBeFocused();
 const filters=page.getByRole('button',{name:'축제 검색 조건',exact:true});
 if(await filters.isVisible() && await filters.getAttribute('aria-expanded')==='false') await filters.click();
 await expect(page.getByRole('button',{name:'축제 검색하기',exact:true})).toHaveAttribute('data-icon-action','');
});

test('all regions share the illustrated map and scroll does not change selection',async({page})=>{
 await page.clock.install();await mockPlannerApi(page);await page.goto('/');
 await page.locator('#story').scrollIntoViewIfNeeded();const demo=page.locator('.wave-journey-demo');await demo.scrollIntoViewIfNeeded();
 await expect(demo.locator('.journey-region-tabs button')).toHaveCount(18);
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
 const initial=await demo.getAttribute('data-region');
 await page.mouse.wheel(0,100);await page.clock.runFor(50);await expect(demo).toHaveAttribute('data-region',initial!);
 await page.clock.runFor(4000);await expect(demo).not.toHaveAttribute('data-region',initial!);
 for(const button of await demo.locator('.journey-region-tabs button').all()) {
  const name=await button.innerText();await button.click();
  await expect(demo.locator('.journey-paper-map')).toHaveAttribute('aria-label',`나루와 꼬마 여행자가 가리키는 지도: ${name}`);
  await expect(demo.locator('.journey-paper-map [data-featured=true]')).toHaveCount(1);
  await expect(demo.locator('.journey-place-copy span')).toHaveText(name);
 }
 const colors=await demo.locator('.journey-demo-steps>span').evaluateAll(nodes=>nodes.map(e=>getComputedStyle(e).backgroundColor));
 expect(new Set(colors).size).toBe(1);
});

test('welcome bubble stays dismissed across routes and reloads but returns in a new tab',async({page,context})=>{
 await page.clock.install();await mockPlannerApi(page);await page.goto('/planner');
 const bubble=page.locator('.naru-welcome-bubble');await expect(bubble).toBeVisible();
 await expect(page.locator('.naru-launcher .naru-character')).toHaveAttribute('data-state','wave');
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));const copy=await bubble.innerText();
 await page.clock.runFor(5000);await expect(bubble).not.toHaveText(copy);
 await bubble.getByRole('button',{name:'나루 안내 잠시 닫기'}).click();await expect(bubble).toHaveCount(0);
 await page.clock.resume();await page.reload();await expect(bubble).toHaveCount(0);
 await page.locator('.simple-footer').scrollIntoViewIfNeeded();
 expect(await page.locator('.wave-header').evaluate(e=>e.getBoundingClientRect().bottom)).toBeLessThan(0);
 await page.goto('/');await expect(bubble).toHaveCount(0);await page.locator('#regions').scrollIntoViewIfNeeded();
 expect(await page.locator('.wave-header').evaluate(e=>e.getBoundingClientRect().bottom)).toBeLessThan(0);
 const fresh=await context.newPage();await mockPublicShellApi(fresh);await mockPlannerApi(fresh);await fresh.goto('/planner');await expect(fresh.locator('.naru-welcome-bubble')).toBeVisible();await fresh.close();
});

test('planner intro settles once and dialogue transitions promptly with opposite portraits',async({page})=>{
 await page.clock.install();await mockPlannerApi(page);await page.goto('/planner');
 const scene=page.locator('.naru-header-scene');
 await expect(scene.locator('.wave-written-line')).toHaveAttribute('data-writing','true');
 await expect(scene).toHaveAttribute('data-intro','true');
 await expect(scene.locator('picture')).toHaveCount(2);
 const opening=await scene.locator('h2').boundingBox();
 expect(Math.abs(opening!.x+opening!.width/2-page.viewportSize()!.width/2)).toBeLessThan(2);
 expect(await scene.locator('h2').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(42);
 await expect(scene).toHaveAttribute('data-frame','1');
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+50));await page.clock.runFor(800);
 await expect(scene).toHaveAttribute('data-frame','2');
 const rows=await scene.locator('.naru-welcome-dialogue p').evaluateAll(nodes=>nodes.map(e=>({portrait:e.querySelector('.naru-dialogue-profile')!.getBoundingClientRect().toJSON(),copy:e.querySelector('.naru-welcome-copy')!.getBoundingClientRect().toJSON()})));
 expect(rows[0].portrait.right).toBeLessThan(rows[0].copy.left);
 expect(rows[1].portrait.left).toBeGreaterThan(rows[1].copy.right);
 await expect(scene).toHaveAttribute('data-intro','false');
 await expect(scene.locator('img.is-current')).toHaveAttribute('src','/naru/planner-harbor-grounded-v4.webp');
 await page.clock.runFor(1800);
 await expect(scene).toHaveAttribute('data-frame','3');
 await expect(scene.locator('img.is-current')).toHaveAttribute('src','/naru/planner-harbor-map-desktop-v1.webp');
 await page.clock.runFor(800);await page.clock.runFor(2400);
 await expect(scene).toHaveAttribute('data-frame','1');
 await expect(scene).toHaveAttribute('data-intro','false');
});
