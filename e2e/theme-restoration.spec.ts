import { acceptTripTimingWarning } from './trip-timing-fixtures';
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockPlannerApi, plan } from "./fixtures";

async function setup(page: Page) {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
}
async function browse(page: Page) {
  await page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: "여행지 찾기", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toBeEnabled();
}
async function facilities(page: Page) {
  await page.getByRole("button", { name: /^필요한 편의/ }).click();
  return page.getByRole("dialog", { name: "필요한 편의", exact: true });
}
async function selectAccessPath(page: Page) {
  const picker = await facilities(page);
  await picker.getByRole("checkbox", { name: "접근로", exact: true }).check();
  await picker.getByRole("button", { name: /^적용/ }).click();
}
async function assertFacilities(page: Page, selected: boolean) {
  const picker = await facilities(page);
  await expect(picker.locator(".simple-facility-grid input:checked")).toHaveCount(selected ? 1 : 0);
  if (selected) await expect(picker.getByRole("checkbox", { name: "접근로", exact: true })).toBeChecked();
  await picker.getByRole("button", { name: "편의 선택 닫기", exact: true }).click();
}
async function addAndSave(page: Page) {
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: /^내 일정/ }).click();
  const initial = page.locator(".simple-initial-setup");
  await initial.getByLabel("시작일", { exact: true }).fill("2026-10-07");
  await initial.getByLabel("마지막 날", { exact: true }).fill("2026-10-08");
  await initial.getByRole("button", { name: "시간표 만들기", exact: true }).click();
  await page.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
    await acceptTripTimingWarning(page);
  await expect(page.locator(".simple-save-control [role=status]")).toContainText("이 기기의 내 여행에 저장했어요");
}

for (const source of ["archive", "shared"] as const) test(`${source}: restoring a two-theme trip keeps both selected activities`, async ({ page }) => {
  await setup(page);
  if (source === "archive") {
    await page.goto("/planner");
    await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
    await page.getByRole("button", { name: "자연·휴양", exact: true }).click();
    await page.getByRole("button", { name: "음식", exact: true }).click();
    await selectAccessPath(page);
    await addAndSave(page);
    await page.getByRole("link", { name: "저장한 여행", exact: true }).click();
    await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
  } else {
    await page.route("**/api/trips/shared-theme", route => route.fulfill({ json: {
      plan, selections: { region: "창원", theme: "nature,food", themes: ["nature", "food"], profiles: [], travelStart: "2026-10-08", travelEnd: "2026-10-09" }, expiresAt: Date.now() + 86_400_000,
    } }));
    await page.goto("/trip/shared-theme");
    await page.getByRole("button", { name: "이 조건으로 다시 설계하기 →", exact: true }).click();
  }
  await browse(page);
  await expect(page.getByRole("button", { name: "자연·휴양", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "음식", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "역사·문화", exact: true })).toHaveAttribute("aria-pressed", "false");
  await assertFacilities(page, source === "archive");
  await page.reload();
  await browse(page);
  await expect(page.getByRole("button", { name: "자연·휴양", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "음식", exact: true })).toHaveAttribute("aria-pressed", "true");
  await assertFacilities(page, source === "archive");
  if (test.info().project.name === "desktop-chromium") for (const width of [960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator("#conditions").screenshot({ path: test.info().outputPath(`theme-${source}-${width}.png`) });
  }
});

for (const [query, expected, initialRequest] of [
  ["theme=leisure", ["레저스포츠"], "leisure"],
  ["theme=leisure&themes=food,nature,food,invalid", ["자연·휴양", "음식"], "nature,food"],
  ["theme=nature&themes=invalid", [], ""],
] as const) test(`legacy and multi-theme URL ${query} preserves later edits on reload`, async ({ page }) => {
  await setup(page);
  const requests: string[] = [];
  page.on("request", request => { const url = new URL(request.url()); if (url.searchParams.get("action") === "plan") requests.push(url.searchParams.get("themes") || ""); });
  await page.goto(`/planner?region=창원&${query}`);
  const activities = page.getByRole("group", { name: "하고 싶은 활동", exact: true });
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toBeEnabled();
  await expect(activities.locator('[aria-pressed="true"]')).toHaveCount(expected.length);
  for (const label of expected) await expect(activities.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-pressed", "true");
  // Region entry now searches automatically with the normalized URL themes.
  await expect.poll(() => requests[0]).toBe(initialRequest);
  for (const label of expected) await activities.getByRole("button", { name: label, exact: true }).click();
  await page.reload();
  await expect(activities.locator('[aria-pressed="true"]')).toHaveCount(0);
  await activities.getByRole("button", { name: "역사·문화", exact: true }).click();
  await activities.getByRole("button", { name: "음식", exact: true }).click();
  await page.reload();
  await expect(activities.locator('[aria-pressed="true"]')).toHaveCount(2);
  await expect(activities.getByRole("button", { name: "역사·문화", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(activities.getByRole("button", { name: "음식", exact: true })).toHaveAttribute("aria-pressed", "true");
  await selectAccessPath(page);
  await expect(page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true })).toBeEnabled();
  await expect.poll(() => requests.at(-1)).toBe("history,food");
});

async function current(page: Page) {
  return page.evaluate(() => {
    const values: Record<string, string | null> = Object.fromEntries(["wave-current-trip-v1", "wave-trip-identity-v1", "wave-saved-places", "wave-saved-place-catalog-v1", "wave-trip-schedule-v1", "wave-trip-order-v1", "wave-planner-region-v1", "wave-trip-themes-v1", "wave-travel-book-v1"].map(key => [key, localStorage.getItem(key)]));
    values["wave-session-facilities-v1"] = sessionStorage.getItem("wave-session-facilities-v1");
    return values;
  });
}

for (const color of ["light", "dark"]) test(`shared redesign protects the current trip on cancellation and storage failure in ${color}`, async ({ page }) => {
  await setup(page);
  await page.addInitScript(color => localStorage.setItem("wave-theme", color), color);
  await page.goto("/planner");
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await page.getByRole("button", { name: "자연·휴양", exact: true }).click();
  await selectAccessPath(page);
  await addAndSave(page);
  // A theme-bearing URL cannot silently alter a trip that already has places.
  await page.goto("/planner?region=창원&themes=food");
  await browse(page);
  await expect(page.getByRole("button", { name: "자연·휴양", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "음식", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.route("**/api/trips/protected-theme", route => route.fulfill({ json: {
    plan, selections: { region: color === "light" ? "창원" : "진주", themes: ["food", "history"], theme: "nature", profiles: ["senior"], travelStart: "2026-10-08", travelEnd: "2026-10-09" }, expiresAt: Date.now() + 86_400_000,
  } }));
  await page.goto("/trip/protected-theme");
  const before = await current(page);
  const { "wave-travel-book-v1": beforeArchive, ...protectedCurrent } = before;
  const beforeBooks = JSON.parse(beforeArchive || "[]");
  expect(beforeBooks).toHaveLength(1);
  const identity = JSON.parse(JSON.parse(before["wave-current-trip-v1"] || "{}").values["wave-trip-identity-v1"]);
  expect(identity.id).toBe(beforeBooks[0].tripId);
  expect(identity.binding).toEqual({ kind: "local", id: beforeBooks[0].id });
  function expectRecoveryBackup(raw: string | null, earliestUpdatedAt: string) {
    const books = JSON.parse(raw || "[]");
    expect(books).toHaveLength(1);
    // Backup precedes the new-trip commit. Only its write time and current
    // binding may advance; every saved place, date and other field must survive.
    expect(books[0]).toEqual({ ...beforeBooks[0], identity, updatedAt: books[0].updatedAt });
    expect(Date.parse(books[0].updatedAt)).toBeGreaterThanOrEqual(Date.parse(earliestUpdatedAt));
    return books[0];
  }
  const trigger = page.getByRole("button", { name: "이 조건으로 다시 설계하기 →", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "공유한 조건으로 새 여행을 시작할까요?" });
  await expect(dialog.getByRole("heading")).toBeFocused();
  expect(await current(page)).toEqual(before);
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "공유 조건으로 새 여행 시작", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "취소하고 현재 여행 유지", exact: true })).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  if (test.info().project.name === "desktop-chromium") for (const width of [960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await dialog.screenshot({ path: test.info().outputPath(`shared-decision-${color}-${width}.png`) });
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await current(page)).toEqual(before);
  await trigger.click();
  await dialog.getByRole("button", { name: "취소하고 현재 여행 유지", exact: true }).click();
  expect(await current(page)).toEqual(before);
  await trigger.click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) { if (key === "wave-current-trip-v1") throw new DOMException("quota", "QuotaExceededError"); original.call(this, key, value); };
    Object.assign(window, { themeFixtureRestore: () => { Storage.prototype.setItem = original; } });
  });
  await dialog.getByRole("button", { name: "공유 조건으로 새 여행 시작", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("현재 여행은 유지됩니다");
  const { "wave-travel-book-v1": recoveryArchive, ...failedCurrent } = await current(page);
  expect(failedCurrent).toEqual(protectedCurrent);
  const recoveryBackup = expectRecoveryBackup(recoveryArchive, beforeBooks[0].updatedAt);
  await page.evaluate(() => (window as unknown as { themeFixtureRestore: () => void }).themeFixtureRestore());
  await dialog.getByRole("button", { name: "공유 조건으로 새 여행 시작", exact: true }).click();
  await expect(page.getByRole("button", { name: "역사·문화", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "음식", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "자연·휴양", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: /^내 일정/ })).toBeEnabled();
  // Shared preferences cannot import another person's facilities or erase ours.
  await assertFacilities(page, true);
  expect((await current(page))["wave-session-facilities-v1"]).toBe(before["wave-session-facilities-v1"]);
  const preservedArchive = (await current(page))["wave-travel-book-v1"];
  expectRecoveryBackup(preservedArchive, recoveryBackup.updatedAt);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: /^내 일정/ }).click();
  await expect(page.locator(".simple-itinerary-heading")).toContainText("2026-10-08 — 2026-10-09");
  await page.reload();
  await browse(page);
  await expect(page.getByRole("button", { name: "음식", exact: true })).toHaveAttribute("aria-pressed", "true");
  await assertFacilities(page, true);
  expect((await current(page))["wave-travel-book-v1"]).toBe(preservedArchive);
});
