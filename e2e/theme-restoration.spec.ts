import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

for (const source of ["archive", "shared"] as const) test(`${source}: restoring a two-theme trip keeps both selected activities`, async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (source === "archive") {
    await page.goto("/planner");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: /^음식/ }).click();
    await page.locator(".condition-actions").getByRole("button", { name: "여행지 둘러보기 →", exact: true }).click();
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
    const itinerary = page.getByRole("region", { name: "날짜별 여행 일정" });
    await itinerary.getByRole("button", { name: "내 일정에 저장", exact: true }).click();
    await expect(itinerary.locator(".travel-book-archive-action [role=status]")).toContainText("내 일정에 저장했어요");
    await itinerary.getByRole("link", { name: /저장한 일정 보기/ }).click();
    await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
  } else {
    await page.route("**/api/trips/shared-theme", route => route.fulfill({ json: {
      plan, selections: { region: "창원", theme: "nature,food", themes: ["nature", "food"], profiles: [], travelStart: "2026-10-08", travelEnd: "2026-10-09" }, expiresAt: Date.now() + 86_400_000,
    } }));
    await page.goto("/trip/shared-theme");
    await page.getByRole("button", { name: "이 조건으로 다시 설계하기 →", exact: true }).click();
  }
  await expect(page.getByRole("button", { name: /^자연·휴양/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^음식/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^역사·문화/ })).toHaveAttribute("aria-pressed", "false");
  const selectedFacilities = page.getByRole("group", { name: "여행 편의 조건 선택" }).locator('[aria-pressed="true"]');
  await expect(selectedFacilities).toHaveCount(source === "archive" ? 1 : 0);
  if (source === "archive") await expect(selectedFacilities).toContainText("휠체어 편의시설");
  await page.reload();
  await expect(page.getByRole("button", { name: /^자연·휴양/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^음식/ })).toHaveAttribute("aria-pressed", "true");
  await expect(selectedFacilities).toHaveCount(source === "archive" ? 1 : 0);
  if (source === "archive") await expect(selectedFacilities).toContainText("휠체어 편의시설");
  if (test.info().project.name === "desktop-chromium") for (const width of [960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator("#conditions").screenshot({ path: test.info().outputPath(`theme-${source}-${width}.png`) });
  }
});

for (const [query, expected] of [
  ["theme=leisure", ["레포츠"]],
  ["theme=leisure&themes=food,nature,food,invalid", ["자연·휴양", "음식"]],
  ["theme=nature&themes=invalid", []],
] as const) test(`legacy and multi-theme URL ${query} preserves later edits on reload`, async ({ page }) => {
  await mockPlannerApi(page);
  const requests: string[] = [];
  page.on("request", request => { const url = new URL(request.url()); if (url.searchParams.get("action") === "plan") requests.push(url.searchParams.get("themes") || ""); });
  await page.goto(`/planner?region=창원&${query}`);
  const activities = page.getByRole("group", { name: "무엇을 하고 싶나요?" });
  await expect(page.getByRole("button", { name: /^음식/ })).toBeEnabled();
  await expect(activities.locator('[aria-pressed="true"]')).toHaveCount(expected.length);
  for (const label of expected) await expect(activities.getByRole("button", { name: new RegExp(`^${label}`) })).toHaveAttribute("aria-pressed", "true");
  expect(requests).toEqual([]);
  for (const label of expected) await activities.getByRole("button", { name: new RegExp(`^${label}`) }).click();
  await page.reload();
  await expect(activities.locator('[aria-pressed="true"]')).toHaveCount(0);
  await activities.getByRole("button", { name: /^역사·문화/ }).click();
  await activities.getByRole("button", { name: /^음식/ }).click();
  await page.reload();
  await expect(activities.locator('[aria-pressed="true"]')).toHaveCount(2);
  await page.locator(".profile-grid").getByRole("button", { name: /휠체어 편의시설/ }).click();
  await page.locator(".condition-actions").getByRole("button", { name: "여행지 둘러보기 →", exact: true }).click();
  await expect(page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true })).toBeVisible();
  expect(requests).toEqual(["history,food"]);
});

async function current(page: Page) {
  return page.evaluate(() => {
    const values: Record<string, string | null> = Object.fromEntries(["wave-current-trip-v1", "wave-saved-places", "wave-saved-place-catalog-v1", "wave-trip-schedule-v1", "wave-trip-order-v1", "wave-planner-region-v1", "wave-trip-themes-v1", "wave-travel-book-v1"].map(key => [key, localStorage.getItem(key)]));
    values["wave-session-facilities-v1"] = sessionStorage.getItem("wave-session-facilities-v1");
    return values;
  });
}

for (const color of ["light", "dark"]) test(`shared redesign protects the current trip on cancellation and storage failure in ${color}`, async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(color => localStorage.setItem("wave-theme", color), color);
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: "내 일정에 저장", exact: true }).click();
  await expect(page.locator(".travel-book-archive-action [role=status]")).toContainText("내 일정에 저장했어요");
  // A theme-bearing URL cannot silently alter a trip that already has places.
  await page.goto("/planner?region=창원&themes=food");
  await expect(page.getByRole("button", { name: /^자연·휴양/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^음식/ })).toHaveAttribute("aria-pressed", "false");
  await page.route("**/api/trips/protected-theme", route => route.fulfill({ json: {
    plan, selections: { region: color === "light" ? "창원" : "진주", themes: ["food", "history"], theme: "nature", profiles: ["senior"], travelStart: "2026-10-08", travelEnd: "2026-10-09" }, expiresAt: Date.now() + 86_400_000,
  } }));
  await page.goto("/trip/protected-theme");
  const before = await current(page);
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
  expect(await current(page)).toEqual(before);
  await page.evaluate(() => (window as unknown as { themeFixtureRestore: () => void }).themeFixtureRestore());
  await dialog.getByRole("button", { name: "공유 조건으로 새 여행 시작", exact: true }).click();
  await expect(page.getByRole("button", { name: /^역사·문화/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^음식/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^자연·휴양/ })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".day-planner-grid li")).toHaveCount(0);
  // A shared trip cannot import someone else's facilities or erase this tab's
  // own explicit choice. The current user selected wheelchair facilities.
  const selectedFacilities = page.getByRole("group", { name: "여행 편의 조건 선택" }).locator('[aria-pressed="true"]');
  await expect(selectedFacilities).toHaveCount(1);
  await expect(selectedFacilities).toContainText("휠체어 편의시설");
  expect((await current(page))["wave-session-facilities-v1"]).toBe(before["wave-session-facilities-v1"]);
  // The date editor mounts only after the first place is added.
  await page.locator(".condition-actions").getByRole("button", { name: "여행지 둘러보기 →", exact: true }).click();
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await expect(page.locator(".day-planner").getByLabel("여행 시작일", { exact: true })).toHaveValue("2026-10-08");
  expect((await current(page))["wave-travel-book-v1"]).toBe(before["wave-travel-book-v1"]);
  await page.reload();
  await expect(page.getByRole("button", { name: /^음식/ })).toHaveAttribute("aria-pressed", "true");
  await expect(selectedFacilities).toHaveCount(1);
  await expect(selectedFacilities).toContainText("휠체어 편의시설");
  expect((await current(page))["wave-travel-book-v1"]).toBe(before["wave-travel-book-v1"]);
});
