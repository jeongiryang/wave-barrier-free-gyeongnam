import { ensureTripDatabase } from "./database";
import { createSchemaBootstrap } from "../../lib/schema-bootstrap.js";
export const experienceDatabase = createSchemaBootstrap(async () => {
  const sql = await ensureTripDatabase();
  if (!sql) return null;
  await sql`CREATE TABLE IF NOT EXISTS wave_observations (id TEXT PRIMARY KEY, author_id TEXT NOT NULL, place_id TEXT NOT NULL, observed_at BIGINT NOT NULL, created_at BIGINT NOT NULL, readings JSONB NOT NULL)`;
  await sql`CREATE INDEX IF NOT EXISTS wave_observations_place_idx ON wave_observations (place_id, observed_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS wave_observations_author_idx ON wave_observations (author_id, created_at DESC)`;
  await sql`CREATE TABLE IF NOT EXISTS wave_companions (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload JSONB NOT NULL, tokens JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 1, created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL, revoked BOOLEAN NOT NULL DEFAULT FALSE)`;
  await sql`CREATE INDEX IF NOT EXISTS wave_companions_expiry_idx ON wave_companions (expires_at)`;
  await sql`CREATE INDEX IF NOT EXISTS wave_companions_owner_idx ON wave_companions (owner_id, created_at DESC)`;
  return sql;
});
export async function sweepExperience() {
  const sql = await experienceDatabase();
  if (!sql) return;
  const now = Date.now();
  await sql`DELETE FROM wave_observations WHERE id IN (SELECT id FROM wave_observations WHERE created_at < ${now - 86400000} ORDER BY created_at LIMIT 500)`;
  await sql`DELETE FROM wave_companions WHERE id IN (SELECT id FROM wave_companions WHERE expires_at <= ${now} ORDER BY expires_at LIMIT 500)`;
}
