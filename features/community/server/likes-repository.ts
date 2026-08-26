import { communityDatabase, type CommunityRow } from "./database";

export async function setCommunityLike(postId: string, userId: string, remove: boolean) {
  const sql = await communityDatabase();
  if (!sql) return { unavailable: true as const };
  const posts = await sql`SELECT id FROM community_posts WHERE id=${postId} AND moderation_status='active'` as CommunityRow[];
  if (!posts[0]) return { missing: true as const };
  if (remove) {
    await sql`DELETE FROM community_likes WHERE post_id=${postId} AND user_id=${userId}`;
  } else {
    await sql`INSERT INTO community_likes (post_id,user_id,created_at) VALUES (${postId},${userId},${Date.now()}) ON CONFLICT (post_id,user_id) DO NOTHING`;
  }
  const count = await sql`SELECT COUNT(*) count FROM community_likes WHERE post_id=${postId}` as CommunityRow[];
  return { liked: !remove, likeCount: Number(count[0]?.count || 0) };
}
