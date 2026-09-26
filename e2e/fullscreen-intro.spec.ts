import { expect, test } from '@playwright/test';
import { prepareLandingMedia, storyReady } from './landing-contract';

for (const reducedMotion of ['reduce','no-preference'] as const) test(`home opens directly without an intro with ${reducedMotion}`,async({page})=>{
  await page.emulateMedia({reducedMotion});
  await prepareLandingMedia(page);
  await page.goto('/');
  await storyReady(page);
  await expect(page.locator('#arrival-boot,.arrival-scene')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-intro-pending');
  await expect(page.getByRole('link',{name:'여행지 둘러보기',exact:true})).toBeVisible();
  await expect(page.locator('.night-hero-motion')).toHaveCount(0);
});
