import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";

test("visiting hours load on request, compare changed times and reuse the same record", async ({ page }, info) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests: string[] = [], errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/wave?action=visit-info&*", route => {
    requests.push(route.request().url());
    return route.fulfill({ json: { id: "1001", status: "available", checkedAt: "2026-09-11T02:00:00Z", source: "ⓒ한국관광공사", hours: "09:00~18:00 (입장마감 17:00)", restDays: "연중무휴", fees: "성인 1,000원", phone: "055-123-4567" } });
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.locator(".planner-navigation nav button").nth(3).click();
  const board = page.locator(".reference-day-list");
  const hours = board.locator(".visit-hours");
  await expect(hours.locator("summary")).toBeVisible();
  expect(requests).toEqual([]);
  await hours.locator("summary").click();
  await expect(hours).toContainText("등록된 이용시간 안에 머무는 일정이에요.");
  await expect(hours.getByRole("link", { name: "055-123-4567" })).toHaveAttribute("href", "tel:0551234567");
  await board.locator(".reference-start-time input").fill("08:00");
  await expect(hours).toContainText("예상 도착이 개장 전이에요.");
  await board.locator(".reference-start-time input").fill("16:00");
  await expect(hours).toContainText("머무는 동안 이용시간이 끝나요.");
  await board.locator(".reference-stop-actions summary").click();
  await board.getByRole("combobox", { name: "경남도립미술관 머무는 시간", exact: true }).selectOption("30");
  await expect(hours).toContainText("시간대 일치");
  await board.locator(".reference-stop-actions summary").click();
  await hours.locator("summary").click();
  await hours.locator("summary").press("Enter");
  await expect(hours).toContainText("시간대 일치");
  expect(requests).toHaveLength(1);
  expect([...new URL(requests[0]).searchParams.keys()]).toEqual(["action", "contentId"]);
  for (const width of info.project.name.startsWith("desktop") ? [1440, 960] : [390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await hours.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`visit-hours-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  expect((await new AxeBuilder({ page }).include(".visit-hours").analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("provider failure retries explicitly and conditional hours remain unconfirmed", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  let calls = 0;
  await page.route("**/api/wave?action=visit-info&*", route => ++calls === 1
    ? route.fulfill({ status: 502, json: { status: "provider-error" } })
    : route.fulfill({ json: { id: "1001", status: "available", checkedAt: "2026-09-11T02:00:00Z", source: "ⓒ한국관광공사", hours: "하절기 09:00~18:00 / 동절기 10:00~17:00", restDays: "월요일 (공휴일은 다음날)" } }));
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.locator(".planner-navigation nav button").nth(3).click();
  const hours = page.locator(".reference-day-list .visit-hours");
  await hours.locator("summary").click();
  await expect(hours.getByRole("alert")).toContainText("불러오지 못했어요");
  expect(calls).toBe(1);
  await hours.getByRole("button", { name: "다시 확인", exact: true }).click();
  await expect(hours.locator("[role=status]")).toContainText("확인 필요");
  await expect(hours).toContainText("하절기 09:00~18:00 / 동절기 10:00~17:00");
  expect(calls).toBe(2);
  await expect(page.locator(".reference-stop-copy")).toContainText("경남도립미술관");
});
