import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test("출발 준비 카드는 부분 성공을 구분하고 키보드로 한국 시간대 캘린더를 저장한다", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(({ date }) => {
    window.localStorage.setItem("wave-trip-schedule-v1", JSON.stringify({
      travelStart: date, travelEnd: date, dayStartTime: "09:30", scheduleAssignments: {},
    }));
  }, { date: today });
  await mockPlannerApi(page);
  await page.route("**/api/weather**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      region: "창원", source: "기상청 단기예보", updatedAt: `${today}T01:00:00.000Z`,
      current: { temperature: 27, apparent: 29, code: 1, label: "대체로 맑음", wind: 2, precipitation: 0, isDay: true },
      days: [{ date: today, code: 1, label: "맑음", max: 30, min: 23, rainProbability: 10, rain: 0, snow: 0, uv: 6, advice: [] }], advice: [],
    }),
  }));
  await page.route("**/api/trips", (route) => route.fulfill({
    status: 201, contentType: "application/json", body: JSON.stringify({ url: "/trip/share-123" }),
  }));
  await page.goto("/planner");

  const card = page.getByRole("region", { name: "출발 준비를 한 장에서 확인하세요." });
  await expect(card).toBeVisible();
  await expect(card.getByText("오늘 출발")).toBeVisible();
  await expect(card.getByText("전체 일부 확인")).toBeVisible();
  await expect(card.getByText(/예측값이며 실시간 방문자 수가 아닙니다/)).toBeVisible();
  await expect(card.getByRole("button", { name: "캘린더(.ics) 저장", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "경남도립미술관 보관하기" }).click();
  const calendarButton = card.getByRole("button", { name: "캘린더(.ics) 저장", exact: true });
  await expect(calendarButton).toBeEnabled();
  await calendarButton.focus();
  await expect(calendarButton).toBeFocused();
  const downloadPromise = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`wave-창원-${today}.ics`);
  const path = await download.path();
  expect(path).toBeTruthy();
  const contents = await readFile(path || "", "utf8");
  expect(contents).toContain("TZID:Asia/Seoul");
  expect(contents).toContain(`DTSTART;TZID=Asia/Seoul:${today.replaceAll("-", "")}T093000`);
  expect(contents).toContain("URL:http://127.0.0.1:4173/trip/share-123");
  await expect(card.getByText("캘린더 파일을 저장했습니다.")).toBeAttached();

  const results = await new AxeBuilder({ page }).include(".departure-readiness").analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("지난 일정과 조회 실패는 출발 가능 상태로 표시하지 않는다", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("wave-trip-schedule-v1", JSON.stringify({
      travelStart: "2026-08-01", travelEnd: "2026-08-01", dayStartTime: "10:00", scheduleAssignments: {},
    }));
  });
  await mockPlannerApi(page);
  await page.route("**/api/weather**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "지연" }) }));
  await page.goto("/planner");
  const card = page.getByRole("region", { name: "출발 준비를 한 장에서 확인하세요." });
  await expect(card.getByText("지난 일정")).toBeVisible();
  await expect(card.getByText("전체 재확인 필요")).toBeVisible();
  await expect(card.getByText(/해당 날짜 예보가 없거나/)).toBeVisible();
  await expect(card.getByRole("button", { name: "캘린더(.ics) 저장", exact: true })).toBeDisabled();
});
