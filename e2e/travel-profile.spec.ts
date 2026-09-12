import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test("현재 탭의 편의 선택은 복구하고 저장한 프로필은 직접 불러와 적용·삭제한다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  await expect(page.getByRole("group", { name: "여행 설계 보기 방식" }).getByRole("button", { name: "전체 보기", exact: true })).toBeEnabled();
  const profileChoices = page.locator(".profile-grid");

  await profileChoices.getByRole("button", { name: /청각 정보 지원/ }).click();
  const profile = page.locator(".travel-profile-card").filter({ has: page.locator("summary").filter({ hasText: "편의 조건 저장·불러오기" }) });
  await profile.locator("summary").click();
  await profile.getByRole("button", { name: "이 조건 저장" }).click();
  await expect(page.getByRole("status").filter({ hasText: "편의 조건을 저장했습니다" })).toBeVisible();

  await page.reload();
  await expect(profileChoices.getByRole("button", { name: /휠체어 편의시설/ })).toHaveAttribute("aria-pressed", "false");
  await expect(profileChoices.getByRole("button", { name: /청각 정보 지원/ })).toHaveAttribute("aria-pressed", "true");
  await profile.locator("summary").click();
  await profile.getByRole("button", { name: "선택한 조건 모두 해제" }).click();
  await expect(profileChoices.locator('[aria-pressed="true"]')).toHaveCount(0);
  await page.reload();
  // Reloading the explicitly cleared working trip must not apply the device's
  // saved profile until the traveler chooses to load it.
  await expect(profileChoices.getByRole("button", { name: /청각 정보 지원/ })).toHaveAttribute("aria-pressed", "false");
  await profile.locator("summary").click();
  await expect(profile).toContainText("청각 정보 지원");
  await profile.getByRole("button", { name: "저장한 조건 불러오기" }).click();
  await expect(profileChoices.getByRole("button", { name: /휠체어 편의시설/ })).toHaveAttribute("aria-pressed", "false");
  await expect(profileChoices.getByRole("button", { name: /청각 정보 지원/ })).toHaveAttribute("aria-pressed", "true");

  await profile.getByRole("button", { name: "선택한 조건 모두 해제" }).click();
  await expect(page.locator(".profile-card[aria-pressed='true']")).toHaveCount(0);
  await profile.getByRole("button", { name: "저장 삭제" }).click();
  await expect(profile.getByRole("button", { name: "이 조건 저장" })).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem("wave-travel-profile-v1"))).toBeNull();
});

test("손상되거나 차단된 프로필 저장소는 현재 선택을 잃지 않고 설명한다", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("wave-travel-profile-v1", "{");
  });
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  await expect(page.getByText(/저장한 편의 조건을 읽지 못했습니다/)).toBeVisible();
  await expect(page.locator(".profile-grid").getByRole("button", { name: /휠체어 편의시설/ })).toHaveAttribute("aria-pressed", "false");
  await page.locator(".profile-grid").getByRole("button", { name: /휠체어 편의시설/ }).click();

  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === "wave-travel-profile-v1") throw new Error("blocked");
      return original.call(this, key, value);
    };
  });
  const profile = page.locator(".travel-profile-card").filter({ has: page.locator("summary").filter({ hasText: "편의 조건 저장·불러오기" }) });
  await profile.locator("summary").click();
  await profile.getByRole("button", { name: "이 조건 저장" }).click();
  await expect(page.getByText(/편의 조건을 저장하지 못했어요/)).toBeVisible();
  await expect(page.locator(".profile-grid").getByRole("button", { name: /휠체어 편의시설/ })).toHaveAttribute("aria-pressed", "true");
});
