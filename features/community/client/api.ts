import type { CommunityComment, CommunityPost } from "../../../lib/community/types";

export type CommunityListResponse = {
  posts?: CommunityPost[];
  page?: number;
  hasMore?: boolean;
  error?: string;
};

export type CommunityDetailResponse = {
  post?: CommunityPost;
  comments?: CommunityComment[];
  error?: string;
};

type CommunityMutationResponse = {
  id?: string;
  error?: string;
  liked?: boolean;
  likeCount?: number;
};

export type CommunityPostInput = {
  category: CommunityPost["category"];
  title: string;
  content: string;
  region: string;
  placeId: string;
  placeName: string;
};

type CommunityResult<T> = { ok: boolean; status: number; payload: T };

async function communityRequest<T>(path: string, init?: RequestInit): Promise<CommunityResult<T>> {
  const response = await fetch(path, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => ({})) as T;
  return { ok: response.ok, status: response.status, payload };
}

export async function listCommunityPosts(params: URLSearchParams, signal: AbortSignal) {
  const result = await communityRequest<CommunityListResponse>(`/api/community/posts?${params}`, { signal });
  if (!result.ok) throw new Error(result.payload.error || "목록을 불러오지 못했습니다.");
  return result.payload;
}

export async function getCommunityPost(postId: string, signal?: AbortSignal) {
  const result = await communityRequest<CommunityDetailResponse>(`/api/community/posts/${postId}`, { signal });
  if (!result.ok || !result.payload.post) {
    throw new Error(result.payload.error || "게시글을 불러오지 못했습니다.");
  }
  return { ...result.payload, post: result.payload.post };
}

export function saveCommunityPost(postId: string | undefined, values: CommunityPostInput) {
  return communityRequest<CommunityMutationResponse>(postId ? `/api/community/posts/${postId}` : "/api/community/posts", {
    method: postId ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
}

export function setCommunityLike(postId: string, liked: boolean) {
  return communityRequest<CommunityMutationResponse>(`/api/community/posts/${postId}/like`, {
    method: liked ? "DELETE" : "POST",
  });
}

export function removeCommunityPost(postId: string) {
  return communityRequest<CommunityMutationResponse>(`/api/community/posts/${postId}`, { method: "DELETE" });
}

export function createCommunityComment(postId: string, content: string) {
  return communityRequest<CommunityMutationResponse>(`/api/community/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function updateCommunityComment(postId: string, commentId: string, content: string) {
  return communityRequest<CommunityMutationResponse>(`/api/community/posts/${postId}/comments/${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export function removeCommunityComment(postId: string, commentId: string) {
  return communityRequest<CommunityMutationResponse>(`/api/community/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
  });
}
