import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";

for (const restoration of ["reload", "archive"] as const) {
  test(`${restoration} restores a saved itinerary that can be shared and exported without another search`, async ({ page }) => {
    await mockPlannerApi(page);
    await mockPublicShellApi(page);
    let searches = 0;
    page.on("request", request => {
      if (new URL(request.url()).searchParams.get("action") === "plan") searches++;
    });
    await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
    await page.getByLabel("하루 시작", { exact: true }).fill("10:30");
    await page.getByLabel("경남도립미술관 여행 날짜", { exact: true }).selectOption("2026-10-09");
    if (restoration === "archive") {
      await page.getByRole("button", { name: "내 일정에 저장", exact: true }).click();
      await expect(page.locator(".travel-book-archive-action [role=status]")).toContainText("내 일정에 저장했어요");
      await page.getByRole("link", { name: /저장한 일정 보기/ }).click();
      await page.getByRole("button", { name: "이 일정 다시 열기", exact: true }).click();
    } else await page.reload();
    await expect(page.getByLabel("하루 시작", { exact: true })).toHaveValue("10:30");
    await expect(page.getByLabel("경남도립미술관 여행 날짜", { exact: true })).toHaveValue("2026-10-09");
    expect(searches).toBe(1);
    const actions = page.locator(".itinerary-primary-actions");
    const calendar = page.locator("#departure-readiness").getByRole("button", { name: "캘린더(.ics) 저장", exact: true });
    await expect.soft(actions.getByRole("button")).toBeEnabled();
    await expect.soft(calendar).toBeEnabled();
    if (test.info().errors.length) return;
    const snapshots: Array<{ selections: { selectedPlaceIds: string[]; dayStartTime: string; scheduleAssignments: Record<string, string> } }> = [];
    await page.route("**/api/trips", async route => {
      snapshots.push(route.request().postDataJSON());
      await route.fulfill({ json: { url: `${new URL(page.url()).origin}/trip/restored-${snapshots.length}` } });
    });
    await actions.getByRole("button").click();
    await expect(actions.getByRole("link")).toHaveAttribute("href", /\/trip\/restored-1$/);
    expect(snapshots[0].selections.selectedPlaceIds).toEqual(["1001"]);
    expect(snapshots[0].selections.dayStartTime).toBe("10:30");
    expect(snapshots[0].selections.scheduleAssignments).toEqual({ "1001": "2026-10-09" });
    expect(snapshots[0]).not.toHaveProperty("plan");
    expect(JSON.stringify(snapshots[0])).not.toMatch(/mapX|mapY|128\.691|35\.238/);
    const pendingDownload = page.waitForEvent("download");
    await calendar.click();
    const download = await pendingDownload;
    const contents = await readFile((await download.path())!, "utf8");
    expect(contents).toContain("BEGIN:VCALENDAR");
    expect(contents).toContain("경남도립미술관");
    expect(contents).toContain("/trip/restored-1");
    expect(snapshots).toHaveLength(1);
    expect(searches).toBe(1);
    for (const width of [960, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await actions.getByRole("button").focus();
      await expect(page.locator(".day-planner")).toHaveCSS("opacity", "1");
      await actions.screenshot({ path: test.info().outputPath(`restored-${restoration}-${width}.png`) });
    }
  });
}
