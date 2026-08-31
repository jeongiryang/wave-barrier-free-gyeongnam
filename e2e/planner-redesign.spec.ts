import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test("통합 플래너는 실제 시간순 이동수단을 먼저 보여주고 없는 수단은 카카오로 연결한다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "내 여행 만들기" })).toBeVisible();
  // 이 목록은 예상 시간이 오면 빠른 순서로 다시 정렬돼 탭 목록이 아니라 선택 버튼 묶음이다.
  const modes = page.locator(".route-mode-sections button");
  await expect(modes).toHaveCount(4);
  await expect(modes.first()).toContainText("자동차");
  await expect(modes.first()).toContainText("25분");
  await expect(page.getByText("가장 저렴함")).toHaveCount(0);
  await expect(page.getByText("환승 최소")).toHaveCount(0);

  await modes.filter({ hasText: "도보" }).first().click();
  const kakaoWalk = page.getByRole("link", { name: /카카오맵에서 도보 확인/ });
  await expect(kakaoWalk).toBeVisible();
  await expect(kakaoWalk).toHaveAttribute("href", /https:\/\/map\.kakao\.com\/link\/to\//);
});

test("장소 상세는 카카오 후기와 정확히 연결된 W.A.V.E 커뮤니티 글을 함께 보여준다", async ({ page }) => {
  await mockPlannerApi(page);
  const post = {
    id: "seed-changwon-access",
    category: "place",
    title: "[샘플] 창원 미술관 접근 동선 메모",
    content: "실제 개인 후기가 아닌 기능 확인용 샘플입니다.",
    region: "창원",
    placeId: "1001",
    placeName: "경남도립미술관",
    authorName: "W.A.V.E 샘플 여행자",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    commentCount: 1,
    likeCount: 2,
    likedByMe: false,
    isOwner: false,
    isSample: true,
  };
  await page.route("**/api/community/posts?placeId=1001**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ posts: [post], page: 1, hasMore: false }),
  }));

  await page.goto("/planner");
  await page.getByRole("button", { name: "접근성 상세" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("link", { name: /방문 후기·사진/ })).toHaveAttribute("href", /map\.kakao\.com\/link\/search/);
  await expect(dialog.getByRole("heading", { name: "이 장소의 여행자 현장 이야기" })).toBeVisible();
  await expect(dialog.getByText("[샘플] 창원 미술관 접근 동선 메모")).toBeVisible();
});
