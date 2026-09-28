import { neon } from "@neondatabase/serverless";
import { securePostgresUrl } from "../../../lib/deployment/environment-validation.js";
import { json } from "../../../server/shared/http";

export async function GET() {
  const url = securePostgresUrl(process.env.DATABASE_URL, { allowLocalhost: process.env.NODE_ENV !== "production" });
  if (!url) return json({ error: "시연 일정을 불러올 수 없습니다." }, 503);
  try {
    const sql = neon(url);
    const trips = await sql`SELECT id, title, region, theme, note, profile_keys AS "profileKeys", place_ids AS "placeIds", day_offsets AS "dayOffsets", visit_minutes AS "visitMinutes", break_minutes AS "breakMinutes" FROM judge_demo_trips ORDER BY sort_order LIMIT 8`;
    return json({ trips }, 200, true);
  } catch {
    return json({ error: "시연 일정을 불러올 수 없습니다." }, 503);
  }
}
