import { commentOwnership, postOwnership } from "./ownership";
import { requiredCommunityUser } from "./session";

export function communityResponse(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export function databaseUnavailable(label = "여행자 이야기") {
  return communityResponse({ error: `${label} 보관 기능을 준비 중입니다.` }, 503);
}

export async function authenticatedCommunityUser() {
  const auth = await requiredCommunityUser();
  if (auth.error === "unavailable") {
    return { error: communityResponse({ error: "계정 서비스 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요." }, 503) };
  }
  if (auth.error === "unauthenticated") {
    return { error: communityResponse({ error: "로그인이 필요한 기능입니다.", login: "/login" }, 401) };
  }
  return auth;
}

export async function verifyCommunityOwnership(
  kind: "post" | "comment",
  postId: string,
  userId: string,
  commentId = "",
) {
  const ownership = kind === "post"
    ? await postOwnership(postId, userId)
    : await commentOwnership(postId, commentId, userId);
  if (ownership === "unavailable") return databaseUnavailable(kind === "post" ? "여행자 이야기" : "댓글");
  if (ownership === "missing") {
    return communityResponse({ error: kind === "post" ? "게시글을 찾을 수 없습니다." : "댓글을 찾을 수 없습니다." }, 404);
  }
  if (ownership === "forbidden") {
    return communityResponse({ error: `본인이 작성한 ${kind === "post" ? "글" : "댓글"}만 수정하거나 삭제할 수 있습니다.` }, 403);
  }
  return null;
}
