import { closeNewTripMenu, newTripAction, startNewTrip } from './planner-header-fixtures';
import { acceptTripTimingWarning } from './trip-timing-fixtures';
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockPlannerApi, mockPublicShellApi, plan } from "./fixtures";

// Independent, public-guest journeys. All trip state is created by UI actions;
// storage reads below are evidence, never setup or repair.
test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: "block" });

const museum = "경남도립미술관";
const lake = "용지호수공원";
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><rect width="800" height="520" fill="#d6edf5"/></svg>';
type Audit = { unexpected: string[]; errors: string[]; plans: string[]; hotUpdates: string[] };
const audits = new WeakMap<Page, Audit>();

async function prepare(page: Page, info: TestInfo) {
  if (info.project.name === "mobile-chromium") await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const audit: Audit = { unexpected: [], errors: [], plans: [], hotUpdates: [] };
  audits.set(page, audit);
  const origin = new URL(String(info.project.use.baseURL)).origin;
  page.on("pageerror", error => audit.errors.push(error.message));
  page.on("console", message => {
    if (message.text().includes("[vite]") && /hot updated|page reload/.test(message.text())) audit.hotUpdates.push(`${new Date().toISOString()} ${message.text()}`);
  });
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/api/wave" && url.searchParams.get("action") === "plan") audit.plans.push(url.href);
  });
  // Bottom route denies every unrecognised API and external request. Known
  // fixture routes registered afterwards may fulfil or fall back to this guard.
  await page.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.origin !== origin && request.resourceType() === "image") return route.fulfill({ status: 200, contentType: "image/svg+xml", body: svg });
    audit.unexpected.push(`${request.method()} ${url.pathname}${url.search}`);
    return route.fulfill({ status: 503, json: { error: "UNEXPECTED_TEST_REQUEST" } });
  });
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
}

async function current(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    const parse = (key: string, fallback: string) => JSON.parse(values[key] || fallback);
    return {
      ids: parse("wave-saved-places", "[]") as string[],
      order: parse("wave-trip-order-v1", "{}") as { mode?: string; ids?: string[] },
      region: values["wave-planner-region-v1"] as string,
      identity: parse("wave-trip-identity-v1", "null") as { id: string; binding: null | { kind: string; id: string } } | null,
      schedule: parse("wave-trip-schedule-v1", "{}") as {
        travelStart: string; travelEnd: string; dayStartTime: string; travelMode: string;
        scheduleAssignments: Record<string, string>; visitMinutesByPlaceId: Record<string, number>;
      },
    };
  });
}

async function books(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("wave-travel-book-v1") || "[]") as Array<{
    id: string; tripId: string; travelStart: string; travelEnd: string; travelMode: string;
    places: Array<{ id: string }>; visitMinutesByPlaceId: Record<string, number>;
  }>);
}

async function browse(page: Page) {
  await page.goto("/planner");
  const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(region).toBeEnabled();
  await region.selectOption("창원");
  await expect(page.locator(".simple-place-row")).toHaveCount(2);
  await expect(page.getByRole("button", { name: `${museum} 일정에 담기`, exact: true })).toBeEnabled();
}

async function add(page: Page, name: string) {
  await page.getByRole("button", { name: `${name} 일정에 담기`, exact: true }).click();
  await expect(page.getByRole("button", { name: `${name} 담았음 · 되돌리기`, exact: true })).toHaveAttribute("aria-pressed", "true");
}

async function openItinerary(page: Page) {
  await page.locator(".wave-header").locator(".wave-my-trips").click();
}

async function timetable(page: Page, end = "2026-10-14") {
  await openItinerary(page);
  const setup = page.locator(".simple-initial-setup");
  await expect(setup.getByRole("heading", { name: "언제 떠날까요?", exact: true })).toBeVisible();
  await setup.getByLabel("시작일", { exact: true }).fill("2026-10-14");
  await setup.getByLabel("마지막 날", { exact: true }).fill(end);
  await setup.getByLabel("하루 시작", { exact: true }).fill("09:30");
  await setup.getByRole("combobox", { name: "이동 수단", exact: true }).selectOption("car");
  await setup.getByRole("button", { name: "시간표 만들기", exact: true }).click();
  await expect(page.locator(".simple-timeboard")).toBeVisible();
  await expect.poll(async () => (await current(page)).schedule.travelMode).toBe("car");
}

async function editor(page: Page) {
  await page.getByRole("button", { name: `${museum} 일정 수정`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `${museum} 수정`, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function noOverflow(page: Page, selector: string) {
  const geometry = await page.evaluate(selector => {
    const width = document.documentElement.clientWidth;
    return {
      width, scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      boxes: [...document.querySelectorAll<HTMLElement>(selector)].filter(node => node.checkVisibility()).map(node => {
        const rect = node.getBoundingClientRect();
        return { tag: node.className, left: rect.left, right: rect.right, width: rect.width };
      }),
    };
  }, selector);
  expect(geometry.scroll, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.boxes.length).toBeGreaterThan(0);
  for (const box of geometry.boxes) {
    expect(box.left, JSON.stringify(box)).toBeGreaterThanOrEqual(-1);
    expect(box.right, JSON.stringify(box)).toBeLessThanOrEqual(geometry.width + 1);
    expect(box.width).toBeGreaterThan(0);
  }
}

test.beforeEach(async ({ page }, info) => prepare(page, info));
test.afterEach(async ({ context }, info) => {
  if (info.status !== info.expectedStatus) {
    const evidence = await Promise.all(context.pages().map(async page => ({
      url: page.url(), audit: audits.get(page),
      current: await current(page).catch(() => "Context unavailable"),
      books: await books(page).catch(() => "Context unavailable"),
    })));
    await info.attach("continuity-failure-state", { contentType: "application/json", body: JSON.stringify(evidence, null, 2) });
  }
  for (const page of context.pages()) {
    const audit = audits.get(page);
    expect(audit?.unexpected || [], "Every external service must use a specific synthetic fixture").toEqual([]);
    expect(audit?.errors || [], "Uncaught page errors (retain HMR failures separately)").toEqual([]);
  }
});

test("지역만 고르면 후보를 자동 조회하고 날짜 없이 담아도 여행지 탐색을 유지한다", async ({ page }, info) => {
  await browse(page);
  const requests = audits.get(page)!.plans.map(value => new URL(value));
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every(url => url.searchParams.get("region") === "창원")).toBe(true);
  expect(await page.locator('.simple-browse-view input[type="date"]').count()).toBe(0);
  await add(page, museum);
  await add(page, lake);
  await expect(page.locator("#conditions")).toBeVisible();
  await expect(page.locator(".simple-results")).toBeVisible();
  await expect.poll(async () => (await current(page)).ids).toEqual(["1001", "1002"]);
  expect((await current(page)).schedule).toMatchObject({ travelStart: "", travelEnd: "", scheduleAssignments: {} });
  await noOverflow(page, ".simple-search-controls, .simple-place-row, .wave-header");
  await page.screenshot({ path: info.outputPath("browse-undated.png"), fullPage: true });
  await openItinerary(page);
  await expect(page.locator(".simple-initial-setup")).toContainText(`${museum} · ${lake}`);
  expect((await current(page)).schedule.travelStart).toBe("");
  expect((await new AxeBuilder({ page }).include(".simple-initial-setup").analyze()).violations).toEqual([]);
});

test("첫 날짜 설정 뒤 장소 수정은 적용 전까지 보존되고 취소와 되돌리기가 동작한다", async ({ page }, info) => {
  await browse(page); await add(page, museum); await add(page, lake);
  await timetable(page, "2026-10-15");
  const before = await current(page);
  expect(before.schedule).toMatchObject({ travelStart: "2026-10-14", travelEnd: "2026-10-15", dayStartTime: "09:30", scheduleAssignments: { "1001": "2026-10-14", "1002": "2026-10-15" } });
  let dialog = await editor(page);
  await dialog.getByRole("combobox", { name: `${museum} 머무는 시간`, exact: true }).selectOption("180");
  expect((await current(page)).schedule).toEqual(before.schedule);
  await noOverflow(page, ".simple-dialog");
  await dialog.screenshot({ path: info.outputPath("stop-editor.png") });
  expect((await new AxeBuilder({ page }).include(".simple-stop-editor").analyze()).violations).toEqual([]);
  await dialog.getByRole("button", { name: "취소", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect((await current(page)).schedule).toEqual(before.schedule);
  dialog = await editor(page);
  await dialog.getByRole("combobox", { name: `${museum} 머무는 시간`, exact: true }).selectOption("180");
  await dialog.getByRole("button", { name: "적용", exact: true }).click();
  await expect.poll(async () => (await current(page)).schedule.visitMinutesByPlaceId["1001"]).toBe(180);
  await expect(page.locator("#itinerary-stop-1001")).toContainText("180분 머묾");
  await page.locator(".simple-command-receipt").getByRole("button", { name: "되돌리기", exact: true }).click();
  await expect.poll(async () => (await current(page)).schedule).toEqual(before.schedule);
  expect((await current(page)).ids).toEqual(before.ids);
  expect((await current(page)).identity?.id).toBe(before.identity?.id);
});

test("새 여행은 미정 날짜의 이전 여행을 백업하고 다시 열어도 날짜와 ID를 바꾸지 않는다", async ({ page }) => {
  await browse(page); await add(page, museum); await add(page, lake);
  const before = await current(page);
  await startNewTrip(page);
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue("");
  await expect.poll(async () => (await current(page)).ids).toEqual([]);
  const fresh = await current(page), archived = await books(page);
  expect(fresh.identity?.id).not.toBe(before.identity?.id);
  expect(fresh.schedule).toMatchObject({ travelStart: "", travelEnd: "" });
  expect(archived).toHaveLength(1);
  expect(archived[0]).toMatchObject({ tripId: before.identity?.id, travelStart: "", travelEnd: "", places: [{ id: "1001" }, { id: "1002" }] });
  await page.goto("/travel-book");
  await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
  await expect(page.locator(".simple-initial-setup")).toBeVisible();
  const restored = await current(page);
  expect(restored.ids).toEqual(before.ids);
  expect(restored.order).toEqual(before.order);
  expect(restored.identity?.id).toBe(before.identity?.id);
  expect(restored.schedule).toMatchObject({ travelStart: "", travelEnd: "", travelMode: before.schedule.travelMode, scheduleAssignments: {} });
  await page.reload();
  await expect(page.locator(".simple-initial-setup")).toBeVisible();
  expect((await current(page)).schedule.travelStart).toBe("");
  expect(await books(page)).toHaveLength(1);
});

test("저장 버튼 하나로 첫 저장 후 날짜·체류·장소 변경을 같은 여행에 자동 갱신한다", async ({ page }) => {
  await browse(page); await add(page, museum); await add(page, lake); await timetable(page);
  const control = page.locator(".simple-save-control");
  await expect(control.getByRole("button")).toHaveCount(1);
  await control.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
  await expect(control.getByRole("status")).toContainText("이후 변경도 자동으로 저장돼요");
  const first = (await books(page))[0];
  expect((await current(page)).identity).toMatchObject({ id: first.tripId, binding: { kind: "local", id: first.id } });
  const stop = await editor(page);
  await stop.getByRole("combobox", { name: `${museum} 머무는 시간`, exact: true }).selectOption("180");
  await stop.getByRole("button", { name: "적용", exact: true }).click();
  await expect.poll(async () => (await books(page))[0].visitMinutesByPlaceId["1001"]).toBe(180);
  await page.getByRole("button", { name: "여행 설정", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "여행 설정", exact: true });
  await settings.getByLabel("마지막 날", { exact: true }).fill("2026-10-15");
  await settings.getByRole("button", { name: "적용", exact: true }).click();
  await expect(control.getByRole("alert")).toContainText("일정의 시간과 날짜를 확인한 뒤 저장해 주세요.");
  expect((await books(page))[0].travelEnd).toBe("2026-10-14");
  await control.getByRole("button").click();
  await acceptTripTimingWarning(page);
  await expect.poll(async () => (await books(page))[0].travelEnd).toBe("2026-10-15");
  await page.locator(".wave-header").locator(".night-search-link").click();
  await page.getByRole("button", { name: `${lake} 담았음 · 되돌리기`, exact: true }).click();
  await openItinerary(page);
  await expect.poll(async () => (await books(page))[0].places.map(place => place.id)).toEqual(["1001"]);
  expect(await books(page)).toHaveLength(1);
  expect((await books(page))[0]).toMatchObject({ id: first.id, tripId: first.tripId, travelStart: "2026-10-14", travelEnd: "2026-10-15", travelMode: "car" });
  await page.reload();
  await expect(page.locator("#itinerary-stop-1001")).toContainText("180분 머묾");
  expect((await current(page)).identity).toMatchObject({ id: first.tripId, binding: { kind: "local", id: first.id } });
  expect(await books(page)).toHaveLength(1);
});

test("다른 탭에서 새 여행을 열면 기존 편집 초안과 자동 저장이 새 여행을 덮어쓰지 않는다", async ({ page, context }, info) => {
  await browse(page); await add(page, museum); await timetable(page);
  await page.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
  await expect(page.locator(".simple-save-control [role=status]")).toBeVisible();
  const old = await current(page), archived = await books(page);
  const stop = await editor(page);
  await stop.getByRole("combobox", { name: `${museum} 머무는 시간`, exact: true }).selectOption("180");
  const other = await context.newPage();
  await prepare(other, info);
  await other.goto("/planner");
  await newTripAction(other); await closeNewTripMenu(other);
  await startNewTrip(other);
  await expect(other.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue("");
  await expect.poll(async () => (await current(other)).ids).toEqual([]);
  const fresh = await current(other);
  expect(fresh.identity?.id).not.toBe(old.identity?.id);
  // The explicit new-trip action may refresh archive metadata. The stale tab
  // must not alter that newly committed backup or the new current trip.
  const backedUp = await books(other);
  expect(backedUp).toHaveLength(1);
  expect(backedUp[0]).toMatchObject({
    id: archived[0].id, tripId: old.identity?.id, places: archived[0].places,
    travelStart: old.schedule.travelStart, travelEnd: old.schedule.travelEnd,
    travelMode: old.schedule.travelMode, visitMinutesByPlaceId: old.schedule.visitMinutesByPlaceId,
  });
  await expect(page.locator(".simple-storage-notice [role=alert]")).toContainText("다른 탭에서 여행이 바뀌었어요");
  await stop.getByRole("button", { name: "적용", exact: true }).click();
  await expect(stop.getByRole("alert")).toHaveText("다른 탭에서 여행이 바뀌었어요. 새로고침해서 확인해 주세요.");
  expect(await current(other)).toEqual(fresh);
  expect(await books(other)).toEqual(backedUp);
  await stop.getByRole("button", { name: "취소", exact: true }).click();
  page.once("dialog", async dialog => {
    expect(dialog.type()).toBe("beforeunload");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "현재 여행 불러오기", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue("");
  expect(await current(page)).toEqual(fresh);
});

test("여행 설정 취소·적용·되돌리기가 날짜와 이동을 보존하고 시간표와 지도는 화면 안에 맞는다", async ({ page }, info) => {
  await browse(page); await add(page, museum); await add(page, lake); await timetable(page);
  const before = await current(page);
  await page.getByRole("button", { name: "여행 설정", exact: true }).click();
  let settings = page.getByRole("dialog", { name: "여행 설정", exact: true });
  await settings.getByLabel("마지막 날", { exact: true }).fill("2026-10-15");
  await settings.getByRole("combobox", { name: "이동 수단", exact: true }).selectOption("walk");
  expect((await current(page)).schedule).toEqual(before.schedule);
  await settings.getByRole("button", { name: "취소", exact: true }).click();
  expect((await current(page)).schedule).toEqual(before.schedule);
  await page.getByRole("button", { name: "여행 설정", exact: true }).click();
  settings = page.getByRole("dialog", { name: "여행 설정", exact: true });
  await settings.getByLabel("마지막 날", { exact: true }).fill("2026-10-15");
  await settings.getByRole("combobox", { name: "이동 수단", exact: true }).selectOption("walk");
  await settings.getByRole("button", { name: "적용", exact: true }).click();
  await expect.poll(async () => (await current(page)).schedule.travelMode).toBe("walk");
  expect((await current(page)).schedule.scheduleAssignments).toEqual(before.schedule.scheduleAssignments);
  await page.locator(".simple-command-receipt").getByRole("button", { name: "되돌리기", exact: true }).click();
  await expect.poll(async () => (await current(page)).schedule).toEqual(before.schedule);
  await noOverflow(page, ".simple-timeboard, .simple-trip-actions, .wave-header");
  await page.screenshot({ path: info.outputPath("timetable.png"), fullPage: true });
  if (info.project.name === "mobile-chromium") await page.getByRole("group", { name: "일정 보기 방식", exact: true }).getByRole("button", { name: "지도", exact: true }).click();
  await expect(page.locator(".simple-itinerary-map .leaflet-container")).toBeVisible();
  await noOverflow(page, ".simple-itinerary-map, .simple-itinerary-map .leaflet-container");
  await page.screenshot({ path: info.outputPath("itinerary-map.png"), fullPage: true });
  expect((await current(page)).ids).toEqual(before.ids);
  expect((await current(page)).identity?.id).toBe(before.identity?.id);
});

test("담기 다음 행동에서 날짜 전에 출발지를 고르고 같은 장소로 시간표를 만든다", async ({ page }) => {
  await browse(page);
  await add(page, museum);
  const next = page.getByLabel('담은 장소로 이어가기', { exact: true });
  await expect(next).toContainText('담은 장소 1곳');
  await next.getByRole('button', { name: '날짜 정하기', exact: true }).click();
  const setup = page.locator('.simple-initial-setup');
  const origin = setup.getByRole('button', { name: '출발지 확인·변경 · 창원중앙역', exact: true });
  await origin.click();
  await expect(setup.getByRole('textbox', { name: '장소 검색', exact: true })).toBeFocused();
  await setup.getByRole('button', { name: /통영종합버스터미널/ }).click();
  await expect(setup.getByRole('button', { name: '출발지 확인·변경 · 통영종합버스터미널', exact: true })).toBeFocused();
  await expect.poll(async () => (await current(page)).schedule?.travelStart || '').toBe('');
  await setup.getByLabel('시작일', { exact: true }).fill('2026-10-14');
  await setup.getByLabel('마지막 날', { exact: true }).fill('2026-10-14');
  await setup.getByRole('button', { name: '시간표 만들기', exact: true }).click();
  await expect(page.locator('.simple-timeboard')).toBeVisible();
  await expect.poll(async () => (await current(page)).ids).toEqual(['1001']);
  await page.locator(".wave-header").locator(".night-search-link").click();
  await expect(next.getByRole('button', { name: '내 일정 보기', exact: true })).toBeVisible();
});

test("나루의 다음 행동이 빈 여행에서 날짜 없는 여행과 완성 일정까지 이어진다", async ({ page }) => {
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: true } }));
  await browse(page);
  const launcher = page.getByRole("button", { name: "WAVE 여행 가이드 나루와 대화 열기", exact: true });
  await launcher.click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('button', { name: '건너뛰기', exact: true }).click();
  await expect(chat.getByRole('button', { name: '현재 일정에서 이동 부담을 줄여줘', exact: true })).toHaveCount(0);
  await chat.locator('.naru-suggestions > summary').click();
  await chat.getByRole('button', { name: '여행지 찾아 일정에 담기', exact: true }).click();
  await expect(chat).not.toBeVisible();
  await add(page, museum);
  await launcher.click();
  await chat.getByRole('button', { name: '담은 1곳의 날짜·출발지 정하기', exact: true }).click();
  const setup = page.locator('.simple-initial-setup');
  await expect(setup.getByLabel('시작일', { exact: true })).toBeFocused();
  await setup.getByLabel('시작일', { exact: true }).fill('2026-10-14');
  await setup.getByLabel('마지막 날', { exact: true }).fill('2026-10-14');
  await setup.getByRole('button', { name: '시간표 만들기', exact: true }).click();
  await expect(page.locator('.simple-timeboard')).toBeVisible();
  await launcher.click();
  await expect(chat.getByRole('button', { name: '내 일정 1곳 확인', exact: true })).toBeVisible();
  await expect(chat.getByRole('button', { name: '현재 일정에서 이동 부담을 줄여줘', exact: true })).toBeVisible();
});

test("비교 후보가 한 곳이면 조건을 몰래 바꾸지 않고 검색 조건으로 돌아간다", async ({ page }) => {
  await page.route('**/api/wave?*', route => {
    if (new URL(route.request().url()).searchParams.get('action') !== 'plan') return route.fallback();
    return route.fulfill({ json: { ...plan, places: plan.places.slice(0, 1), stops: plan.stops.slice(0, 1) } });
  });
  await page.goto('/planner');
  const region = page.getByRole('combobox', { name: '여행 지역', exact: true });
  await region.selectOption('창원');
  await expect(page.locator('.simple-place-row')).toHaveCount(1);
  await page.getByRole('button', { name: '편의 비교', exact: true }).click();
  await expect(page.getByText('현재 목록에는 비교할 장소가 1곳뿐이에요.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '검색 조건 확인', exact: true }).click();
  await expect(region).toBeFocused();
  await expect(region).toHaveValue('창원');
  await expect(page.locator('.simple-place-row')).toHaveCount(1);
});

test("나루 시작 버튼은 PC·태블릿·모바일에서 보이고 키보드로 열고 돌아온다", async ({ page }, info) => {
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: true } }));
  await browse(page);
  for (const width of info.project.name === 'desktop-chromium' ? [1440, 960, 390] : [390]) {
    await page.setViewportSize({ width, height: 960 });
    await noOverflow(page, '.simple-planner-actions button');
    const entry = page.getByRole("button", { name: "WAVE 여행 가이드 나루와 대화 열기", exact: true });
    const rect = await entry.boundingBox();
    expect(rect?.height).toBeGreaterThanOrEqual(44);
    await entry.focus();
    await entry.press('Enter');
    const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
    await expect(chat).toBeVisible();
    await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
    await expect(entry).toBeFocused();
  }
  const axe = await new AxeBuilder({ page }).include('.wave-header').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(axe.violations).toEqual([]);
  await page.screenshot({ path: info.outputPath('journey-actions.png'), fullPage: false });
});
