import { validateCommentInput } from "../../../lib/community/validation.js";
import { readSameOriginJson } from "../../../lib/server-request";
import {
  createCommunityComment,
  deleteCommunityComment,
  updateCommunityComment,
} from "./comments-repository";
import {
  authenticatedCommunityUser,
  communityResponse,
  databaseUnavailable,
  verifyCommunityOwnership,
} from "./http";
import { communityAuthorName } from "./session";

export async function createComment(request: Request, postId: string) {
  const auth = await authenticatedCommunityUser();
  if (auth.error) return auth.error;
  const parsed = await readSameOriginJson(request, 4000);
  if (parsed.response) return parsed.response;
  const validated = validateCommentInput(parsed.body);
  if (validated.error || !validated.value) {
    return communityResponse({ error: validated.error || "댓글 내용을 확인해 주세요." }, 400);
  }
  const result = await createCommunityComment(
    postId,
    auth.user.id,
    communityAuthorName(auth.user),
    validated.value.content,
  );
  if ("unavailable" in result) return databaseUnavailable("댓글");
  if ("missing" in result) return communityResponse({ error: "게시글을 찾을 수 없습니다." }, 404);
  if ("rateLimited" in result) {
    return communityResponse({ error: "짧은 시간에 많은 댓글이 작성되었습니다. 잠시 후 다시 시도해 주세요." }, 429);
  }
  return communityResponse({ id: result.id }, 201);
}

export async function updateComment(request: Request, postId: string, commentId: string) {
  const auth = await authenticatedCommunityUser();
  if (auth.error) return auth.error;
  const parsed = await readSameOriginJson(request, 4000);
  if (parsed.response) return parsed.response;
  const validated = validateCommentInput(parsed.body);
  if (validated.error || !validated.value) {
    return communityResponse({ error: validated.error || "댓글 내용을 확인해 주세요." }, 400);
  }
  const ownershipError = await verifyCommunityOwnership("comment", postId, auth.user.id, commentId);
  if (ownershipError) return ownershipError;
  await updateCommunityComment(postId, commentId, auth.user.id, validated.value.content);
  return communityResponse({ ok: true });
}

export async function deleteComment(postId: string, commentId: string) {
  const auth = await authenticatedCommunityUser();
  if (auth.error) return auth.error;
  const ownershipError = await verifyCommunityOwnership("comment", postId, auth.user.id, commentId);
  if (ownershipError) return ownershipError;
  await deleteCommunityComment(postId, commentId, auth.user.id);
  return communityResponse({ ok: true });
}
