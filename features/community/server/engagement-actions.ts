import { authenticatedCommunityUser, communityResponse, databaseUnavailable } from "./http";
import { setCommunityLike } from "./likes-repository";

export async function likePost(postId: string, remove: boolean) {
  const auth = await authenticatedCommunityUser();
  if (auth.error) return auth.error;
  const result = await setCommunityLike(postId, auth.user.id, remove);
  if ("unavailable" in result) return databaseUnavailable("좋아요");
  if ("missing" in result) return communityResponse({ error: "게시글을 찾을 수 없습니다." }, 404);
  return communityResponse(result);
}
