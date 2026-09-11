import fs from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import {test,expect,type Page} from '@playwright/test';
import {mockPlannerApi,mockPublicShellApi,chooseTripConditions} from './fixtures';
import {alternativePlan} from './alternative-fixtures';

async function setup(page:Page){
 await mockPublicShellApi(page);await mockPlannerApi(page,{preserveView:true});await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/api/wave?action=plan*',route=>route.fulfill({json:alternativePlan}));
 await page.addInitScript(()=>{if(!localStorage.getItem('wave-trip-schedule-v1')){
  localStorage.setItem('wave-trip-schedule-v1',JSON.stringify({travelStart:'2026-09-15',travelEnd:'2026-09-16',dayStartTime:'10:00',scheduleAssignments:{'1001':'2026-09-15','1002':'2026-09-16'},visitMinutesByPlaceId:{'1001':45},breakMinutesByPlaceId:{'1001':15}}));
  localStorage.setItem('wave-trip-order-v1',JSON.stringify({mode:'manual',ids:['1001','1002']}));
 }});
 await page.goto('/planner');await chooseTripConditions(page);
 for(const name of ['경남도립미술관','용지호수공원'])await page.getByRole('button',{name:name+' 일정에 추가',exact:true}).click();
 await page.locator('.reference-journey-views button').nth(1).click();await page.getByRole('button',{name:'다음: 전체보기',exact:true}).click();
 await page.getByText('여행비 계획하기',{exact:true}).click();
 return page.getByRole('region',{name:'여행비 계획',exact:true});
}
test('budget distinguishes unknown from zero, combines per-person and group costs and preserves saved input',async({page},info)=>{
 const panel=await setup(page),before=await page.evaluate(()=>localStorage.getItem('wave-trip-schedule-v1'));
 await expect(panel).toContainText('미확인 4항목');await expect(panel).toContainText('확인한 금액 0원');
 await panel.getByRole('combobox',{name:'함께하는 인원',exact:true}).selectOption('3');await panel.getByLabel('목표 예산 (원)',{exact:true}).fill('30000');await panel.getByRole('combobox',{name:'예산 기준',exact:true}).selectOption('person');
 await panel.getByText('장소별 입장·이용요금',{exact:true}).click();await panel.getByLabel('경남도립미술관 입장·이용요금 (원)',{exact:true}).fill('5000');await panel.getByLabel('용지호수공원 입장·이용요금 (원)',{exact:true}).fill('0');
 await panel.locator('summary').filter({hasText:'식사·숙박과 추가 비용'}).click();await panel.getByRole('button',{name:'비용 항목 추가',exact:true}).click();await panel.getByLabel('항목 이름',{exact:true}).fill('점심');await panel.getByLabel('추가 금액 (원)',{exact:true}).fill('18000');
 await expect(panel).toContainText('확인한 금액 33,000원');await expect(panel).toContainText('전체 예산까지 57,000원 남았어요');await expect(panel).toContainText('미확인 2항목');
 await page.getByText('여행비 계획하기',{exact:true}).click();await page.getByRole('button',{name:'여행 당일 진행',exact:true}).click();await page.getByText('여행비 계획하기',{exact:true}).click();await expect(panel.getByLabel('목표 예산 (원)',{exact:true})).toHaveValue('30000');
 await panel.getByRole('button',{name:'여행비 저장',exact:true}).click();await expect(panel.getByRole('status')).toHaveText('여행비 계획을 저장했어요.');
 await panel.getByLabel('목표 예산 (원)',{exact:true}).fill('1000');await expect(panel).toContainText('전체 예산보다 30,000원 많아요');await panel.getByRole('button',{name:'저장한 내용으로 되돌리기',exact:true}).click();await expect(panel.getByLabel('목표 예산 (원)',{exact:true})).toHaveValue('30000');
  await page.reload();await page.getByText('여행비 계획하기',{exact:true}).click();await expect(panel).toContainText('확인한 금액 33,000원');expect(await page.evaluate(()=>localStorage.getItem('wave-trip-schedule-v1'))).toBe(before);
  await page.getByRole('button',{name:'여행 요약 챙기기',exact:true}).click();const pack=page.getByRole('region',{name:'여행 요약 파일',exact:true});await pack.getByLabel('저장한 여행비 계획 포함',{exact:true}).check();const event=page.waitForEvent('download');await pack.getByRole('button',{name:'여행 요약 파일 저장',exact:true}).click();const file=info.outputPath('budget-in-trip.html');await(await event).saveAs(file);const html=await fs.readFile(file,'utf8');expect(html).toContain('확인한 금액 33,000원');expect(html).toContain('전체 예산 90,000원');
 for(const width of info.project.name.includes('desktop')?[1440,960]:[390,320]){await page.setViewportSize({width,height:960});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`budget-${width}.png`)});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);expect((await new AxeBuilder({page}).include('[aria-label="여행비 계획"]').analyze()).violations).toEqual([]);}
});
test('budget fee errors and failed writes never report an invented price or discard input',async({page},info)=>{
 const panel=await setup(page);let calls=0;
 await page.route('**/api/wave?action=visit-info*',route=>{calls++;return route.fulfill({status:503,json:{error:'unavailable'}});});expect(calls).toBe(0);
 await panel.getByText('장소별 입장·이용요금',{exact:true}).click();await panel.getByRole('button',{name:'경남도립미술관 공식 요금 안내',exact:true}).click();await expect(panel.getByRole('status')).toContainText('요금 안내를 불러오지 못했어요');expect(calls).toBe(1);await expect(panel).toContainText('미확인 4항목');
 await panel.getByLabel('목표 예산 (원)',{exact:true}).fill('-1');await expect(panel.getByRole('alert')).toContainText('원 단위 정수');await expect(panel.getByRole('button',{name:'여행비 저장',exact:true})).toBeDisabled();
 await panel.getByLabel('목표 예산 (원)',{exact:true}).fill('50000');await page.evaluate(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='wave-trip-budget-v1')throw new DOMException('Full','QuotaExceededError');return original.call(this,key,value);};});
 await panel.getByRole('button',{name:'여행비 저장',exact:true}).click();await expect(panel.getByRole('status')).toContainText('여행비를 저장하지 못했어요');await expect(panel.getByLabel('목표 예산 (원)',{exact:true})).toHaveValue('50000');
 const event=page.waitForEvent('download');await panel.getByRole('button',{name:'여행비 요약 저장',exact:true}).click();const file=info.outputPath('budget.txt');await (await event).saveAs(file);expect(await fs.readFile(file,'utf8')).toContain('전체 예산 50,000원');expect(await page.evaluate(()=>localStorage.getItem('wave-trip-budget-v1'))).toBeNull();
});
test('budget detects another writer before saving and leaves the pending draft available to export',async({page})=>{
 const panel=await setup(page);await panel.getByLabel('목표 예산 (원)',{exact:true}).fill('50000');await panel.getByRole('button',{name:'여행비 저장',exact:true}).click();
 await panel.getByLabel('목표 예산 (원)',{exact:true}).fill('70000');
 await page.evaluate(()=>{const records=JSON.parse(localStorage.getItem('wave-trip-budget-v1')!);records[0].value.target=60000;localStorage.setItem('wave-trip-budget-v1',JSON.stringify(records));});
 await panel.getByRole('button',{name:'여행비 저장',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('다른 창에서 여행비가 변경');await expect(panel.getByLabel('목표 예산 (원)',{exact:true})).toHaveValue('70000');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('wave-trip-budget-v1')!)[0].value.target)).toBe(60000);
 await panel.getByRole('button',{name:'저장한 내용으로 되돌리기',exact:true}).click();await expect(panel.getByLabel('목표 예산 (원)',{exact:true})).toHaveValue('60000');
});
