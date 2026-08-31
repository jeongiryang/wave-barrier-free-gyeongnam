import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseModeratorUserIds, validateCommunityReport, validateModerationDecision } from "../lib/community/moderation.js";
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

test("moderator IDs fail closed for empty, malformed and duplicate configuration", () => {
  assert.deepEqual(parseModeratorUserIds(undefined), []);
  assert.deepEqual(parseModeratorUserIds(" , \n, "), []);
  assert.deepEqual(parseModeratorUserIds("user-1, user_2,user-1"), ["user-1", "user_2"]);
  assert.deepEqual(parseModeratorUserIds(`valid-id,bad id,${"x".repeat(129)},line\nbreak`), ["valid-id"]);
});

test("community post validation preserves plain text and enforces product limits", () => {
  const valid = validatePostInput({ category: "review", title: "남해 여행에서 확인한 접근로", content: "현장에서 직접 확인한 이동 경험을 공유합니다.", region: "남해", placeId: "123", placeName: "독일마을" });
  assert.deepEqual(valid.value, { category: "review", title: "남해 여행에서 확인한 접근로", content: "현장에서 직접 확인한 이동 경험을 공유합니다.", region: "남해", placeId: "123", placeName: "독일마을", visitDate: null, fieldReports: [], journalPlaces: [] });
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
  const [form, hydratedSession, shell, motionHeadline, authCss, authRoute, server] = await Promise.all([
    Promise.all([
      source("features/auth/components/AuthForm.tsx"),
      source("features/auth/hooks/useAuthForm.ts"),
      source("features/auth/validation.ts"),
    ]).then((parts) => parts.join("\n")),
    source("features/auth/hooks/useHydratedSession.ts"),
    source("features/auth/components/AuthShell.tsx"),
    source("features/auth/components/AuthMotionHeadline.tsx"), accountStyleSource(),
    source("app/api/auth/[...path]/route.ts"), source("lib/auth/server.ts"),
  ]);
  assert.match(form, /authClient\.signIn\.email/);
  assert.match(form, /authClient\.signUp\.email/);
  assert.match(form, /confirmPassword/);
  assert.match(form, /aria-pressed=\{auth\.showPassword\}/);
  assert.match(form, /autoComplete=\{auth\.registering \? "new-password" : "current-password"\}/);
  assert.match(form, /safeAuthReturnPath/);
  assert.match(form, /readAuthCredentials/);
  assert.match(form, /useHydratedSession/);
  assert.match(hydratedSession, /useSyncExternalStore/);
  assert.match(hydratedSession, /data: hydrated \? session\.data : null/);
  assert.match(hydratedSession, /isPending: !hydrated \|\| session\.isPending/);
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
  const [route, postActions, commentActions, communityHttp, posts, comments, likes, ownership, database, session, requestGuard, migration] = await Promise.all([
    source("app/api/community/[...path]/route.ts"),
    source("features/community/server/post-actions.ts"),
    source("features/community/server/comment-actions.ts"),
    source("features/community/server/http.ts"),
    Promise.all([
      source("features/community/server/posts-repository.ts"),
      source("features/community/server/post-read-repository.ts"),
      source("features/community/server/post-write-repository.ts"),
      source("features/community/server/post-mappers.ts"),
    ]).then((parts) => parts.join("\n")),
    source("features/community/server/comments-repository.ts"),
    source("features/community/server/likes-repository.ts"),
    source("features/community/server/ownership.ts"),
    source("features/community/server/database.ts"),
    source("features/community/server/session.ts"),
    source("lib/server-request.ts"),
    source("migrations/001_community.sql"),
  ]);
  assert.match(session, /auth\.getSession\(\)/);
  const communityApi = `${route}\n${postActions}\n${commentActions}\n${communityHttp}`;
  assert.doesNotMatch(communityApi, /body\.author/);
  assert.match(communityHttp, /본인이 작성한.*수정하거나 삭제/);
  assert.match(posts, /export async function createCommunityPost/);
  assert.match(comments, /export async function createCommunityComment/);
  assert.match(likes, /ON CONFLICT \(post_id,user_id\) DO NOTHING/);
  assert.match(ownership, /row.*author_id|rows\[0\]\.author_id/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS community_posts/);
  assert.match(postActions, /짧은 시간에 많은 글/);
  assert.match(postActions, /readSameOriginJson\(request, 14000\)/);
  assert.match(commentActions, /readSameOriginJson\(request, 4000\)/);
  assert.doesNotMatch(route, /validatePostInput|validateCommentInput|requiredCommunityUser/);
  assert.match(requestGuard, /sec-fetch-site/);
  assert.match(requestGuard, /origin !== requestUrl\.origin/);
  assert.match(requestGuard, /TextEncoder\(\)\.encode\(raw\)\.byteLength/);
  assert.match(migration, /REFERENCES community_posts\(id\) ON DELETE CASCADE/);
  assert.match(migration, /PRIMARY KEY \(post_id, user_id\)/);
  assert.match(migration, /community_posts_place_created_idx/);
});

test("community UI supports public reading, protected participation and place linkage", async () => {
  const [list, detail, clientApi, editor, planner, placeDialog, landing, sitemap] = await Promise.all([
    Promise.all([
      source("features/community/components/CommunityBoard.tsx"),
      source("features/community/components/CommunityHero.tsx"),
      source("features/community/components/CommunityBoardToolbar.tsx"),
      source("features/community/components/CommunityPostList.tsx"),
      source("features/community/hooks/useCommunityBoard.ts"),
      source("features/community/hooks/useCommunityPostList.ts"),
    ]).then((parts) => parts.join("\n")),
    Promise.all([
      source("features/community/components/CommunityDetail.tsx"),
      source("features/community/components/CommunityPostArticle.tsx"),
      source("features/community/components/CommunityComments.tsx"),
      source("features/community/hooks/useCommunityDetail.ts"),
      source("features/community/hooks/useCommunityPostResource.ts"),
      source("features/community/hooks/useCommunityPostEngagement.ts"),
      source("features/community/hooks/useCommunityCommentActions.ts"),
    ]).then((parts) => parts.join("\n")),
    source("features/community/client/api.ts"),
    Promise.all([
      source("features/community/components/CommunityEditor.tsx"),
      source("features/community/hooks/useCommunityEditor.ts"),
    ]).then((parts) => parts.join("\n")),
    source("app/planner/page.tsx"),
    Promise.all([
      source("features/planner/components/PlaceDecisionDialog.tsx"),
      source("features/planner/components/PlaceEvidenceSummary.tsx"),
      source("features/planner/components/PlaceParticipationActions.tsx"),
    ]).then((parts) => parts.join("\n")),
    Promise.all([
      source("features/landing/components/LandingProductStories.tsx"),
      source("features/landing/components/LandingDiscoveryStories.tsx"),
      source("features/landing/components/LandingJourneyStories.tsx"),
      source("features/landing/components/LandingAdaptStory.tsx"),
      source("features/community/components/LandingCommunityStory.tsx"),
      source("features/community/hooks/useCommunityPreview.ts"),
    ]).then((parts) => parts.join("\n")), source("app/sitemap.ts"),
  ]);
  assert.match(list, /로그인 없이 공개 글을 확인/);
  assert.match(list, /아직 등록된 후기나 질문이 없습니다/);
  assert.match(detail, /toggleLike/);
  assert.match(detail, /createComment|submitComment/);
  assert.match(clientApi, /export async function listCommunityPosts/);
  assert.match(clientApi, /export function createCommunityComment/);
  assert.doesNotMatch(`${list}\n${detail}`, /fetch\(/);
  assert.match(editor, /본인이 작성한 글만 수정/);
  assert.doesNotMatch(editor, /fetch\(/);
  assert.match(planner, /PlaceDecisionDialog/);
  assert.match(placeDialog, /place-community-link/);
  assert.match(placeDialog, /placeId=\$\{encodeURIComponent\(place\.id\)\}/);
  assert.match(landing, /실제 사용자가 작성한 글만 표시/);
  assert.doesNotMatch(landing, /김철수|홍길동|test user/i);
  assert.match(sitemap, /`\$\{origin\}\/community`/);
});

test("landing product story exposes previews and reduced-motion styles", async () => {
  const [stories, storyCss, accountCss] = await Promise.all([
    Promise.all([
      source("features/landing/components/LandingProductStories.tsx"),
      source("features/landing/components/LandingDiscoveryStories.tsx"),
      source("features/landing/components/LandingJourneyStories.tsx"),
      source("features/landing/components/LandingAdaptStory.tsx"),
      source("features/community/components/LandingCommunityStory.tsx"),
    ]).then((parts) => parts.join("\n")),
    source("app/styles/landing-stories.css"), accountStyleSource(),
  ]);
  const css = `${storyCss}\n${accountCss}`;
  for (const chapter of ["DISCOVER", "ACCESS", "PLAN", "ROUTE", "ADAPT", "COMMUNITY"]) assert.match(stories, new RegExp(chapter));
  assert.match(stories, /기능 화면 미리보기/);
  assert.match(stories, /정보 없음은 시설 없음과 다릅니다/);
  assert.match(stories, /현재 예보처럼 오해하지 않도록/);
  assert.match(css, /\.product-story,.landing-community \{ min-height: 680px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*community-skeletons/);
});

test("community moderation validates reports and restricts operator decisions", async () => {
  assert.deepEqual(validateCommunityReport({ reason: "unsafe", details: "현장 공사 중" }), { value: { reason: "unsafe", details: "현장 공사 중" } });
  assert.match(validateCommunityReport({ reason: "invalid" }).error, /신고 이유/);
  assert.deepEqual(validateModerationDecision({ targetType: "post", targetId: "post-1", status: "hidden" }), { value: { targetType: "post", targetId: "post-1", status: "hidden" } });
  assert.match(validateModerationDecision({ targetType: "post", targetId: "post-1", status: "deleted" }).error, /운영 처리 대상/);

  const [route, actions, repository, reads, comments, migration, client] = await Promise.all([
    source("app/api/community/[...path]/route.ts"),
    source("features/community/server/moderation-actions.ts"),
    source("features/community/server/moderation-repository.ts"),
    source("features/community/server/post-read-repository.ts"),
    source("features/community/server/comments-repository.ts"),
    source("migrations/002_community_moderation.sql"),
    Promise.all([
      source("features/community/components/CommunityReportControl.tsx"),
      source("features/community/components/CommunityModerationQueue.tsx"),
    ]).then((parts) => parts.join("\n")),
  ]);
  assert.match(route, /reportCommunityTarget/);
  assert.match(route, /listModerationQueue/);
  assert.match(actions, /COMMUNITY_MODERATOR_USER_IDS/);
  assert.match(actions, /parseModeratorUserIds/);
  assert.match(actions, /authenticatedCommunityUser/);
  assert.match(repository, /reporter_id,target_type,target_id/);
  assert.match(repository, /reportCount >= 3/);
  assert.match(repository, /moderation_status='active'/);
  assert.match(repository, /RETURNING id/);
  assert.match(actions, /"missing" in result/);
  assert.match(reads, /moderation_status='active'/);
  assert.match(repository, /r\.target_type='post' OR c\.id IS NOT NULL/);
  assert.match(comments, /DELETE FROM community_reports WHERE target_type='comment'/);
  assert.match(migration, /UNIQUE \(reporter_id, target_type, target_id\)/);
  assert.match(migration, /community_posts_moderation_status_check/);
  assert.match(migration, /community_comments_moderation_status_check/);
  assert.match(migration, /NOT VALID/);
  assert.match(migration, /VALIDATE CONSTRAINT/);
  assert.match(client, /운영팀에 전달할 이유/);
  assert.match(client, /공개 유지/);
  assert.match(client, /숨김 처리/);
});
