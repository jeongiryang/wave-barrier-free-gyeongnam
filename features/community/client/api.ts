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
  reported?: boolean;
  underReview?: boolean;
  retryAfter?: number;
};

export type CommunityRequestErrorKind = "aborted" | "timeout" | "network" | "invalid" | "http";

export class CommunityRequestError extends Error {
  readonly kind: CommunityRequestErrorKind;
  readonly status: number;

  constructor(kind: CommunityRequestErrorKind, message: string, status = 0, options?: ErrorOptions) {
    super(message, options);
    this.name = "CommunityRequestError";
    this.kind = kind;
    this.status = status;
  }
}

export function isCommunityRequestError(error: unknown): error is CommunityRequestError {
  return error instanceof CommunityRequestError;
}

export function communityErrorMessage(error: unknown, fallback: string) {
  if (!isCommunityRequestError(error)) return error instanceof Error ? error.message : fallback;
  if (error.kind === "timeout") return "응답이 늦어 연결을 멈췄습니다. 잠시 후 다시 시도해 주세요.";
  if (error.kind === "network") return "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
  if (error.kind === "invalid") return "서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  return error.message || fallback;
}

export type CommunityPostInput = {
  category: CommunityPost["category"];
  title: string;
  content: string;
  region: string;
  placeId: string;
  placeName: string;
  visitDate: string;
  fieldReports: CommunityPost["fieldReports"];
  journalPlaces: CommunityPost["journalPlaces"];
};

export type CommunityModerationReport = {
  id: string;
  postId: string;
  targetType: "post" | "comment";
  targetId: string;
  reason: string;
  details: string;
  createdAt: number;
  postTitle: string;
  targetContent: string;
  moderationStatus: string;
};

export type CommunityResult<T> = { ok: boolean; status: number; payload: T };
type CommunityRequestInit = Omit<RequestInit, "signal"> & { signal?: AbortSignal; timeoutMs?: number };

const COMMUNITY_REQUEST_TIMEOUT_MS = 12_000;

async function communityRequest<T>(path: string, init: CommunityRequestInit = {}): Promise<CommunityResult<T>> {
  const { signal: parentSignal, timeoutMs = COMMUNITY_REQUEST_TIMEOUT_MS, headers, ...requestInit } = init;
  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted) abortFromParent();
  else parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Community request timed out", "TimeoutError"));
  }, timeoutMs);

  try {
    const response = await fetch(path, {
      ...requestInit,
      headers: { Accept: "application/json", ...headers },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as T | null;
    if (payload === null) {
      if (response.ok) throw new CommunityRequestError("invalid", "커뮤니티 응답 형식을 확인하지 못했습니다.", response.status);
      return { ok: false, status: response.status, payload: {} as T };
    }
    return { ok: response.ok, status: response.status, payload };
  } catch (error) {
    if (isCommunityRequestError(error)) throw error;
    if (timedOut) throw new CommunityRequestError("timeout", "커뮤니티 요청 시간이 초과됐습니다.", 0, { cause: error });
    if (controller.signal.aborted) throw new CommunityRequestError("aborted", "커뮤니티 요청이 취소됐습니다.", 0, { cause: error });
    throw new CommunityRequestError("network", "커뮤니티에 연결하지 못했습니다.", 0, { cause: error });
  } finally {
    window.clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
}

export async function listCommunityPosts(params: URLSearchParams, signal?: AbortSignal, timeoutMs?: number) {
  const result = await communityRequest<CommunityListResponse>(`/api/community/posts?${params}`, { signal, timeoutMs });
  if (!result.ok) throw new CommunityRequestError("http", result.payload.error || "목록을 불러오지 못했습니다.", result.status);
  return result.payload;
}

export async function getCommunityPost(postId: string, signal?: AbortSignal) {
  const result = await communityRequest<CommunityDetailResponse>(`/api/community/posts/${postId}`, { signal });
  if (!result.ok || !result.payload.post) {
    throw new CommunityRequestError("http", result.payload.error || "게시글을 불러오지 못했습니다.", result.status);
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

export function reportCommunityContent(postId: string, targetType: "post" | "comment", targetId: string, reason: string) {
  const path = targetType === "post"
    ? `/api/community/posts/${postId}/report`
    : `/api/community/posts/${postId}/comments/${targetId}/report`;
  return communityRequest<CommunityMutationResponse>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
}

export function getCommunityModerationQueue(signal?: AbortSignal) {
  return communityRequest<{ reports?: CommunityModerationReport[]; error?: string }>("/api/community/moderation", { signal });
}

export function applyCommunityModeration(targetType: "post" | "comment", targetId: string, status: "active" | "hidden") {
  return communityRequest<{ ok?: boolean; error?: string }>("/api/community/moderation", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetType, targetId, status }),
  });
}
