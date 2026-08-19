import { communityDatabase, type CommunityRow } from "./database";
import type { ListFilters, PostValue } from "./types";

function mappedPost(row: CommunityRow, userId = "") {
  return {
    id: String(row.id),
    category: String(row.category),
    title: String(row.title),
    content: String(row.content),
    region: row.region ? String(row.region) : null,
    placeId: row.place_id ? String(row.place_id) : null,
    placeName: row.place_name ? String(row.place_name) : null,
    authorName: String(row.author_name),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    commentCount: Number(row.comment_count || 0),
    likeCount: Number(row.like_count || 0),
    likedByMe: Boolean(row.liked_by_me),
    isOwner: Boolean(userId && row.author_id === userId),
  };
}

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
  return {
    posts: typedRows.slice(0, limit).map((row) => mappedPost(row, userId)),
    page,
    hasMore: typedRows.length > limit,
  };
}

export async function getCommunityPost(postId: string, userId: string) {
  const sql = await communityDatabase();
  if (!sql) return null;
  const rows = await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id) comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.id=${postId} LIMIT 1` as CommunityRow[];
  if (!rows[0]) return { missing: true as const };
  const comments = await sql`SELECT * FROM community_comments WHERE post_id=${postId} ORDER BY created_at ASC` as CommunityRow[];
  return {
    post: mappedPost(rows[0], userId),
    comments: comments.map((row) => ({
      id: String(row.id),
      content: String(row.content),
      authorName: String(row.author_name),
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      isOwner: Boolean(userId && row.author_id === userId),
    })),
  };
}

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
