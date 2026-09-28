import { neon } from "@neondatabase/serverless";
import { securePostgresUrl } from "../../../lib/deployment/environment-validation.js";
import { json } from "../../../server/shared/http";

export async function GET() {
  const url = securePostgresUrl(process.env.DATABASE_URL, { allowLocalhost: process.env.NODE_ENV !== "production" });
  if (!url) return json({ error: "시연 사진을 불러올 수 없습니다." }, 503);
  try {
    const sql = neon(url);
    const photos = await sql`SELECT file_name AS "fileName", caption FROM judge_demo_photos ORDER BY sort_order LIMIT 8`;
    return json({ photos }, 200, true);
  } catch {
    return json({ error: "시연 사진을 불러올 수 없습니다." }, 503);
  }
}
