import { expect, test, type Locator, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, openItinerary } from "./fixtures";

async function expectTouchable(action: Locator) {
  await action.scrollIntoViewIfNeeded();
  const size = (await action.boundingBox())!;
  expect(size.width).toBeGreaterThanOrEqual(44);
  expect(size.height).toBeGreaterThanOrEqual(44);
  expect(await action.evaluate(node => {
    const box = node.getBoundingClientRect();
    return node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  }), "the launcher or header must not cover an action's centre").toBe(true);
}

async function tripSnapshot(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    return { places: values["wave-saved-places"], order: values["wave-trip-order-v1"], schedule: values["wave-trip-schedule-v1"] };
  });
}

test("workspace keeps two-screen navigation and one itinerary usable across desktop, half-window and mobile", async ({ page }, testInfo) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/planner");
  const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(region).toBeEnabled();
  await expect(page.locator(".simple-region-entry .simple-region")).toHaveCount(6);
  await region.selectOption("창원");
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page, { start: "2026-09-20" });
  const before = await tripSnapshot(page);
  const tabs = page.getByRole("group", { name: "여행 설계 화면", exact: true });
  const timetable = page.locator(".simple-timeboard"), map = page.locator(".simple-itinerary-map");

  for (const width of [1440, 1180, 960, 641, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await expect(tabs.getByRole("button", { name: /^내 일정/ })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".simple-itinerary-board")).toHaveCount(1);
    await expect(timetable).toBeVisible();
    await expect(timetable.locator("#itinerary-stop-1001")).toContainText("경남도립미술관");
    const mode = page.getByRole("group", { name: "일정 보기 방식", exact: true });
    if (width >= 1024) {
      await expect(mode).toHaveCount(0);
      await expect(map.locator(".leaflet-container")).toBeVisible();
      const left = (await timetable.boundingBox())!, right = (await map.boundingBox())!;
      expect(left.x + left.width).toBeLessThanOrEqual(right.x + 1);
      expect(right.x + right.width).toBeLessThanOrEqual(width);
    } else {
      await expect(mode.getByRole("button", { name: "시간표", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(map).toHaveCount(0);
      for (const action of await mode.getByRole("button").all()) await expectTouchable(action);
      await mode.getByRole("button", { name: "지도", exact: true }).click();
      await expect(map.locator(".leaflet-container")).toBeVisible();
      await expect(timetable).toBeHidden();
      expect(await tripSnapshot(page)).toEqual(before);
      await mode.getByRole("button", { name: "시간표", exact: true }).click();
      await expect(timetable).toBeVisible();
    }
    for (const action of [...await tabs.getByRole("button").all(), page.getByRole("button", { name: "여행 설정", exact: true }), page.getByRole("button", { name: "내 여행에 저장", exact: true }), page.getByRole("button", { name: "공유", exact: true })]) await expectTouchable(action);
    expect(await tripSnapshot(page)).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath("workspace-" + width + ".png") });
  }
  expect(errors).toEqual([]);
});
