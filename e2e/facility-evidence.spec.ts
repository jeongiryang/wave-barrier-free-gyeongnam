import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";

const post = { id: "visit-photo", category: "review", title: "직접 확인한 입구와 이동 동선", content: "입구에서 화장실까지 직접 이동하면서 확인했어요.", region: "창원", placeId: "1001", placeName: "경남도립미술관", authorName: "현장 여행자", createdAt: 1789128000000, updatedAt: 1789128000000, commentCount: 0, likeCount: 0, likedByMe: false, isOwner: true, visitDate: "2026-09-10", fieldReports: [{ field: "entrance", status: "confirmed", note: "경사로를 이용했어요." }], journalPlaces: [] };

test("visit photos preserve a draft after failed registration, then display and edit the published photos", async ({ page }, info) => {
  await mockPublicShellApi(page); await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/auth/get-session", route => route.fulfill({ json: { user: { id: "field-fixture", name: "현장 여행자", email: "fixture@example.com" }, session: { id: "fixture" } } }));
  let attempts = 0, saved: typeof post & { visitPhotos?: { dataUrl: string; width: number; height: number; caption: string }[]; photoConsent?: boolean } = { ...post };
  await page.route("**/api/community/posts**", async route => {
    const request = route.request(), url = new URL(request.url());
    if (["POST", "PATCH"].includes(request.method())) {
      attempts++;
      if (attempts === 1) return route.fulfill({ status: 401, json: { error: "로그인 필요" } });
      saved = { ...post, ...request.postDataJSON() };
      return route.fulfill({ status: request.method() === "POST" ? 201 : 200, json: { id: post.id, ok: true } });
    }
    if (url.pathname.endsWith("/visit-photo")) return route.fulfill({ json: { post: saved, comments: [] } });
    return route.fulfill({ json: { posts: [], page: 1, hasMore: false } });
  });
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/community/new?category=review&placeId=1001&placeName=경남도립미술관&region=창원&field=entrance&observation=confirmed");
  await page.getByLabel("제목").fill(post.title); await page.getByLabel("내용").fill(post.content);
  const imageUrl: string = JSON.parse(await readFile("tests/visit-photo-fixture.json", "utf8"));
  await page.getByLabel("사진 선택 (최대 2장)").setInputFiles({ name: "synthetic-entry.jpg", mimeType: "image/jpeg", buffer: Buffer.from(imageUrl.split(",")[1], "base64") });
  await page.getByLabel("사진 1 설명", { exact: true }).fill("출입구 옆의 경사로를 이용했어요.");
  await page.getByLabel("방문일 (사진 첨부 시 필수)").fill(post.visitDate);
  await page.getByRole("checkbox", { name: "직접 촬영한 사진을 후기에 공개할게요." }).check();
  const editor = page.locator(".community-editor");
  for (const width of info.project.name.startsWith("desktop") ? [1440, 960] : [390, 320]) {
    await page.setViewportSize({ width, height: 960 }); await page.getByLabel("사진 1 설명", { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`photo-editor-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
  expect((await new AxeBuilder({ page }).include(".community-editor").analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "후기 등록", exact: true }).click();
  await expect(editor.getByRole("alert")).toContainText("로그인이 만료됐어요");
  await expect(page.getByRole("link", { name: "새 탭에서 로그인하기" })).toHaveAttribute("target", "_blank");
  await expect(page.getByLabel("사진 1 설명", { exact: true })).toHaveValue("출입구 옆의 경사로를 이용했어요.");
  await page.getByRole("button", { name: "후기 등록", exact: true }).click();
  await expect(page).toHaveURL(/\/community\/visit-photo$/);
  expect(saved.visitPhotos).toHaveLength(1); expect(saved.visitPhotos![0].width).toBeLessThanOrEqual(800);
  expect(saved.photoConsent).toBe(true);
  const gallery = page.getByRole("region", { name: "사진으로 남긴 현장" });
  await expect(gallery.getByRole("img")).toBeVisible(); await expect(gallery).toContainText(post.visitDate);
  expect(await gallery.getByRole("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await gallery.scrollIntoViewIfNeeded(); await page.screenshot({ path: info.outputPath("photo-detail.png") });
  await page.goto("/community/visit-photo/edit");
  await expect(page.getByLabel("사진 1 설명", { exact: true })).toHaveValue("출입구 옆의 경사로를 이용했어요.");
  await page.getByRole("button", { name: "사진 1 제거", exact: true }).click();
  await page.getByRole("button", { name: "수정 내용 저장", exact: true }).click();
  await expect(page).toHaveURL(/\/community\/visit-photo$/); expect(saved.visitPhotos).toEqual([]);
  await expect(page.getByRole("heading", { name: "사진으로 남긴 현장" })).toHaveCount(0); expect(errors).toEqual([]);
});

test("facility history loads on demand, retries, identifies conflicting dates and links a precise report draft", async ({ page }, info) => {
  await mockPublicShellApi(page); await mockPlannerApi(page, { preserveView: true }); await page.emulateMedia({ reducedMotion: "reduce" });
  let requests = 0;
  await page.route("**/api/community/posts?*", route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get("history") !== "1") return route.fulfill({ json: { posts: [], page: 1, hasMore: false } });
    requests++;
    if (requests === 1) return route.fulfill({ status: 503, json: { error: "잠시 후 다시 시도해 주세요." } });
    if (params.get("page") === "2") return route.fulfill({ json: { posts: [{ ...post, id: "older", visitDate: "2026-09-01" }], page: 2, hasMore: false } });
    return route.fulfill({ json: { posts: [post, { ...post, id: "changed", createdAt: post.createdAt + 1, fieldReports: [{ field: "entrance", status: "changed", note: "정문이 공사 중이었어요." }] }], page: 1, hasMore: true } });
  });
  await page.goto("/planner"); await chooseTripConditions(page);
  await page.locator(".place-card").first().getByRole("button", { name: "이용 정보", exact: true }).click();
  const history = page.getByRole("region", { name: "편의시설, 언제 확인했을까요?" });
  await expect(history.getByRole("button", { name: "시설 제보 이력 확인", exact: true })).toBeVisible(); expect(requests).toBe(0);
  await history.getByRole("button", { name: "시설 제보 이력 확인", exact: true }).click(); await expect(history.getByRole("status")).toContainText("다시 시도");
  await history.getByRole("button", { name: "시설 제보 이력 확인", exact: true }).click(); await expect(history).toContainText("같은 방문일의 제보가 서로 달라요.");
  await history.getByRole("button", { name: "이전 방문 기록 더 보기", exact: true }).click(); await expect(history.getByRole("status")).toContainText("후기 3건");
  const entrance = history.getByRole("article").filter({ has: page.getByRole("heading", { name: "출입 경로", exact: true }) });
  await entrance.getByText("불러온 항목별 기록 3건", { exact: true }).click(); await expect(entrance).toContainText("2026-09-01");
  for (const width of info.project.name.startsWith("desktop") ? [1440, 960] : [390, 320]) {
    await page.setViewportSize({ width, height: 960 }); await entrance.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`facility-history-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  }
  expect((await new AxeBuilder({ page }).include(".place-community-stories").analyze()).violations).toEqual([]);
  const href = await entrance.getByRole("link", { name: "달라진 점이 있어요", exact: true }).getAttribute("href");
  expect(href).toContain("field=entrance&observation=changed"); expect(href).toContain("placeId=1001"); expect(href).not.toContain("visitDate");
});
