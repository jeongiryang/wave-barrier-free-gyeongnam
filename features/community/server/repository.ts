import { neon } from "@neondatabase/serverless";

type Row = Record<string, unknown>;
type PostValue = { category: string; title: string; content: string; region: string | null; placeId: string | null; placeName: string | null };
type ListFilters = { category: string; search: string; placeId: string; page: number; limit: number; offset: number };

const createSql = (url: string) => neon(url);
type Sql = ReturnType<typeof createSql>;
let schemaReady: Promise<Sql | null> | null = null;

/** Runtime DDL keeps fresh previews usable; the migration remains the source of truth. */
export async function communityDatabase() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) return null;
    const sql = createSql(databaseUrl);
    await sql`CREATE TABLE IF NOT EXISTS community_posts (id TEXT PRIMARY KEY, author_id TEXT NOT NULL, author_name TEXT NOT NULL, category TEXT NOT NULL CHECK (category IN ('general', 'place', 'review')), title VARCHAR(120) NOT NULL, content TEXT NOT NULL, region VARCHAR(20), place_id VARCHAR(100), place_name VARCHAR(120), created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL, CHECK ((place_id IS NULL AND place_name IS NULL) OR (place_id IS NOT NULL AND place_name IS NOT NULL)))`;
    await sql`CREATE TABLE IF NOT EXISTS community_comments (id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE, author_id TEXT NOT NULL, author_name TEXT NOT NULL, content VARCHAR(1000) NOT NULL, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS community_likes (post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE, user_id TEXT NOT NULL, created_at BIGINT NOT NULL, PRIMARY KEY (post_id, user_id))`;
    await sql`CREATE INDEX IF NOT EXISTS community_posts_created_idx ON community_posts (created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS community_posts_category_created_idx ON community_posts (category, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS community_posts_place_created_idx ON community_posts (place_id, created_at DESC) WHERE place_id IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS community_posts_author_created_idx ON community_posts (author_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS community_comments_post_created_idx ON community_comments (post_id, created_at ASC)`;
    await sql`CREATE INDEX IF NOT EXISTS community_comments_author_created_idx ON community_comments (author_id, created_at DESC)`;
    return sql;
  })();
  return schemaReady;
}

function mappedPost(row: Row, userId = "") {
  return { id: String(row.id), category: String(row.category), title: String(row.title), content: String(row.content), region: row.region ? String(row.region) : null, placeId: row.place_id ? String(row.place_id) : null, placeName: row.place_name ? String(row.place_name) : null, authorName: String(row.author_name), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at), commentCount: Number(row.comment_count || 0), likeCount: Number(row.like_count || 0), likedByMe: Boolean(row.liked_by_me), isOwner: Boolean(userId && row.author_id === userId) };
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
  const typedRows = rows as Row[];
  return { posts: typedRows.slice(0, limit).map((row) => mappedPost(row, userId)), page, hasMore: typedRows.length > limit };
}

export async function getCommunityPost(postId: string, userId: string) {
  const sql = await communityDatabase();
  if (!sql) return null;
  const rows = await sql`SELECT p.*, (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id) comment_count, (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) like_count, EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id=p.id AND l.user_id=${userId}) liked_by_me FROM community_posts p WHERE p.id=${postId} LIMIT 1` as Row[];
  if (!rows[0]) return { missing: true as const };
  const comments = await sql`SELECT * FROM community_comments WHERE post_id=${postId} ORDER BY created_at ASC` as Row[];
  return { post: mappedPost(rows[0], userId), comments: comments.map((row) => ({ id: String(row.id), content: String(row.content), authorName: String(row.author_name), createdAt: Number(row.created_at), updatedAt: Number(row.updated_at), isOwner: Boolean(userId && row.author_id === userId) })) };
}

async function ownership(table: "community_posts" | "community_comments", id: string, userId: string, postId = "") {
  const sql = await communityDatabase();
  if (!sql) return "unavailable" as const;
  const rows = table === "community_posts"
    ? await sql`SELECT author_id FROM community_posts WHERE id=${id} LIMIT 1` as Row[]
    : await sql`SELECT author_id FROM community_comments WHERE id=${id} AND post_id=${postId} LIMIT 1` as Row[];
  if (!rows[0]) return "missing" as const;
  return rows[0].author_id === userId ? "owner" as const : "forbidden" as const;
}

export const postOwnership = (postId: string, userId: string) => ownership("community_posts", postId, userId);
export const commentOwnership = (postId: string, commentId: string, userId: string) => ownership("community_comments", commentId, userId, postId);

export async function createCommunityPost(userId: string, name: string, value: PostValue) {
  const sql = await communityDatabase();
  if (!sql) return { unavailable: true as const };
  const recent = await sql`SELECT COUNT(*) count FROM community_posts WHERE author_id=${userId} AND created_at>${Date.now() - 600000}` as Row[];
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

export async function createCommunityComment(postId: string, userId: string, name: string, content: string) {
  const sql = await communityDatabase();
  if (!sql) return { unavailable: true as const };
  const posts = await sql`SELECT id FROM community_posts WHERE id=${postId}` as Row[];
  if (!posts[0]) return { missing: true as const };
  const recent = await sql`SELECT COUNT(*) count FROM community_comments WHERE author_id=${userId} AND created_at>${Date.now() - 600000}` as Row[];
  if (Number(recent[0]?.count || 0) >= 20) return { rateLimited: true as const };
  const id = crypto.randomUUID();
  const now = Date.now();
  await sql`INSERT INTO community_comments (id,post_id,author_id,author_name,content,created_at,updated_at) VALUES (${id},${postId},${userId},${name},${content},${now},${now})`;
  return { id };
}

export async function updateCommunityComment(postId: string, commentId: string, userId: string, content: string) {
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

export async function setCommunityLike(postId: string, userId: string, remove: boolean) {
  const sql = await communityDatabase();
  if (!sql) return { unavailable: true as const };
  const posts = await sql`SELECT id FROM community_posts WHERE id=${postId}` as Row[];
  if (!posts[0]) return { missing: true as const };
  if (remove) {
    await sql`DELETE FROM community_likes WHERE post_id=${postId} AND user_id=${userId}`;
  } else {
    await sql`INSERT INTO community_likes (post_id,user_id,created_at) VALUES (${postId},${userId},${Date.now()}) ON CONFLICT (post_id,user_id) DO NOTHING`;
  }
  const count = await sql`SELECT COUNT(*) count FROM community_likes WHERE post_id=${postId}` as Row[];
  return { liked: !remove, likeCount: Number(count[0]?.count || 0) };
}
