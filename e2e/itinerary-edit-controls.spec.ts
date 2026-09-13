import { openSupportMenu } from "./support-menu";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseTripConditions, mockPlannerApi, openItinerary } from "./fixtures";

for (const { en, theme, width } of [{ en: false, theme: "light", width: 960 }, { en: true, theme: "dark", width: 1440 }]) {
  test(`itinerary date and time edits remain visible and persist ${en ? "EN" : "KO"} ${theme}`, async ({ page }, info) => {
    await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
    await mockPlannerApi(page, { preserveView: true });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(theme => localStorage.setItem("wave-theme", theme), theme);
    await page.goto("/planner?travelStart=2026-10-07&travelEnd=2026-10-09");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
    if (en) {
      await openSupportMenu(page);
      const preferences = page.locator(".preference-controls:visible");
      await preferences.getByLabel("환경설정 열기", { exact: true }).click();
      await preferences.getByLabel("언어", { exact: true }).selectOption("en");
      await preferences.getByLabel("Open preferences", { exact: true }).click();
      const support = page.locator(".wave-support-menu");
      if (await support.getAttribute("open") !== null) await support.locator(":scope > summary").click();
    }
    await openItinerary(page);
    const panel = page.locator("#itinerary"), settingsButton = panel.getByRole("button", { name: "여행 설정", exact: true });
    await settingsButton.focus(); await settingsButton.press("Enter");
    const settings = page.getByRole("dialog", { name: "여행 설정", exact: true }), time = settings.getByLabel("하루 시작", { exact: true });
    await time.fill("09:15"); await page.keyboard.press("Escape");
    await expect(settings).toHaveCount(0); await expect(settingsButton).toBeFocused();
    await settingsButton.press("Enter"); await expect(time).toHaveValue("10:00");
    await time.fill("11:30"); await settings.getByRole("button", { name: "적용", exact: true }).click();
    const editButton = panel.getByRole("button", { name: "경남도립미술관 일정 수정", exact: true });
    await editButton.focus(); await editButton.press("Enter");
    const editor = page.getByRole("dialog", { name: "경남도립미술관 수정", exact: true }), date = editor.getByRole("combobox", { name: "방문 날짜", exact: true });
    await date.selectOption("2026-10-09"); await editor.getByRole("button", { name: "적용", exact: true }).click();
    await expect(panel.locator(".simple-stops > li")).toHaveCount(0);
    await panel.getByRole("button", { name: /^3일차/ }).click();
    await expect(panel.locator(".simple-stops > li")).toHaveCount(1);
    await expect(panel.locator(".simple-stops > li")).toContainText("경남도립미술관");
    await page.reload();
    await expect(panel.locator(".simple-stops > li")).toHaveCount(0);
    await expect(panel.getByRole("button", { name: /^1일차/ })).toHaveAttribute("aria-pressed", "true");
    await panel.getByRole("button", { name: /^3일차/ }).click();
    await expect(panel.locator(".simple-stops > li")).toHaveCount(1);
    await page.setViewportSize({ width: info.project.name.startsWith("mobile") ? en ? 320 : 390 : width, height: 1000 });
    await settingsButton.click(); await expect(time).toHaveValue("11:30");
    for (const control of [time, settings.getByRole("button", { name: "취소", exact: true }), settings.getByRole("button", { name: "적용", exact: true })]) {
      const box = await control.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    expect((await new AxeBuilder({ page }).include('dialog[aria-labelledby="trip-settings-title"]').analyze()).violations).toEqual([]);
    await settings.getByRole("button", { name: "취소", exact: true }).click();
    await editButton.click(); await expect(date).toHaveValue("2026-10-09");
    for (const control of [date, editor.getByRole("button", { name: "일정에서 빼기", exact: true }), editor.getByRole("button", { name: "적용", exact: true })]) {
      const box = await control.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: info.outputPath("itinerary-timeline.png") });
    expect((await new AxeBuilder({ page }).include(".simple-stop-editor").analyze()).violations).toEqual([]);
    const current = await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values["wave-trip-schedule-v1"]));
    expect(current).toMatchObject({ dayStartTime: "11:30", scheduleAssignments: { "1001": "2026-10-09" } });
  });
}
