import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";

test("공개 관광지에 연결한 현장 확인 정보를 민감정보 없이 작성하고 읽는다", async ({ page }) => {
  let submitted: Record<string, unknown> | null = null;
  await page.route("**/api/auth/get-session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ user: { id: "traveler-1", name: "현장 여행자" }, session: { id: "session-1" } }) }));
  await page.route("**/api/community/posts**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/community/posts" && request.method() === "POST") {
      submitted = request.postDataJSON() as Record<string, unknown>;
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "access-post" }) });
    }
    const post = { id: "access-post", category: "field-report", title: "경남도립미술관 · 2026-06-15 현장 확인", content: "입구의 낮은 경사로를 현장에서 직접 확인했습니다.", region: "창원", placeId: "1001", placeName: "경남도립미술관", authorName: "현장 여행자", createdAt: Date.now(), updatedAt: Date.now(), commentCount: 0, likeCount: 0, likedByMe: false, isOwner: true, visitDate: "2026-06-15", fieldReports: [], journalPlaces: [] };
    if (pathname === "/api/community/posts" && request.method() === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ posts: [post], page: 1, hasMore: false }) });
    if (pathname === "/api/community/posts/access-post" && request.method() === "PUT") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    if (pathname === "/api/community/posts/access-post") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ post, comments: [] }) });
    return route.fallback();
  });

  await page.goto("/community/new?category=field-report&placeId=1001&placeName=%EA%B2%BD%EB%82%A8%EB%8F%84%EB%A6%BD%EB%AF%B8%EC%88%A0%EA%B4%80&region=%EC%B0%BD%EC%9B%90");
  await expect(page.getByRole("heading", { name: "현장에서 확인한 정보" })).toBeVisible();
  await expect(page.getByText("장애 유형·건강정보·복지 수급 여부·GPS 좌표·사진은 요청하거나 저장하지 않습니다.")).toBeVisible();
  await expect(page.getByLabel("제목")).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.getByLabel("확인한 날짜").fill("2026-06-15");
  await page.getByLabel("확인한 내용").fill("입구의 낮은 경사로를 현장에서 직접 확인했습니다.");
  expect((await new AxeBuilder({ page }).analyze()).violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
  await page.getByRole("button", { name: "후기 등록" }).click();
  await expect(page).toHaveURL(/\/community\/access-post$/);
  expect(submitted).toMatchObject({ category: "field-report", placeId: "1001", placeName: "경남도립미술관", visitDate: "2026-06-15" });
  expect(submitted).not.toHaveProperty("disabilityType");
  await expect(page.getByRole("heading", { name: "여행자가 남긴 정보" })).toBeVisible();
  await expect(page.getByText("여행자가 직접 확인한 내용이에요. W.A.V.E가 확인한 정보가 아니에요.")).toBeVisible();
  await page.getByRole("link", { name: "수정" }).click();
  await expect(page.getByRole("heading", { name: "현장에서 확인한 정보" })).toBeVisible();
  await expect(page.getByLabel("확인한 날짜")).toHaveValue("2026-06-15");
  await page.getByRole("button", { name: "수정 내용 저장" }).click();
  await expect(page).toHaveURL(/\/community\/access-post$/);
  await page.goto("/community");
  await expect(page.getByRole("heading", { name: "경남도립미술관 · 2026-06-15 현장 확인" })).toBeVisible();
});

test("장소 상세는 최신 일반글과 무관하게 현장 확인 정보를 함께 조회해 공식 영역과 분리한다", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  const previewRequests: URLSearchParams[] = [];
  await page.route("**/api/community/posts?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    previewRequests.push(params);
    const fieldReports = [{ id: "report-older", category: "field-report", title: "경남도립미술관 · 2026-06-15 현장 확인", content: "입구 경사로 폭을 직접 확인했습니다.", region: "창원", placeId: "1001", placeName: "경남도립미술관", authorName: "현장 여행자", createdAt: 1780000000000, updatedAt: 1780000000000, commentCount: 0, likeCount: 0, likedByMe: false, isOwner: false, visitDate: "2026-06-15", fieldReports: [], journalPlaces: [] }];
    return route.fulfill({ json: { fieldReports, posts: Array.from({ length: 4 }, (_, index) => ({ id: `normal-${index}`, category: "review", title: `더 최신인 일반 후기 ${index + 1}`, content: "일반 여행 후기입니다.", region: "창원", placeId: "1001", placeName: "경남도립미술관", authorName: "여행자", createdAt: 1790000000000 + index, updatedAt: 1790000000000 + index, commentCount: 0, likeCount: 0, likedByMe: false, isOwner: false, visitDate: "2026-09-10", fieldReports: [], journalPlaces: [] })), page: 1, hasMore: true } });
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 상세 보기", exact: true }).click();
  await page.locator(".place-visitor-records > summary").click();
  const reports = page.getByRole("region", { name: "여행자가 남긴 정보", exact: true });
  await expect(reports).toContainText("경남도립미술관 · 2026-06-15 현장 확인");
  await expect(reports).toContainText(/\d+개월 전에 확인한 정보예요/);
  await expect(page.getByRole("region", { name: "방문 후기", exact: true })).toBeVisible();
  expect(previewRequests).toHaveLength(1);
  expect(Object.fromEntries(previewRequests[0])).toMatchObject({ placeId: "1001", placePreview: "1", page: "1", limit: "3" });
  await expect(page.getByRole("region", { name: "방문 후기", exact: true })).not.toContainText("현장 확인");
  expect(await reports.locator(".official-facility-summary").count()).toBe(0);
});
