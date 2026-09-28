import {test,expect} from '@playwright/test';
import {mockPlannerApi,mockPublicShellApi} from './fixtures';

test.use({contextOptions:{reducedMotion:'reduce'}});
for (const width of [390,960,1440]) test(`review select keyboard form and placement ${width}`,async({page})=>{
  await page.setViewportSize({width,height:650});
  await mockPublicShellApi(page);await mockPlannerApi(page,{preserveView:true});
  await page.addInitScript(()=>sessionStorage.setItem('wave-arrival-session-v1','done'));
  await page.goto('/');
  const select=page.getByRole('combobox',{name:'어디로 떠나고 싶으세요?',exact:true});
  await expect(select).toHaveJSProperty('tagName', 'BUTTON');
  await select.focus();await select.press('ArrowDown');
  const menu=page.getByRole('listbox',{name:'어디로 떠나고 싶으세요?',exact:true});
  await expect(menu).toBeVisible();
  const anchor=await select.boundingBox(),box=await menu.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(anchor!.y+anchor!.height);
  expect(box!.y+box!.height).toBeLessThanOrEqual(650);
  expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);
  await page.keyboard.press('Home');await page.keyboard.press('Enter');
  await expect(select).toBeFocused();await expect(select).toHaveText('통영');
  await expect(page.locator('#landing-region')).toHaveValue('통영');
  await select.click();await page.getByRole('option',{name:'거제',exact:true}).click();
  await expect(select).toHaveText('거제');await expect(select).toBeFocused();
  await select.press('ArrowDown');await page.keyboard.press('Escape');await expect(select).toBeFocused();
  await page.locator('.night-hero-search').getByRole('button',{name:'여행지 검색',exact:true}).click();
  await expect(page).toHaveURL(url=>url.pathname==='/planner'&&url.searchParams.get('region')==='거제');
});

for (const width of [390,960,1440]) test(`review nested preference select ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await mockPublicShellApi(page);await mockPlannerApi(page,{preserveView:true});
 await page.addInitScript(()=>localStorage.setItem('wave-dev-presentation','enabled'));
 await page.addInitScript(()=>sessionStorage.setItem('wave-arrival-session-v1','done'));
 await page.goto('/');await page.getByRole('button',{name:'WAVE 이용 안내 메뉴',exact:true}).click();
 await page.getByRole('button',{name:'환경설정 열기',exact:true}).click();
 const combo=page.locator('.preference-panel [role=combobox]').first();await combo.click();
 const options=page.getByRole('listbox');await expect(options).toBeVisible();
 await options.getByRole('option',{name:/English/}).click();
 await expect(page.locator('.header-dropdown:popover-open')).toBeVisible();await expect(combo).toBeFocused();
 await expect(combo).toContainText('English');
 await expect(page.locator('.preference-panel select')).toHaveValue('en');
});

test('review all 28 Naru tool entries and search return',async({page})=>{
 test.setTimeout(90000);await mockPublicShellApi(page);await mockPlannerApi(page,{preserveView:true});await page.goto('/planner');
 await page.getByRole('button',{name:'WAVE 여행 가이드 나루와 대화 열기',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'WAVE 여행 가이드 나루와 대화',exact:true});
 await dialog.getByRole('tab',{name:'직접 골라서 하기',exact:true}).click();
 await dialog.getByRole('button',{name:'전체',exact:true}).click();
 const catalog=dialog.locator('.naru-task-actions');
 await expect(catalog.getByRole('button')).toHaveCount(28);
 await dialog.locator('#naru-tool-search').fill('막차');await expect(catalog.getByRole('button')).toHaveCount(1);
 await expect(catalog.getByRole('button')).toContainText('교통과 귀가편 찾기');
 await dialog.getByRole('button',{name:'검색 지우기',exact:true}).click();
 const names=await catalog.getByRole('button').locator('strong').allTextContents();
 for(const name of names){
  await catalog.getByRole('button').filter({has:page.getByText(name,{exact:true})}).click();
  await expect(dialog).toBeVisible();
  const nested=page.locator('dialog[open]:not(.naru-panel)');
  if(await nested.count()) await page.keyboard.press('Escape');
  const back=dialog.getByRole('button',{name:'다른 기능 고르기',exact:true});
  await expect(back).toBeVisible();await back.click();
  await expect(catalog.getByRole('button')).toHaveCount(28);
 }
});
