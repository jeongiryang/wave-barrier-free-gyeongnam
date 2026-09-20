import { acceptTripTimingWarning } from './trip-timing-fixtures';
import { openSupportMenu } from "./support-menu";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { liveSharePayload } from "../lib/trips/live-share.js";
import { mockPlannerApi, chooseTripConditions, openItinerary } from "./fixtures";

const errors = new WeakMap<Page, string[]>(), rejectedShares = new WeakMap<Page, number>();
test.beforeEach(async ({ page }) => {
  const list: string[] = []; errors.set(page, list); rejectedShares.set(page, 0);
  page.on("pageerror", error => list.push(error.message));
  page.on("console", message => { if (message.type() === "error") list.push(message.text()); });
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
});
test.afterEach(async ({ page }) => {
  const messages = errors.get(page) || [], expected400 = messages.filter(message => message.includes("the server responded with a status of 400"));
  expect(expected400).toHaveLength(rejectedShares.get(page) || 0);
  expect(messages.filter(message => !expected400.includes(message))).toEqual([]);
});
async function schedule(page: Page) { return page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values["wave-trip-schedule-v1"])); }
async function settings(page: Page) { await page.getByRole("button", { name: "여행 설정", exact: true }).click(); return page.getByRole("dialog", { name: "여행 설정", exact: true }); }
function deferred() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
async function prepare(page: Page, english: boolean, end = "2026-10-08", theme = "light") {
  await page.addInitScript(theme => localStorage.setItem("wave-theme", theme), theme);
  await mockPlannerApi(page, { preserveView: true });
  await page.goto(`/planner?travelStart=2026-10-07&travelEnd=${end}`);
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에 담기", exact: true }).click();
  if (english) {
    await openSupportMenu(page);
    const preferences = page.locator(".preference-controls:visible"), trigger = preferences.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ });
    await trigger.click(); await expect(trigger).toBeFocused(); await expect(trigger).toBeInViewport();
    await preferences.getByLabel("언어", { exact: true }).selectOption("en");
    await preferences.getByLabel("Open preferences", { exact: true }).click();
    const support = page.locator(".wave-support-menu");
    if (await support.getByRole('button', { name: /^(WAVE 이용 안내 메뉴|WAVE support menu)$/ }).getAttribute('aria-expanded') === 'true') await support.getByRole('button', { name: /^(WAVE 이용 안내 메뉴|WAVE support menu)$/ }).click();
  }
  await openItinerary(page);
  return page.locator("#itinerary");
}

for (const english of [false, true]) for (const theme of ["light", "dark"]) {
  test(`seven-day input and current itinerary stay consistent ${english ? "English" : "Korean"} ${theme}`, async ({ page }, info) => {
    const itinerary = await prepare(page, english, "2026-10-08", theme), before = await schedule(page);
    const editor = await settings(page), end = editor.getByLabel("마지막 날", { exact: true });
    await expect(end).toHaveAttribute("max", "2026-10-13");
    await end.fill("2026-10-16");
    await editor.getByRole("button", { name: "적용", exact: true }).click();
    expect(await end.evaluate((element: HTMLInputElement) => element.validity.rangeOverflow)).toBe(true);
    await expect(end).toBeFocused();
    expect(await schedule(page)).toEqual(before);
    await end.fill("2026-10-08");
    await editor.getByLabel("시작일", { exact: true }).fill("2026-10-10");
    await expect(end).toHaveValue("2026-10-10");
    await editor.getByRole("button", { name: "적용", exact: true }).click();
    await expect(itinerary.locator(".simple-itinerary-heading")).toContainText("2026-10-10 — 2026-10-10");
    await expect(itinerary.locator(".simple-day-tabs button")).toHaveCount(1);
    await expect(itinerary.locator(".simple-outside-dates")).toContainText("경남도립미술관 · 2026-10-07");
    await expect(itinerary.locator(".simple-outside-dates")).toContainText("용지호수공원 · 2026-10-07");
    expect((await schedule(page)).scheduleAssignments).toEqual(before.scheduleAssignments);
    for (const width of [390, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await itinerary.scrollIntoViewIfNeeded();
      expect(await itinerary.locator(".simple-outside-dates > div > span").evaluateAll(nodes => nodes.filter(node => node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1).map(node => node.textContent))).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await itinerary.screenshot({ path: info.outputPath(`date-notice-${width}-${english ? "en" : "ko"}.png`) });
    }
    expect((await new AxeBuilder({ page }).include("#itinerary").analyze()).violations).toEqual([]);
  });

  test(`outside dates remain in local archives and need correction for public sharing ${english ? "English" : "Korean"} ${theme}`, async ({ page }) => {
    // This round trip enters three full documents and verifies both rejected and corrected sharing.
    test.setTimeout(90_000);
    const itinerary = await prepare(page, english, "2026-10-08", theme);
    await page.getByRole("button", { name: "용지호수공원 일정 수정", exact: true }).click();
    const stop = page.getByRole("dialog", { name: "용지호수공원 수정", exact: true });
    await stop.getByRole("combobox", { name: "방문 날짜", exact: true }).selectOption("2026-10-08");
    await stop.getByRole("button", { name: "적용", exact: true }).click();
    const editor = await settings(page);
    await editor.getByLabel("마지막 날", { exact: true }).fill("2026-10-07");
    await editor.getByRole("button", { name: "적용", exact: true }).click();
    await expect(itinerary.locator(".simple-outside-dates")).toContainText("용지호수공원 · 2026-10-08");
    await expect(itinerary.locator(".simple-stops > li")).toHaveCount(1);
    await itinerary.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
    await expect(itinerary.locator(".simple-save-control [role=status]")).toContainText("내 여행에 저장했어요");
    const archive = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-travel-book-v1") || "[]")[0]);
    expect(archive).toMatchObject({ travelEnd: "2026-10-07", scheduleAssignments: { "1001": "2026-10-07", "1002": "2026-10-08" } });
    const posted: Array<{ selections: { scheduleAssignments: Record<string, string> } }> = [];
    await page.route("**/api/kakao/share", route => route.fulfill({ json: { javascriptKey: "" } }));
    await page.route("**/api/trips", route => {
      const body = route.request().postDataJSON(); posted.push(body);
      // Reuse the actual pure API validator, without accounts or a database.
      try { liveSharePayload(body); }
      catch (error) { rejectedShares.set(page, (rejectedShares.get(page) || 0) + 1); return route.fulfill({ status: 400, json: { error: error instanceof Error ? error.message : "날짜 확인 필요" } }); }
      return route.fulfill({ json: { id: "123456789abc", url: `${new URL(page.url()).origin}/trip/123456789abc`, revision: 1, expiresAt: Date.now() + 30 * 86_400_000 } });
    });
    await itinerary.getByRole("button", { name: "공유", exact: true }).click();
    await page.getByRole("button", { name: "공개 링크 만들기", exact: true }).click();
    const share = page.getByRole("dialog", { name: "여행 공유", exact: true });
    await expect(share.getByRole("status")).toContainText("기간 밖 장소의 방문 날짜");
    await expect(share.getByRole("link", { name: "공유 일정 보기", exact: true })).toHaveCount(0);
    expect(posted[0].selections.scheduleAssignments["1002"]).toBe("2026-10-08");
    expect((await schedule(page)).scheduleAssignments["1002"]).toBe("2026-10-08");
    await share.getByRole("button", { name: "공유 닫기", exact: true }).click();
    await page.getByRole("link", { name: "저장한 여행", exact: true }).click();
    await expect(page.getByRole("button", { name: "이 일정 다시 열기", exact: true })).toBeEnabled();
    const moduleGate = deferred(), sessionGate = deferred();
    let heldModules = 0, heldSessions = 0;
    await page.route("**/features/travel-book/TravelBookArchiveAction.tsx*", async route => {
      heldModules++; await moduleGate.promise; await route.continue();
    });
    await page.route("**/api/auth/get-session", async route => {
      heldSessions++; await sessionGate.promise; await route.fulfill({ json: null });
    });
    try {
      await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
      await itinerary.waitFor();
      await expect.poll(() => heldModules).toBe(1);
      await expect(itinerary.locator(".simple-save-control")).toHaveCount(0);
      await expect(itinerary.locator(".simple-outside-dates")).toContainText("용지호수공원 · 2026-10-08");
      expect((await schedule(page)).scheduleAssignments["1002"]).toBe("2026-10-08");
      await itinerary.locator(".simple-outside-dates > div").filter({ hasText: "용지호수공원" }).getByRole("button", { name: "날짜 수정", exact: true }).click();
      await stop.getByRole("combobox", { name: "방문 날짜", exact: true }).selectOption("2026-10-07");
      await stop.getByRole("button", { name: "적용", exact: true }).click();
      await expect(itinerary.locator(".simple-outside-dates")).toHaveCount(0);
      expect((await schedule(page)).scheduleAssignments["1002"]).toBe("2026-10-07");
      // Editing must survive both a late archive-module mount and an auth result
      // that arrives after the real 900ms autosave debounce has elapsed.
      moduleGate.release();
      await expect.poll(() => heldSessions).toBeGreaterThan(0);
      await expect(itinerary.locator(".simple-save-control > button")).toBeDisabled();
      await page.waitForTimeout(1100);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-travel-book-v1") || "[]")[0].scheduleAssignments["1002"])).toBe("2026-10-08");
      sessionGate.release();
      await expect.poll(() => page.evaluate(() => {
        const books = JSON.parse(localStorage.getItem("wave-travel-book-v1") || "[]");
        return { count: books.length, id: books[0]?.id, travelEnd: books[0]?.travelEnd, assignedDate: books[0]?.scheduleAssignments["1002"] };
      })).toEqual({ count: 1, id: archive.id, travelEnd: "2026-10-07", assignedDate: "2026-10-07" });
    } finally { moduleGate.release(); sessionGate.release(); }
    await page.getByRole("button", { name: "공유", exact: true }).click();
  { const create = page.getByRole('button', { name: '공개 링크 만들기', exact: true }); if (await create.isVisible() && await create.isEnabled()) { await create.click(); await acceptTripTimingWarning(page); } }
    await expect(share.getByRole("link", { name: "공유 일정 보기", exact: true })).toHaveAttribute("href", /\/trip\/123456789abc$/);
    expect(posted.at(-1)?.selections.scheduleAssignments).toEqual({ "1001": "2026-10-07", "1002": "2026-10-07" });
    await share.getByRole("button", { name: "공유 닫기", exact: true }).click();
    await page.reload(); await itinerary.waitFor();
    await expect(itinerary.locator(".simple-stops > li")).toHaveCount(2);
  });

  test(`legacy long URL normalizes visibly ${english ? "English" : "Korean"} ${theme}`, async ({ page }) => {
    const itinerary = await prepare(page, english, "2026-10-16", theme);
    await expect(itinerary.locator(".simple-itinerary-heading")).toContainText("2026-10-07 — 2026-10-13");
    await expect(itinerary.locator(".simple-day-tabs button")).toHaveCount(7);
    const editor = await settings(page);
    await expect(editor.getByLabel("마지막 날", { exact: true })).toHaveValue("2026-10-13");
    expect((await schedule(page)).travelEnd).toBe("2026-10-13");
  });
}
