import { closeNewTripMenu, newTripAction, startNewTrip } from './planner-header-fixtures';
import { acceptTripTimingWarning } from './trip-timing-fixtures';
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, plan } from "./fixtures";
import type { AccountTripPayload, TripDetail } from "../features/account-travel/types";
import type { TripIdentity } from "../lib/trip-identity.js";

test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: "block" });

const sourceId = "12345678-1234-4123-8123-123456789012";
const userId = "synthetic-account-owner", userName = "모의 여행자";
const museum = "경남도립미술관";
const start = "2026-10-14", end = "2026-10-15";
const uuid = /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const originalPayload: AccountTripPayload = {
  version: 1, title: "가족과 느긋하게 보는 창원", note: "기차 도착 후 점심을 먹고 출발해요.", status: "visited",
  region: "창원", travelStart: start, travelEnd: end, dayStartTime: "09:45", travelMode: "car",
  themes: ["history", "nature"], placeIds: ["1002", "1001"],
  scheduleAssignments: { "1002": start, "1001": start }, visitMinutesByPlaceId: { "1002": 60, "1001": 90 },
  breakMinutesByPlaceId: {}, restPurposeByPlaceId: {}, fixedVisits: {}, dayDeadlines: {},
};
function deferred() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}
type Write = { path: string; body: { id?: string; revision?: number; payload: AccountTripPayload } };
function fixtureState(role: "owner" | "member" = "owner") {
  const trip: TripDetail = { id: sourceId, payload: structuredClone(originalPayload), role, revision: 4, updatedAt: 1789200000000, members: [], votes: [], comments: [], invitationActive: false };
  return {
    trips: new Map([[trip.id, trip]]), signedIn: true, sessionReads: 0, emptySessionReads: 0, savedLookupResponses: 0,
    writes: [] as Write[], completed: 0, placeIdsRead: [] as string[],
    nextFailure: 0 as 0 | 401 | 409, nextGate: null as ReturnType<typeof deferred> | null,
    unexpected: [] as string[], errors: [] as string[], hotUpdates: [] as string[],
  };
}
type State = ReturnType<typeof fixtureState>;
const states = new WeakMap<Page, State>();

async function install(page: Page, state: State, info: TestInfo) {
  states.set(page, state);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const origin = new URL(String(info.project.use.baseURL)).origin;
  page.on("pageerror", error => state.errors.push(error.message));
  page.on("console", message => { if (message.text().includes("[vite]") && /hot updated|page reload/.test(message.text())) state.hotUpdates.push(message.text()); });
  page.on("response", response => {
    const url = new URL(response.url());
    if (url.pathname === "/api/wave" && url.searchParams.get("action") === "places" && response.ok()) state.savedLookupResponses++;
  });
  await page.route("**/*", route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin && !url.pathname.startsWith("/api/")) return route.continue();
    if (url.origin !== origin && request.resourceType() === "image") return route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#d6edf5"/></svg>' });
    state.unexpected.push(`${request.method()} ${url.pathname}${url.search}`);
    return route.fulfill({ status: 503, json: { error: "UNEXPECTED_SYNTHETIC_REQUEST" } });
  });
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.route("**/api/auth/get-session", route => {
    state.sessionReads++;
    if (!state.signedIn) state.emptySessionReads++;
    return route.fulfill({ json: state.signedIn ? { user: { id: userId, name: userName, email: "synthetic@example.test" }, session: { id: "synthetic-session" } } : null });
  });
  await page.route("**/api/auth/sign-out", route => {
    state.signedIn = false;
    return route.fulfill({ json: { success: true } });
  });
  await page.route("**/api/account/travel**", async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    const prefix = "/api/account/travel";
    if (path === prefix && request.method() === "GET") return route.fulfill({ json: { trips: [...state.trips.values()] } });
    const match = path.match(/^\/api\/account\/travel\/([^/]+)(\/places)?$/);
    const source = match ? state.trips.get(match[1]) : null;
    if (match?.[2] && source && request.method() === "POST") {
      state.placeIdsRead.push(source.id);
      // Return a different API order: the saved schedule remains authoritative.
      return route.fulfill({ json: { places: plan.places.filter(place => source.payload.placeIds.includes(place.id)), missing: 0 } });
    }
    if (match && !match[2] && request.method() === "GET") return route.fulfill(source ? { json: source } : { status: 404, json: { error: "해당 모의 여행이 없어요." } });
    if (request.method() !== "POST" || path !== prefix && (!match || match[2] || !source)) return route.fallback();
    const body = structuredClone(request.postDataJSON()) as Write["body"];
    state.writes.push({ path, body });
    const failure = state.nextFailure, gate = state.nextGate;
    state.nextFailure = 0; state.nextGate = null;
    if (gate) await gate.promise;
    if (failure) {
      await route.fulfill({ status: failure, json: { error: failure === 401 ? "로그인이 만료됐어요. 다시 로그인해 주세요." : "다른 곳에서 여행이 수정됐어요. 최신 버전을 확인해 주세요." } });
      state.completed++;
      return;
    }
    if (source && body.revision !== source.revision) {
      await route.fulfill({ status: 409, json: { error: "모의 계정 여행의 버전이 달라요." } });
      state.completed++;
      return;
    }
    const id = source?.id || body.id;
    if (!id || !uuid.test(id) || !body.payload?.placeIds?.length) return route.fulfill({ status: 400, json: { error: "모의 저장 요청 형식이 올바르지 않아요." } });
    const saved: TripDetail = { id, payload: structuredClone(body.payload), revision: source ? source.revision + 1 : 1, role: "owner", updatedAt: 1789200000000 + state.writes.length, members: [], votes: [], comments: [], invitationActive: false };
    state.trips.set(id, saved);
    await route.fulfill({ json: saved });
    state.completed++;
  });
}

async function stored(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    return {
      identity: JSON.parse(values["wave-trip-identity-v1"] || "null") as TripIdentity | null,
      ids: JSON.parse(values["wave-saved-places"] || "[]") as string[],
      order: JSON.parse(values["wave-trip-order-v1"] || "{}") as { mode: string; ids: string[] },
      region: values["wave-planner-region-v1"] as string,
      schedule: JSON.parse(values["wave-trip-schedule-v1"] || "{}") as { travelStart: string; travelEnd: string; travelMode: string; dayStartTime: string; scheduleAssignments: Record<string, string>; visitMinutesByPlaceId: Record<string, number> },
      books: JSON.parse(localStorage.getItem("wave-travel-book-v1") || "[]") as Array<{ tripId: string; identity: TripIdentity }>,
    };
  });
}
async function openSource(page: Page, state: State) {
  await page.goto(`/my-trips/${sourceId}`);
  await expect(page.getByRole("heading", { name: originalPayload.title, exact: true })).toBeVisible();
  const reads = state.placeIdsRead.length;
  await page.getByRole("button", { name: "여행 설계에서 열기", exact: true }).click();
  await expect(page).toHaveURL(/\/planner\?from=account#itinerary$/);
  await expect(page.locator("#itinerary-stop-1001")).toBeVisible();
  expect(state.placeIdsRead.length).toBeGreaterThan(reads);
  expect(state.placeIdsRead.every(id => id === sourceId)).toBe(true);
  await expect.poll(async () => (await stored(page)).identity?.binding).toEqual({ kind: "account", id: sourceId, revision: 4, role: state.trips.get(sourceId)!.role, userId });
}
async function editVisit(page: Page, minutes = "180") {
  await page.getByRole("button", { name: `${museum} 일정 수정`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `${museum} 수정`, exact: true });
  await dialog.getByRole("combobox", { name: `${museum} 머무는 시간`, exact: true }).selectOption(minutes);
  await dialog.getByRole("button", { name: "적용", exact: true }).click();
  await expect(page.locator("#itinerary-stop-1001")).toContainText(`${minutes}분 머묾`);
  await expect.poll(async () => (await stored(page)).schedule.visitMinutesByPlaceId["1001"]).toBe(Number(minutes));
}
async function reviewPausedSave(page: Page) {
  const control = page.locator('.simple-save-control');
  await expect(control.getByRole('alert')).toContainText('일정의 시간과 날짜를 확인한 뒤 저장해 주세요.');
  expect(states.get(page)!.writes).toHaveLength(0);
  await control.getByRole('button', { name: '저장 다시 시도', exact: true }).click();
  await expect(page.getByRole('dialog', { name: '저장·공유 전 일정 확인', exact: true })).toBeVisible();
  await acceptTripTimingWarning(page);
}
async function freshTrip(page: Page) {
  await page.goto("/planner");
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await page.getByRole("button", { name: `${museum} 일정에 담기`, exact: true }).click();
  await page.locator(".wave-header").locator(".wave-my-trips").click();
  const setup = page.locator(".simple-initial-setup");
  await setup.getByLabel("시작일", { exact: true }).fill(start);
  await setup.getByLabel("마지막 날", { exact: true }).fill(end);
  await setup.getByRole("combobox", { name: "이동 수단", exact: true }).selectOption("car");
  await setup.getByRole("button", { name: "시간표 만들기", exact: true }).click();
  await expect(page.locator("#itinerary-stop-1001")).toBeVisible();
  await expect(page.getByRole("button", { name: "내 여행에 저장", exact: true })).toBeEnabled();
}
async function loadAccountMenu(page: Page) {
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  await expect(page.locator(".wave-support-menu")).toHaveAttribute("aria-busy", "false");
  await page.locator(".wave-header").getByRole("button", { name: "계정 관리", exact: true }).click();
  const trigger = page.getByRole("button", { name: `${userName} 계정 메뉴`, exact: true });
  await expect(trigger).toBeVisible();
  await trigger.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
}
test.afterEach(async ({ context }, info) => {
  const audits = [...new Set(context.pages().map(page => states.get(page)).filter((value): value is State => Boolean(value)))];
  if (info.status !== info.expectedStatus) await info.attach("account-save-failure-state", { contentType: "application/json", body: JSON.stringify({
    pages: await Promise.all(context.pages().map(async page => ({ url: page.url(), current: await stored(page).catch(() => null) }))),
    audits: audits.map(state => ({ ...state, trips: [...state.trips.values()] })),
  }, null, 2) });
  for (const state of audits) {
    expect(state.unexpected, "All account/DB/external requests must remain synthetic").toEqual([]);
    expect(state.errors, "Uncaught page errors").toEqual([]);
  }
});

test("계정 원본을 열면 ID·revision·순서를 유지하고 빈 날짜 확인 뒤 같은 행에 저장하고 다음 수정은 자동 저장된다", async ({ page }, info) => {
  const state = fixtureState(); await install(page, state, info); await openSource(page, state);
  const before = await stored(page);
  expect(before.identity?.id).toBe(sourceId);
  expect(before.ids).toEqual(originalPayload.placeIds);
  expect(before.order).toEqual({ mode: "manual", ids: originalPayload.placeIds });
  expect(before.schedule).toMatchObject({ travelStart: start, travelEnd: end, dayStartTime: "09:45", travelMode: "car", scheduleAssignments: originalPayload.scheduleAssignments });
  await expect.poll(() => state.savedLookupResponses).toBeGreaterThan(0);
  // Refreshing provider evidence is not a user edit and must not spend a revision.
  await page.waitForTimeout(1200);
  expect(state.writes).toHaveLength(0);
  await editVisit(page);
  await reviewPausedSave(page);
  await expect.poll(() => state.writes.length).toBe(1);
  await expect.poll(async () => (await stored(page)).identity?.binding).toEqual({ kind: "account", id: sourceId, revision: 5, role: "owner", userId });
  expect(state.writes[0]).toMatchObject({ path: `/api/account/travel/${sourceId}`, body: { revision: 4, payload: { title: originalPayload.title, note: originalPayload.note, status: originalPayload.status, placeIds: originalPayload.placeIds, visitMinutesByPlaceId: { "1001": 180, "1002": 60 } } } });
  expect(state.trips.size).toBe(1);
  await editVisit(page, "120");
  await expect.poll(() => state.writes.length).toBe(2);
  await expect.poll(async () => { const binding = (await stored(page)).identity?.binding; return binding?.kind === "account" ? binding.revision : null; }).toBe(6);
  expect(state.writes[1]).toMatchObject({ path: `/api/account/travel/${sourceId}`, body: { revision: 5, payload: { visitMinutesByPlaceId: { "1001": 120 } } } });
  await expect(page.getByRole('dialog', { name: '저장·공유 전 일정 확인', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.locator("#itinerary-stop-1001")).toContainText("120분 머묾");
  expect((await stored(page)).identity).toMatchObject({ id: sourceId, binding: { id: sourceId, revision: 6 } });
  expect(state.writes).toHaveLength(2);
  await page.getByRole("link", { name: "저장한 여행", exact: true }).click();
  await expect(page.getByLabel("여행 이름", { exact: true })).toHaveValue(originalPayload.title);
  await expect(page.getByRole("textbox", { name: "동행자와 공유하는 여행 메모", exact: true })).toHaveValue(originalPayload.note);
});

test("동행자 일정의 수정은 원본을 자동 갱신하지 않고 명시적 사본 저장으로 새 행을 만든다", async ({ page }, info) => {
  const state = fixtureState("member"); await install(page, state, info); await openSource(page, state);
  const source = structuredClone(state.trips.get(sourceId)!);
  await editVisit(page);
  // Cross the actual autosave debounce to verify the member permission boundary.
  await page.waitForTimeout(1200);
  expect(state.writes).toHaveLength(0);
  await page.getByRole("button", { name: "내 여행에 사본 저장", exact: true }).click();
  await acceptTripTimingWarning(page);
  await expect.poll(() => state.writes.length).toBe(1);
  const request = state.writes[0];
  expect(request.path).toBe("/api/account/travel");
  expect(request.body.id).toMatch(uuid);
  expect(request.body.id).not.toBe(sourceId);
  expect(request.body.revision).toBeUndefined();
  expect(request.body.payload).toMatchObject({ title: originalPayload.title, note: originalPayload.note, status: originalPayload.status });
  await expect.poll(async () => (await stored(page)).identity?.binding).toEqual({ kind: "account", id: request.body.id, revision: 1, role: "owner", userId });
  expect(state.trips.get(sourceId)).toEqual(source);
  expect(state.trips.size).toBe(2);
  expect(state.trips.get(request.body.id!)!.payload.visitMinutesByPlaceId?.["1001"]).toBe(180);
  // A save keeps the open draft's continuity ID; opening its copy uses the new row.
  expect((await stored(page)).identity?.id).toBe(sourceId);
  await page.getByRole("link", { name: "저장한 여행", exact: true }).click();
  await page.getByRole("button", { name: "여행 설계에서 열기", exact: true }).click();
  await expect(page.locator("#itinerary-stop-1001")).toContainText("180분 머묾");
  expect((await stored(page)).identity).toMatchObject({ id: request.body.id, binding: { id: request.body.id, revision: 1, role: "owner" } });
});

test("401 저장 실패는 로그인 복구를 안내하고 초안을 유지한 채 같은 revision으로 재시도한다", async ({ page }, info) => {
  const state = fixtureState(); await install(page, state, info); await openSource(page, state);
  state.nextFailure = 401;
  await editVisit(page);
  await reviewPausedSave(page);
  const control = page.locator(".simple-save-control");
  await expect(control.getByRole("alert")).toContainText("로그인이 만료됐어요");
  await expect(control.getByRole("link", { name: /로그인/ })).toBeVisible();
  const draft = await stored(page);
  expect(draft.identity?.binding).toMatchObject({ id: sourceId, revision: 4, role: "owner" });
  expect(state.trips.get(sourceId)!.payload.visitMinutesByPlaceId?.["1001"]).toBe(90);
  await page.waitForTimeout(1200);
  expect(state.writes).toHaveLength(1);
  await control.getByRole("button", { name: "저장 다시 시도", exact: true }).click();
  await expect.poll(async () => (await stored(page)).identity?.binding).toMatchObject({ id: sourceId, revision: 5, role: "owner" });
  expect(state.writes).toHaveLength(2);
  expect(state.writes.every(write => write.path.endsWith(sourceId) && write.body.revision === 4)).toBe(true);
  expect((await stored(page)).schedule).toEqual(draft.schedule);
  expect((await stored(page)).ids).toEqual(draft.ids);
  expect(state.trips.size).toBe(1);
});

test("409 충돌은 원본과 수정 초안을 보존하고 명시적으로 수정본을 새 여행에 저장한다", async ({ page }, info) => {
  const state = fixtureState(); await install(page, state, info); await openSource(page, state);
  state.trips.set(sourceId, { ...state.trips.get(sourceId)!, revision: 5, payload: { ...structuredClone(originalPayload), title: "다른 화면에서 바꾼 제목", note: "원본의 최신 메모" } });
  const latestSource = structuredClone(state.trips.get(sourceId)!);
  await editVisit(page);
  await reviewPausedSave(page);
  const control = page.locator(".simple-save-control");
  await expect(control.getByRole("alert")).toBeVisible();
  expect((await stored(page)).identity?.binding).toMatchObject({ id: sourceId, revision: 4 });
  expect((await stored(page)).schedule.visitMinutesByPlaceId["1001"]).toBe(180);
  expect(state.trips.get(sourceId)).toEqual(latestSource);
  expect(state.writes[0].body.revision).toBe(4);
  await control.getByRole("button", { name: "현재 일정을 사본으로 저장", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(2);
  const copy = state.writes[1];
  expect(copy.path).toBe("/api/account/travel");
  expect(copy.body.id).toMatch(uuid);
  expect(copy.body.id).not.toBe(sourceId);
  expect(copy.body.payload).toMatchObject({ title: latestSource.payload.title, note: latestSource.payload.note, status: latestSource.payload.status });
  await expect.poll(async () => (await stored(page)).identity?.binding).toMatchObject({ id: copy.body.id, revision: 1, role: "owner" });
  expect(state.trips.get(sourceId)).toEqual(latestSource);
  expect(state.trips.get(copy.body.id!)!.payload.visitMinutesByPlaceId?.["1001"]).toBe(180);
  expect(state.trips.size).toBe(2);
});

test("저장 응답 전에 다른 탭에서 로그아웃하면 열린 초안에 계정 binding을 붙이지 않는다", async ({ page, context }, info) => {
  const state = fixtureState(); await install(page, state, info); await freshTrip(page);
  await loadAccountMenu(page);
  const before = await stored(page), gate = deferred(); state.nextGate = gate;
  await page.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
  await acceptTripTimingWarning(page);
  await expect.poll(() => state.writes.length).toBe(1);
  const other = await context.newPage(); await install(other, state, info); await other.goto("/guide");
  await loadAccountMenu(other);
  await other.getByRole("button", { name: `${userName} 계정 메뉴`, exact: true }).click();
  await other.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect.poll(() => state.signedIn).toBe(false);
  await page.bringToFront();
  await page.locator(".wave-header .account-menu:not(.wave-support-menu) > button").click();
  await expect(page.locator(".wave-header").getByRole("link", { name: "로그인", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `${userName} 계정 메뉴`, exact: true })).toHaveCount(0);
  await page.locator(".wave-header .account-menu:not(.wave-support-menu) > button").press("Escape");
  gate.release();
  await expect.poll(() => state.completed).toBe(1);
  await expect(page.getByRole("button", { name: "내 여행에 저장", exact: true })).toBeEnabled();
  const after = await stored(page);
  expect(after.identity).toEqual(before.identity);
  expect(after.identity?.binding).toBeNull();
  expect(after.schedule).toEqual(before.schedule);
  expect(after.ids).toEqual(before.ids);
  expect(after.books).toEqual(before.books);
});

test("저장 응답 전에 다른 여행으로 전환하면 이전 응답은 새 여행이나 백업에 binding을 붙이지 않는다", async ({ page, context }, info) => {
  const state = fixtureState(); await install(page, state, info); await freshTrip(page);
  const before = await stored(page), gate = deferred(); state.nextGate = gate;
  await page.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
  await acceptTripTimingWarning(page);
  await expect.poll(() => state.writes.length).toBe(1);
  const other = await context.newPage(); await install(other, state, info); await other.goto("/planner");
  await newTripAction(other); await closeNewTripMenu(other);
  await startNewTrip(other);
  await newTripAction(other); await closeNewTripMenu(other);
  await expect(other.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue("");
  const fresh = await stored(other);
  expect(fresh.identity?.id).not.toBe(before.identity?.id);
  expect(fresh.identity?.binding).toBeNull();
  expect(fresh.ids).toEqual([]);
  expect(fresh.books).toHaveLength(1);
  expect(fresh.books[0].tripId).toBe(before.identity?.id);
  await expect(page.locator(".simple-storage-notice [role=alert]")).toContainText("다른 탭에서 여행이 바뀌었어요");
  gate.release();
  await expect.poll(() => state.completed).toBe(1);
  await expect(page.getByRole("button", { name: "내 여행에 저장", exact: true })).toBeEnabled();
  expect(await stored(other)).toEqual(fresh);
  expect(fresh.books[0].identity.binding).toBeNull();
});
