import { expect, test } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";
import { openPlannerMap, addAnotherMapPlace, ensureMapView } from "./nearby-fixtures";

test("내 일정의 장소와 지도·경로 목적지가 어긋나지 않는다", async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();

  // 첫 추천이 아닌 장소만 담으면 지도와 경로도 그 일정 장소를 보여야 한다.
  await page.getByRole("button", { name: "용지호수공원 일정에 담기" }).click();
  await openPlannerMap(page);
  const destination = page.getByRole("button", { name: /도착 · 눌러서 변경/ });
  await expect(destination).toContainText("용지호수공원");

  // 현재 목적지를 빼고 다른 일정 장소가 남으면 남은 장소로 경로를 맞춘다.
  await addAnotherMapPlace(page, "경남도립미술관");
  const timetable = page.getByRole("group", { name: "일정 보기 방식", exact: true }).getByRole("button", { name: "시간표", exact: true });
  if (await timetable.count()) await timetable.click();
  await page.getByRole("button", { name: "용지호수공원 일정 수정", exact: true }).click();
  await page.getByRole("dialog", { name: "용지호수공원 수정", exact: true }).getByRole("button", { name: "일정에서 빼기", exact: true }).click();
  await ensureMapView(page);
  await expect(destination).toContainText("경남도립미술관");
});
