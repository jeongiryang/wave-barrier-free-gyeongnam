import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("장소 후기에서 구조화 현장 제보를 작성하고 개별 경험으로 읽는다", async ({ page }) => {
  const now = Date.now();
  let submitted: Record<string, unknown> | null = null;
  await page.route("**/api/auth/get-session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: { id: "traveler-1", name: "현장 여행자", email: "field@example.com" }, session: { id: "session-1" } }),
  }));
  await page.route("**/api/community/posts**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/community/posts" && request.method() === "POST") {
      submitted = request.postDataJSON() as Record<string, unknown>;
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "field-post" }) });
    }
    if (url.pathname === "/api/community/posts/field-post") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          post: {
            id: "field-post", category: "review", title: "미술관 현장 접근성 확인", content: "입구부터 전시실까지 직접 이동하며 확인했습니다.",
            region: "창원", placeId: "1001", placeName: "경남도립미술관", authorName: "현장 여행자", createdAt: now, updatedAt: now,
            commentCount: 0, likeCount: 0, likedByMe: false, isOwner: true, isSample: false, visitDate: "2026-08-30",
            fieldReports: [{ field: "entrance", status: "changed", note: "정문 경사로가 공사 중이었습니다." }], journalPlaces: [],
          }, comments: [],
        }),
      });
    }
    return route.fallback();
  });

  await page.goto("/community/new?category=review&placeId=1001&placeName=%EA%B2%BD%EB%82%A8%EB%8F%84%EB%A6%BD%EB%AF%B8%EC%88%A0%EA%B4%80&region=%EC%B0%BD%EC%9B%90");
  await expect(page.getByRole("heading", { name: "여행자 현장 접근성 제보" })).toBeVisible();
  await page.getByLabel("제목").fill("미술관 현장 접근성 확인");
  await page.getByLabel("내용").fill("입구부터 전시실까지 직접 이동하며 확인했습니다.");
  await page.getByLabel("방문일 (선택)").fill("2026-08-30");
  await page.getByLabel("출입 경로 확인 상태").selectOption("changed");
  await page.getByLabel("출입 경로 메모").fill("정문 경사로가 공사 중이었습니다.");
  expect((await new AxeBuilder({ page }).analyze()).violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
  await page.getByRole("button", { name: "후기 등록" }).click();
  await expect(page).toHaveURL(/\/community\/field-post$/);
  expect(submitted).toMatchObject({
    category: "review", placeId: "1001", visitDate: "2026-08-30",
    fieldReports: [{ field: "entrance", status: "changed", note: "정문 경사로가 공사 중이었습니다." }],
  });
  await expect(page.getByRole("heading", { name: "여행자 현장 제보" })).toBeVisible();
  await expect(page.getByText("작성자 1명이 남긴 개별 경험입니다.")).toBeVisible();
  await expect(page.getByText("공식 정보와 달라짐")).toBeVisible();
});

test("여행일지 초안은 일정 장소를 연결하되 사용자가 공개 전에 수정한다", async ({ page }) => {
  await page.route("**/api/auth/get-session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: { id: "traveler-1", name: "현장 여행자", email: "field@example.com" }, session: { id: "session-1" } }),
  }));
  const journal = encodeURIComponent(JSON.stringify([
    { id: "1001", name: "경남도립미술관", day: "2026-09-01" },
    { id: "1002", name: "용지호수공원", day: "2026-09-01" },
  ]));
  await page.goto(`/community/new?draft=journal&category=review&region=%EC%B0%BD%EC%9B%90&visitDate=2026-09-01&journal=${journal}`);
  const journalDraft = page.locator(".editor-journal-places");
  await expect(journalDraft.getByText("일정에서 연결한 장소 2곳")).toBeVisible();
  await expect(journalDraft.getByText("경남도립미술관")).toBeVisible();
  await expect(journalDraft.getByText("용지호수공원")).toBeVisible();
  await expect(page.getByLabel("제목")).toHaveValue("창원 2곳 무장애 여행일지");
  await expect(page.getByRole("button", { name: "후기 등록" })).toBeVisible();
});
