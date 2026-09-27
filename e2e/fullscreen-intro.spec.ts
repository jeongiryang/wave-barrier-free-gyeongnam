import { expect, test } from '@playwright/test';
import { prepareLandingMedia, storyReady } from './landing-contract';

test('first visit shows the logo intro with keyboard skip and session-only completion', async ({page}) => {
  await prepareLandingMedia(page);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/'); await storyReady(page);
  const scene=page.locator('.arrival-scene');
  await expect(scene).toBeVisible();
  const skip=scene.getByRole('button',{name:'건너뛰기',exact:true});
  await expect(skip).toBeFocused();
  await page.keyboard.press('Tab'); await expect(skip).toBeFocused();
  await page.keyboard.press('Escape'); await expect(scene).toBeHidden();
  expect(await page.evaluate(()=>sessionStorage.getItem('wave-arrival-session-v1'))).toBe('done');
  await page.reload(); await storyReady(page); await expect(scene).toBeHidden();
  await expect(page.getByRole('link',{name:'여행지 둘러보기',exact:true})).toBeVisible();
});

test('reduced motion bypasses intro without loading its renderer',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await prepareLandingMedia(page);
  const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
  await page.goto('/');await storyReady(page);
  await expect(page.locator('.arrival-scene')).toBeHidden();
  await expect(page.locator('#arrival-boot')).toHaveCount(0);
  expect(requests.filter(url=>/wave-intro(?:\.|-)/.test(url))).toEqual([]);
  await expect(page.getByRole('link',{name:'여행지 둘러보기',exact:true})).toBeVisible();
});

test('blocked scripts leave the page readable without a boot overlay',async({page})=>{
  await prepareLandingMedia(page);
  await page.route(/\.(?:js|mjs|tsx)(?:\?|$)/,route=>route.abort());
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#arrival-boot')).toHaveCount(0);
  await expect(page.locator('.arrival-scene')).toBeHidden();
  await expect(page.locator('.landing-actions a')).toBeVisible();
  await expect(page.locator('.landing-actions a')).toHaveAttribute('href','/planner');
});
