import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test("여행 조건부터 통합 추천과 4개 이동수단, 지역 커뮤니티까지 한 흐름으로 이어진다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.route("**/api/community/posts?placeId=1001&limit=3", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ posts: [{
      id: "seed-wave-changwon-01",
      category: "review",
      title: "[샘플] 창원 진해 해양공원 이동 메모",
      content: "공모전 기능 시연용 샘플 글입니다. 창원 여행의 이동과 접근성 확인 흐름을 보여줍니다.",
      region: "창원",
      placeId: null,
      placeName: null,
      authorName: "W.A.V.E 샘플 여행자",
      createdAt: 1787922000000,
      updatedAt: 1787922000000,
      commentCount: 0,
      likeCount: 0,
      likedByMe: false,
      isOwner: false,
    }], page: 1, hasMore: false }),
  }));

  await page.goto("/planner");
  const conditions = page.locator("#planner");
  const journey = page.locator("#journey");
  const navigation = page.locator("#navigation");
  await expect(conditions).toBeVisible();
  await expect(journey).toBeVisible();
  await expect(navigation).toBeVisible();
  await expect(page.locator(".photo-course")).toHaveCount(0);

  const conditionBox = await conditions.boundingBox();
  const journeyBox = await journey.boundingBox();
  const navigationBox = await navigation.boundingBox();
  expect(conditionBox && journeyBox && navigationBox).toBeTruthy();
  if (conditionBox && journeyBox && navigationBox) {
    expect(conditionBox.y).toBeLessThan(journeyBox.y);
    expect(journeyBox.y).toBeLessThan(navigationBox.y);
  }

  await expect(journey.getByText("추천 여행지", { exact: true })).toBeVisible();
  await expect(journey.getByText("YOUR W.A.V.E ROUTE", { exact: true })).toBeVisible();
  await expect(journey.getByText("창원 상황과 여행 정보", { exact: true })).toBeVisible();
  await expect(page.getByText("믿을 수 있는 여행 추천", { exact: true })).toHaveCount(0);

  await navigation.scrollIntoViewIfNeeded();
  const modeCards = navigation.locator(".route-mode-card");
  await expect(modeCards).toHaveCount(4);
  await expect(modeCards.first()).toContainText("자동차");
  await expect(modeCards.first()).toContainText("25분");
  await expect(navigation.getByRole("link", { name: /도보 길찾기 열기/ })).toHaveAttribute("href", /map\.kakao\.com\/link\/by\/walk\//);
  await expect(navigation.getByRole("link", { name: /자전거 길찾기 열기/ })).toHaveAttribute("href", /map\.kakao\.com\/link\/by\/bicycle\//);
  await expect(navigation.getByRole("link", { name: /대중교통 길찾기 열기/ })).toHaveAttribute("href", /map\.kakao\.com\/link\/by\/traffic\//);
  await expect(navigation.getByRole("link", { name: /카카오맵에서 열기/ }).first()).toHaveAttribute("href", /map\.kakao\.com\/link\/by\/car\//);

  await page.locator("#places").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "접근성 상세" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "창원을 먼저 다녀온 여행자 이야기" })).toBeVisible();
  await expect(dialog.getByText("[샘플] 창원 진해 해양공원 이동 메모", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /방문 후기·사진/ })).toHaveAttribute("href", /map\.kakao\.com\/link\/search/);
});
