import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openNearby, type MapLayerFixture } from "./nearby-fixtures";

async function currentMap(page: Page) {
  return page.evaluate(() => { const maps=(window as unknown as {mapLayerFixture:MapLayerFixture}).mapLayerFixture.maps; const map=maps.at(-1)!;return {count:maps.length,base:map.base,layers:map.layers}; });
}

for(const first of ["base","layer"]) test(`failed ${first} choice survives another successful setting and restores both choices`,async({page})=>{
  const nearby=await openNearby(page);await nearby.getByRole("button",{name:"주변 장소 닫기",exact:true}).click();
  await page.locator('button[aria-controls="map-panel-layers"]').click();
  const sky=page.getByRole("button",{name:"스카이뷰",exact:true}),traffic=page.locator("#map-panel-layers").getByRole("button",{name:"교통정보",exact:true});
  await page.evaluate(first=>{const s=(window as unknown as {mapLayerFixture:MapLayerFixture}).mapLayerFixture;s.failBase=first==="base";s.failLayer=first==="layer";},first);
  if(first==="base"){await sky.click();await traffic.click();}else{await traffic.click();await sky.click();}
  await expect(sky).toHaveAttribute("aria-pressed",String(first!=="base"));await expect(traffic).toHaveAttribute("aria-pressed",String(first!=="layer"));
  await expect(page.locator(".map-layer-status")).toContainText("확인할 수 없습니다");
  await page.evaluate(()=>{const s=(window as unknown as {mapLayerFixture:MapLayerFixture}).mapLayerFixture;s.failBase=false;s.failLayer=false;});
  const reload=page.locator("#map-panel-layers").getByRole("button",{name:"지도 다시 불러오기",exact:true});await reload.focus();await page.keyboard.press("Enter");
  await expect(sky).toHaveAttribute("aria-pressed","true");await expect(traffic).toHaveAttribute("aria-pressed","true");
  expect((await currentMap(page)).base).toBe(3);expect((await currentMap(page)).layers).toEqual([4]);await expect(reload).toBeFocused();
});

test("alternative map clears Kakao layer claims and reconnection restores the requested choices",async({page})=>{
  const nearby=await openNearby(page);await nearby.getByRole("button",{name:"주변 장소 닫기",exact:true}).click();
  const sky=page.getByRole("button",{name:"스카이뷰",exact:true});await sky.click();
  await page.locator('button[aria-controls="map-panel-layers"]').click();
  const traffic=page.locator("#map-panel-layers").getByRole("button",{name:"교통정보",exact:true});await traffic.click();
  await page.route("**/api/map-config",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({provider:"osm"})}));
  await page.getByRole("button",{name:"용지호수공원 일정에 추가",exact:true}).click();
  await expect(page.locator(".map-provider-badge.osm")).toBeVisible();
  await expect(sky).toHaveAttribute("aria-pressed","false");await expect(sky).toBeDisabled();await expect(traffic).toHaveAttribute("aria-pressed","false");
  await expect(traffic).toHaveAttribute("aria-disabled","true");await traffic.focus();await page.keyboard.press("Enter");await expect(traffic).toHaveAttribute("aria-pressed","false");
  await page.route("**/api/map-config",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({provider:"kakao",javascriptKey:"e2e-stub-key"})}));
  const reconnect=page.locator("#map-panel-layers").getByRole("button",{name:"지도 다시 불러오기",exact:true});await reconnect.focus();await page.keyboard.press("Enter");
  await expect(page.locator(".map-provider-badge.kakao")).toBeVisible();await expect(sky).toHaveAttribute("aria-pressed","true");await expect(traffic).toHaveAttribute("aria-pressed","true");
  expect((await currentMap(page)).base).toBe(3);expect((await currentMap(page)).layers).toEqual([4]);
  await expect(reconnect).toBeFocused();
});

for (const kind of ["base", "layer"]) test(`map ${kind} selection stays true when an itinerary change recreates the map`, async ({page}) => {
  const nearby=await openNearby(page);await nearby.getByRole("button",{name:"주변 장소 닫기",exact:true}).click();
  const sky=page.getByRole("button",{name:"스카이뷰",exact:true});
  await sky.click();await expect(sky).toHaveAttribute("aria-pressed","true");
  if(kind==="layer") {
    await page.locator('button[aria-controls="map-panel-layers"]').click();
    await page.locator("#map-panel-layers").getByRole("button",{name:"교통정보",exact:true}).click();
  }
  const before=await currentMap(page);expect(before.base).toBe(3);if(kind==="layer")expect(before.layers).toEqual([4]);
  await page.getByRole("button",{name:"용지호수공원 일정에 추가",exact:true}).click();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(2);
  await expect.poll(async()=>(await currentMap(page)).count).toBeGreaterThan(before.count);
  await expect(sky).toHaveAttribute("aria-pressed","true");
  expect((await currentMap(page)).base).toBe(3);
  if(kind==="layer") {await expect(page.locator("#map-panel-layers").getByRole("button",{name:"교통정보",exact:true})).toHaveAttribute("aria-pressed","true");expect((await currentMap(page)).layers).toEqual([4]);}
});

for (const english of [false, true]) for (const theme of ["light", "dark"]) test(`map layer controls and recovery are accessible in ${english ? "English" : "Korean"} ${theme}`, async ({page},testInfo) => {
  const nearby = await openNearby(page, english, theme);
  await nearby.getByRole("button", {name: english ? "Close nearby places" : "주변 장소 닫기", exact:true}).click();
  await page.locator('button[aria-controls="map-panel-layers"]').click();
  const panel = page.getByRole("region",{name:english ? "Map display settings" : "지도 표시 설정",exact:true});
  const traffic=panel.getByRole("button",{name:english ? "Traffic" : "교통정보",exact:true});
  await traffic.click(); await expect(traffic).toHaveAttribute("aria-pressed","true");
  for (const [width,height] of [[320,568],[360,640],[390,844],[430,932],[768,1024],[1024,768],[1280,720],[1366,768],[1440,900],[1920,1080],[2560,1440]]) {
    await page.setViewportSize({width,height});
    const buttons=panel.getByRole("button");await expect(buttons).toHaveCount(9);
    expect(await buttons.evaluateAll(bs=>bs.map(b=>({name:b.textContent,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height,scroll:b.scrollWidth,client:b.clientWidth})).filter(b=>b.width<44||b.height<44||b.scroll>b.client+1)),`${width}px ${theme} controls`).toEqual([]);
    const close=panel.getByRole("button",{name:english ? "Close map settings" : "지도 설정 닫기",exact:true});await close.focus();
    for(let index=1;index<9;index++) {await page.keyboard.press("Tab");await expect(buttons.nth(index)).toBeFocused();expect(await buttons.nth(index).evaluate(b=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),`${width}px control ${index}`).toBe(true);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    if([390,1366].includes(width))await panel.screenshot({path:testInfo.outputPath(`map-layers-${width}-${english ? "en":"ko"}-${theme}.png`)});
  }
  expect((await new AxeBuilder({page}).include("#map-panel-layers").analyze()).violations).toEqual([]);
  await panel.getByRole("button",{name:english ? "Close map settings" : "지도 설정 닫기",exact:true}).click();
  await page.evaluate(()=>{(window as unknown as {mapLayerFixture:MapLayerFixture}).mapLayerFixture.failBase=true;});
  await page.getByRole("button",{name:english ? "Skyview" : "스카이뷰",exact:true}).click();
  const retry=page.getByRole("button",{name:english ? "Reapply map settings" : "지도 설정 다시 적용",exact:true});
  for(const width of [390,1366]) {
    await page.setViewportSize({width,height:844});
    await page.locator('.map-command-primary button[aria-controls="map-panel-route"]').focus();
    await page.keyboard.press("Shift+Tab"); await expect(retry).toBeFocused();
    expect(await retry.evaluate(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44&&b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})).toBe(true);
    expect((await new AxeBuilder({page}).include(".map-layer-status").analyze()).violations).toEqual([]);
  }
});

for(const kind of ["base","layer"]) test(`map ${kind} failure is explained without an unhandled exception`,async({page})=>{
  const errors:string[]=[];page.on("pageerror",(error)=>errors.push(error.message));
  const nearby=await openNearby(page);await nearby.getByRole("button",{name:"주변 장소 닫기",exact:true}).click();
  await page.evaluate((kind)=>{const state=(window as unknown as {mapLayerFixture:MapLayerFixture}).mapLayerFixture;if(kind==="base")state.failBase=true;else state.failLayer=true;},kind);
  if(kind==="base")await page.getByRole("button",{name:"스카이뷰",exact:true}).click();
  else {await page.locator('button[aria-controls="map-panel-layers"]').click();await page.locator("#map-panel-layers").getByRole("button",{name:"교통정보",exact:true}).click();}
  await page.evaluate(()=>new Promise<void>((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  expect(errors).toEqual([]);
  await expect(page.locator(".map-layer-status")).toContainText("확인할 수 없습니다");
  const before=await currentMap(page);
  let release!:()=>void;const gate=new Promise<void>((resolve)=>{release=resolve;});let held=0;
  await page.route("**/api/map-config",async(route)=>{held++;await gate;await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({provider:"kakao",javascriptKey:"e2e-stub-key"})});});
  const retry=page.getByRole("button",{name:"지도 설정 다시 적용",exact:true});await retry.focus();await page.keyboard.press("Enter");
  await expect.poll(()=>held).toBe(1);await expect(retry).toHaveAttribute("aria-disabled","true");await page.keyboard.press("Enter");expect(held).toBe(1);
  await page.evaluate(()=>{const state=(window as unknown as {mapLayerFixture:MapLayerFixture}).mapLayerFixture;state.failBase=false;state.failLayer=false;});release();
  await expect(page.locator(".map-layer-status")).toContainText("지도 설정을 적용했습니다");await expect(retry).toBeFocused();
  expect((await currentMap(page)).count).toBe(before.count+1);
  if(kind==="base")expect((await currentMap(page)).base).toBe(3);else expect((await currentMap(page)).layers).toEqual([4]);
  expect(errors).toEqual([]);
});
