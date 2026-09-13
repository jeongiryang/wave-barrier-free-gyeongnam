import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi, openItinerary, plan } from "./fixtures";
import type { Place, PlanData } from "../features/planner/types";

const keys = ["parking", "route", "wheelchair", "elevator", "restroom"];
const unknown: Place = {
  ...plan.places[0], score: 0, knownFields: 0, unknownFields: 5, negativeFields: 0,
  facilityLookupState: "error", features: [], details: [],
  accessibility: keys.map(key => ({ key, label: key, state: "unknown", detail: "" })),
};
const negative: Place = { ...unknown, id: "1002", name: "계단뿐인 전시관", negativeFields: 1, unknownFields: 4,
  accessibility: unknown.accessibility!.map(field => ({ ...field, state: field.key === "route" ? "negative" : "unknown", detail: field.key === "route" ? "접근로 없음" : "" })) };
const elsewhere: Place = { ...unknown, id: "1003", city: "진주", name: "다른 지역 전시관" };
const response: PlanData = { ...plan, mode: "partial", places: [], stops: [], criteria: { facilityKeys: keys }, explorationPlaces: [unknown, elsewhere], excludedPlaces: [negative],
  statuses: [{ id: "barrierfree", name: "무장애 여행정보", role: "시설 확인", state: "error", count: 0, note: "제공처 요청 한도", failure: { provider: "kto", operation: "detail", kind: "rate_limited", httpStatus: 429, code: null, retryAfterMs: null, resetAt: null, retryable: true } }] };
const consentName = "방문 전 확인할 후보로 담기";
const find = (page: Page) => page.locator(".simple-results").getByRole("button", { name: "다시 시도", exact: true });

async function setup(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", route => { errors.push(`Unexpected API: ${new URL(route.request().url()).pathname}`); return route.fulfill({ status: 503, json: { error: "Unmocked test API" } }); });
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { plannerView: "overview", savedPlaces: response.explorationPlaces });
  await page.route("**/api/community/posts?**", route => route.fulfill({ json: { posts: [], hasMore: false, page: 1 } }));
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: response }));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await expect(page.locator(".simple-results > .simple-place-list article")).toHaveCount(0);
  await expect(page.locator(".simple-exploration article")).toHaveCount(2);
  await expect(page.locator(".simple-excluded > summary")).toHaveText("선택한 시설이 없어 제외된 장소 1곳");
  return errors;
}

async function open(page: Page, name = unknown.name) {
  if (name === negative.name) {
    const excluded = page.locator('.simple-excluded');
    if (!await excluded.evaluate(node => (node as HTMLDetailsElement).open)) await excluded.locator('summary').click();
    await excluded.getByRole('button', { name, exact: true }).click();
  } else await page.locator(".simple-exploration article").filter({ has: page.getByRole("heading", { name, exact: true }) }).getByRole("button", { name: `${name} 편의 확인`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name, exact: true });
  await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
  return dialog;
}

async function stored(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    return { ids: JSON.parse(values["wave-saved-places"] || "[]"), schedule: JSON.parse(values["wave-trip-schedule-v1"] || "{}"), profiles: JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]") };
  });
}

for (const theme of ["light", "dark"]) test(`${theme}: a provider failure candidate requires consent, keeps unknown evidence and restores dates and needs`, async ({ page }, info) => {
  await page.addInitScript(value => localStorage.setItem("wave-theme", value), theme);
  const errors = await setup(page);
  let dialog = await open(page);
  await expect(dialog.getByRole("button", { name: "일정에 추가", exact: true })).toBeDisabled();
  await expect(dialog.getByLabel(consentName, { exact: true })).not.toBeChecked();
  await expect(dialog.locator(".place-unknown-consent")).toContainText("제공처에 연결하지 못했어요");
  await expect(dialog.getByRole("group", { name: "공식 데이터 확인 범위" })).toHaveText(/확인됨 0미확인 5불일치 0/);
  await dialog.getByLabel(consentName, { exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(dialog.getByRole("button", { name: "일정에 추가", exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  dialog = await open(page);
  await expect(dialog.getByLabel(consentName, { exact: true })).not.toBeChecked();
  await expect(dialog.getByRole("button", { name: "일정에 추가", exact: true })).toBeDisabled();
  for (const width of info.project.name.includes("desktop") ? [1440, 960] : [390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    const label = dialog.locator(".place-unknown-consent label");
    await label.scrollIntoViewIfNeeded();
    expect((await label.boundingBox())?.height || 0).toBeGreaterThanOrEqual(44);
    const pane = await dialog.boundingBox(), body = await dialog.locator('.modal-body').boundingBox();
    expect(body?.width || 0).toBeGreaterThan((pane?.width || 0) * .8);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`unknown-consent-${theme}-${width}.png`) });
  }
  await dialog.getByLabel(consentName, { exact: true }).check();
  await dialog.getByRole("button", { name: "일정에 추가", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => stored(page).then(value => value.ids)).toEqual(["1001"]);
  const before = await stored(page);
  expect(before.profiles).toEqual(keys);
  expect(before.schedule.travelStart).toBe("2026-10-08");
  expect(before.schedule.travelEnd).toBe("2026-10-09");
  await page.reload();
  await expect(page.locator('.simple-result-notice')).toContainText(/요청|제한/);
  expect(await stored(page)).toEqual(before);
  await openItinerary(page);
  const view=page.getByRole('group',{name:'일정 보기 방식',exact:true});if(await view.count())await view.getByRole('button',{name:'시간표',exact:true}).click();
  await page.locator(".simple-stops h3").getByRole("button", { name: unknown.name, exact: true }).click();
  dialog = page.getByRole("dialog", { name: unknown.name, exact: true });
  await expect(dialog.getByRole("group", { name: "공식 데이터 확인 범위" })).toHaveText(/확인됨 0미확인 5불일치 0/);
  await expect(dialog.getByRole("button", { name: "일정에서 빼기", exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test("required negative evidence and a different region cannot use an unknown acknowledgement", async ({ page }) => {
  const errors = await setup(page);
  for (const place of [negative, elsewhere]) {
    const dialog = await open(page, place.name);
    await expect(dialog.getByLabel(consentName, { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "일정에 추가", exact: true })).toBeDisabled();
    if (place === negative) await expect(dialog).toContainText("필요한 편의가 제공되지 않는 것으로 기록된 장소는 추가할 수 없어요");
    await page.keyboard.press("Escape");
  }
  expect((await stored(page)).ids).toEqual([]);
  expect((await stored(page)).profiles).toEqual(keys);
  expect(errors).toEqual([]);
});

test("changing required facilities blocks old results and cannot reuse a previous acknowledgement", async ({ page }) => {
  const errors = await setup(page);
  let dialog = await open(page);
  await dialog.getByLabel(consentName, { exact: true }).check();
  await page.keyboard.press("Escape");
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let calls=0;
  await page.route('**/api/wave?action=plan*',async route=>{calls++;await gate;await route.fulfill({json:response});});
  await page.locator('.simple-facility-trigger').click();
  let picker=page.getByRole('dialog',{name:'필요한 편의',exact:true});await picker.getByRole('checkbox',{name:'유모차 대여',exact:true}).check();await picker.getByRole('button',{name:/^적용/}).click();
  await expect.poll(()=>calls).toBe(1);
  dialog = await open(page);
  await expect(dialog.getByLabel(consentName, { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "일정에 추가", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.locator('.simple-facility-trigger').click();picker=page.getByRole('dialog',{name:'필요한 편의',exact:true});await picker.getByRole('checkbox',{name:'유모차 대여',exact:true}).uncheck();await picker.getByRole('button',{name:/^적용/}).click();
  release();await expect(page.locator('.simple-results')).toHaveAttribute('aria-busy','false');
  dialog = await open(page);
  await expect(dialog.getByLabel(consentName, { exact: true })).not.toBeChecked();
  await expect(dialog.getByRole("button", { name: "일정에 추가", exact: true })).toBeDisabled();
  expect((await stored(page)).ids).toEqual([]);
  expect((await stored(page)).profiles).toEqual(keys);
  expect(errors).toEqual([]);
});

for (const nextKind of ["exploration", "recommended"]) test(`${nextKind}: a new response cannot authorize the old open snapshot with the same place ID`, async ({ page }) => {
  const errors = await setup(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const refreshed: Place = { ...unknown, checkedAt: "2026-09-12T12:00:00Z", ...(nextKind === "recommended" ? { score: 100, knownFields: 5, unknownFields: 0, facilityLookupState: "available", accessibility: unknown.accessibility!.map(field => ({ ...field, state: "confirmed" as const })) } : {}) };
  await page.route("**/api/wave?action=plan*", async route => {
    await pending;
    await route.fulfill({ json: { ...response, generatedAt: refreshed.checkedAt, places: nextKind === "recommended" ? [refreshed] : [], explorationPlaces: nextKind === "exploration" ? [refreshed] : [] } });
  });
  await find(page).click();
  const dialog = await open(page);
  await expect(dialog.getByLabel(consentName, { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "일정에 추가", exact: true })).toBeDisabled();
  release();
  await expect(page.locator(".simple-exploration article")).toHaveCount(nextKind === "exploration" ? 1 : 0);
  await expect(dialog.getByLabel(consentName, { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "일정에 추가", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  if (nextKind === "exploration") {
    const current = await open(page);
    await expect(current.getByLabel(consentName, { exact: true })).not.toBeChecked();
    await expect(current.getByRole("button", { name: "일정에 추가", exact: true })).toBeDisabled();
    expect((await stored(page)).ids).toEqual([]);
  } else {
    await page.locator(".simple-results > .simple-place-list").getByRole("button", { name: `${unknown.name} 상세 보기`, exact: true }).click();
    const current = page.getByRole("dialog", { name: unknown.name, exact: true });
    await expect(current.getByLabel(consentName, { exact: true })).toHaveCount(0);
    await expect(current.getByRole("button", { name: "일정에 추가", exact: true })).toBeEnabled();
    await current.getByRole("button", { name: "일정에 추가", exact: true }).click();
    await expect.poll(() => stored(page).then(value => value.ids)).toEqual(["1001"]);
  }
  expect(errors).toEqual([]);
});
