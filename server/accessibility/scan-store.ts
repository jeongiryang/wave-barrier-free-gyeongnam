import { neon } from "@neondatabase/serverless";

/**
 * 현장 판독 결과 보관.
 *
 * 저장하는 것은 W.A.V.E가 만든 판정값뿐이다. 한국관광공사 응답과 사용자가 올린
 * 사진 원본은 저장하지 않는다. 사진은 같은 장면인지 알아보기 위한 해시만 남기고
 * 바이트는 응답 직후 버린다. DATABASE_URL이 없으면 저장을 건너뛰되 분석 결과는
 * 그대로 돌려준다. 보관은 부가 기능이고 판독이 본 기능이기 때문이다.
 */

export type StoredScan = { id: string; stored: boolean };

async function connect() {
  const url = typeof process === "undefined" ? "" : process.env.DATABASE_URL?.trim();
  if (!url) return null;
  const sql = neon(url);
  await sql`CREATE TABLE IF NOT EXISTS accessibility_scan (
    id TEXT PRIMARY KEY,
    place_id TEXT NOT NULL,
    place_name TEXT NOT NULL,
    image_digest TEXT NOT NULL,
    scene_description TEXT NOT NULL DEFAULT '',
    scan_result JSONB NOT NULL,
    confidence REAL,
    verification_status TEXT NOT NULL DEFAULT 'pending',
    created_at BIGINT NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS accessibility_scan_place_idx ON accessibility_scan (place_id)`;
  return sql;
}

/** 사진 바이트를 남기지 않기 위해 내용 해시만 계산한다. */
export async function digestImage(base64: string) {
  const bytes = new TextEncoder().encode(base64);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export async function saveScan(
  { placeId, placeName, imageDigest, analysis }: { placeId: string; placeName: string; imageDigest: string; analysis: { sceneDescription: string; overallConfidence: number | null } },
): Promise<StoredScan> {
  const id = crypto.randomUUID();
  const sql = await connect().catch(() => null);
  if (!sql) return { id, stored: false };
  try {
    await sql`INSERT INTO accessibility_scan (id, place_id, place_name, image_digest, scene_description, scan_result, confidence, verification_status, created_at)
      VALUES (${id}, ${placeId}, ${placeName}, ${imageDigest}, ${analysis.sceneDescription}, ${JSON.stringify(analysis)}::jsonb, ${analysis.overallConfidence}, 'pending', ${Date.now()})`;
    return { id, stored: true };
  } catch {
    // 보관 실패가 판독 결과 전달을 막지 않는다.
    return { id, stored: false };
  }
}
