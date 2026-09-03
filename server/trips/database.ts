import { neon } from "@neondatabase/serverless";
import { createSchemaBootstrap } from "../../lib/schema-bootstrap.js";
import { FEEDBACK_RETENTION_MS, SCHEDULED_SWEEP_LIMIT } from "../../lib/trips/retention.js";
import { securePostgresUrl } from "../../lib/deployment/environment-validation.js";

const createSql = (url: string) => neon(url);
export type TripSql = ReturnType<typeof createSql>;

/**
 * 런타임 DDL은 새 프리뷰 환경을 바로 쓰게 해 주지만, 진실은 `migrations/`에 있다.
 * 요청마다 다시 보내면 실제 작업 전에 왕복이 여러 번 붙으므로 한 번만 실행한다.
 * 성공한 준비만 재사용하고, 일시적인 실패는 다음 요청이 다시 시도한다.
 */
export const ensureTripDatabase = createSchemaBootstrap(async (): Promise<TripSql | null> => {
  const url = typeof process === "undefined" ? null : securePostgresUrl(process.env.DATABASE_URL, {
    allowLocalhost: process.env.NODE_ENV !== "production",
  });
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
});

/**
 * 보관 기간이 지난 공유 여행을 실제로 지운다. 읽을 때 걸러내기만 하면 행은
 * 영원히 남는다. 예약 작업과 저장 요청 두 곳에서 도는데, 저장 요청은 사람이
 * 응답을 기다리는 경로다. 그래서 한 문장이 지우는 양을 반드시 묶는다.
 * 남은 행은 다음 정리가 이어서 지운다.
 */
export async function sweepExpiredTrips(sql: TripSql, now = Date.now(), limit = SCHEDULED_SWEEP_LIMIT) {
  const rows = await sql`DELETE FROM itineraries WHERE id IN (
    SELECT id FROM itineraries WHERE expires_at <= ${now} ORDER BY expires_at LIMIT ${limit}
  ) RETURNING id` as Array<{ id: string }>;
  return rows.length;
}

export async function sweepExpiredFeedback(sql: TripSql, now = Date.now(), limit = SCHEDULED_SWEEP_LIMIT) {
  const cutoff = now - FEEDBACK_RETENTION_MS;
  const rows = await sql`DELETE FROM place_feedback WHERE id IN (
    SELECT id FROM place_feedback WHERE created_at <= ${cutoff} ORDER BY created_at LIMIT ${limit}
  ) RETURNING id` as Array<{ id: string }>;
  return rows.length;
}
