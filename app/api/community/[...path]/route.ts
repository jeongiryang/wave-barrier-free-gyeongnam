import {
  commentOwnership, createCommunityComment, createCommunityPost, deleteCommunityComment,
  deleteCommunityPost, getCommunityPost, listCommunityPosts, postOwnership,
  setCommunityLike, updateCommunityComment, updateCommunityPost,
} from "../../../../features/community/server/repository";
import { communityAuthorName, optionalCommunityUser, requiredCommunityUser } from "../../../../features/community/server/session";
import { communityListParams, validateCommentInput, validatePostInput } from "../../../../lib/community/validation.js";
import { readSameOriginJson } from "../../../../lib/server-request";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ path: string[] }> };

function response(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

function databaseUnavailable(label = "여행자 이야기") {
  return response({ error: `${label} 보관 기능을 준비 중입니다.` }, 503);
}

async function authenticated() {
  const auth = await requiredCommunityUser();
  if (auth.error === "unavailable") return { error: response({ error: "계정 서비스 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요." }, 503) };
  if (auth.error === "unauthenticated") return { error: response({ error: "로그인이 필요한 기능입니다.", login: "/login" }, 401) };
  return auth;
}

async function listPosts(request: Request) {
  const filters = communityListParams(new URL(request.url));
  const user = await optionalCommunityUser(request);
  const result = await listCommunityPosts(filters, user?.id || "");
  return result ? response(result) : databaseUnavailable();
}

async function createPost(request: Request) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const parsed = await readSameOriginJson(request, 14000); if (parsed.response) return parsed.response;
  const validated = validatePostInput(parsed.body); if (validated.error || !validated.value) return response({ error: validated.error || "게시글 내용을 확인해 주세요." }, 400);
  const result = await createCommunityPost(auth.user.id, communityAuthorName(auth.user), validated.value);
  if ("unavailable" in result) return databaseUnavailable();
  if ("rateLimited" in result) return response({ error: "짧은 시간에 많은 글이 작성되었습니다. 잠시 후 다시 시도해 주세요." }, 429);
  return response({ id: result.id }, 201);
}

async function readPost(request: Request, postId: string) {
  const user = await optionalCommunityUser(request);
  const result = await getCommunityPost(postId, user?.id || "");
  if (!result) return databaseUnavailable();
  if ("missing" in result) return response({ error: "게시글을 찾을 수 없습니다." }, 404);
  return response(result);
}

async function verifyOwnership(kind: "post" | "comment", postId: string, userId: string, commentId = "") {
  const ownership = kind === "post" ? await postOwnership(postId, userId) : await commentOwnership(postId, commentId, userId);
  if (ownership === "unavailable") return databaseUnavailable(kind === "post" ? "여행자 이야기" : "댓글");
  if (ownership === "missing") return response({ error: kind === "post" ? "게시글을 찾을 수 없습니다." : "댓글을 찾을 수 없습니다." }, 404);
  if (ownership === "forbidden") return response({ error: `본인이 작성한 ${kind === "post" ? "글" : "댓글"}만 수정하거나 삭제할 수 있습니다.` }, 403);
  return null;
}

async function updatePost(request: Request, postId: string) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const parsed = await readSameOriginJson(request, 14000); if (parsed.response) return parsed.response;
  const validated = validatePostInput(parsed.body); if (validated.error || !validated.value) return response({ error: validated.error || "게시글 내용을 확인해 주세요." }, 400);
  const ownershipError = await verifyOwnership("post", postId, auth.user.id); if (ownershipError) return ownershipError;
  await updateCommunityPost(postId, auth.user.id, validated.value);
  return response({ ok: true });
}

async function deletePost(postId: string) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const ownershipError = await verifyOwnership("post", postId, auth.user.id); if (ownershipError) return ownershipError;
  await deleteCommunityPost(postId, auth.user.id);
  return response({ ok: true });
}

async function createComment(request: Request, postId: string) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const parsed = await readSameOriginJson(request, 4000); if (parsed.response) return parsed.response;
  const validated = validateCommentInput(parsed.body); if (validated.error || !validated.value) return response({ error: validated.error || "댓글 내용을 확인해 주세요." }, 400);
  const result = await createCommunityComment(postId, auth.user.id, communityAuthorName(auth.user), validated.value.content);
  if ("unavailable" in result) return databaseUnavailable("댓글");
  if ("missing" in result) return response({ error: "게시글을 찾을 수 없습니다." }, 404);
  if ("rateLimited" in result) return response({ error: "짧은 시간에 많은 댓글이 작성되었습니다. 잠시 후 다시 시도해 주세요." }, 429);
  return response({ id: result.id }, 201);
}

async function updateComment(request: Request, postId: string, commentId: string) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const parsed = await readSameOriginJson(request, 4000); if (parsed.response) return parsed.response;
  const validated = validateCommentInput(parsed.body); if (validated.error || !validated.value) return response({ error: validated.error || "댓글 내용을 확인해 주세요." }, 400);
  const ownershipError = await verifyOwnership("comment", postId, auth.user.id, commentId); if (ownershipError) return ownershipError;
  await updateCommunityComment(postId, commentId, auth.user.id, validated.value.content);
  return response({ ok: true });
}

async function deleteComment(postId: string, commentId: string) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const ownershipError = await verifyOwnership("comment", postId, auth.user.id, commentId); if (ownershipError) return ownershipError;
  await deleteCommunityComment(postId, commentId, auth.user.id);
  return response({ ok: true });
}

async function likePost(postId: string, remove: boolean) {
  const auth = await authenticated(); if (auth.error) return auth.error;
  const result = await setCommunityLike(postId, auth.user.id, remove);
  if ("unavailable" in result) return databaseUnavailable("좋아요");
  if ("missing" in result) return response({ error: "게시글을 찾을 수 없습니다." }, 404);
  return response(result);
}

async function handle(request: Request, context: RouteContext) {
  try {
    const path = (await context.params).path || [];
    if (path[0] !== "posts") return response({ error: "지원하지 않는 커뮤니티 경로입니다." }, 404);
    if (path.length === 1 && request.method === "GET") return listPosts(request);
    if (path.length === 1 && request.method === "POST") return createPost(request);
    const postId = String(path[1] || "").slice(0, 64);
    if (!postId) return response({ error: "게시글 ID가 필요합니다." }, 400);
    if (path.length === 2 && request.method === "GET") return readPost(request, postId);
    if (path.length === 2 && request.method === "PATCH") return updatePost(request, postId);
    if (path.length === 2 && request.method === "DELETE") return deletePost(postId);
    if (path[2] === "comments" && path.length === 3 && request.method === "POST") return createComment(request, postId);
    if (path[2] === "comments" && path[3] && request.method === "PATCH") return updateComment(request, postId, String(path[3]).slice(0, 64));
    if (path[2] === "comments" && path[3] && request.method === "DELETE") return deleteComment(postId, String(path[3]).slice(0, 64));
    if (path[2] === "like" && path.length === 3 && request.method === "POST") return likePost(postId, false);
    if (path[2] === "like" && path.length === 3 && request.method === "DELETE") return likePost(postId, true);
    return response({ error: "지원하지 않는 요청입니다." }, 405);
  } catch (error) {
    console.error("community request failed", error instanceof Error ? error.message : "unknown");
    return response({ error: "여행자 이야기를 처리하는 중 연결이 지연됐습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
