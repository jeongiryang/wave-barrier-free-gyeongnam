import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test("여행 프로필은 저장 뒤에도 자동 적용하지 않고 사용자가 선택해 적용·삭제한다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();
  const profileChoices = page.locator(".profile-grid");

  await profileChoices.getByRole("button", { name: /휠체어 이용/ }).click();
  await profileChoices.getByRole("button", { name: /청각 정보 지원/ }).click();
  await page.getByRole("button", { name: "현재 선택 저장" }).click();
  await expect(page.getByRole("status").filter({ hasText: "이 기기의 여행 프로필로 저장" })).toBeVisible();

  await page.reload();
  await expect(profileChoices.getByRole("button", { name: /휠체어 이용/ })).toHaveAttribute("aria-pressed", "true");
  await expect(profileChoices.getByRole("button", { name: /청각 정보 지원/ })).toHaveAttribute("aria-pressed", "false");
  const profile = page.getByRole("region", { name: "나의 무장애 여행 프로필" });
  await expect(profile).toContainText("청각 정보 지원");
  await profile.getByRole("button", { name: "저장 프로필 적용" }).click();
  await expect(profileChoices.getByRole("button", { name: /휠체어 이용/ })).toHaveAttribute("aria-pressed", "false");
  await expect(profileChoices.getByRole("button", { name: /청각 정보 지원/ })).toHaveAttribute("aria-pressed", "true");

  await profile.getByRole("button", { name: "현재 선택 전체 해제" }).click();
  await expect(page.locator(".profile-card[aria-pressed='true']")).toHaveCount(0);
  await profile.getByRole("button", { name: "저장 프로필 삭제" }).click();
  await expect(profile.getByRole("button", { name: "현재 선택 저장" })).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem("wave-travel-profile-v1"))).toBeNull();
});

test("손상되거나 차단된 프로필 저장소는 현재 선택을 잃지 않고 설명한다", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("wave-travel-profile-v1", "{");
  });
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.getByText(/저장된 여행 프로필을 읽지 못했습니다/)).toBeVisible();
  await expect(page.getByRole("button", { name: /휠체어 이용/ })).toHaveAttribute("aria-pressed", "true");

  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === "wave-travel-profile-v1") throw new Error("blocked");
      return original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "현재 선택 저장" }).click();
  await expect(page.getByText(/이 브라우저에서는 여행 프로필을 저장할 수 없습니다/)).toBeVisible();
  await expect(page.getByRole("button", { name: /휠체어 이용/ })).toHaveAttribute("aria-pressed", "true");
});
