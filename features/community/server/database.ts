import { neon } from "@neondatabase/serverless";

export type CommunityRow = Record<string, unknown>;
const createSql = (url: string) => neon(url);
export type CommunitySql = ReturnType<typeof createSql>;
let schemaReady: Promise<CommunitySql | null> | null = null;

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
