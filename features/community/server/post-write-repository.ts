import { communityDatabase, type CommunityRow } from "./database";
import type { PostValue } from "./types";

export async function createCommunityPost(userId: string, name: string, value: PostValue) {
  const sql = await communityDatabase();
  if (!sql) return { unavailable: true as const };
  const recent = await sql`SELECT COUNT(*) count FROM community_posts WHERE author_id=${userId} AND created_at>${Date.now() - 600000}` as CommunityRow[];
  if (Number(recent[0]?.count || 0) >= 5) return { rateLimited: true as const };
  const id = crypto.randomUUID();
  const now = Date.now();
  await sql`INSERT INTO community_posts (id,author_id,author_name,category,title,content,region,place_id,place_name,created_at,updated_at) VALUES (${id},${userId},${name},${value.category},${value.title},${value.content},${value.region},${value.placeId},${value.placeName},${now},${now})`;
  return { id };
}

export async function updateCommunityPost(postId: string, userId: string, value: PostValue) {
  const sql = await communityDatabase();
  if (!sql) return false;
  await sql`UPDATE community_posts SET category=${value.category},title=${value.title},content=${value.content},region=${value.region},place_id=${value.placeId},place_name=${value.placeName},updated_at=${Date.now()} WHERE id=${postId} AND author_id=${userId}`;
  return true;
}

export async function deleteCommunityPost(postId: string, userId: string) {
  const sql = await communityDatabase();
  if (!sql) return false;
  await sql`DELETE FROM community_posts WHERE id=${postId} AND author_id=${userId}`;
  return true;
}
