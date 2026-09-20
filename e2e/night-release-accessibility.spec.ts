import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {mockPlannerApi} from './fixtures';
import {prepareStory,storyReady} from './landing-contract';
for(const width of [1440,960,390]) for(const route of ['/','/planner','/community','/festivals']) {
 test(`midnight release ${route} at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await prepareStory(page);await mockPlannerApi(page,{preserveView:true});await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/api/community/posts**',r=>r.fulfill({json:{posts:[],page:1,hasMore:false}}));
  await page.route('**/api/festivals**',r=>r.fulfill({json:{items:[],state:'available',partial:false,checkedAt:'2026-09-20T00:00:00Z'}}));
  await page.goto(route);if(route==='/')await storyReady(page);await expect(page.locator('h1').first()).toBeVisible();
  const violations=(await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='critical'||v.impact==='serious');
  expect(violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 });
}
