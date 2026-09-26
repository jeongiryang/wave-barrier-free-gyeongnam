import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi } from './fixtures';

test.use({storageState:{cookies:[],origins:[]},contextOptions:{reducedMotion:'reduce'}});
for(const width of [390,960,1440]) test(`local night artwork and source catalog at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:900});
 await mockPlannerApi(page);
 await page.goto('/planner');
 const scene=page.locator('.naru-header-scene');
 await expect(scene).toBeVisible();
 await expect(scene.locator('img.is-visible')).toHaveAttribute('src','/naru/conversation-map-night.webp');
 await expect.poll(()=>scene.locator('img.is-visible').evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
 await expect(page.locator('.planner-welcome-header')).toHaveCSS('background-image',/night-coast.webp/);
 await expect(page.locator('.naru-launcher').first()).not.toHaveCSS('background-color','rgb(255, 255, 255)');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.screenshot({path:testInfo.outputPath(`naru-night-${width}.png`)});
 await page.goto('/policies#content-credits');
 await expect(page.locator('#content-credits')).toBeVisible();
 await expect(page.getByText('한국관광공사',{exact:false}).first()).toBeVisible();
 await page.screenshot({path:testInfo.outputPath(`sources-${width}.png`)});
 expect((await new AxeBuilder({page}).include('#content-credits').withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
});
