import { communityDatabase, type CommunityRow } from "./database";
import { mapCommunityComment, mapCommunityPost } from "./post-mappers";
import type { ListFilters } from "./types";

export async function listCommunityPosts(filters: ListFilters, userId: string) {
  const sql = await communityDatabase();
  if (!sql) return null;
  const { category, search, placeId, page, limit, offset } = filters;
  const pattern = `%${search}%`;
  const take = limit + 1;
  const rows = placeId
    ? await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id) comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.place_id=${placeId} ORDER BY p.created_at DESC LIMIT ${take} OFFSET ${offset}`
    : category && search
      ? await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id) comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.category=${category} AND (p.title ILIKE ${pattern} OR p.content ILIKE ${pattern} OR COALESCE(p.place_name,'') ILIKE ${pattern}) ORDER BY p.created_at DESC LIMIT ${take} OFFSET ${offset}`
      : category
        ? await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id) comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.category=${category} ORDER BY p.created_at DESC LIMIT ${take} OFFSET ${offset}`
        : search
          ? await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id) comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.title ILIKE ${pattern} OR p.content ILIKE ${pattern} OR COALESCE(p.place_name,'') ILIKE ${pattern} ORDER BY p.created_at DESC LIMIT ${take} OFFSET ${offset}`
          : await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id) comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p ORDER BY p.created_at DESC LIMIT ${take} OFFSET ${offset}`;
  const typedRows = rows as CommunityRow[];
  return { posts: typedRows.slice(0, limit).map((row) => mapCommunityPost(row, userId)), page, hasMore: typedRows.length > limit };
}

export async function getCommunityPost(postId: string, userId: string) {
  const sql = await communityDatabase();
  if (!sql) return null;
  const rows = await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id) comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.id=${postId} LIMIT 1` as CommunityRow[];
  if (!rows[0]) return { missing: true as const };
  const comments = await sql`SELECT * FROM community_comments WHERE post_id=${postId} ORDER BY created_at ASC` as CommunityRow[];
  return { post: mapCommunityPost(rows[0], userId), comments: comments.map((row) => mapCommunityComment(row, userId)) };
}
