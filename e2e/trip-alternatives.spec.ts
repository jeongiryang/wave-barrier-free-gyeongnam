import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi, openItinerary } from "./fixtures";
import { alternativePlan } from "./alternative-fixtures";

const requiredKeys = ["parking", "route", "wheelchair", "elevator", "restroom"];
const result = { ...alternativePlan, places: alternativePlan.places.filter(place => place.id !== '1005'), explorationPlaces: alternativePlan.places.filter(place => place.id === '1005') };
const currentValues = async (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {});
async function tripSnapshot(page:Page){const value=await currentValues(page);return{ids:JSON.parse(value['wave-saved-places']),order:JSON.parse(value['wave-trip-order-v1']),schedule:JSON.parse(value['wave-trip-schedule-v1'])};}
async function timetable(page: Page) { const view=page.getByRole('group',{name:'일정 보기 방식',exact:true});if(await view.count())await view.getByRole('button',{name:'시간표',exact:true}).click(); }
async function setup(page: Page) {
  await mockPublicShellApi(page); await mockPlannerApi(page, { preserveView: true, savedPlaces: alternativePlan.places });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(places => {
    if (!localStorage.getItem("wave-current-trip-v1")) localStorage.setItem("wave-current-trip-v1", JSON.stringify({ version: 1, values: {
      'wave-planner-region-v1':'창원','wave-trip-themes-v1':'["nature"]','wave-saved-places':'["1001","1002"]','wave-saved-place-catalog-v1':JSON.stringify(places),
      'wave-trip-order-v1':'{"mode":"manual","ids":["1001","1002"]}',
      'wave-trip-schedule-v1':JSON.stringify({ travelStart:'2026-09-14',travelEnd:'2026-09-14',dayStartTime:'10:00',scheduleAssignments:{1001:'2026-09-14',1002:'2026-09-14'},visitMinutesByPlaceId:{1001:180},breakMinutesByPlaceId:{1001:15} })
    } }));
  }, result.places);
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: result }));
  await page.route("**/api/wave?action=visit-info*", route => {
    const id = new URL(route.request().url()).searchParams.get("contentId");
    return route.fulfill({ json: { id, status: "available", checkedAt: new Date().toISOString(), source: "ⓒ한국관광공사", hours: "09:00~18:00", setting: id === "1003" ? { state: "indoor-space", detail: "실내 전시 공간에서 쉴 수 있습니다." } : { state: "unknown", detail: "" } } });
  });
  await page.goto("/planner"); await chooseTripConditions(page); await openItinerary(page); await timetable(page);
  return page.locator(".simple-timeboard");
}
async function open(page: Page, name = "경남도립미술관") {
  await page.getByRole("button", { name: `${name} 비슷한 장소로 교체`, exact: true }).click();
  return page.getByRole("dialog", { name: "이곳만 바꿔 볼까요?", exact: true });
}

test("one-place comparison keeps dates/order, supports cancel and undo, and respects later edits", async ({ page }, info) => {
  const board = await setup(page);
  const before = await tripSnapshot(page);
  let dialog = await open(page);
  await expect(dialog).not.toContainText("편의 미확인 전시실");
  await expect(dialog).toContainText("현재 여행의 편의 5개");
  await dialog.getByRole("button", { name: "더 짧게 둘러볼래요", exact: true }).click();
  for (const width of info.project.name.startsWith("desktop") ? [1440, 960] : [390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await page.screenshot({ path: info.outputPath(`alternatives-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include(".place-comparison-dialog").analyze()).violations).toEqual([]);
  }
  await dialog.getByRole("button", { name: "시민문화쉼터 선택", exact: true }).click();
  await dialog.getByRole("button", { name: "현재 일정 유지", exact: true }).click();
  await expect(board.locator(".simple-stop-copy h3 > button")).toHaveText(["경남도립미술관", "용지호수공원"]);
  expect(await tripSnapshot(page)).toEqual(before);
  dialog = await open(page); await dialog.getByRole("button", { name: "시민문화쉼터 선택", exact: true }).click();
  await dialog.getByRole("button", { name: "선택한 장소로 교체", exact: true }).click();
  await expect(board.locator(".simple-stop-copy h3 > button")).toHaveText(["시민문화쉼터", "용지호수공원"]);
  const replaced=await tripSnapshot(page);expect(replaced.schedule.visitMinutesByPlaceId['1003']).toBe(180);expect(replaced.schedule.breakMinutesByPlaceId['1003']).toBe(15);expect(replaced.schedule.scheduleAssignments['1003']).toBe('2026-09-14');
  await page.getByRole("button", { name: "방금 교체 되돌리기", exact: true }).click();
  await expect(board.locator(".simple-stop-copy h3 > button")).toHaveText(["경남도립미술관", "용지호수공원"]);
  expect(await tripSnapshot(page)).toEqual(before);
  await expect(board).toContainText("180분 머묾"); await expect(board).toContainText("방문 뒤 15분 휴식");
  dialog = await open(page); await dialog.getByRole("button", { name: "시민문화쉼터 선택", exact: true }).click(); await dialog.getByRole("button", { name: "선택한 장소로 교체", exact: true }).click();
  await board.getByLabel("시민문화쉼터 일정 수정", { exact: true }).click(); const editor=page.getByRole('dialog',{name:'시민문화쉼터 수정',exact:true});await editor.getByLabel("시민문화쉼터 머무는 시간", { exact: true }).selectOption("30"); await editor.getByRole('button',{name:'적용',exact:true}).click();
  const edited=await tripSnapshot(page);
  await page.getByRole("button", { name: "방금 교체 되돌리기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "새 선택을 보존하기 위해" })).toBeVisible();
  expect(await tripSnapshot(page)).toEqual(edited);
  await page.reload(); await openItinerary(page);await timetable(page);await expect(board.locator(".simple-stop-copy h3 > button")).toHaveText(["시민문화쉼터", "용지호수공원"]); await expect(board).toContainText("30분 머묾");
});

test("indoor evidence is checked explicitly and nearby discovery retains facility and activity choices", async ({ page }) => {
  await setup(page);
  const calls: URL[] = []; page.on("request", request => { if (request.url().includes("/api/wave?")) calls.push(new URL(request.url())); });
  const dialog = await open(page);
  await dialog.getByRole("button", { name: "실내 공간으로", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "시민문화쉼터 선택", exact: true })).toHaveCount(0);
  // Saved-place evidence and its visible photo may load in the background;
  // indoor details and alternative searches require an explicit action.
  expect(calls.filter(url => !["places", "spot-photo"].includes(url.searchParams.get("action") || ""))).toHaveLength(0);
  for (const photo of calls.filter(url => url.searchParams.get("action") === "spot-photo")) {
    expect(["1001", "1002"]).toContain(photo.searchParams.get("contentId"));
    expect(photo.searchParams.has("latitude")).toBe(false);
    expect(photo.searchParams.has("longitude")).toBe(false);
  }
  for (const lookup of calls.filter(url => url.searchParams.get("action") === "places")) {
    expect(lookup.searchParams.get("ids")?.split(",").sort()).toEqual(["1001", "1002"]);
    expect((lookup.searchParams.get("facilityKeys") || "").split(",")).toEqual(requiredKeys);
  }
  await dialog.locator(".travel-book-actions").filter({ hasText: "시민문화쉼터" }).getByRole("button", { name: "실내 공간 정보 확인", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "시민문화쉼터 선택", exact: true })).toBeVisible();
  expect(calls.filter(url => url.searchParams.get("action") === "visit-info")).toHaveLength(1);
  expect(calls.find(url => url.searchParams.get("action") === "visit-info")?.searchParams.get("contentId")).toBe("1003");
  await dialog.getByRole("button", { name: "새로운 곳을 볼래요", exact: true }).click();
  await dialog.getByRole("button", { name: "다음 후보 보기", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "시민문화쉼터 선택", exact: true })).toHaveCount(0);
  await dialog.getByText("경남의 다른 후보 살펴보기", { exact: true }).click();
  await dialog.getByRole("combobox", { name: "살펴볼 지역", exact: true }).selectOption("함안");
  await dialog.getByRole("button", { name: "같은 편의로 후보 찾기", exact: true }).click();
  await expect(dialog.getByRole("status").filter({ hasText: "함안에서 후보" })).toBeVisible();
  expect(calls.filter(url => url.searchParams.get("action") === "plan")).toHaveLength(1);
  const request = calls.find(url => url.searchParams.get("action") === "plan")!;
  expect(request.searchParams.get("region")).toBe("함안"); expect(request.searchParams.get("themes")).toBe("nature"); expect((request.searchParams.get("facilityKeys") || request.searchParams.get("profiles") || "").split(",")).toEqual(requiredKeys);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "경남도립미술관 비슷한 장소로 교체", exact: true })).toBeFocused();
  expect(JSON.parse((await currentValues(page))["wave-saved-places"])).toEqual(["1001", "1002"]);
});

test("forecast comparison leaves missing dates unknown and moves only the selected stop within seven days", async ({ page }) => {
  const board = await setup(page);
  await page.route("**/api/wave?action=crowd-calendar*", route => route.fulfill({ json: { id: "1001", title: "경남도립미술관", checkedAt: new Date().toISOString(), source: "ⓒ한국관광공사", status: "available", days: [{ date: "2026-09-13", rate: 0 }, { date: "2026-09-15", rate: 20 }, { date: "2026-09-25", rate: 10 }] } }));
  const dialog = await open(page); await dialog.getByText("장소를 유지하고 날짜 비교", { exact: true }).click();
  await dialog.getByRole("button", { name: "날짜별 예측 확인", exact: true }).click();
  const table = dialog.getByRole("region", { name: "날짜별 관광 집중률", exact: true });
  await expect(table.getByRole("row").filter({ hasText: "2026-09-14" })).toContainText("미확인");
  await expect(table.getByRole("row").filter({ hasText: "2026-09-13" })).toContainText("0.0%");
  await expect(table.getByRole("button", { name: "09-25 선택", exact: true })).toBeDisabled();
  await table.getByRole("button", { name: "09-13 선택", exact: true }).click();
  await dialog.getByRole("button", { name: "이 날짜로 방문일 변경", exact: true }).click();
  await expect(board.locator(".simple-stop-copy h3 > button")).toHaveText(["경남도립미술관"]);
  await board.getByRole("button", { name: "2일차 09/14", exact: true }).click();
  await expect(board.locator(".simple-stop-copy h3 > button")).toHaveText(["용지호수공원"]);
  await page.reload();
  const value = JSON.parse((await currentValues(page))["wave-trip-schedule-v1"]);
  expect(value.scheduleAssignments).toEqual({ "1001": "2026-09-13", "1002": "2026-09-14" });
  expect(value.travelStart).toBe("2026-09-13"); expect(value.travelEnd).toBe("2026-09-14");
  expect(value.visitMinutesByPlaceId["1001"]).toBe(180); expect(value.breakMinutesByPlaceId["1001"]).toBe(15);
});

test("unverified facility candidates need explicit opt-in and remain visibly unverified", async ({ page }) => {
  await setup(page);
  const dialog = await open(page);
  await expect(dialog.getByRole('button', { name: '편의 미확인 전시실 선택', exact: true })).toHaveCount(0);
  await dialog.getByLabel('편의 미확인 후보도 직접 비교', { exact:true }).check();
  await dialog.getByRole('button', { name: '편의 미확인 전시실 선택', exact: true }).click();
  await expect(dialog.getByRole('status').filter({hasText:'이 후보는 필요한 편의'})).toContainText('미확인');
  await dialog.getByLabel('편의 미확인 후보도 직접 비교', { exact:true }).uncheck();
  await expect(dialog.getByRole('button', {name:'선택한 장소로 교체',exact:true})).toBeDisabled();
  await expect(dialog.getByRole('button', { name: '편의 미확인 전시실 선택', exact: true })).toHaveCount(0);
});

test('optional facilities and activities do not block another-region alternatives or invent nature',async({page})=>{
  await setup(page);
  const requests:URL[]=[];
  await page.route('**/api/wave?action=plan*',route=>{const url=new URL(route.request().url());requests.push(url);const region=url.searchParams.get('region')||'창원';const keys=(url.searchParams.get('facilityKeys')||url.searchParams.get('profiles')||'').split(',').filter(Boolean);return route.fulfill({json:{...result,criteria:{facilityKeys:keys},places:result.places.map(place=>({...place,city:region}))}});});
  await page.locator(".wave-header").locator(".night-search-link").click();
  await page.getByRole('button',{name:'자연·휴양',exact:true}).click();await page.locator('.simple-facility-trigger').click();const picker=page.getByRole('dialog',{name:'필요한 편의',exact:true});await picker.getByRole('button',{name:'선택 해제',exact:true}).click();await picker.getByRole('button',{name:'적용',exact:true}).click();
  await expect.poll(()=>requests.some(url=>!url.searchParams.get('themes')&&!url.searchParams.get('facilityKeys')&&!url.searchParams.get('profiles'))).toBe(true);await expect(page.locator('.simple-results')).toHaveAttribute('aria-busy','false');
  await openItinerary(page);const before=await currentValues(page);const dialog=await open(page);await expect(dialog).toContainText('현재 여행의 편의 0개');await dialog.getByText('경남의 다른 후보 살펴보기',{exact:true}).click();await dialog.getByRole('combobox',{name:'살펴볼 지역',exact:true}).selectOption('함안');await dialog.getByRole('button',{name:'같은 편의로 후보 찾기',exact:true}).click();
  await expect(dialog.getByRole('status').filter({hasText:'함안에서 후보'})).toBeVisible();const request=requests.filter(url=>url.searchParams.get('region')==='함안');expect(request).toHaveLength(1);expect(request[0].searchParams.get('themes')||'').toBe('');expect(request[0].searchParams.get('facilityKeys')||request[0].searchParams.get('profiles')||'').toBe('');
  await expect(dialog.getByRole('button',{name:'시민문화쉼터 선택',exact:true})).toBeVisible();await dialog.getByRole('button',{name:'현재 일정 유지',exact:true}).click();expect(await currentValues(page)).toEqual(before);
});
