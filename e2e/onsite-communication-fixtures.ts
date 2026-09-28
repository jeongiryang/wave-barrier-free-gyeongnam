import { expect, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";

export async function openOnsiteCommunication(page: Page, offlineBeforeEntry = false, beforeEntry?: () => void) {
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  await page.route("**/api/community/posts?*", route => route.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.waitForURL(url => url.pathname === "/planner" && url.searchParams.get("region") === "창원");
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "경남도립미술관 상세 보기", exact: true }).click();
  const detail = page.locator(".native-place-dialog");
  // Keep the original offline precondition: load the inquiry and communication
  // bundle online through the UI before measuring the local-only conversation.
  await detail.getByRole("button", { name: /^방문 전에 물어보기/ }).click();
  const inquiry = page.getByRole("dialog", { name: "이렇게 물어보세요." });
  await expect(inquiry).toBeVisible();
  await inquiry.getByRole("button", { name: "문의 카드 닫기", exact: true }).click();
  const entry = detail.getByRole("button", { name: /^현장에서 화면으로 대화/ });
  await expect(entry).toBeEnabled();
  beforeEntry?.();
  if (offlineBeforeEntry) await page.context().setOffline(true);
  await entry.click();
  const board = page.locator(".inquiry-dialog");
  await expect(page.getByRole("dialog", { name: "직원과 화면으로 대화", exact: true })).toBeVisible();
  await expect(board.getByRole("button", { name: "직원에게 보여주기", exact: true })).toBeFocused();
  return board;
}
