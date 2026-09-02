import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test("이 기기 일정의 장소와 지도·경로 목적지가 어긋나지 않는다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();

  // 첫 추천이 아닌 장소만 담으면 지도와 경로도 그 일정 장소를 보여야 한다.
  await page.getByRole("button", { name: "용지호수공원 일정에 추가" }).click();
  const destination = page.getByRole("button", { name: /도착 · 눌러서 변경/ });
  await expect(destination).toContainText("용지호수공원");

  // 현재 목적지를 빼고 다른 일정 장소가 남으면 남은 장소로 경로를 맞춘다.
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가" }).click();
  await page.getByRole("button", { name: "용지호수공원 일정에서 제거" }).click();
  await expect(destination).toContainText("경남도립미술관");
});
