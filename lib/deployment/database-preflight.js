import { securePostgresUrl } from "./environment-validation.js";

// Non-secret identifiers verified in the authenticated Neon console. Changing the
// production branch requires a reviewed operation change, not a request parameter.
export const PRODUCTION_DATABASE_TARGET = Object.freeze({
  project: "icy-poetry-45639585",
  branch: "br-super-sun-azshacj4",
  endpoint: "ep-nameless-voice-azo6m14c",
  database: "neondb",
});

export function matchesProductionDatabase(value) {
  const secure = securePostgresUrl(value);
  if (!secure) return false;
  const url = new URL(secure);
  const labels = url.hostname.split(".");
  return [PRODUCTION_DATABASE_TARGET.endpoint, `${PRODUCTION_DATABASE_TARGET.endpoint}-pooler`].includes(labels[0])
    && labels.length >= 4 && labels.slice(-2).join(".") === "neon.tech"
    && url.pathname === `/${PRODUCTION_DATABASE_TARGET.database}`;
}

export const DATABASE_PREFLIGHT_SQL = `
SELECT current_database() AS database_name,
  current_setting('transaction_read_only') AS read_only,
  (SELECT count(*) = 3 FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'community_posts'
     AND ((column_name = 'visit_date' AND udt_name = 'varchar')
       OR (column_name = 'journal_places' AND udt_name = 'jsonb' AND is_nullable = 'NO')
       OR (column_name = 'moderation_status' AND udt_name = 'varchar' AND is_nullable = 'NO'))) AS schema_matches,
  count(*) AS total_posts,
  count(*) FILTER (WHERE moderation_status = 'active') AS active_posts,
  count(*) FILTER (WHERE jsonb_typeof(journal_places) IS DISTINCT FROM 'array') AS non_array_journals,
  count(*) FILTER (WHERE moderation_status = 'active' AND (
    visit_date > to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')
    OR EXISTS (SELECT 1 FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(journal_places) = 'array' THEN journal_places ELSE '[]'::jsonb END
    ) item WHERE item->>'day' > to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD'))
  )) AS affected_008
FROM public.community_posts`;

/** A server-enforced READ ONLY transaction; never returns connection/user data. */
export async function inspectProductionDatabase(sql, databaseUrl) {
  if (!matchesProductionDatabase(databaseUrl)) return { ok: false, reason: "database-target-mismatch" };
  try {
    const results = await sql.transaction([
      sql.query("SELECT set_config('statement_timeout', '10s', true), set_config('lock_timeout', '2s', true)"),
      sql.query(DATABASE_PREFLIGHT_SQL),
    ], { readOnly: true, isolationLevel: "RepeatableRead" });
    const row = results[1]?.[0];
    if (!row || row.database_name !== PRODUCTION_DATABASE_TARGET.database || row.read_only !== "on"
      || row.schema_matches !== true || Number(row.non_array_journals) !== 0) {
      return { ok: false, reason: "database-schema-or-readonly-mismatch" };
    }
    const counts = [row.total_posts, row.active_posts, row.affected_008].map(Number);
    if (counts.some((value) => !Number.isSafeInteger(value) || value < 0)
      || counts[2] > counts[1] || counts[1] > counts[0]) {
      return { ok: false, reason: "database-counts-invalid" };
    }
    return {
      ok: true, mode: "inspect", readOnly: true, target: PRODUCTION_DATABASE_TARGET,
      totalPosts: counts[0], activePosts: counts[1], affected008: counts[2],
      checkedAt: new Date().toISOString(),
    };
  } catch {
    // Provider errors may contain SQL, user content or the connection string.
    return { ok: false, reason: "database-preflight-unavailable" };
  }
}
