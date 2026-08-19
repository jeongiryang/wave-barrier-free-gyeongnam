import { createComment, deleteComment, updateComment } from "../../../../features/community/server/comment-actions";
import { likePost } from "../../../../features/community/server/engagement-actions";
import { communityResponse } from "../../../../features/community/server/http";
import { createPost, deletePost, listPosts, readPost, updatePost } from "../../../../features/community/server/post-actions";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: RouteContext) {
  try {
    const path = (await context.params).path || [];
    if (path[0] !== "posts") {
      return communityResponse({ error: "지원하지 않는 커뮤니티 경로입니다." }, 404);
    }
    if (path.length === 1 && request.method === "GET") return listPosts(request);
    if (path.length === 1 && request.method === "POST") return createPost(request);

    const postId = String(path[1] || "").slice(0, 64);
    if (!postId) return communityResponse({ error: "게시글 ID가 필요합니다." }, 400);
    if (path.length === 2 && request.method === "GET") return readPost(request, postId);
    if (path.length === 2 && request.method === "PATCH") return updatePost(request, postId);
    if (path.length === 2 && request.method === "DELETE") return deletePost(postId);

    if (path[2] === "comments" && path.length === 3 && request.method === "POST") {
      return createComment(request, postId);
    }
    const commentId = path[2] === "comments" && path[3] ? String(path[3]).slice(0, 64) : "";
    if (commentId && request.method === "PATCH") return updateComment(request, postId, commentId);
    if (commentId && request.method === "DELETE") return deleteComment(postId, commentId);
    if (path[2] === "like" && path.length === 3 && request.method === "POST") return likePost(postId, false);
    if (path[2] === "like" && path.length === 3 && request.method === "DELETE") return likePost(postId, true);
    return communityResponse({ error: "지원하지 않는 요청입니다." }, 405);
  } catch (error) {
    console.error("community request failed", error instanceof Error ? error.message : "unknown");
    return communityResponse({ error: "여행자 이야기를 처리하는 중 연결이 지연됐습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
