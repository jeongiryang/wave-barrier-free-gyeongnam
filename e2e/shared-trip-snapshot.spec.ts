import { acceptTripTimingWarning } from './trip-timing-fixtures';
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, openItinerary } from "./fixtures";

const shareId = "abcde1234567";
type Snapshot = { revision?: number; selections: { dayStartTime: string; selectedPlaceIds: string[]; scheduleAssignments: Record<string, string>; profiles: string[] } };
function deferred() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
async function prepare(page: Page) {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (url: string) => {
      sessionStorage.setItem("test-copied-links", JSON.stringify([...JSON.parse(sessionStorage.getItem("test-copied-links") || "[]"), url]));
    } } });
  });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page, { start: "2026-10-08", end: "2026-10-09" });
}
async function server(page: Page, gates: { create?: ReturnType<typeof deferred>; update?: ReturnType<typeof deferred> } = {}) {
  const posts: Array<{ path: string; body: Snapshot }> = [];
  const expiresAt = Date.now() + 30 * 86_400_000;
  let revision = 0;
  await page.route(/\/api\/trips(?:\/abcde1234567)?$/, async route => {
    const path = new URL(route.request().url()).pathname, body = route.request().postDataJSON();
    if (body.operation === "status") return route.fulfill({ json: { revision, expiresAt, live: true } });
    posts.push({ path, body: structuredClone(body) });
    if (path === "/api/trips") { if (gates.create) await gates.create.promise; }
    else {
      if (gates.update) await gates.update.promise;
      if (body.revision !== revision) return route.fulfill({ status: 409, json: { error: "Synthetic revision conflict" } });
    }
    revision++;
    return route.fulfill({ json: { id: shareId, url: `${new URL(page.url()).origin}/trip/${shareId}`, revision, expiresAt, live: true } });
  });
  return { posts, creates: () => posts.filter(post => post.path === "/api/trips"), revision: () => revision };
}
async function menu(page: Page) {
  await page.getByRole("button", { name: "공유", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "여행 공유", exact: true });
  const create = panel.getByRole("button", { name: "공개 링크 만들기", exact: true });
  if (await create.isVisible() && await create.isEnabled()) { await create.click(); await acceptTripTimingWarning(page); }
  return panel;
}
async function closeMenu(page: Page) { await page.getByRole("button", { name: "공유 닫기", exact: true }).click(); }
async function startTime(page: Page, value: string) {
  await page.getByRole("button", { name: "여행 설정", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "여행 설정", exact: true });
  await settings.getByLabel("하루 시작", { exact: true }).fill(value);
  await settings.getByRole("button", { name: "적용", exact: true }).click();
}
async function visitDate(page: Page, name: string, value: string) {
  await page.getByRole("button", { name: `${name} 일정 수정`, exact: true }).click();
  const editor = page.getByRole("dialog", { name: `${name} 수정`, exact: true });
  const date = editor.getByRole("combobox", { name: "방문 날짜", exact: true });
  if (await date.inputValue() === value) { await editor.getByRole("button", { name: "취소", exact: true }).click(); return; }
  await date.selectOption(value);
  await editor.getByRole("button", { name: "적용", exact: true }).click();
}
async function copied(page: Page) { return page.evaluate(() => JSON.parse(sessionStorage.getItem("test-copied-links") || "[]")); }

test("editing a shared itinerary updates the same live link with current dates, order and removals", async ({ page }) => {
  await prepare(page); const app = await server(page);
  let panel = await menu(page);
  const url = `${new URL(page.url()).origin}/trip/${shareId}`;
  await expect(panel.getByRole("link", { name: "공유 일정 보기", exact: true })).toHaveAttribute("href", url);
  expect(app.creates()).toHaveLength(1);
  const original = structuredClone(app.posts[0].body);
  await closeMenu(page); await startTime(page, "10:30");
  await expect.poll(() => app.posts.at(-1)?.body.selections.dayStartTime).toBe("10:30");
  await visitDate(page, "경남도립미술관", "2026-10-09");
  await expect.poll(() => app.posts.at(-1)?.body.selections.scheduleAssignments["1001"]).toBe("2026-10-09");
  panel = await menu(page);
  await expect(panel.getByRole("link", { name: "공유 일정 보기", exact: true })).toHaveAttribute("href", url);
  for (let i = 0; i < 2; i++) await panel.getByRole("button", { name: "링크 복사", exact: true }).click();
  await expect.poll(() => copied(page)).toEqual([url, url]);
  await closeMenu(page);
  await page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: "여행지 찾기", exact: true }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에 담기", exact: true }).click();
  await openItinerary(page);
  await visitDate(page, "용지호수공원", "2026-10-08");
  await page.getByRole("group", { name: "일정 날짜", exact: true }).getByRole("button", { name: /^2일차/ }).click();
  await visitDate(page, "경남도립미술관", "2026-10-08");
  await page.getByRole("group", { name: "일정 날짜", exact: true }).getByRole("button", { name: /^1일차/ }).click();
  await page.getByRole("button", { name: "경남도립미술관 같은 날 앞 순서로 이동", exact: true }).click();
  await page.getByRole("button", { name: "경남도립미술관 같은 날 뒤 순서로 이동", exact: true }).click();
  await expect.poll(() => app.posts.at(-1)?.body.selections.selectedPlaceIds).toEqual(["1002", "1001"]);
  await page.getByRole("button", { name: "경남도립미술관 일정 수정", exact: true }).click();
  await page.getByRole("dialog", { name: "경남도립미술관 수정", exact: true }).getByRole("button", { name: "일정에서 빼기", exact: true }).click();
  await expect.poll(() => app.posts.at(-1)?.body.selections.selectedPlaceIds).toEqual(["1002"]);
  panel = await menu(page);
  await expect(panel.getByRole("link", { name: "공유 일정 보기", exact: true })).toHaveAttribute("href", url);
  expect(app.creates()).toHaveLength(1);
  expect(app.posts.slice(1).every(post => post.path === `/api/trips/${shareId}` && Number.isInteger(post.body.revision))).toBe(true);
  expect(app.posts.every(post => post.body.selections.profiles.length === 0)).toBe(true);
  expect(original.selections).toMatchObject({ dayStartTime: "10:00", selectedPlaceIds: ["1001"], scheduleAssignments: { "1001": "2026-10-08" } });
  expect(app.posts.at(-1)?.body.selections.scheduleAssignments).toEqual({ "1002": "2026-10-08" });
});

test("an obsolete creation response cannot overwrite the edited itinerary or copy stale content", async ({ page }) => {
  await prepare(page);
  const create = deferred(), update = deferred(), app = await server(page, { create, update });
  try {
    let panel = await menu(page);
    await expect.poll(() => app.creates().length).toBe(1);
    await expect(panel.getByRole("button", { name: "링크 복사", exact: true })).toBeDisabled();
    await closeMenu(page); await startTime(page, "11:00");
    panel = await menu(page);
    await expect(panel.getByRole("button", { name: "링크 복사", exact: true })).toBeDisabled();
    create.release();
    await expect.poll(() => app.posts.length).toBe(2);
    expect(app.posts[1].body).toMatchObject({ revision: 1, selections: { dayStartTime: "11:00", selectedPlaceIds: ["1001"] } });
    expect(await copied(page)).toEqual([]);
    await expect(panel.getByRole("button", { name: "링크 복사", exact: true })).toBeDisabled();
    update.release();
    await expect(panel.getByRole("button", { name: "링크 복사", exact: true })).toBeEnabled();
    await panel.getByRole("button", { name: "링크 복사", exact: true }).click();
    const url = `${new URL(page.url()).origin}/trip/${shareId}`;
    await expect.poll(() => copied(page)).toEqual([url]);
    await expect(panel.getByRole("link", { name: "공유 일정 보기", exact: true })).toHaveAttribute("href", url);
    expect(app.creates()).toHaveLength(1); expect(app.revision()).toBe(2);
    expect(await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values["wave-trip-schedule-v1"]).dayStartTime)).toBe("11:00");
  } finally { create.release(); update.release(); }
});

for (const theme of ["light", "dark"] as const) test(`clipboard failure preserves a usable live link and an accessible retry in ${theme}`, async ({ page }) => {
  await page.addInitScript(value => localStorage.setItem("wave-theme", value), theme);
  await prepare(page); const app = await server(page);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined }));
  const panel = await menu(page), button = panel.getByRole("button", { name: "링크 복사", exact: true });
  const url = `${new URL(page.url()).origin}/trip/${shareId}`;
  await expect(panel.getByRole("link", { name: "공유 일정 보기", exact: true })).toHaveAttribute("href", url);
  await button.focus(); await page.keyboard.press("Enter");
  await expect(panel.getByRole("status")).toContainText(/복사하지 못|직접 복사/);
  await expect(button).toBeFocused();
  await expect(panel.getByRole("status")).not.toContainText("복사했어요");
  await expect(panel.getByRole("link", { name: "공유 일정 보기", exact: true })).toHaveAttribute("href", url);
  expect((await new AxeBuilder({ page }).include(".simple-share-menu").analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: test.info().outputPath(`shared-link-${theme}.png`) });
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => {} } }));
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("status")).toContainText("공유 링크를 복사했어요");
  expect(app.creates()).toHaveLength(1); expect(app.posts).toHaveLength(1); expect(errors).toEqual([]);
});
