import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseTripConditions, mockPlannerApi, plan, openItinerary } from "./fixtures";

const failure = { provider: "kto", operation: "KorWithService2/areaBasedList2", kind: "quota_exhausted", httpStatus: 200, code: "22", retryAfterMs: null, resetAt: null, retryable: false };
async function prepare(page: Page, en: boolean) {
  await mockPlannerApi(page);
  await page.addInitScript(en => localStorage.setItem("wave-locale", en ? "en" : "ko"), en);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({width:320,height:844});
}

test("a failed transport notice module preserves the itinerary and detailed restriction", async ({page}) => {
  await prepare(page,true);
  let modules=0;
  await page.route("**/TransitProviderNotice.tsx*",route=>{modules++;return route.abort();});
  await page.route("**/api/route**",route=>route.fulfill({json:{configured:true,alternatives:[],
    providers:[{id:"odsay",name:"ODsay",role:"Public transport",configured:true,state:"error",failure:{...failure,provider:"odsay",operation:"searchPubTransPathT"}}],
    context:{nearbyStops:[],arrivals:[],korail:[],catalog:{trainCities:0,expressTerminals:0,intercityTerminals:0},datasets:[]},
  }}));
  await search(page);
  expect(modules).toBe(0);
  await page.getByRole("button",{name:"경남도립미술관 add to itinerary",exact:true}).click();
  await itinerary(page);
  await expect(page.locator('.route-compare-panel [role="status"]')).toHaveText("The transport notice could not be displayed. Check transport details or an external map.");
  expect(await savedIds(page)).toEqual(["1001"]);
  await page.locator(".reference-transport-details > summary").click();
  await page.locator(".transport-details > summary").click();
  await expect(page.locator(".transport-provider-strip")).toContainText("usage allowance has been reached");
  expect(modules).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
async function search(page: Page) {
  await page.goto('/planner');
  await chooseTripConditions(page);
}
async function itinerary(page: Page) {
  await openItinerary(page, { start: '2026-10-14' });
  await page.getByRole('group', { name: '일정 보기 방식' }).getByRole('button', { name: '지도', exact: true }).click();
}
async function savedIds(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values?.['wave-saved-places'] || '[]'));
}
for (const en of [false,true]) {
  test(`quota results are unavailable rather than empty, with keyboard recovery ${en?"English":"Korean"}`,async({page})=>{
    await prepare(page,en);let calls=0;
    await page.route("**/api/wave?**",route=>{
      if(new URL(route.request().url()).searchParams.get("action")!=="plan")return route.fallback();
      calls++;return route.fulfill({json:{...plan,mode:"fallback",places:[],stops:[],statuses:[{...plan.statuses[0],state:"error",count:0,failure}]}});
    });
    await search(page);
    const notice=page.locator(".simple-result-notice");
    await expect(notice).toContainText(en?"usage allowance has been reached":"제공처의 이용 한도");
    await expect(page.locator(".simple-empty")).toHaveCount(0);
    await expect(page.locator(".simple-place-row")).toHaveCount(0);
    const recovery=notice.getByRole('button', { name: en ? 'Retry' : '다시 시도', exact: true });
    const before = calls; const conditions = await page.getByRole('combobox', { name: '여행 지역' }).inputValue();
    await recovery.focus(); await page.keyboard.press('Enter');
    await expect.poll(() => calls).toBe(before + 1);
    await expect(page.getByRole('combobox', { name: '여행 지역' })).toHaveValue(conditions);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    const axe=await new AxeBuilder({page}).analyze();
    expect(axe.violations.filter(v=>v.impact==="critical"||v.impact==="serious")).toEqual([]);
  });
  test(`weather throttling preserves saved places and exposes the actual restriction ${en?"English":"Korean"}`,async({page})=>{
    await prepare(page,en);
    await page.route("**/api/weather**",route=>route.fulfill({status:502,json:{error:"Unavailable",failure:{...failure,provider:"open-meteo",operation:"forecast",kind:"rate_limited",httpStatus:429,retryAfterMs:60000,retryable:true}}}));
    await search(page);
    await page.getByRole("button",{name:en?"경남도립미술관 add to itinerary":"경남도립미술관 일정에 담기",exact:true}).click();
    await itinerary(page);
    await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
    const chat = page.getByRole('dialog', { name: /나루/ });
    await chat.getByRole('textbox', { name: '나루에게 여행 질문하기' }).fill('날씨 보여줘');
    await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
    const board=page.locator(".weather-board");
    await expect(board).toContainText(en?"temporarily limiting requests":"제공처의 요청 제한");
    await expect(board.locator(".weather-current")).toHaveCount(0);
    expect(await savedIds(page)).toEqual(["1001"]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  });
  test(`transport restriction is not an empty timetable ${en?"English":"Korean"}`,async({page})=>{
    await prepare(page,en);
    await page.route("**/api/route**",route=>route.fulfill({json:{
      configured:true,alternatives:[],
      providers:[{id:"odsay",name:"ODsay",role:"Public transport",configured:true,state:"error",failure:{...failure,provider:"odsay",operation:"searchPubTransPathT"}}],
      context:{nearbyStops:[],arrivals:[],korail:[],catalog:{trainCities:0,expressTerminals:0,intercityTerminals:0},
        datasets:[{id:"korail-plan",name:"Timetable",state:"error",queryStatus:"error",failure:{...failure,provider:"korail"}}]},
    }}));
    await search(page);
    await page.getByRole("button",{name:en?"경남도립미술관 add to itinerary":"경남도립미술관 일정에 담기",exact:true}).click();
    await itinerary(page);
    await expect(page.locator('.route-compare-panel [role="status"]')).toContainText(en?"usage allowance has been reached":"제공처의 이용 한도");
    await page.locator(".reference-transport-details > summary").click();
  await page.locator(".transport-details > summary").click();
    await expect(page.locator(".transport-provider-strip")).toContainText(en?"usage allowance has been reached":"제공처의 이용 한도");
    await page.locator(".transport-dataset-grid").getByRole("button",{name:en?/KORAIL timetables/:/KORAIL 운행계획/}).click();
    await expect(page.locator(".transport-data-panel")).toContainText(en?"usage allowance has been reached":"제공처의 이용 한도");
    await expect(page.locator(".transport-data-panel")).not.toContainText(en?"returned no results":"현재 조건의 결과가 없습니다");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  });
}
