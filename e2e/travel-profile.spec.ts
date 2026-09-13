import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

async function setup(page: Page) {
  await page.route("**/api/**", route => route.fulfill({ status: 503, json: { error: "Unconfigured synthetic API" } }));
  await mockPlannerApi(page, { preserveView: true }); await page.goto("/planner");
}
async function picker(page: Page) {
  await page.locator(".simple-facility-trigger").click();
  const dialog = page.getByRole("dialog", { name: "필요한 편의", exact: true });
  await dialog.locator(".simple-saved-preferences > summary").click();
  return dialog;
}
const selected = (page: Page) => page.evaluate(() => JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]"));

test("현재 탭의 편의 선택은 복구하고 저장한 프로필은 직접 불러와 적용·삭제한다", async ({ page }) => {
  await setup(page); let dialog = await picker(page);
  for (const name of ["수어 안내", "영상 안내", "청각 지원 객실"]) await dialog.getByRole("checkbox", { name, exact: true }).check();
  await dialog.getByRole("button", { name: "이 기기에 조건 저장", exact: true }).click();
  await expect(dialog.getByRole("status").filter({ hasText: "편의 조건을 저장했습니다" })).toBeVisible();
  // A saved preference stays separate from the current tab until Apply.
  expect(await selected(page)).toEqual([]);
  await dialog.getByRole("button", { name: /^적용/ }).click();
  expect(await selected(page)).toEqual(["signguide", "videoguide", "hearingroom"]);
  await page.reload(); dialog = await picker(page);
  await expect(dialog.getByRole("checkbox", { name: "휠체어 대여", exact: true })).not.toBeChecked();
  for (const name of ["수어 안내", "영상 안내", "청각 지원 객실"]) await expect(dialog.getByRole("checkbox", { name, exact: true })).toBeChecked();
  await dialog.getByRole("button", { name: "선택 해제", exact: true }).click();
  await expect(dialog.locator(".simple-facility-grid input:checked")).toHaveCount(0);
  await dialog.getByRole("button", { name: /^적용/ }).click();
  await page.reload(); dialog = await picker(page);
  await expect(dialog.locator(".simple-facility-grid input:checked")).toHaveCount(0);
  await dialog.getByRole("button", { name: "저장한 조건 불러오기", exact: true }).click();
  for (const name of ["수어 안내", "영상 안내", "청각 지원 객실"]) await expect(dialog.getByRole("checkbox", { name, exact: true })).toBeChecked();
  expect(await selected(page)).toEqual([]);
  await dialog.getByRole("button", { name: /^적용/ }).click();
  expect(await selected(page)).toEqual(["signguide", "videoguide", "hearingroom"]);
  dialog = await picker(page);
  await dialog.getByRole("button", { name: "선택 해제", exact: true }).click();
  await dialog.getByRole("button", { name: "저장한 조건 삭제", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "저장한 조건 불러오기", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("wave-travel-profile-v1"))).toBeNull();
  await dialog.getByRole("button", { name: /^적용/ }).click(); expect(await selected(page)).toEqual([]);
});

test("손상되거나 차단된 프로필 저장소는 현재 선택을 잃지 않고 설명한다", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("wave-travel-profile-v1", "{"));
  await setup(page); const dialog = await picker(page);
  await expect(dialog.getByRole("status").filter({ hasText: "저장한 편의 조건을 읽지 못했습니다" })).toBeVisible();
  await expect(dialog.locator(".simple-facility-grid input:checked")).toHaveCount(0);
  await dialog.getByRole("checkbox", { name: "휠체어 대여", exact: true }).check();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) { if (key === "wave-travel-profile-v1") throw new Error("blocked"); return original.call(this, key, value); };
  });
  await dialog.getByRole("button", { name: "이 기기에 조건 저장", exact: true }).click();
  await expect(dialog.getByRole("status").filter({ hasText: "편의 조건을 저장하지 못했어요" })).toBeVisible();
  await expect(dialog.getByRole("checkbox", { name: "휠체어 대여", exact: true })).toBeChecked();
  await dialog.getByRole("button", { name: /^적용/ }).click();
  expect(await selected(page)).toEqual(["wheelchair"]);
  expect(await page.evaluate(() => localStorage.getItem("wave-travel-profile-v1"))).toBe("{");
});
