import AxeBuilder from '@axe-core/playwright';
import {test,expect,type Page} from '@playwright/test';
import {mockPlannerApi,mockPublicShellApi,chooseTripConditions} from './fixtures';
import {alternativePlan} from './alternative-fixtures';

const stop={nodeId:'S1',cityCode:'38010',name:'미술관 앞',point:{lat:35.238,lng:128.691},distance:125};
const route={routeId:'R1',routeName:'100',vehicles:[{seconds:300,stopsAway:3,vehicle:'저상버스'},{seconds:900,stopsAway:8,vehicle:''}]};
const next={nodeId:'S2',name:'호수공원 앞',order:2,direction:'0',point:{lat:35.2265,lng:128.6831}};
function response(params:URLSearchParams){
 const id=params.get('contentId')!,selected=params.has('nodeId'),chosen=params.has('routeId');
 return{id,status:chosen?'route':selected?'arrivals':'stops',source:'국토교통부 TAGO · 한국관광공사',stops:[stop],checkedAt:new Date().toISOString(),arrivalCheckedAt:selected?new Date().toISOString():null,routes:selected?[route]:[],...(selected?{selected:stop}:{}),...(chosen?{routeId:'R1',direction:{status:'available',stops:[next],next,reason:''},routeCheckedAt:new Date().toISOString(),times:{origin:'버스 차고지',destination:'공원',first:'05:30',last:'23:00'},timesCheckedAt:new Date().toISOString()}: {})};
}
async function setup(page:Page){
 await mockPublicShellApi(page);await mockPlannerApi(page,{preserveView:true});await page.emulateMedia({reducedMotion:'reduce'});
 await page.route('**/api/wave?action=plan*',route=>route.fulfill({json:alternativePlan}));
 await page.goto('/planner');await chooseTripConditions(page);
 for(const name of ['경남도립미술관','용지호수공원'])await page.getByRole('button',{name:name+' 일정에 추가',exact:true}).click();
 await page.locator('.reference-journey-views button').nth(1).click();await page.getByRole('button',{name:'다음: 전체보기',exact:true}).click();
 await page.getByRole('button',{name:'돌아가는 교통 확인',exact:true}).click();
 const panel=page.getByRole('region',{name:'돌아가는 교통 확인',exact:true});await panel.getByRole('combobox',{name:'어디에서 이동하나요?',exact:true}).selectOption('1001');return panel;
}
test('return transport is explicit, relates subsequent stops to a saved place and keeps the itinerary',async({page},info)=>{
 const calls:string[]=[];await page.route('**/api/wave?action=return-transport*',r=>{calls.push(r.request().url());return r.fulfill({json:response(new URL(r.request().url()).searchParams)});});
 const panel=await setup(page),before=await page.evaluate(()=>localStorage.getItem('wave-trip-schedule-v1'));expect(calls).toEqual([]);
 await panel.getByRole('button',{name:'주변 정류장 확인',exact:true}).click();await expect(panel).toContainText('장소에서 직선거리 약 125m');expect(calls).toHaveLength(1);
 await panel.getByRole('button',{name:'이 정류장의 버스 확인',exact:true}).click();await expect(panel.getByRole('region',{name:'선택한 정류장의 도착 정보'})).toContainText('약 5분 뒤 도착 예상');await expect(panel).toContainText('그다음 차');expect(calls).toHaveLength(2);
 await panel.getByRole('button',{name:'이 노선의 진행 방향 확인',exact:true}).click();await expect(panel).toContainText('미술관 앞 → 호수공원 앞 방면');await expect(panel).toContainText('기점 출발 첫차 05:30 · 막차 23:00');await expect(panel).toContainText('이 정류장의 막차 도착 시각은 별도 확인');
 await expect(panel.getByRole('heading',{name:'미술관 앞 → 호수공원 앞 방면',exact:true})).toBeFocused();
 await panel.getByRole('combobox',{name:'다음 이동 장소와 비교',exact:true}).selectOption('1002');await expect(panel).toContainText('용지호수공원까지 직선거리');expect(calls).toHaveLength(3);
 await panel.getByText('이후 정류장 1곳',{exact:true}).click();await expect(panel.getByRole('listitem').filter({hasText:'호수공원 앞'}).first()).toBeVisible();
 for(const width of info.project.name.includes('desktop')?[1440,960]:[390,320]){await page.setViewportSize({width,height:960});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`return-transport-${width}.png`)});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);expect((await new AxeBuilder({page}).include('[aria-label="돌아가는 교통 확인"]').analyze()).violations).toEqual([]);}
 expect(calls).toHaveLength(3);expect(await page.evaluate(()=>localStorage.getItem('wave-trip-schedule-v1'))).toBe(before);
});
test('empty, unavailable, missing next vehicle and stale arrivals never imply the service has ended',async({page})=>{
 let mode='empty',calls=0;await page.route('**/api/wave?action=return-transport*',r=>{calls++;const data=response(new URL(r.request().url()).searchParams);if(mode==='empty')return r.fulfill({json:{...data,status:'empty',stops:[],routes:[]}});if(mode==='error')return r.fulfill({status:502,json:{error:'Unavailable'}});return r.fulfill({json:{...data,status:'arrivals',selected:stop,routes:[{...route,vehicles:[{seconds:null,stopsAway:null,vehicle:''}]}],arrivalCheckedAt:new Date(Date.now()-6*60000).toISOString()}});});
 const panel=await setup(page);await panel.getByRole('button',{name:'주변 정류장 확인',exact:true}).click();await expect(panel).toContainText('제공된 주변 정류장이 없어요');
 mode='error';await panel.getByRole('button',{name:'주변 정류장 다시 확인',exact:true}).click();await expect(panel.getByRole('alert')).toContainText('교통 정보를 확인하지 못했어요');
 mode='stale';await panel.getByRole('button',{name:'주변 정류장 다시 확인',exact:true}).click();await expect(panel).toContainText('오래된 도착 정보 · 다시 확인');await expect(panel).toContainText('그다음 차 정보는 아직 없어요');await expect(panel).not.toContainText('0분');expect(calls).toBe(3);
});
test('switching saved places aborts pending transport and cannot mix an old response into the new place',async({page})=>{
 let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;});let calls=0;
 await page.route('**/api/wave?action=return-transport*',async r=>{calls++;const params=new URL(r.request().url()).searchParams;if(params.get('contentId')==='1001')await pending;try{await r.fulfill({json:{...response(params),stops:[{...stop,name:params.get('contentId')==='1001'?'늦은 이전 장소':'새 장소 정류장'}]}});}catch{/* explicitly cancelled old request */}});
 const panel=await setup(page);await panel.getByRole('button',{name:'주변 정류장 확인',exact:true}).click();await expect(panel.getByRole('button',{name:'교통 정보 확인 중…',exact:true})).toBeDisabled();await panel.getByRole('combobox',{name:'어디에서 이동하나요?',exact:true}).selectOption('1002');await panel.getByRole('button',{name:'주변 정류장 확인',exact:true}).click();await expect(panel).toContainText('새 장소 정류장');release();await expect(panel).not.toContainText('늦은 이전 장소');expect(calls).toBe(2);
 await expect(panel.getByRole('link',{name:'카카오맵에서 교통편 보기',exact:true})).toHaveAttribute('href',/map\.kakao\.com\/link\/search\//);
});
