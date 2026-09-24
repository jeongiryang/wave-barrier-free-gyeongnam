import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: "reduce" } });

const basePost = {
  category: "review", content: "짐을 줄여 보니 여행이 한결 편했어요.", authorName: "데모 여행자 01",
  createdAt: Date.UTC(2026, 7, 10), updatedAt: Date.UTC(2026, 7, 10), region: "창원", placeId: null, placeName: null,
  likeCount: 0, commentCount: 2, likedByMe: false, isOwner: false, visitDate: null, fieldReports: [], journalPlaces: [], visitPhotos: [], photoCount: 0,
};
const demoPost = { ...basePost, id: "demo-post", title: "[시연] 짐을 가볍게 꾸린 날", demoBatchId: "wave-community-demo-2026-v1" };
const realPost = { ...basePost, id: "real-post", title: "직접 남긴 여행 이야기", content: "직접 작성한 일반 게시글입니다.", authorName: "일반 여행자", commentCount: 0, demoBatchId: null };
const comments = [
  { id: "demo-comment", content: "작은 가방이 편해 보여요.", authorName: "데모 답글 01", createdAt: demoPost.createdAt + 1_000, updatedAt: demoPost.createdAt + 1_000, isOwner: false, demoBatchId: demoPost.demoBatchId },
  { id: "real-comment", content: "일반 이용자가 남긴 댓글입니다.", authorName: "일반 댓글 작성자", createdAt: demoPost.createdAt + 2_000, updatedAt: demoPost.createdAt + 2_000, isOwner: false, demoBatchId: null },
];

test("demo titles remain identifiable without repeated badges in list, detail and comments", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.route("**/api/auth/get-session", (route) => route.fulfill({ json: null }));
  await page.route("**/api/community/posts**", (route) => {
    const url = new URL(route.request().url());
    const posts = [demoPost, realPost].filter(post => post.title.includes(url.searchParams.get("search") || ""));
    return route.fulfill({ json: url.pathname === "/api/community/posts/demo-post" ? { post: demoPost, comments } : { posts, page: 1, hasMore: false } });
  });

  await page.goto("/community");
  const demoCard = page.locator(".community-list article").filter({ hasText: demoPost.title });
  const realCard = page.locator(".community-list article").filter({ hasText: realPost.title });
  await expect(demoCard.locator(".community-demo-label")).toHaveCount(0);
  await expect(demoCard.getByRole("heading")).toHaveText(demoPost.title);
  await expect(demoCard).not.toContainText("합성 데모");
  await expect(demoCard.locator("footer")).toContainText("데모 여행자 01");
  await expect(realCard.locator(".community-demo-label")).toHaveCount(0);

  await page.getByRole("textbox", { name: "여행 후기 검색" }).fill("[시연]");
  await page.getByRole("button", { name: "검색", exact: true }).click();
  await expect(realCard).toHaveCount(0);
  await expect(demoCard.getByRole("heading")).toHaveText(demoPost.title);
  await expect(demoCard.locator(".community-demo-label")).toHaveCount(0);

  await demoCard.getByRole("link", { name: `${demoPost.title} 게시글 읽기` }).click();
  await expect(page.locator(".community-detail > header .community-demo-label")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(demoPost.title);
  const demoComment = page.locator(".comment-list li").filter({ hasText: comments[0].content });
  const realComment = page.locator(".comment-list li").filter({ hasText: comments[1].content });
  await expect(demoComment.locator(".community-demo-label")).toHaveCount(0);
  await expect(demoComment.locator("header")).toContainText("데모 답글 01");
  await expect(realComment.locator(".community-demo-label")).toHaveCount(0);
});
