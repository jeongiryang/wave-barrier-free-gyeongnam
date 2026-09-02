import { communityListParams, validatePostInput } from "../../../lib/community/validation.js";
import { rateLimitResponse } from "../../../lib/rate-limit-response.js";
import { readSameOriginJson } from "../../../lib/server-request";
import {
  createCommunityPost,
  deleteCommunityPost,
  getCommunityPost,
  listCommunityPosts,
  updateCommunityPost,
} from "./posts-repository";
import {
  authenticatedCommunityUser,
  communityResponse,
  databaseUnavailable,
  verifyCommunityOwnership,
} from "./http";
import { communityAuthorName, optionalCommunityUser } from "./session";

export async function listPosts(request: Request) {
  const filters = communityListParams(new URL(request.url));
  const user = await optionalCommunityUser(request);
  const result = await listCommunityPosts(filters, user?.id || "");
  return result ? communityResponse(result) : databaseUnavailable();
}

export async function createPost(request: Request) {
  const auth = await authenticatedCommunityUser();
  if (auth.error) return auth.error;
  const parsed = await readSameOriginJson(request, 14000);
  if (parsed.response) return parsed.response;
  const validated = validatePostInput(parsed.body);
  if (validated.error || !validated.value) {
    return communityResponse({ error: validated.error || "게시글 내용을 확인해 주세요." }, 400);
  }
  const result = await createCommunityPost(auth.user.id, communityAuthorName(auth.user), validated.value);
  if ("unavailable" in result) return databaseUnavailable();
  if ("rateLimited" in result) {
    return rateLimitResponse("짧은 시간에 많은 글이 작성되었습니다. 잠시 후 다시 시도해 주세요.", result.retryAfter ?? 600);
  }
  return communityResponse({ id: result.id }, 201);
}

export async function readPost(request: Request, postId: string) {
  const user = await optionalCommunityUser(request);
  const result = await getCommunityPost(postId, user?.id || "");
  if (!result) return databaseUnavailable();
  if ("missing" in result) return communityResponse({ error: "게시글을 찾을 수 없습니다." }, 404);
  return communityResponse(result);
}

export async function updatePost(request: Request, postId: string) {
  const auth = await authenticatedCommunityUser();
  if (auth.error) return auth.error;
  const parsed = await readSameOriginJson(request, 14000);
  if (parsed.response) return parsed.response;
  const validated = validatePostInput(parsed.body);
  if (validated.error || !validated.value) {
    return communityResponse({ error: validated.error || "게시글 내용을 확인해 주세요." }, 400);
  }
  const ownershipError = await verifyCommunityOwnership("post", postId, auth.user.id);
  if (ownershipError) return ownershipError;
  await updateCommunityPost(postId, auth.user.id, validated.value);
  return communityResponse({ ok: true });
}

export async function deletePost(postId: string) {
  const auth = await authenticatedCommunityUser();
  if (auth.error) return auth.error;
  const ownershipError = await verifyCommunityOwnership("post", postId, auth.user.id);
  if (ownershipError) return ownershipError;
  await deleteCommunityPost(postId, auth.user.id);
  return communityResponse({ ok: true });
}
