import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { communityListParams, validateCommentInput, validatePostInput } from "../lib/community/validation.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

async function accountStyleSource() {
  const paths = [
    "app/styles/account-auth.css",
    "app/styles/community.css",
    "app/styles/account-community.css",
  ];
  return (await Promise.all(paths.map(source))).join("\n");
}

test("community post validation preserves plain text and enforces product limits", () => {
  const valid = validatePostInput({ category: "review", title: "남해 여행에서 확인한 접근로", content: "현장에서 직접 확인한 이동 경험을 공유합니다.", region: "남해", placeId: "123", placeName: "독일마을" });
  assert.deepEqual(valid.value, { category: "review", title: "남해 여행에서 확인한 접근로", content: "현장에서 직접 확인한 이동 경험을 공유합니다.", region: "남해", placeId: "123", placeName: "독일마을" });
  assert.match(validatePostInput({ category: "other", title: "충분한 제목", content: "충분한 내용입니다." }).error, /게시판/);
  assert.match(validatePostInput({ category: "place", title: "짧음", content: "충분한 내용입니다." }).error, /제목/);
  assert.match(validatePostInput({ category: "place", title: "충분한 제목입니다", content: "충분한 내용입니다.", placeId: "123" }).error, /함께/);
  assert.match(validatePostInput({ category: "place", title: "충분한 제목입니다", content: "충분한 내용입니다.", region: "서울" }).error, /경남/);
});

test("community comments and list parameters reject empty data and cap pagination", () => {
  assert.match(validateCommentInput({ content: " " }).error, /2자/);
  assert.equal(validateCommentInput({ content: "좋은 정보 감사합니다." }).value.content, "좋은 정보 감사합니다.");
  const params = communityListParams(new URL("https://wave.example/api/community/posts?page=9999&limit=999&category=review&search=남해"));
  assert.equal(params.page, 1000);
  assert.equal(params.limit, 24);
  assert.equal(params.category, "review");
  assert.equal(params.search, "남해");
});

test("formal auth pages use Neon Auth with accessible password and return flows", async () => {
  const [form, shell, motionHeadline, authCss, authRoute, server] = await Promise.all([
    source("components/AuthForm.tsx"), source("components/AuthShell.tsx"),
    source("components/AuthMotionHeadline.tsx"), accountStyleSource(),
    source("app/api/auth/[...path]/route.ts"), source("lib/auth/server.ts"),
  ]);
  assert.match(form, /authClient\.signIn\.email/);
  assert.match(form, /authClient\.signUp\.email/);
  assert.match(form, /confirmPassword/);
  assert.match(form, /aria-pressed=\{showPassword\}/);
  assert.match(form, /autoComplete=\{registering \? "new-password" : "current-password"\}/);
  assert.match(form, /safeNext/);
  assert.match(shell, /로그인 없이 여행 설계/);
  assert.match(shell, /AuthMotionHeadline mode=\{mode\}/);
  assert.match(motionHeadline, /나에게 맞는 하루로/);
  assert.match(motionHeadline, /더 편한 이동으로/);
  assert.match(motionHeadline, /여행자의 이야기까지/);
  assert.match(motionHeadline, /motion === "calm"/);
  assert.match(motionHeadline, /setTimeout\(\(\) => setPhraseIndex\(1\), 2700\)/);
  assert.match(motionHeadline, /setTimeout\(\(\) => setPhraseIndex\(2\), 5400\)/);
  assert.match(motionHeadline, /clearTimeout\(second\)/);
  assert.match(motionHeadline, /className="sr-only"/);
  assert.match(motionHeadline, /aria-hidden="true"/);
  assert.doesNotMatch(motionHeadline, /aria-live/);
  assert.match(authCss, /\.auth-copy-phrase-shell \{ min-block-size:/);
  assert.match(authCss, /html\[data-motion="calm"\][\s\S]*\.auth-copy-phrase/);
  assert.match(authCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.auth-copy-phrase/);
  assert.match(authRoute, /getAuth\(\)\?\.handler/);
  assert.match(server, /secret\.length < 32/);
  assert.match(server, /sameSite: "lax"/);
});

test("community API derives identity from the session and enforces ownership", async () => {
  const [route, repository, posts, comments, likes, ownership, database, session, requestGuard, migration] = await Promise.all([
    source("app/api/community/[...path]/route.ts"),
    source("features/community/server/repository.ts"),
    source("features/community/server/posts-repository.ts"),
    source("features/community/server/comments-repository.ts"),
    source("features/community/server/likes-repository.ts"),
    source("features/community/server/ownership.ts"),
    source("features/community/server/database.ts"),
    source("features/community/server/session.ts"),
    source("lib/server-request.ts"),
    source("migrations/001_community.sql"),
  ]);
  assert.match(session, /auth\.getSession\(\)/);
  assert.doesNotMatch(route, /body\.author/);
  assert.match(route, /본인이 작성한.*수정하거나 삭제/);
  assert.match(repository, /export \* from "\.\/posts-repository"/);
  assert.match(repository, /export \* from "\.\/comments-repository"/);
  assert.match(repository, /export \* from "\.\/likes-repository"/);
  assert.match(posts, /export async function createCommunityPost/);
  assert.match(comments, /export async function createCommunityComment/);
  assert.match(likes, /ON CONFLICT \(post_id,user_id\) DO NOTHING/);
  assert.match(ownership, /row.*author_id|rows\[0\]\.author_id/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS community_posts/);
  assert.match(route, /짧은 시간에 많은 글/);
  assert.match(route, /readSameOriginJson\(request, 14000\)/);
  assert.match(requestGuard, /sec-fetch-site/);
  assert.match(requestGuard, /origin !== requestUrl\.origin/);
  assert.match(requestGuard, /TextEncoder\(\)\.encode\(raw\)\.byteLength/);
  assert.match(migration, /REFERENCES community_posts\(id\) ON DELETE CASCADE/);
  assert.match(migration, /PRIMARY KEY \(post_id, user_id\)/);
  assert.match(migration, /community_posts_place_created_idx/);
});

test("community UI supports public reading, protected participation and place linkage", async () => {
  const [list, detail, editor, planner, placeDialog, landing, sitemap] = await Promise.all([
    source("features/community/components/CommunityBoard.tsx"), source("components/CommunityDetail.tsx"),
    source("components/CommunityEditor.tsx"), source("app/planner/page.tsx"),
    source("features/planner/components/PlaceDecisionDialog.tsx"),
    source("components/LandingStories.tsx"), source("app/sitemap.ts"),
  ]);
  assert.match(list, /로그인 없이 공개 글을 확인/);
  assert.match(list, /아직 등록된 이야기가 없습니다/);
  assert.match(detail, /toggleLike/);
  assert.match(detail, /createComment|submitComment/);
  assert.match(editor, /본인이 작성한 글만 수정/);
  assert.match(planner, /PlaceDecisionDialog/);
  assert.match(placeDialog, /place-community-link/);
  assert.match(placeDialog, /placeId=\$\{encodeURIComponent\(place\.id\)\}/);
  assert.match(landing, /실제 사용자가 작성한 글만 표시/);
  assert.doesNotMatch(landing, /김철수|홍길동|test user/i);
  assert.match(sitemap, /`\$\{origin\}\/community`/);
});

test("landing product story exposes previews and reduced-motion styles", async () => {
  const [stories, storyCss, accountCss] = await Promise.all([source("components/LandingStories.tsx"), source("app/styles/landing-stories.css"), accountStyleSource()]);
  const css = `${storyCss}\n${accountCss}`;
  for (const chapter of ["DISCOVER", "ACCESS", "PLAN", "ROUTE", "ADAPT", "COMMUNITY"]) assert.match(stories, new RegExp(chapter));
  assert.match(stories, /기능 화면 미리보기/);
  assert.match(stories, /정보 없음은 시설 없음과 다릅니다/);
  assert.match(stories, /현재 예보처럼 오해하지 않도록/);
  assert.match(css, /\.product-story,.landing-community \{ min-height: 680px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*community-skeletons/);
});
