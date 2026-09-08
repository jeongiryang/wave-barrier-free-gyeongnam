import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test("편의 조건은 저장 뒤에도 자동 적용하지 않고 사용자가 선택해 적용·삭제한다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.getByRole("group", { name: "여행 설계 보기 방식" }).getByRole("button", { name: "전체 보기", exact: true })).toBeEnabled();
  const profileChoices = page.locator(".profile-grid");

  await profileChoices.getByRole("button", { name: /청각 정보 지원/ }).click();
  const profile = page.locator(".travel-profile-card");
  await profile.locator("summary").click();
  await profile.getByRole("button", { name: "이 조건 저장" }).click();
  await expect(page.getByRole("status").filter({ hasText: "이 기기에 저장" })).toBeVisible();

  await page.reload();
  await expect(profileChoices.getByRole("button", { name: /휠체어 편의시설/ })).toHaveAttribute("aria-pressed", "false");
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
  await expect(page.getByText(/저장한 편의 조건을 읽지 못했습니다/)).toBeVisible();
  await expect(page.getByRole("button", { name: /휠체어 편의시설/ })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: /휠체어 편의시설/ }).click();

  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === "wave-travel-profile-v1") throw new Error("blocked");
      return original.call(this, key, value);
    };
  });
  const profile = page.locator(".travel-profile-card");
  await profile.locator("summary").click();
  await profile.getByRole("button", { name: "이 조건 저장" }).click();
  await expect(page.getByText(/이 브라우저에서는 편의 조건을 저장할 수 없습니다/)).toBeVisible();
  await expect(page.getByRole("button", { name: /휠체어 편의시설/ })).toHaveAttribute("aria-pressed", "true");
});
