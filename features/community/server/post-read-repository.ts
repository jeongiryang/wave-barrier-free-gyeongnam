import { communitySearchPattern } from "../../../lib/community/validation.js";
import { communityDatabase, type CommunityRow } from "./database";
import { mapCommunityComment, mapCommunityPost } from "./post-mappers";
import type { ListFilters } from "./types";

export async function listCommunityPosts(filters: ListFilters, userId: string) {
  const sql = await communityDatabase();
  if (!sql) return null;
  const { category, search, placeId, page, limit, offset } = filters;
  const pattern = communitySearchPattern(search);
  const take = limit + 1;
  const journalPlace = JSON.stringify([{ id: placeId }]);
  const rows = placeId
    ? await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id AND c.moderation_status='active') comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.moderation_status='active' AND p.author_id <> 'wave-seed' AND (p.visit_date IS NULL OR p.visit_date <= to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')) AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p.journal_places) item WHERE item->>'day' > to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')) AND (p.place_id=${placeId} OR p.journal_places @> ${journalPlace}::jsonb) ORDER BY p.created_at DESC LIMIT ${take} OFFSET ${offset}`
    : category && search
      ? await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id AND c.moderation_status='active') comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.moderation_status='active' AND p.author_id <> 'wave-seed' AND (p.visit_date IS NULL OR p.visit_date <= to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')) AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p.journal_places) item WHERE item->>'day' > to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')) AND p.category=${category} AND (p.title ILIKE ${pattern} OR p.content ILIKE ${pattern} OR COALESCE(p.place_name,'') ILIKE ${pattern} OR p.journal_places::text ILIKE ${pattern}) ORDER BY p.created_at DESC LIMIT ${take} OFFSET ${offset}`
      : category
        ? await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id AND c.moderation_status='active') comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.moderation_status='active' AND p.author_id <> 'wave-seed' AND (p.visit_date IS NULL OR p.visit_date <= to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')) AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p.journal_places) item WHERE item->>'day' > to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')) AND p.category=${category} ORDER BY p.created_at DESC LIMIT ${take} OFFSET ${offset}`
        : search
          ? await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id AND c.moderation_status='active') comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.moderation_status='active' AND p.author_id <> 'wave-seed' AND (p.visit_date IS NULL OR p.visit_date <= to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')) AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p.journal_places) item WHERE item->>'day' > to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')) AND (p.title ILIKE ${pattern} OR p.content ILIKE ${pattern} OR COALESCE(p.place_name,'') ILIKE ${pattern} OR p.journal_places::text ILIKE ${pattern}) ORDER BY p.created_at DESC LIMIT ${take} OFFSET ${offset}`
          : await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id AND c.moderation_status='active') comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.moderation_status='active' AND p.author_id <> 'wave-seed' AND (p.visit_date IS NULL OR p.visit_date <= to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')) AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p.journal_places) item WHERE item->>'day' > to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')) ORDER BY p.created_at DESC LIMIT ${take} OFFSET ${offset}`;
  const typedRows = rows as CommunityRow[];
  return { posts: typedRows.slice(0, limit).map((row) => mapCommunityPost(row, userId)), page, hasMore: typedRows.length > limit };
}

export async function getCommunityPost(postId: string, userId: string) {
  const sql = await communityDatabase();
  if (!sql) return null;
  const rows = await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id AND c.moderation_status='active') comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.id=${postId} AND p.moderation_status='active' AND p.author_id <> 'wave-seed' AND (p.visit_date IS NULL OR p.visit_date <= to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')) AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p.journal_places) item WHERE item->>'day' > to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')) LIMIT 1` as CommunityRow[];
  if (!rows[0]) return { missing: true as const };
  const comments = await sql`SELECT * FROM community_comments WHERE post_id=${postId} AND moderation_status='active' ORDER BY created_at ASC` as CommunityRow[];
  return { post: mapCommunityPost(rows[0], userId), comments: comments.map((row) => mapCommunityComment(row, userId)) };
}
