import { expect,test } from '@playwright/test';
import { mockPlannerApi } from './fixtures';
import { prepareStory,storyReady } from './landing-contract';

test('Design B destination, planning steps and Naru examples connect to the working journey',async({page})=>{
 await prepareStory(page);await mockPlannerApi(page,{preserveView:true});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');await storyReady(page);
 const story=page.locator('#story');
 await story.locator('.night-region-shortcuts').getByRole('button',{name:'하동',exact:true}).click();
 await expect(story.getByRole('link',{name:'하동 여행 설계하기'})).toHaveAttribute('href',/region=%ED%95%98%EB%8F%99/);
 await story.getByRole('button',{name:/편의 확인/}).click();
 await expect(story.getByRole('heading',{name:'내게 필요한 편의까지'})).toBeVisible();
 await story.getByRole('button',{name:/일정 만들기/}).click();
 await expect(story.getByRole('heading',{name:'하루의 순서는, 내가 원하는 대로'})).toBeVisible();
 await page.locator('#naru .landing-naru-usecases button').first().click();
 await expect(page.locator('.naru-panel')).toBeVisible();
 await page.keyboard.press('Escape');
 await page.locator('#landing-region').selectOption('거제');
 await page.getByRole('button',{name:'여행지 검색',exact:true}).click();
 await expect(page).toHaveURL(url=>url.pathname==='/planner'&&url.searchParams.get('region')==='거제');
});
