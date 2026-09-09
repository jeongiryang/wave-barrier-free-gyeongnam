import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";

test("출발 준비 카드는 부분 성공을 구분하고 키보드로 한국 시간대 캘린더를 저장한다", async ({ page, baseURL }) => {
  const now = new Date();
  await page.clock.setFixedTime(now);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(({ date }) => {
    window.localStorage.setItem("wave-trip-schedule-v1", JSON.stringify({
      travelStart: date, travelEnd: date, dayStartTime: "09:30", scheduleAssignments: {},
    }));
  }, { date: today });
  await mockPlannerApi(page);
  // This success fixture represents the selected itinerary place on its date.
  // The default fixture is a historical reference and cannot confirm today's trip.
  await page.route("**/api/wave?*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("action") !== "crowd") return route.fallback();
    return route.fulfill({ status: 200, json: { crowd: { place: "경남도립미술관", rate: 24, baseYmd: today.replaceAll("-", "") } } });
  });
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
  await chooseTripConditions(page);

  const card = page.getByRole("region", { name: "출발 전에 이것만 다시 확인하세요." });
  await expect(card).toBeVisible();
  await expect(card.getByText("오늘 출발")).toBeVisible();
  await expect(card.getByText("전체 재확인 필요")).toBeVisible();
  await expect(card.getByText("먼저 장소를 일정에 추가하면 공유 일정과 캘린더를 만들 수 있습니다.")).toBeVisible();
  await expect(card.getByText(/예측값이며 실시간 방문자 수가 아닙니다/)).toBeVisible();
  await expect(card.getByRole("button", { name: "캘린더(.ics) 저장", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "경남도립미술관 일정에 추가" }).click();
  const journeys = card.locator("article").filter({ has: page.getByText("이동 경로·시간", { exact: true }) });
  await expect(journeys).toContainText("전체 1구간 중 0구간");
  await page.getByRole("button", { name: "모든 구간 조회하기", exact: true }).click();
  await expect(journeys).toContainText("전체 1구간 중 1구간");
  await expect(journeys).toHaveClass("confirmed");
  await expect(card.locator("article").filter({ has: page.getByText("이동 편의", { exact: true }) })).toHaveClass("recheck");
  await expect(card.getByText("전체 재확인 필요")).toBeVisible();
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
  expect(contents).toContain(`URL:${new URL("/trip/share-123", baseURL).href}`);
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
  await chooseTripConditions(page);
  const card = page.getByRole("region", { name: "출발 전에 이것만 다시 확인하세요." });
  await expect(card.getByText(/출발 전 확인 · 지난 일정/)).toBeVisible();
  await expect(card.getByText("전체 재확인 필요")).toBeVisible();
  await expect(card.getByText(/해당 날짜 예보가 없거나/)).toBeVisible();
  await expect(card.getByRole("button", { name: "캘린더(.ics) 저장", exact: true })).toBeDisabled();
});
