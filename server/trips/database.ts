import { neon } from "@neondatabase/serverless";

const createSql = (url: string) => neon(url);
export type TripSql = ReturnType<typeof createSql>;
let schemaReady: Promise<TripSql | null> | null = null;

/**
 * 런타임 DDL은 새 프리뷰 환경을 바로 쓰게 해 주지만, 진실은 `migrations/`에 있다.
 * 요청마다 다시 보내면 실제 작업 전에 왕복이 여러 번 붙으므로 한 번만 실행한다.
 */
export async function ensureTripDatabase() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
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
  })();
  return schemaReady;
}

/**
 * 보관 기간이 지난 공유 여행을 실제로 지운다. 읽을 때 걸러내기만 하면 행은
 * 영원히 남는다. 저장 요청에 얹어 조금씩 지우므로 별도 스케줄러가 필요 없고,
 * 한 요청이 오래 붙잡히지 않도록 한 번에 지우는 양을 제한한다.
 */
export async function sweepExpiredTrips(sql: TripSql, now = Date.now()) {
  const rows = await sql`DELETE FROM itineraries WHERE expires_at <= ${now} RETURNING id` as Array<{ id: string }>;
  return rows.length;
}
