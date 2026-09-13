import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, openItinerary, plan } from "./fixtures";

test("an explicit new region trip clears this trip's facilities and activities while keeping the archive and saved profile", async ({ page }, info) => {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
  await mockPlannerApi(page, { preserveView: true });
  await page.goto("/planner?travelStart=2026-10-07&travelEnd=2026-10-08");
  await chooseTripConditions(page);
  const activities = page.getByRole("group", { name: "하고 싶은 활동", exact: true });
  await expect(activities.locator('[aria-pressed="true"]')).toHaveCount(1);
  await page.locator(".simple-facility-trigger").click();
  const facilities = page.getByRole("dialog", { name: "필요한 편의", exact: true });
  await expect(facilities.locator(".simple-facility-grid input:checked")).toHaveCount(5);
  await facilities.locator(".simple-saved-preferences > summary").click();
  await facilities.getByRole("button", { name: "이 기기에 조건 저장", exact: true }).click();
  await expect(facilities.getByRole("button", { name: "저장한 조건 불러오기", exact: true })).toBeEnabled();
  await facilities.getByRole("button", { name: "편의 선택 닫기", exact: true }).click();
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page, { start: "2026-10-07", end: "2026-10-08" });
  await page.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
  await expect(page.locator(".simple-save-control [role=status]")).toContainText("내 여행에 저장했어요");
  const archive = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-travel-book-v1") || "[]")[0]);
  await page.getByRole("button", { name: "새 여행", exact: true }).click();
  const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(region).toHaveValue("");
  await expect(activities.locator('[aria-pressed="true"]')).toHaveCount(0);
  const requests: URL[] = [];
  await page.route("**/api/wave?**", route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("action") !== "plan") return route.fallback();
    requests.push(url);
    return route.fulfill({ json: { ...plan, places: [], stops: [] } });
  });
  await region.focus(); await region.selectOption("고성");
  await expect(region).toBeFocused();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0].searchParams.get("region")).toBe("고성");
  expect(requests[0].searchParams.get("facilityKeys") || "").toBe("");
  expect(requests[0].searchParams.get("themes") || "").toBe("");
  await expect(page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: /^내 일정/ })).toBeDisabled();
  await page.locator(".simple-facility-trigger").click();
  await expect(facilities.locator(".simple-facility-grid input:checked")).toHaveCount(0);
  await facilities.locator(".simple-saved-preferences > summary").click();
  await facilities.getByRole("button", { name: "저장한 조건 불러오기", exact: true }).click();
  await expect(facilities.locator(".simple-facility-grid input:checked")).toHaveCount(5);
  // Loading a saved profile is still a draft until the traveler applies it.
  await facilities.getByRole("button", { name: "편의 선택 닫기", exact: true }).click();
  const current = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values);
  expect(JSON.parse(current["wave-saved-places"])).toEqual([]);
  expect(JSON.parse(current["wave-trip-schedule-v1"])).toMatchObject({ travelStart: "", travelEnd: "" });
  expect(JSON.parse(current["wave-trip-identity-v1"]).id).not.toBe(archive.tripId);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]"))).toEqual([]);
  const books = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-travel-book-v1") || "[]"));
  expect(books).toHaveLength(1);
  expect(books[0]).toMatchObject({ id: archive.id, tripId: archive.tripId, title: archive.title, theme: archive.theme, themes: archive.themes, note: archive.note, places: archive.places, travelStart: archive.travelStart, travelEnd: archive.travelEnd, scheduleAssignments: archive.scheduleAssignments });
  for (const width of info.project.name.startsWith("desktop") ? [960, 1440] : [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await region.focus();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.locator("#conditions").screenshot({ path: info.outputPath(`new-trip-neutral-${width}.png`) });
  }
});
