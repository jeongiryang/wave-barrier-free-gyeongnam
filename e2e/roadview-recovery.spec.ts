import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openNearby } from "./nearby-fixtures";

interface RoadviewFixture { failure: string; requests: ((id: number | null) => void)[]; views: { pano?: number; listeners: Set<() => void> }[] }
const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = []; browserErrors.set(page, errors);
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(browserErrors.get(page)).toEqual([]); });
async function prepare(page: Page, english = false, theme = "light") {
  const nearby=await openNearby(page,english,theme);
  await nearby.getByRole("button",{name:english ? "Close nearby places":"주변 장소 닫기",exact:true}).click();
  await page.evaluate(()=>{
    const state:RoadviewFixture={failure:"",requests:[],views:[]};Object.assign(window,{roadviewFixture:state});
    const sdk=window.kakao!.maps;
    sdk.Roadview=class {pano?:number;listeners=new Set<()=>void>();constructor(){if(state.failure==="construct")throw Error("controlled Roadview failure");state.views.push(this);}setPanoId(id:number){if(state.failure==="pano")throw Error("controlled panorama failure");this.pano=id;}relayout(){}};
    sdk.RoadviewClient=class {getNearestPanoId(_p:unknown,_r:number,callback:(id:number|null)=>void){if(state.failure==="search")throw Error("controlled search failure");state.requests.push(callback);}};
    const oldAdd=sdk.event!.addListener;
    sdk.event!.addListener=(target,event,callback)=>{if(event==="init")(target as RoadviewFixture["views"][number]).listeners.add(callback as ()=>void);else oldAdd(target,event,callback);};
    sdk.event!.removeListener=(target,_event,callback)=>(target as RoadviewFixture["views"][number]).listeners.delete(callback as ()=>void);
  });
}
async function choose(page:Page,english=false){
  const trigger=page.getByRole("button",{name:english ? "◉ Roadview":"◉ 로드뷰",exact:true});await trigger.focus();await page.keyboard.press("Enter");
  const choice=page.locator("#map-roadview-choice");await expect(choice).toBeVisible();
  await expect(choice.getByRole("button",{name:english ? "Cancel Roadview selection":"로드뷰 위치 선택 취소",exact:true})).toBeFocused();
  await page.keyboard.press("Tab");const select=choice.getByLabel(english ? "Itinerary place":"일정 장소",{exact:true});await expect(select).toBeFocused();await expect(select).toHaveValue("");
  await select.selectOption({index:1});await page.keyboard.press("Tab");
  const open=choice.getByRole("button",{name:english ? "Open selected place Roadview":"선택한 장소 로드뷰 열기",exact:true});await expect(open).toBeFocused();await page.keyboard.press("Enter");
  const panel=page.locator("#map-roadview-panel");await expect(panel).toBeVisible();await expect(panel.getByRole("button",{name:english ? "Close Roadview":"로드뷰 닫기",exact:true})).toBeFocused();return panel;
}
async function deliver(page:Page,index:number,id:number|null,init=false){await page.evaluate(({index,id,init})=>{const f=(window as unknown as {roadviewFixture:RoadviewFixture}).roadviewFixture;f.requests[index](id);if(init)f.views.at(-1)!.listeners.forEach(fn=>fn());},{index,id,init});}

test("Roadview keyboard choice waits for SDK initialization and returns focus",async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await prepare(page);const panel=await choose(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });await expect(panel.getByRole("button",{name:"로드뷰 닫기",exact:true})).toBeFocused();await page.emulateMedia({ reducedMotion: "reduce" });await expect(panel.getByRole("button",{name:"로드뷰 닫기",exact:true})).toBeFocused();
  await deliver(page,0,1);await expect(panel.getByRole("status")).toContainText("불러오고");await page.evaluate(()=>(window as unknown as {roadviewFixture:RoadviewFixture}).roadviewFixture.views[0].listeners.forEach(fn=>fn()));
  await expect(panel.getByRole("status")).toContainText("초기화되었습니다");await page.keyboard.press("Escape");await expect(panel).toBeHidden();await expect(page.getByRole("button",{name:"◉ 로드뷰",exact:true})).toBeFocused();expect(errors).toEqual([]);
});
for(const kind of ["construct","search","pano"])test(`Roadview ${kind} failure supports one retry without losing focus`,async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await prepare(page);await page.evaluate(kind=>{(window as unknown as {roadviewFixture:RoadviewFixture}).roadviewFixture.failure=kind;},kind);
  const panel=await choose(page);if(kind==="pano")await deliver(page,0,1);await expect(panel.getByRole("status")).toContainText("불러오지 못");
  await page.evaluate(()=>{(window as unknown as {roadviewFixture:RoadviewFixture}).roadviewFixture.failure="";});const retry=panel.getByRole("button",{name:"로드뷰 다시 시도",exact:true});await retry.focus();await page.keyboard.press("Enter");await expect(retry).toHaveAttribute("aria-disabled","true");await page.keyboard.press("Enter");
  const count=await page.evaluate(()=>(window as unknown as {roadviewFixture:RoadviewFixture}).roadviewFixture.requests.length);expect(count).toBe(kind==="pano"?2:1);await deliver(page,count-1,2,true);await expect(panel.getByRole("status")).toContainText("초기화되었습니다");await expect(retry).toBeFocused();expect(errors).toEqual([]);
});
test("Roadview timeout ignores late responses and distinguishes an empty result",async({page})=>{
  await prepare(page);await page.clock.install();const panel=await choose(page);await page.clock.fastForward(10_001);await expect(panel.getByRole("status")).toContainText("불러오지 못");await deliver(page,0,1);expect(await page.evaluate(()=>(window as unknown as {roadviewFixture:RoadviewFixture}).roadviewFixture.views[0].pano)).toBeUndefined();
  await panel.getByRole("button",{name:"로드뷰 다시 시도",exact:true}).click();await deliver(page,1,null);await expect(panel.getByRole("status")).toContainText("1km 안에 제공되는 로드뷰가 없습니다");
});
test("closing Roadview invalidates its callback before a new place is opened",async({page})=>{
  await prepare(page);await choose(page);await page.keyboard.press("Escape");await choose(page);await deliver(page,1,2,true);await deliver(page,0,null);
  await expect(page.locator("#map-roadview-panel").getByRole("status")).toContainText("초기화되었습니다");expect(await page.evaluate(()=>(window as unknown as {roadviewFixture:RoadviewFixture}).roadviewFixture.views[0].pano)).toBeUndefined();
});
test("a closing map panel cannot steal a later keyboard focus",async({page})=>{
  const nearby=await openNearby(page);
  await page.evaluate(()=>{const original=window.requestAnimationFrame;const frames:FrameRequestCallback[]=[];window.requestAnimationFrame=fn=>{frames.push(fn);return 100_000+frames.length;};Object.assign(window,{releasePanelFrames:()=>{window.requestAnimationFrame=original;frames.forEach(fn=>fn(performance.now()));}});});
  await nearby.getByRole("button",{name:"주변 장소 닫기",exact:true}).click();const roadview=page.getByRole("button",{name:"◉ 로드뷰",exact:true});await roadview.focus();
  await page.evaluate(()=>(window as unknown as {releasePanelFrames:()=>void}).releasePanelFrames());await expect(roadview).toBeFocused();await page.keyboard.press("Enter");await expect(page.locator("#map-roadview-choice")).toBeVisible();
});
for(const english of [false,true])for(const theme of ["light","dark"])test(`Roadview readable controls ${english ? "English":"Korean"} ${theme}`,async({page},testInfo)=>{
  await prepare(page,english,theme);const panel=await choose(page,english);await deliver(page,0,null);
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1366,768],[1440,900],[1920,1080],[2560,1440]]){
    await page.setViewportSize({width,height});const retry=panel.getByRole("button",{name:english ? "Retry Roadview":"로드뷰 다시 시도",exact:true});await panel.getByRole("button",{name:english ? "Close Roadview":"로드뷰 닫기",exact:true}).focus();await page.keyboard.press("Tab");await expect(retry).toBeFocused();
    expect(await panel.getByRole("button").evaluateAll(bs=>bs.map(b=>({w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height,overflow:b.scrollWidth-b.clientWidth})).filter(b=>b.w<44||b.h<44||b.overflow>1))).toEqual([]);
    expect(await retry.evaluate(b=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),`${width}px retry reachable`).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    if([390,1366].includes(width))await panel.screenshot({path:testInfo.outputPath(`roadview-${width}-${english ? "en":"ko"}-${theme}.png`)});
  }
  expect((await new AxeBuilder({page}).include("#map-roadview-panel").analyze()).violations).toEqual([]);
});
for(const english of [false,true])for(const theme of ["light","dark"])test(`Roadview location selection stays reachable ${english ? "English":"Korean"} ${theme}`,async({page},testInfo)=>{
  await prepare(page,english,theme);await page.getByRole("button",{name:english ? "◉ Roadview":"◉ 로드뷰",exact:true}).click();const choice=page.locator("#map-roadview-choice");
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1366,768],[1440,900],[1920,1080],[2560,1440]]){
    await page.setViewportSize({width,height});const controls=choice.locator("button,select");await expect(controls).toHaveCount(3);await controls.last().focus();await page.keyboard.press("Shift+Tab");await page.keyboard.press("Shift+Tab");
    for(let index=0;index<3;index++){
      if(index)await page.keyboard.press("Tab");await expect(controls.nth(index)).toBeFocused();
      expect(await controls.nth(index).evaluate(b=>{const r=b.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return [{width:r.width,height:r.height,overflow:b.scrollWidth-b.clientWidth,verticalOverflow:b.scrollHeight-b.clientHeight,reachable:b.contains(hit),hit:hit?.className}].filter(v=>v.width<44||v.height<44||v.overflow>1||v.verticalOverflow>1||!v.reachable);}),`${width}px choice control ${index}`).toEqual([]);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    if([390,1366].includes(width))await choice.screenshot({path:testInfo.outputPath(`roadview-choice-${width}-${english ? "en":"ko"}-${theme}.png`)});
  }
  expect((await new AxeBuilder({page}).include("#map-roadview-choice").analyze()).violations).toEqual([]);
  await choice.getByRole("button",{name:english ? "Cancel Roadview selection":"로드뷰 위치 선택 취소",exact:true}).click();await expect(page.getByRole("button",{name:english ? "◉ Roadview":"◉ 로드뷰",exact:true})).toBeFocused();
});
