import { communityDatabase, type CommunityRow } from "./database";

export async function createCommunityComment(
  postId: string,
  userId: string,
  name: string,
  content: string,
) {
  const sql = await communityDatabase();
  if (!sql) return { unavailable: true as const };
  const posts = await sql`SELECT id FROM community_posts WHERE id=${postId}` as CommunityRow[];
  if (!posts[0]) return { missing: true as const };
  const recent = await sql`SELECT COUNT(*) count FROM community_comments WHERE author_id=${userId} AND created_at>${Date.now() - 600000}` as CommunityRow[];
  if (Number(recent[0]?.count || 0) >= 20) return { rateLimited: true as const };
  const id = crypto.randomUUID();
  const now = Date.now();
  await sql`INSERT INTO community_comments (id,post_id,author_id,author_name,content,created_at,updated_at) VALUES (${id},${postId},${userId},${name},${content},${now},${now})`;
  return { id };
}

export async function updateCommunityComment(
  postId: string,
  commentId: string,
  userId: string,
  content: string,
) {
  const sql = await communityDatabase();
  if (!sql) return false;
  await sql`UPDATE community_comments SET content=${content},updated_at=${Date.now()} WHERE id=${commentId} AND post_id=${postId} AND author_id=${userId}`;
  return true;
}

export async function deleteCommunityComment(postId: string, commentId: string, userId: string) {
  const sql = await communityDatabase();
  if (!sql) return false;
  await sql`DELETE FROM community_comments WHERE id=${commentId} AND post_id=${postId} AND author_id=${userId}`;
  return true;
}
