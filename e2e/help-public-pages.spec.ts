import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test("커뮤니티와 여행집 도움말은 페이지 맥락을 설명하고 잘못된 포인터를 만들지 않는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await page.route("**/api/community/posts?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ posts: [], page: 1, hasMore: false }),
  }));

  for (const journey of [
    { path: "/community", title: "여행자의 현장 경험을 살펴보세요." },
    { path: "/travel-book", title: "갈 여행과 다녀온 여행을 모아 보세요." },
  ]) {
    await page.goto(journey.path);
    const helpButton = page.getByRole("button", { name: "도움말" });
    await expect(helpButton).toBeEnabled();
    await helpButton.click();
    const dialog = page.getByRole("dialog", { name: journey.title });
    await expect(dialog).toBeVisible();
    await expect(page.locator(".help-tour-spotlight")).toBeVisible();
    await expect(page.locator(".help-tour-pointer")).toHaveCount(0);
    await expect(dialog.getByText("강조된 테두리가 현재 설명하는 영역을 표시합니다.")).toBeVisible();
    await page.getByRole("button", { name: "도움말 닫기" }).click();
    await expect(dialog).toHaveCount(0);
  }
});
