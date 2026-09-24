import { arrivalPlaybackReady } from './landing-contract';
import { openNaruTool, closeNaruTool } from './naru-tool-fixtures';
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import { freshArrival, prepareLandingMedia, storyReady, expectUsableTarget } from "./landing-contract";

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

test("landing: first arrival is readable, dismissible and remembers completion", async ({ page }) => {
  await freshArrival(page);
  const scene = page.locator(".arrival-scene"), planning = page.locator(".landing-actions a");
  await expect(scene).toHaveAttribute("open", "");
  await arrivalPlaybackReady(page);
  await expect(scene).toContainText("모두의 발걸음이 닿는 경상남도");
  await expect(scene.getByRole("button", { name: "건너뛰기" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(scene).toBeHidden();
  expect(await page.evaluate(() => sessionStorage.getItem("wave-arrival-session-v1"))).toBe("done");
  await page.clock.resume();
  await page.reload(); await storyReady(page);
  await expect(scene).toBeHidden();
  await expectUsableTarget(planning);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectNoSeriousA11yIssues(page);
});

test("landing: reduced motion exposes the real planning action immediately without dismissal", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepareLandingMedia(page);
  await page.goto("/"); await storyReady(page);
  await expect(page.locator(".arrival-scene")).toBeHidden();
  await expect(page.locator(":modal, [inert]:not(.horizon-chapter-backdrops > [aria-hidden=true]):not(.arrival-picture)")).toHaveCount(0);
  const planning = page.locator(".landing-actions a");
  await expectUsableTarget(planning);
  await expect(planning).toHaveAccessibleName("여행지 둘러보기");
  await expect(planning).toHaveAttribute("href", "/planner");
  await page.keyboard.press("Tab");
  await expect(planning).not.toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.closest(".arrival-scene"))).toBeNull();
});

test("planner supports decision, save, route-aware schedule and focus restoration", async ({ page }) => {
  const api = await mockPlannerApi(page, { preserveView: true });
  let releaseAutomatic!: () => void;
  const automaticHeld = new Promise<void>(resolve => { releaseAutomatic = resolve; });
  let carRequests = 0;
  await page.route("**/api/route?**", async route => {
    if (new URL(route.request().url()).searchParams.get("mode") === "car" && ++carRequests === 2) await automaticHeld;
    await route.fallback();
  });
  const mobileLayout = (page.viewportSize()?.width || 1440) < 1024;
  const screens = page.getByRole("group", { name: "여행 설계 화면", exact: true });
  try {
    await page.goto("/planner");
    const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
    await expect(region).toBeEnabled();
    await region.selectOption("창원");
    const museumCard = page.locator(".simple-place-row").filter({ has: page.getByRole("heading", { name: "경남도립미술관" }) });
    const parkCard = page.locator(".simple-place-row").filter({ has: page.getByRole("heading", { name: "용지호수공원" }) });
    await expect(museumCard.getByRole("img", { name: "경남도립미술관 관광사진" })).toBeVisible();
    await expect(parkCard.getByText("공식 사진을 확인할 수 없어요", { exact: true })).toBeVisible();

    const detailButton = museumCard.getByRole("button", { name: "경남도립미술관 상세 보기", exact: true });
    await detailButton.focus(); await detailButton.click();
    const dialog = page.getByRole("dialog", { name: "경남도립미술관", exact: true });
    await expect(dialog.getByRole("heading", { name: "경남도립미술관", exact: true })).toBeFocused();
    const close = dialog.getByRole("button", { name: "닫기", exact: true });
    const firstControl = dialog.locator('button:visible:not([disabled]), a:visible[href], input:visible:not([disabled]), select:visible, textarea:visible, summary:visible, [tabindex="0"]:visible').first();
    await firstControl.focus(); await page.keyboard.press("Shift+Tab");
    // Chromium may include the scrollable, nonmodal dialog itself in the tab
    // sequence before its first control. It must still let the next reverse
    // Tab leave; a modal must continue to contain keyboard focus.
    if (!mobileLayout && await dialog.evaluate(element => document.activeElement === element)) await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate(element => ({ contained: element.contains(document.activeElement), active: document.activeElement?.outerHTML.slice(0, 300) })) ).toMatchObject({ contained: mobileLayout });
    await expect(page.locator(":modal")).toHaveCount(mobileLayout ? 1 : 0);
    await expect(dialog.getByText(/공식 시설 정보는 안전 인증이나 접근 가능성 보장이 아닙니다/)).toBeVisible();
    await close.focus(); await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0); await expect(detailButton).toBeFocused();

    await museumCard.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
    await expect(page.locator(".simple-results")).toBeVisible();
    await screens.getByRole("button", { name: /^내 일정/ }).click();
    const setup = page.locator(".simple-initial-setup");
    await expect(setup).toContainText("경남도립미술관");
    await setup.getByLabel("시작일", { exact: true }).fill("2026-09-20");
    await setup.getByLabel("마지막 날", { exact: true }).fill("2026-09-20");
    await setup.getByLabel("하루 시작", { exact: true }).fill("10:00");
    await setup.getByRole("combobox", { name: "이동 수단", exact: true }).selectOption("car");
    await setup.getByRole("button", { name: "시간표 만들기", exact: true }).click();
    // Mobile hides the same timetable while the map is selected; inspect its
    // shared schedule now and require it to be visible when returning below.
    const itinerary = page.getByRole("region", { name: "날짜별 여행 일정", exact: true, includeHidden: true });
    const arrival = itinerary.locator("#itinerary-stop-1001 time").first();
    if (mobileLayout) await page.getByRole("group", { name: "일정 보기 방식", exact: true }).getByRole("button", { name: "지도", exact: true }).click();
    await expect(page.locator(".simple-itinerary-map .leaflet-container")).toBeVisible();
    await expect(arrival).toHaveText("10:25");
    await expect(itinerary.locator("#itinerary-stop-1001 .simple-leg-time")).toHaveText("여기까지 이동 25분");
    await openNaruTool(page, '이동 구간 확인');
    await expect.poll(() => carRequests).toBe(2);
    await expect(page.locator(".coverage-actions button").first()).toHaveAttribute("aria-busy", "true");
    await closeNaruTool(page);
    await page.locator(".reference-route-details > summary").click();
    await page.getByRole("button", { name: /여유 자동차 경로/ }).click();
    await expect(arrival).toHaveText("10:40");
    releaseAutomatic();
    await openNaruTool(page, "이동 구간 확인");
    await expect(page.locator(".coverage-actions button").first()).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".itinerary-route-coverage").getByRole("status")).toContainText("전체 1구간 중 1구간 확인");
    await expect(arrival).toHaveText("10:40");
    await closeNaruTool(page);
    await page.getByRole("button", { name: /추천 자동차 경로/ }).click();
    await expect(arrival).toHaveText("10:25");
    if (mobileLayout) await page.getByRole("group", { name: "일정 보기 방식", exact: true }).getByRole("button", { name: "시간표", exact: true }).click();
    await expect(itinerary).toBeVisible();
    await page.getByRole("button", { name: "여행 설정", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "여행 설정", exact: true });
    await settings.getByLabel("하루 시작", { exact: true }).fill("09:00");
    await settings.getByRole("button", { name: "적용", exact: true }).click();
    await expect(arrival).toHaveText("09:25");

    await screens.getByRole("button", { name: "여행지 찾기", exact: true }).click();
    await parkCard.getByRole("button", { name: "용지호수공원 일정에 담기", exact: true }).click();
    await screens.getByRole("button", { name: /^내 일정/ }).click();
    await expect(itinerary.locator("#itinerary-stop-1002")).toContainText("용지호수공원");
    await openNaruTool(page, "오디오 가이드·후기");
    await expect(page.getByRole("link", { name: "여행 후기 작성", exact: true })).toHaveAttribute("href", /draft=journal/);
    await closeNaruTool(page);
    await page.getByRole("button", { name: "용지호수공원 일정 수정", exact: true }).click();
    await page.getByRole("dialog", { name: "용지호수공원 수정", exact: true }).getByRole("button", { name: "일정에서 빼기", exact: true }).click();
    await expect(itinerary.locator("#itinerary-stop-1002")).toHaveCount(0);
    await screens.getByRole("button", { name: "여행지 찾기", exact: true }).click();
    await parkCard.getByRole("button", { name: "용지호수공원 일정에 담기", exact: true }).click();
    await screens.getByRole("button", { name: /^내 일정/ }).click();
    expect(api.enrichmentRequestCount()).toBe(0);
    await openNaruTool(page, "출발 전 확인");
    await page.locator(".travel-layers > summary").click();
    await expect(page.getByRole("heading", { name: /기준월의 관심을\s*살펴봅니다\./ })).toBeVisible();
    await expect.poll(api.enrichmentRequestCount).toBe(1);
    await expect(page.locator(".demand-insight")).toContainText("지역 관광자원 수요지수의 최신 가용월 자료가 제공되면 표시합니다.");
    await page.reload();
    await expect(page.getByRole("region", { name: "날짜별 여행 일정" })).toBeVisible();
    await expect(page.locator("#itinerary-stop-1001 time").first()).toHaveText("09:25");
    await expect(page.locator("#itinerary-stop-1002")).toContainText("용지호수공원");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expectNoSeriousA11yIssues(page);
  } finally { releaseAutomatic(); }
});

test("planner exposes honest recovery when the official plan request fails", async ({ page }) => {
  await mockPlannerApi(page, { failPlan: true });
  await page.goto("/planner");
  const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(region).toBeEnabled(); await region.selectOption("창원");
  await expect(page.locator("#places").getByRole("alert")).toContainText("서버가 요청을 처리하지 못했어요.");
  await expect(page.getByRole("button", { name: "같은 조건으로 다시 시도", exact: true })).toBeVisible();
  await expect(region).toHaveValue("창원");
});

test("planner announces a delayed request and replaces its skeleton with official results", async ({ page }) => {
  await mockPlannerApi(page, { slowPlan: true });
  await page.goto("/planner");
  const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(region).toBeEnabled(); await region.selectOption("창원");
  await expect(page.getByRole("status").filter({ hasText: "여행지를 찾고 있어요." })).toBeAttached();
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator(".simple-place-skeleton")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".simple-place-skeleton")).toHaveCount(0);
});

test("community remains readable without login and protects writing", async ({ page }) => {
  await page.route("**/api/auth/get-session", (requestRoute) => requestRoute.fulfill({ status: 200, contentType: "application/json", body: "null" }));
  await page.route("**/api/community/posts**", (requestRoute) => requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ posts: [], page: 1, hasMore: false }) }));
  await page.goto("/community");
  await expect(page.getByText("아직 등록된 후기나 질문이 없습니다.", { exact: true })).toBeVisible();
  await expect(page.locator(".night-story-card")).toHaveCount(0);
  await expectNoSeriousA11yIssues(page);
  await page.getByRole("link", { name: "글 쓰기", exact: true }).first().click();
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
  const report = page.getByRole("button", { name: "신고" });
  await report.click();
  await expect(report).toHaveAttribute("aria-expanded", "true");
  await expect(report).toHaveAttribute("aria-controls", /community-report-/);
  await expect(page.getByRole("button", { name: "사실과 다른 정보" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(report).toHaveAttribute("aria-expanded", "false");
  await expect(report).toBeFocused();
  await report.click();
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
  await expect(page.getByRole("heading", { name: "경남 여행 후기와 질문을 남겨 주세요" })).toBeVisible();
  await page.getByLabel("게시판").selectOption("review");
  await page.getByLabel("지역").selectOption("창원");
  await page.getByLabel("제목").fill("휠체어로 둘러본 미술관 동선");
  await page.getByLabel("내용").fill("입구에서 전시장까지 직접 이동해 본 경험을 공유합니다.");
  await page.getByRole("button", { name: "후기 등록" }).click();
  await expect(page).toHaveURL(/\/community\/owned-post$/);
  await expect(page.getByRole("heading", { name: "휠체어로 둘러본 미술관 동선" })).toBeVisible();

  await page.getByRole("button", { name: /도움이 됐어요/ }).click();
  await expect(page.getByRole("button", { name: /공감했어요/ })).toHaveAttribute("aria-pressed", "true");
  const commentInput = page.getByLabel("댓글 남기기");
  await commentInput.fill("로그인한 계정의 댓글 초안입니다.");
  await page.reload();
  await expect(commentInput).toHaveValue("로그인한 계정의 댓글 초안입니다.");
  await page.getByRole("button", { name: "초안 지우기", exact: true }).click();
  await expect(commentInput).toHaveValue("");
  await commentInput.fill("다음 방문자에게도 도움이 되길 바랍니다.");
  await page.getByRole("button", { name: "댓글 등록" }).click();
  await expect(page.getByText("다음 방문자에게도 도움이 되길 바랍니다.")).toBeVisible();
  await expect(page.getByText("테스트 여행자").first()).toBeVisible();
  expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith("wave-community-comment-draft-v1:")))).toEqual([]);
});
