import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

const pageErrors = new WeakMap<import("@playwright/test").Page, string[]>();

function trackPageErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) errors.push(message.text());
  });
  return errors;
}

async function expectNoSeriousA11yIssues(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  pageErrors.set(page, trackPageErrors(page));
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) || []).toEqual([]);
});

test("landing intro appears once, remains keyboard usable and has no serious accessibility violations", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E 시작 화면" });
  await expect(intro).toBeVisible();
  await expect(page.getByRole("button", { name: "바로 시작" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(intro).toHaveCount(0);
  await expect(page.getByRole("link", { name: /내 여행 설계하기/ }).first()).toBeVisible();
  await page.reload();
  await expect(intro).toHaveCount(0);
  await page.waitForTimeout(1_500);
  await expectNoSeriousA11yIssues(page);
});

test("reduced motion skips the intro before it mounts", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "W.A.V.E 시작 화면" })).toHaveCount(0);
});

test("planner supports decision, save, route-aware schedule and focus restoration", async ({ page }) => {
  const api = await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();
  const museumCard = page.locator(".place-card").filter({ has: page.getByRole("heading", { name: "경남도립미술관" }) });
  const parkCard = page.locator(".place-card").filter({ has: page.getByRole("heading", { name: "용지호수공원" }) });
  await expect(museumCard.getByRole("img", { name: "경남도립미술관 관광사진" })).toBeVisible();
  await expect(parkCard.getByText("공식 사진 준비 중")).toBeVisible();

  const detailButton = page.getByRole("button", { name: "접근성 상세" }).first();
  await detailButton.focus();
  await detailButton.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "닫기" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await expect(dialog.getByText("잘 맞는 이유")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(detailButton).toBeFocused();

  await page.getByRole("button", { name: "경남도립미술관 보관하기" }).click();
  const itinerary = page.getByRole("region", { name: "날짜별 여행 일정" });
  await expect(itinerary).toBeVisible();
  await expect(itinerary.getByText(/10:25 · 경남도립미술관/)).toBeVisible();
  await expect(itinerary.getByText(/확인된 경로 이동 25분/)).toBeVisible();
  await page.getByRole("button", { name: /여유 자동차 경로/ }).click();
  await expect(itinerary.getByText(/10:40 · 경남도립미술관/)).toBeVisible();
  await page.getByRole("button", { name: /추천 자동차 경로/ }).click();
  await expect(itinerary.getByText(/10:25 · 경남도립미술관/)).toBeVisible();
  await itinerary.getByLabel("하루 시작").fill("09:00");
  await expect(itinerary.getByText(/09:25 · 경남도립미술관/)).toBeVisible();

  await page.getByRole("button", { name: "용지호수공원 보관하기" }).click();
  await expect(itinerary.getByRole("link", { name: /여행일지 초안 만들기/ })).toHaveAttribute("href", /draft=journal/);
  await expect(itinerary.getByText(/용지호수공원/)).toBeVisible();
  await page.getByRole("button", { name: "용지호수공원 보관함에서 빼기" }).click();
  await expect(itinerary.getByText(/용지호수공원/)).toHaveCount(0);
  await page.getByRole("button", { name: "용지호수공원 보관하기" }).click();
  expect(api.enrichmentRequestCount()).toBe(0);
  await page.locator(".planner-secondary-details > summary").click();
  await expect(page.getByRole("heading", { name: /사람들이 지금/ })).toBeVisible();
  await expect.poll(api.enrichmentRequestCount).toBe(1);
  await page.reload();
  await expect(page.getByRole("region", { name: "날짜별 여행 일정" })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectNoSeriousA11yIssues(page);
});

test("planner exposes honest recovery when the official plan request fails", async ({ page }) => {
  await mockPlannerApi(page, { failPlan: true });
  await page.goto("/planner");
  await expect(page.getByRole("alert")).toContainText("공식 관광정보 연결이 지연되고 있습니다");
  await expect(page.getByRole("button", { name: "공식 데이터 다시 조회" })).toBeVisible();
});

test("planner announces a delayed request and replaces its skeleton with official results", async ({ page }) => {
  await mockPlannerApi(page, { slowPlan: true });
  await page.goto("/planner");
  await expect(page.getByRole("status").filter({ hasText: "공식 관광정보를 불러오고 있어요" })).toBeAttached();
  await expect(page.locator(".place-carousel")).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();
  await expect(page.locator(".place-carousel")).toHaveAttribute("aria-busy", "false");
});

test("community remains readable without login and protects writing", async ({ page }) => {
  await page.route("**/api/auth/get-session", (requestRoute) => requestRoute.fulfill({ status: 200, contentType: "application/json", body: "null" }));
  await page.route("**/api/community/posts**", (requestRoute) => requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ posts: [], page: 1, hasMore: false }) }));
  await page.goto("/community");
  await expect(page.getByText("아직 등록된 이야기가 없습니다.")).toBeVisible();
  await expectNoSeriousA11yIssues(page);
  await page.getByRole("link", { name: /새 이야기 쓰기/ }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fcommunity%2Fnew/);
  await expect(page.getByLabel("이메일")).toBeVisible();
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeVisible();
  await expectNoSeriousA11yIssues(page);
});

test("community reporting requires login and moderation does not leak to public users", async ({ page }) => {
  const post = {
    id: "post-1", category: "place", title: "입구 경사로를 확인했어요", content: "현장에서 확인한 경험입니다.",
    region: "창원", placeId: "1001", placeName: "경남도립미술관", authorName: "여행자", createdAt: Date.now(), updatedAt: Date.now(),
    commentCount: 0, likeCount: 0, likedByMe: false, isOwner: false,
  };
  await page.route("**/api/community/posts/post-1", (requestRoute) => requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ post, comments: [] }) }));
  await page.goto("/community/post-1");
  await page.getByRole("button", { name: "신고" }).click();
  await page.getByRole("button", { name: "여행 안전 우려" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fcommunity%2Fpost-1/);

  await page.route("**/api/community/moderation", (requestRoute) => requestRoute.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "운영자 권한이 필요합니다." }) }));
  await page.goto("/community/moderation");
  await expect(page.getByRole("alert")).toContainText("운영자 권한이 필요합니다");
});

test("community moderation APIs fail closed without an authenticated operator", async ({ request }) => {
  const queue = await request.get("/api/community/moderation");
  expect(queue.ok()).toBe(false);
  expect([401, 403, 503]).toContain(queue.status());
  const decision = await request.patch("/api/community/moderation", {
    data: { targetType: "post", targetId: "post-1", status: "hidden" },
    headers: { origin: "http://127.0.0.1:4173" },
  });
  expect(decision.ok()).toBe(false);
  expect([401, 403, 503]).toContain(decision.status());
});

test("authenticated travelers can publish, like and comment without losing session state", async ({ page }) => {
  const now = Date.now();
  let commentCreated = false;
  let liked = false;
  const ownedPost = () => ({
    id: "owned-post", category: "review", title: "휠체어로 둘러본 미술관 동선", content: "입구에서 전시장까지 직접 이동해 본 경험을 공유합니다.",
    region: "창원", placeId: null, placeName: null, authorName: "테스트 여행자", createdAt: now, updatedAt: now,
    commentCount: commentCreated ? 1 : 0, likeCount: liked ? 1 : 0, likedByMe: liked, isOwner: true,
  });
  await page.route("**/api/auth/get-session", (requestRoute) => requestRoute.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: { id: "user-1", name: "테스트 여행자", email: "traveler@example.com" }, session: { id: "session-1" } }),
  }));
  await page.route("**/api/community/posts**", async (requestRoute) => {
    const request = requestRoute.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/community/posts" && request.method() === "POST") {
      return requestRoute.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "owned-post" }) });
    }
    if (url.pathname.endsWith("/like") && request.method() === "POST") {
      liked = true;
      return requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ liked: true, likeCount: 1 }) });
    }
    if (url.pathname.endsWith("/comments") && request.method() === "POST") {
      commentCreated = true;
      return requestRoute.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "comment-1" }) });
    }
    if (url.pathname === "/api/community/posts/owned-post") {
      const comments = commentCreated ? [{ id: "comment-1", postId: "owned-post", authorName: "테스트 여행자", content: "다음 방문자에게도 도움이 되길 바랍니다.", createdAt: now, updatedAt: now, isOwner: true }] : [];
      return requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ post: ownedPost(), comments }) });
    }
    return requestRoute.fallback();
  });

  await page.goto("/community/new");
  await expect(page.getByRole("heading", { name: "경남 여행 이야기를 남겨 주세요" })).toBeVisible();
  await page.getByLabel("게시판").selectOption("review");
  await page.getByLabel("지역").selectOption("창원");
  await page.getByLabel("제목").fill("휠체어로 둘러본 미술관 동선");
  await page.getByLabel("내용").fill("입구에서 전시장까지 직접 이동해 본 경험을 공유합니다.");
  await page.getByRole("button", { name: "이야기 등록" }).click();
  await expect(page).toHaveURL(/\/community\/owned-post$/);
  await expect(page.getByRole("heading", { name: "휠체어로 둘러본 미술관 동선" })).toBeVisible();

  await page.getByRole("button", { name: /도움이 됐어요/ }).click();
  await expect(page.getByRole("button", { name: /공감했어요/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("댓글 남기기").fill("다음 방문자에게도 도움이 되길 바랍니다.");
  await page.getByRole("button", { name: "댓글 등록" }).click();
  await expect(page.getByText("다음 방문자에게도 도움이 되길 바랍니다.")).toBeVisible();
  await expect(page.getByText("테스트 여행자").first()).toBeVisible();
});
