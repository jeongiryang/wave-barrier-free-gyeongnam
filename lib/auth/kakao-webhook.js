import { neon } from "@neondatabase/serverless";
import { securePostgresUrl } from "../deployment/environment-validation.js";
import { validKakaoWebhook } from "./kakao-lifecycle.js";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const response = (status) => new Response(null, { status, headers });

/** External unlink revokes Kakao credentials/sessions; the verified email can recover WAVE. */
export async function disconnectKakaoAccount(accountId, databaseUrl) {
  const connectionString = securePostgresUrl(databaseUrl);
  if (!connectionString) throw new Error("AUTH_DATABASE_NOT_CONFIGURED");
  const sql = neon(connectionString, { fetchOptions: { signal: AbortSignal.timeout(2_500) } });
  await sql.transaction([
    sql`SET LOCAL statement_timeout = '1500ms'`,
    sql`WITH affected AS MATERIALIZED (
      SELECT "userId" FROM neon_auth.account WHERE "providerId"='kakao' AND "accountId"=${accountId} FOR UPDATE
    ), revoked AS (
      DELETE FROM neon_auth.session WHERE "userId" IN (SELECT "userId" FROM affected) RETURNING id
    ) DELETE FROM neon_auth.account WHERE "providerId"='kakao' AND "accountId"=${accountId}`,
  ]);
}

export async function kakaoUnlinkWebhook(request, env = process.env, disconnect = disconnectKakaoAccount) {
  if (env.WAVE_AUTH_BACKEND !== "native") return response(503);
  // Authenticate before consuming the body or connecting to the database.
  const auth = request.headers.get("authorization");
  const probe = new URLSearchParams({ app_id: "1539906", user_id: "1" });
  if (!validKakaoWebhook(auth, probe, env.KAKAO_PRIMARY_ADMIN_KEY)) return response(401);
  let params;
  if (request.method === "GET") {
    if (request.url.length > 2_048) return response(413);
    params = new URL(request.url).searchParams;
  } else if (request.method === "POST") {
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) return response(415);
    const reader = request.body?.getReader();
    let size = 0;
    const chunks = [];
    if (reader) {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > 2_048) { void reader.cancel(); return response(413); }
          chunks.push(value);
        }
      } catch { return response(400); }
    }
    params = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
  } else return response(405);
  if (!validKakaoWebhook(auth, params, env.KAKAO_PRIMARY_ADMIN_KEY)) return response(400);
  try {
    await disconnect(params.get("user_id"), env.DATABASE_URL);
    return response(200);
  } catch { return response(503); }
}
