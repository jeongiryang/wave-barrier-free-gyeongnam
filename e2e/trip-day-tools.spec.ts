import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions } from './fixtures';
import { alternativePlan } from './alternative-fixtures';

async function setup(page:Page) {
  await mockPublicShellApi(page);await mockPlannerApi(page,{preserveView:true});await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/api/wave?action=plan*',route=>route.fulfill({json:alternativePlan}));
  await page.addInitScript(()=>{if(!localStorage.getItem('wave-trip-schedule-v1')){
    localStorage.setItem('wave-trip-schedule-v1',JSON.stringify({travelStart:'2026-09-15',travelEnd:'2026-09-16',dayStartTime:'10:00',scheduleAssignments:{'1001':'2026-09-15','1002':'2026-09-15','1003':'2026-09-15'},visitMinutesByPlaceId:{'1001':45},breakMinutesByPlaceId:{'1001':15}}));
    localStorage.setItem('wave-trip-order-v1',JSON.stringify({mode:'manual',ids:['1001','1002','1003']}));
  }});
  await page.route('**/api/wave?action=visit-info*',route=>route.fulfill({json:{id:new URL(route.request().url()).searchParams.get('contentId'),status:'available',checkedAt:'2026-09-11T12:00:00Z',source:'ⓒ한국관광공사',hours:'09:00~18:00',phone:'055-123-4567',fees:'무료'}}));
  await page.goto('/planner');await chooseTripConditions(page);
  for(const name of ['경남도립미술관','용지호수공원','시민문화쉼터'])await page.getByRole('button',{name:name+' 일정에 추가',exact:true}).click();
  await page.locator('.planner-navigation nav button').nth(3).click();
  await page.getByRole('button',{name:'다음: 전체보기',exact:true}).click();
}
const guide=(page:Page)=>page.getByRole('region',{name:'여행 당일 진행',exact:true});

test('on-trip completion, skip, undo and resume keep the original schedule',async({page},info)=>{
  await setup(page);const before=await page.evaluate(()=>({saved:localStorage.getItem('wave-saved-places'),schedule:localStorage.getItem('wave-trip-schedule-v1')}));
  await page.getByRole('button',{name:'여행 당일 진행',exact:true}).click();const panel=guide(page);
  await panel.getByRole('button',{name:'여행 시작하기',exact:true}).click();
  await panel.getByRole('button',{name:'이곳 방문 완료',exact:true}).click();await expect(panel.getByRole('heading',{name:'용지호수공원',exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'이번에는 건너뛰기',exact:true}).click();await expect(panel).toContainText('1곳 건너뜀');await expect(panel.getByRole('heading',{name:'시민문화쉼터',exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'직전 진행 되돌리기',exact:true}).click();await expect(panel.getByRole('heading',{name:'용지호수공원',exact:true})).toBeVisible();
  await panel.getByRole('button',{name:'잠시 멈추기',exact:true}).click();await expect(panel.getByRole('button',{name:'이곳 방문 완료',exact:true})).toBeDisabled();
  await page.reload();await page.getByRole('button',{name:'여행 당일 진행',exact:true}).click();await expect(panel).toContainText('1곳 방문 완료');await panel.getByRole('button',{name:'이어서 진행',exact:true}).click();
  await panel.getByLabel('이어갈 시각',{exact:true}).fill('17:00');await expect(panel).toContainText('17:00 출발 기준');
  const after=await page.evaluate(()=>({saved:localStorage.getItem('wave-saved-places'),schedule:localStorage.getItem('wave-trip-schedule-v1')}));expect(after).toEqual(before);
  for(const width of info.project.name.includes('desktop')?[1440,960]:[390,320]){
    await page.setViewportSize({width,height:960});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`on-trip-${width}.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);expect((await new AxeBuilder({page}).include('[aria-label="여행 당일 진행"]').analyze()).violations).toEqual([]);
  }
});

test('offline HTML and text include confirmed contacts, missing fields and no remote resources',async({page,context},info)=>{
  await setup(page);await page.getByRole('button',{name:'여행 요약 챙기기',exact:true}).click();const pack=page.getByRole('region',{name:'여행 요약 파일',exact:true});
  await pack.getByText('담을 장소와 문의처 확인',{exact:true}).click();await pack.getByRole('button',{name:'경남도립미술관 문의·이용 정보 확인',exact:true}).click();await expect(pack).toContainText('문의 055-123-4567');
  const downloaded=page.waitForEvent('download');await pack.getByRole('button',{name:'여행 요약 파일 저장',exact:true}).click();const download=await downloaded,file=info.outputPath('WAVE-trip.html');await download.saveAs(file);
  const html=await fs.readFile(file,'utf8');expect(html).toContain('055-123-4567');expect(html).toContain('문의처: 미확인');expect(html).not.toMatch(/<script|<img|href=|src=/);
  const offline=await context.newPage();const requests:string[]=[];offline.on('request',request=>requests.push(request.url()));await context.setOffline(true);await offline.goto(pathToFileURL(file).href);
  await expect(offline.getByRole('heading',{name:/WAVE · 창원/})).toBeVisible();await expect(offline.locator('body')).toContainText('휴식 15분');expect(requests.every(url=>url.startsWith('file:'))).toBe(true);
  await offline.screenshot({path:info.outputPath('offline-pack.png')});expect((await new AxeBuilder({page:offline}).analyze()).violations).toEqual([]);await offline.close();await context.setOffline(false);
  const textDownload=page.waitForEvent('download');await pack.getByRole('button',{name:'텍스트로 저장',exact:true}).click();expect((await textDownload).suggestedFilename()).toMatch(/\.txt$/);
});

test('failed progress storage remains available to the offline pack and read errors are visible',async({page},info)=>{
  await setup(page);
  const original=await page.evaluate(()=>localStorage.getItem('wave-trip-schedule-v1'));
  await page.evaluate(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='wave-on-trip-v1')throw new DOMException('Full','QuotaExceededError');write.call(this,key,value);};});
  await page.getByRole('button',{name:'여행 당일 진행',exact:true}).click();const panel=guide(page);
  await panel.getByRole('button',{name:'여행 시작하기',exact:true}).click();await panel.getByRole('button',{name:'이곳 방문 완료',exact:true}).click();
  await expect(panel).toContainText('1곳 방문 완료');await expect(panel.getByRole('status')).toContainText('진행 기록을 저장하지 못했어요');
  await page.getByRole('button',{name:'여행 요약 챙기기',exact:true}).click();const pack=page.getByRole('region',{name:'여행 요약 파일',exact:true});
  const event=page.waitForEvent('download');await pack.getByRole('button',{name:'여행 요약 파일 저장',exact:true}).click();const file=info.outputPath('unsaved-progress.html');await (await event).saveAs(file);
  expect(await fs.readFile(file,'utf8')).toContain('경남도립미술관 · 방문 완료');
  await page.getByRole('button',{name:'여행 당일 진행',exact:true}).click();await expect(panel).toContainText('1곳 방문 완료');await expect(panel.getByRole('status')).toContainText('아직 저장하지 못한 진행 기록');
  await page.evaluate(()=>{const read=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(key==='wave-on-trip-v1')throw new DOMException('Blocked','SecurityError');return read.call(this,key);};});
  await page.getByRole('group',{name:'진행할 여행 날짜',exact:true}).getByRole('button',{name:'09월 16일',exact:true}).click();
  await expect(panel.getByRole('status')).toContainText('진행 기록을 불러오지 못했어요');
  expect(await page.evaluate(()=>localStorage.getItem('wave-trip-schedule-v1'))).toBe(original);
});
