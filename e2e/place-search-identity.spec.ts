import { test, expect } from '@playwright/test';
import { mockPlannerApi, plan } from './fixtures';

test('direct search reuses official evidence and ID while unrelated businesses remain unknown', async ({page}) => {
  await mockPlannerApi(page);
  const place = { ...plan.places[0], accessibility: [{ key:'elevator',label:'승강기',state:'confirmed',detail:'승강기 있음' },{key:'wheelchair',label:'휠체어 대여',state:'negative',detail:'대여 없음'}] };
  await page.route('**/api/location-search?**', route => {
    expect(new URL(route.request().url()).searchParams.get('official')).toBe('1');
    return route.fulfill({json:{places:[{id:'shop',name:place.name+' 기프트숍',address:place.address,mapX:place.mapX,mapY:place.mapY,resultType:'other'}, {id:'kakao-venue',name:place.name,address:place.address,mapX:place.mapX,mapY:place.mapY,resultType:'tourism'}],officialPlaces:[place],officialState:'available'}});
  });
  await page.goto('/planner');
  await page.getByRole('combobox', {name:'여행 지역',exact:true}).selectOption('창원');
  const query=page.getByRole('combobox',{name:'여행지 검색',exact:true});
  await query.fill(place.name); await query.press('Enter');
  const results=page.locator('#direct-place-results');
  const venue=results.getByRole('listitem').first();
  await expect(venue).toContainText('승강기 확인됨');
  await expect(venue).toContainText('휠체어 대여 없음으로 기록');
  await expect(results.getByRole('listitem').nth(1)).toContainText('편의·접근성미확인');
  await venue.getByRole('button',{name:place.name+' 일정에 담기',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wave-saved-places')||'[]'))).toEqual([place.id]);
  await venue.getByRole('button',{name:place.name,exact:true}).click();
  await expect(page.locator('.simple-place-pane[open]')).toContainText(place.name);
});

test('official lookup failure keeps external search usable and does not invent facilities',async({page})=>{
  await mockPlannerApi(page);
  await page.route('**/api/location-search?**',route=>route.fulfill({json:{places:[{id:'shop',name:'별도 카페',address:'경남 창원시',mapX:'128.68',mapY:'35.23',resultType:'cafe'}],officialPlaces:[],officialState:'error'}}));
  await page.goto('/planner');
  await page.getByRole('combobox', {name:'여행 지역',exact:true}).selectOption('창원');
  const query=page.getByRole('combobox',{name:'여행지 검색',exact:true}); await query.fill('별도 카페');await query.press('Enter');
  await expect(page.getByRole('status').filter({hasText:'공식 관광정보 일부'})).toBeVisible();
  await expect(page.locator('#direct-place-results')).toContainText('편의·접근성미확인');
  await expect(page.getByRole('button',{name:'별도 카페 일정에 담기',exact:true})).toBeEnabled();
});
