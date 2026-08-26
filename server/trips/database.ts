import { neon } from "@neondatabase/serverless";

const createSql = (url: string) => neon(url);
export type TripSql = ReturnType<typeof createSql>;

export async function ensureTripDatabase() {
  const url = typeof process === "undefined" ? "" : process.env.DATABASE_URL?.trim();
  if (!url) return null;
  const sql = createSql(url);
  await sql`CREATE TABLE IF NOT EXISTS itineraries (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS itineraries_expires_idx ON itineraries (expires_at)`;
  await sql`CREATE INDEX IF NOT EXISTS itineraries_created_idx ON itineraries (created_at)`;
  await sql`CREATE TABLE IF NOT EXISTS place_feedback (
    id TEXT PRIMARY KEY,
    place_id TEXT NOT NULL,
    place_name TEXT NOT NULL,
    field TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    created_at BIGINT NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS place_feedback_created_idx ON place_feedback (created_at)`;
  return sql;
}
