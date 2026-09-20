import { acceptTripTimingWarning } from './trip-timing-fixtures';
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi, openItinerary } from "./fixtures";

for (const restoration of ["reload", "archive"] as const) {
  test(`${restoration} restores exact dates and can share and export after background refresh`, async ({ page }, info) => {
    await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
    await mockPlannerApi(page, { preserveView: true });
    await mockPublicShellApi(page);
    let searches = 0;
    page.on("requestfinished", request => {
      if (new URL(request.url()).searchParams.get("action") === "plan") searches++;
    });
    await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
    await openItinerary(page, { start: "2026-10-08", end: "2026-10-09" });
    await page.getByRole("button", { name: "여행 설정", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "여행 설정", exact: true });
    await settings.getByLabel("하루 시작", { exact: true }).fill("10:30");
    await settings.getByRole("button", { name: "적용", exact: true }).click();
    await page.getByRole("button", { name: "경남도립미술관 일정 수정", exact: true }).click();
    const stop = page.getByRole("dialog", { name: "경남도립미술관 수정", exact: true });
    await stop.getByRole("combobox", { name: "방문 날짜", exact: true }).selectOption("2026-10-09");
    await stop.getByRole("button", { name: "적용", exact: true }).click();
    if (restoration === "archive") {
      await page.getByRole("button", { name: "내 여행에 저장", exact: true }).click();
      await expect(page.locator(".simple-save-control [role=status]")).toContainText("내 여행에 저장했어요");
      await page.getByRole("link", { name: "저장한 여행", exact: true }).click();
      searches = 0;
      await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
    } else { searches = 0; await page.reload(); }
    await expect(page.locator("#itinerary")).toBeVisible();
    await expect.poll(() => searches).toBe(1);
    await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
    await page.getByRole("button", { name: "여행 설정", exact: true }).click();
    await expect(settings.getByLabel("하루 시작", { exact: true })).toHaveValue("10:30");
    await expect(settings.getByLabel("시작일", { exact: true })).toHaveValue("2026-10-08");
    await expect(settings.getByLabel("마지막 날", { exact: true })).toHaveValue("2026-10-09");
    await settings.getByRole("button", { name: "취소", exact: true }).click();
    await page.getByRole("group", { name: "일정 날짜", exact: true }).getByRole("button", { name: /^2일차/ }).click();
    await expect(page.locator("#itinerary-stop-1001")).toBeVisible();
    await page.getByRole("button", { name: "경남도립미술관 일정 수정", exact: true }).click();
    await expect(stop.getByRole("combobox", { name: "방문 날짜", exact: true })).toHaveValue("2026-10-09");
    await stop.getByRole("button", { name: "취소", exact: true }).click();
    const snapshots: Array<{ selections: { selectedPlaceIds: string[]; dayStartTime: string; scheduleAssignments: Record<string, string>; profiles: string[] } }> = [];
    const shareId = "abcdef123456", expiresAt = Date.now() + 30 * 86_400_000;
    await page.route("**/api/trips", async route => {
      snapshots.push(route.request().postDataJSON());
      await route.fulfill({ json: { id: shareId, url: `${new URL(page.url()).origin}/trip/${shareId}`, revision: 1, expiresAt, live: true } });
    });
    await page.getByRole("button", { name: "공유", exact: true }).click();
  { const create = page.getByRole('button', { name: '공개 링크 만들기', exact: true }); if (await create.isVisible() && await create.isEnabled()) { await create.click(); await acceptTripTimingWarning(page); } }
    const menu = page.getByRole("dialog", { name: "여행 공유", exact: true });
    await expect(menu.getByRole("link", { name: "공유 일정 보기", exact: true })).toHaveAttribute("href", new RegExp(`/trip/${shareId}$`));
    expect(snapshots[0].selections.selectedPlaceIds).toEqual(["1001"]);
    expect(snapshots[0].selections.dayStartTime).toBe("10:30");
    expect(snapshots[0].selections.scheduleAssignments).toEqual({ "1001": "2026-10-09" });
    expect(snapshots[0].selections.profiles).toEqual([]);
    expect(snapshots[0]).not.toHaveProperty("plan");
    expect(JSON.stringify(snapshots[0])).not.toMatch(/mapX|mapY|128\.691|35\.238/);
    const pendingDownload = page.waitForEvent("download");
    await menu.getByRole("button", { name: "캘린더", exact: true }).click();
    const download = await pendingDownload;
    const contents = await readFile((await download.path())!, "utf8");
    expect(contents).toContain("BEGIN:VCALENDAR");
    expect(contents).toContain("경남도립미술관");
    expect(contents).not.toContain(`/trip/${shareId}`);
    expect(contents).not.toMatch(/^URL:/m);
    expect(snapshots).toHaveLength(1);
    expect(searches).toBe(1);
    for (const width of info.project.name.startsWith("desktop") ? [960, 1440] : [390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await menu.getByRole("button", { name: "캘린더", exact: true }).focus();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await menu.screenshot({ path: info.outputPath(`restored-${restoration}-${width}.png`) });
    }
  });
}
