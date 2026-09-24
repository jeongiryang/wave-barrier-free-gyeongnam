import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { neon } from "@neondatabase/serverless";
import { matchesProductionDatabase } from "../lib/deployment/database-preflight.js";
import { securePostgresUrl } from "../lib/deployment/environment-validation.js";
import { splitMigrationStatements } from "../lib/deployment/migrations.js";
import {
  COMMUNITY_DEMO_BATCH,
  COMMUNITY_DEMO_PRODUCTION_TARGET,
  COMMUNITY_DEMO_SNAPSHOT_SQL,
  normalizeDemoSnapshot,
  preservationAssertionSql,
  preservationValues,
  productionTargetMatches,
  snapshotParams,
} from "../lib/deployment/community-demo-operation.js";

const DATA_URL = new URL("../data/community-demo-wave-2026-v1.json", import.meta.url);
const MIGRATION_URL = new URL("../migrations/019_community_demo_metadata.sql", import.meta.url);
const EXPECTED_REGIONS = ["창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", "의령", "함안", "창녕", "고성", "남해", "하동", "산청", "함양", "거창", "합천"];
const EXPECTED_CATEGORIES = ["general", "place", "review", "tips", "together", "travel-talk"];
const args = new Set(process.argv.slice(2));
const valueArg = (name) => process.argv.slice(2).find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) || "";

export async function readDemoData() {
  return JSON.parse(await readFile(DATA_URL, "utf8"));
}

export async function demoFixtureSha256() {
  return createHash("sha256").update(await readFile(DATA_URL)).digest("hex");
}

export function validateDemoData(data) {
  const errors = [];
  if (data?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (data?.batch?.id !== COMMUNITY_DEMO_BATCH.id || data?.batch?.ownerKey !== COMMUNITY_DEMO_BATCH.ownerKey
    || data?.batch?.label !== COMMUNITY_DEMO_BATCH.label) errors.push("batch metadata does not match the approved fixture");
  const posts = Array.isArray(data?.posts) ? data.posts : [];
  const comments = Array.isArray(data?.comments) ? data.comments : [];
  if (posts.length !== 360) errors.push(`expected 360 posts, received ${posts.length}`);
  if (comments.length !== 720) errors.push(`expected 720 comments, received ${comments.length}`);
  const postIds = new Set(posts.map((post) => post.id));
  const commentIds = new Set(comments.map((comment) => comment.id));
  if (postIds.size !== posts.length) errors.push("post IDs must be unique");
  if (commentIds.size !== comments.length) errors.push("comment IDs must be unique");
  if (new Set(posts.map((post) => post.title)).size !== posts.length) errors.push("post titles must be unique");
  if (new Set(posts.map((post) => post.content)).size !== posts.length) errors.push("post bodies must be unique");
  if (new Set(comments.map((comment) => comment.content)).size !== comments.length) errors.push("comments must be unique");

  const byRegion = Object.fromEntries(EXPECTED_REGIONS.map((region) => [region, 0]));
  const byCategory = Object.fromEntries(EXPECTED_CATEGORIES.map((category) => [category, 0]));
  const postById = new Map();
  for (const post of posts) {
    if (!(post.region in byRegion)) errors.push(`unsupported region: ${post.region}`); else byRegion[post.region] += 1;
    if (!(post.category in byCategory)) errors.push(`unsupported category: ${post.category}`); else byCategory[post.category] += 1;
    if (post.demoBatchId !== data.batch.id || !String(post.authorId).startsWith("wave-demo-author-") || !String(post.authorName).startsWith("데모 여행자 ")) errors.push(`post ${post.id} is not batch-owned`);
    if (typeof post.content !== "string" || !post.content.trim()) errors.push(`post ${post.id} has empty content`);
    if (!Number.isSafeInteger(post.demoLikeCount) || post.demoLikeCount < 0 || post.demoLikeCount > 48) errors.push(`post ${post.id} has an invalid demoLikeCount`);
    if (!String(post.title).startsWith("[시연] ") || String(post.title).length > 120) errors.push(`post ${post.id} must have a valid [시연] title`);
    if (![post.placeId, post.placeName, post.visitDate].every((value) => value === null) || post.fieldReports?.length || post.journalPlaces?.length || post.visitPhotos?.length) errors.push(`post ${post.id} contains unsupported factual fields`);
    if (!Number.isSafeInteger(post.createdAt) || post.createdAt !== post.updatedAt || post.createdAt > Date.UTC(2026, 8, 20, 23, 59, 59)) errors.push(`post ${post.id} has an invalid timestamp`);
    postById.set(post.id, post);
  }
  for (const [region, count] of Object.entries(byRegion)) if (count !== 20) errors.push(`${region} must have 20 posts`);
  for (const [category, count] of Object.entries(byCategory)) if (count === 0) errors.push(`${category} must have at least one coherent example`);

  const commentsPerPost = new Map(posts.map((post) => [post.id, 0]));
  for (const comment of comments) {
    const parent = postById.get(comment.postId);
    if (!parent) errors.push(`comment ${comment.id} has no parent post`);
    else {
      commentsPerPost.set(comment.postId, commentsPerPost.get(comment.postId) + 1);
      if (!(comment.createdAt > parent.createdAt) || comment.updatedAt !== comment.createdAt) errors.push(`comment ${comment.id} is not chronological`);
    }
    if (!Number.isSafeInteger(comment.createdAt) || comment.createdAt > Date.UTC(2026, 8, 20, 23, 59, 59)) errors.push(`comment ${comment.id} has an invalid timestamp`);
    if (typeof comment.content !== "string" || !comment.content.trim()) errors.push(`comment ${comment.id} has empty content`);
    if (comment.demoBatchId !== data.batch.id || !String(comment.authorId).startsWith("wave-demo-commenter-") || !String(comment.authorName).startsWith("데모 답글 ")) errors.push(`comment ${comment.id} is not batch-owned`);
  }
  for (const [postId, count] of commentsPerPost) if (count > 8) errors.push(`${postId} must have at most 8 demo comments`);
  if (new Set(commentsPerPost.values()).size < 6) errors.push("demo comment counts must demonstrate varied sorting");
  return { ok: errors.length === 0, errors, summary: { posts: posts.length, comments: comments.length, regions: byRegion, categories: byCategory, uniqueTitles: new Set(posts.map((post) => post.title)).size, uniqueBodies: new Set(posts.map((post) => post.content)).size, uniqueComments: new Set(comments.map((comment) => comment.content)).size } };
}

function operationConfig(data) {
  const requested = ["apply", "rollback", "preflight"].filter((mode) => args.has(`--${mode}`));
  if (requested.length !== 1) throw new Error("Choose exactly one operation: --preflight, --apply or --rollback.");
  const mode = requested[0];
  if (valueArg("--batch") !== data.batch.id || valueArg("--owner") !== data.batch.ownerKey) throw new Error("The exact --batch and --owner values are required.");
  const databaseUrl = securePostgresUrl(process.env.DATABASE_URL, { allowLocalhost: true });
  if (!databaseUrl) throw new Error("A safe DATABASE_URL is required for demo database operations.");
  const production = args.has("--production");
  if (production) {
    if (!productionTargetMatches(databaseUrl, valueArg("--target"), process.env.VERCEL_ENV)) {
      throw new Error("The approved production target, --target and VERCEL_ENV do not match.");
    }
    if (mode !== "preflight" && (process.env.WAVE_COMMUNITY_DEMO_WRITE !== "1"
      || process.env.WAVE_COMMUNITY_DEMO_PRODUCTION_WRITE !== COMMUNITY_DEMO_BATCH.id)) {
      throw new Error("The exact production demo write opt-in values are required.");
    }
    return { mode, databaseUrl, production };
  }
  if (mode === "preflight") throw new Error("--preflight is reserved for the explicit --production procedure.");
  if (process.env.WAVE_COMMUNITY_DEMO_WRITE !== "1") throw new Error("Set WAVE_COMMUNITY_DEMO_WRITE=1 to opt in to a demo mutation.");
  if (process.env.VERCEL_ENV === "production" || matchesProductionDatabase(databaseUrl)) throw new Error("Use the explicit --production procedure for the approved production target.");
  const host = new URL(databaseUrl).hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!local && !args.has("--allow-remote")) throw new Error("Remote demo mutations require the explicit --allow-remote flag.");
  return { mode, databaseUrl, production };
}

function insertQuery(table, columns, rows, casts = {}) {
  const params = [];
  const values = rows.map((row) => `(${columns.map((column) => {
    params.push(row[column]);
    return `$${params.length}${casts[column] || ""}`;
  }).join(",")})`).join(",");
  return { text: `INSERT INTO ${table} (${columns.map((column) => column.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)).join(",")}) VALUES ${values}` , params };
}

export async function applyDemo(sql, data, options = {}) {
  if (!options.requireExistingSchema) {
    const migration = splitMigrationStatements(await readFile(MIGRATION_URL, "utf8"));
    await sql.transaction(migration.map((statement) => sql.query(statement)));
  }
  const inspected = options.preflight || await inspectCommunityDemoDatabase(sql, data, options);
  if (!inspected.ok) throw new Error("community-demo-preflight-failed");
  const before = inspected.snapshot;
  const postIds = data.posts.map((post) => post.id);
  const commentIds = data.comments.map((comment) => comment.id);
  const postColumns = ["id", "authorId", "authorName", "category", "title", "content", "region", "placeId", "placeName", "createdAt", "updatedAt", "moderationStatus", "visitDate", "fieldReports", "journalPlaces", "visitPhotos", "demoBatchId"];
  const commentColumns = ["id", "postId", "authorId", "authorName", "content", "createdAt", "updatedAt", "moderationStatus", "demoBatchId"];
  const snapshot = snapshotParams(data);
  const preserved = preservationValues(before);
  const guardParams = [...snapshot, ...preserved, before.postsBatch, before.commentsBatch, before.batchRows];
  const atomicGuard = `SELECT 1 / ((s.schema_matches AND s.batch_metadata_matches
    AND s.foreign_post_collisions=0 AND s.foreign_comment_collisions=0
    AND s.extra_batch_posts=0 AND s.extra_batch_comments=0
    AND s.posts_non_demo=$7 AND s.posts_non_demo_active=$8
    AND s.comments_non_demo=$9 AND s.comments_non_demo_active=$10
    AND s.real_comments_on_batch_posts=$11 AND s.likes_total=$12
    AND s.likes_on_batch_posts=$13 AND s.reports_total=$14
    AND s.reports_on_batch_posts=$15 AND s.posts_batch=$16
    AND s.comments_batch=$17 AND s.batch_rows=$18)::int) AS safe
    FROM (${COMMUNITY_DEMO_SNAPSHOT_SQL}) s`;
  const preserveParams = [data.batch.id, ...preserved];
  const queries = [
    sql.query("SELECT pg_catalog.set_config('search_path','pg_catalog, public',true)"),
    sql.query("SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext($1))", [data.batch.id]),
    sql.query(atomicGuard, guardParams),
    sql.query("INSERT INTO community_demo_batches (id,owner_key,label,created_at) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING", [data.batch.id, data.batch.ownerKey, data.batch.label, Date.UTC(2026, 8, 20)]),
    sql.query("SELECT 1 / ((EXISTS (SELECT 1 FROM community_demo_batches WHERE id=$1 AND owner_key=$2 AND label=$3 AND created_at=$4))::int) ownership_ok", [data.batch.id, data.batch.ownerKey, data.batch.label, COMMUNITY_DEMO_BATCH.createdAt]),
    sql.query("SELECT 1 / ((NOT EXISTS (SELECT 1 FROM community_posts WHERE id=ANY($1::text[]) AND demo_batch_id IS DISTINCT FROM $2))::int) post_ids_ok", [postIds, data.batch.id]),
    sql.query("SELECT 1 / ((NOT EXISTS (SELECT 1 FROM community_comments WHERE id=ANY($1::text[]) AND demo_batch_id IS DISTINCT FROM $2))::int) comment_ids_ok", [commentIds, data.batch.id]),
    sql.query(`SELECT 1 / ((NOT EXISTS (
      SELECT 1 FROM jsonb_to_recordset($1::jsonb) AS fixture(id text, "postId" text)
      JOIN community_comments c ON c.id=fixture.id
      JOIN community_reports r ON r.target_type='comment' AND r.target_id=c.id
      WHERE c.post_id<>fixture."postId"
    ))::int) reported_comment_parents_ok`, [JSON.stringify(data.comments.map(({ id, postId }) => ({ id, postId })))]),
  ];
  for (let offset = 0; offset < data.posts.length; offset += 20) {
    const query = insertQuery("community_posts", postColumns, data.posts.slice(offset, offset + 20), { fieldReports: "::jsonb", journalPlaces: "::jsonb", visitPhotos: "::jsonb" });
    query.params = query.params.map((value) => Array.isArray(value) ? JSON.stringify(value) : value);
    query.text += " ON CONFLICT (id) DO UPDATE SET author_id=EXCLUDED.author_id,author_name=EXCLUDED.author_name,category=EXCLUDED.category,title=EXCLUDED.title,content=EXCLUDED.content,region=EXCLUDED.region,place_id=EXCLUDED.place_id,place_name=EXCLUDED.place_name,created_at=EXCLUDED.created_at,updated_at=EXCLUDED.updated_at,moderation_status='active',visit_date=EXCLUDED.visit_date,field_reports=EXCLUDED.field_reports,journal_places=EXCLUDED.journal_places,visit_photos=EXCLUDED.visit_photos WHERE community_posts.demo_batch_id=EXCLUDED.demo_batch_id";
    queries.push(sql.query(query.text, query.params));
  }
  for (let offset = 0; offset < data.comments.length; offset += 50) {
    const query = insertQuery("community_comments", commentColumns, data.comments.slice(offset, offset + 50));
    query.text += " ON CONFLICT (id) DO UPDATE SET post_id=EXCLUDED.post_id,author_id=EXCLUDED.author_id,author_name=EXCLUDED.author_name,content=EXCLUDED.content,created_at=EXCLUDED.created_at,updated_at=EXCLUDED.updated_at,moderation_status='active' WHERE community_comments.demo_batch_id=EXCLUDED.demo_batch_id";
    queries.push(sql.query(query.text, query.params));
  }
  queries.push(sql.query(preservationAssertionSql(), preserveParams));
  // Existing interactions have been verified unchanged above. Add only the
  // explicitly requested, namespaced demo likes; never update/delete any like.
  queries.push(sql.query(`INSERT INTO community_likes (post_id,user_id,created_at)
    SELECT p.id, 'wave-demo-like:wave-community-demo-2026-v1:' || n, p.created_at + n * 60000
    FROM jsonb_to_recordset($1::jsonb) AS fixture(id text, "demoLikeCount" integer)
    JOIN community_posts p ON p.id=fixture.id AND p.demo_batch_id=$2
    CROSS JOIN LATERAL generate_series(1,fixture."demoLikeCount") AS n
    WHERE EXISTS (SELECT 1 FROM community_demo_batches WHERE id=$2 AND owner_key=$3)
    ON CONFLICT (post_id,user_id) DO NOTHING`, [JSON.stringify(data.posts.map(({ id, demoLikeCount }) => ({ id, demoLikeCount }))), data.batch.id, data.batch.ownerKey]));
  queries.push(sql.query("SELECT 1 / (((SELECT count(*) FROM community_posts WHERE demo_batch_id=$1)=$2 AND (SELECT count(*) FROM community_posts WHERE demo_batch_id=$1 AND moderation_status='active')=$2 AND (SELECT count(*) FROM community_posts WHERE demo_batch_id=$1 AND title LIKE '[시연] %')=$2 AND (SELECT count(*) FROM community_comments WHERE demo_batch_id=$1)=$3 AND (SELECT count(*) FROM community_comments WHERE demo_batch_id=$1 AND moderation_status='active')=$3)::int) counts_ok", [data.batch.id, COMMUNITY_DEMO_BATCH.posts, COMMUNITY_DEMO_BATCH.comments]));
  queries.push(sql.query(COMMUNITY_DEMO_SNAPSHOT_SQL, snapshot));
  const results = await sql.transaction(queries, { isolationLevel: "Serializable" });
  const after = normalizeDemoSnapshot(results.at(-1)?.[0], { expectedDatabase: options.expectedDatabase });
  if (!after || after.postsBatch !== COMMUNITY_DEMO_BATCH.posts || after.commentsBatch !== COMMUNITY_DEMO_BATCH.comments) {
    throw new Error("community-demo-postflight-failed");
  }
  return { action: "apply", posts: COMMUNITY_DEMO_BATCH.posts, comments: COMMUNITY_DEMO_BATCH.comments, before, after };
}

export async function rollbackDemo(sql, data, options = {}) {
  const table = await sql.query("SELECT to_regclass('public.community_demo_batches') batch_table");
  if (!table[0]?.batch_table) return { action: "rollback", postsHidden: 0, commentsHidden: 0, alreadyAbsent: true };
  const inspected = options.preflight || await inspectCommunityDemoDatabase(sql, data, options);
  if (!inspected.ok) throw new Error("community-demo-preflight-failed");
  const before = inspected.snapshot;
  if (!before.batchRows) return { action: "rollback", postsHidden: 0, commentsHidden: 0, alreadyAbsent: true, before, after: before };
  const snapshot = snapshotParams(data);
  const preserved = preservationValues(before);
  const guardParams = [...snapshot, ...preserved, before.postsBatch, before.commentsBatch, before.batchRows];
  const atomicGuard = `SELECT 1 / ((s.schema_matches AND s.batch_metadata_matches
    AND s.foreign_post_collisions=0 AND s.foreign_comment_collisions=0
    AND s.extra_batch_posts=0 AND s.extra_batch_comments=0
    AND s.posts_non_demo=$7 AND s.posts_non_demo_active=$8
    AND s.comments_non_demo=$9 AND s.comments_non_demo_active=$10
    AND s.real_comments_on_batch_posts=$11 AND s.likes_total=$12
    AND s.likes_on_batch_posts=$13 AND s.reports_total=$14
    AND s.reports_on_batch_posts=$15 AND s.posts_batch=$16
    AND s.comments_batch=$17 AND s.batch_rows=$18)::int) AS safe
    FROM (${COMMUNITY_DEMO_SNAPSHOT_SQL}) s`;
  const results = await sql.transaction([
    sql.query("SELECT pg_catalog.set_config('search_path','pg_catalog, public',true)"),
    sql.query("SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext($1))", [data.batch.id]),
    sql.query(atomicGuard, guardParams),
    sql.query("UPDATE community_comments SET moderation_status='hidden' WHERE demo_batch_id=$1 AND moderation_status<>'hidden' AND EXISTS (SELECT 1 FROM community_demo_batches WHERE id=$1 AND owner_key=$2) RETURNING id", [data.batch.id, data.batch.ownerKey]),
    sql.query("UPDATE community_posts SET moderation_status='hidden' WHERE demo_batch_id=$1 AND moderation_status<>'hidden' AND EXISTS (SELECT 1 FROM community_demo_batches WHERE id=$1 AND owner_key=$2) RETURNING id", [data.batch.id, data.batch.ownerKey]),
    sql.query(preservationAssertionSql(), [data.batch.id, ...preserved]),
    sql.query("SELECT 1 / (((SELECT count(*) FROM community_posts WHERE demo_batch_id=$1)=$2 AND (SELECT count(*) FROM community_posts WHERE demo_batch_id=$1 AND moderation_status='hidden')=$2 AND (SELECT count(*) FROM community_comments WHERE demo_batch_id=$1)=$3 AND (SELECT count(*) FROM community_comments WHERE demo_batch_id=$1 AND moderation_status='hidden')=$3)::int) hidden_ok", [data.batch.id, before.postsBatch, before.commentsBatch]),
    sql.query(COMMUNITY_DEMO_SNAPSHOT_SQL, snapshot),
  ], { isolationLevel: "Serializable" });
  const after = normalizeDemoSnapshot(results.at(-1)?.[0], { expectedDatabase: options.expectedDatabase });
  if (!after || after.postsBatch !== before.postsBatch || after.commentsBatch !== before.commentsBatch) throw new Error("community-demo-postflight-failed");
  return { action: "rollback", postsHidden: results[4].length, commentsHidden: results[3].length, preservedRealInteractions: true, before, after };
}

export async function inspectCommunityDemoDatabase(sql, data, options = {}) {
  try {
    const results = await sql.transaction([
      sql.query("SELECT pg_catalog.set_config('search_path','pg_catalog, public',true),pg_catalog.set_config('statement_timeout','15s',true),pg_catalog.set_config('lock_timeout','2s',true)"),
      sql.query(COMMUNITY_DEMO_SNAPSHOT_SQL, snapshotParams(data)),
    ], { readOnly: true, isolationLevel: "RepeatableRead" });
    const snapshot = normalizeDemoSnapshot(results[1]?.[0], {
      requireReadOnly: true,
      expectedDatabase: options.expectedDatabase,
    });
    return snapshot ? { ok: true, mode: "preflight", readOnly: true, snapshot } : { ok: false, reason: "database-schema-ownership-or-counts-mismatch" };
  } catch {
    return { ok: false, reason: "database-preflight-unavailable" };
  }
}

export async function runProductionDemo(sql, data, {
  mode,
  databaseUrl,
  target = "",
  vercelEnv = "",
  writeOptIn = "",
  productionWriteOptIn = "",
} = {}) {
  const report = validateDemoData(data);
  if (!report.ok) return { ok: false, reason: "fixture-validation-failed" };
  if (!productionTargetMatches(databaseUrl, target, vercelEnv)) return { ok: false, reason: "production-target-mismatch" };
  if (!["preflight", "apply", "rollback"].includes(mode)) return { ok: false, reason: "operation-invalid" };
  if (mode !== "preflight" && (writeOptIn !== "1" || productionWriteOptIn !== COMMUNITY_DEMO_BATCH.id)) {
    return { ok: false, reason: "production-write-opt-in-missing" };
  }
  const options = { requireExistingSchema: true, expectedDatabase: "neondb" };
  const preflight = await inspectCommunityDemoDatabase(sql, data, options);
  if (!preflight.ok) return preflight;
  if (mode === "preflight") return {
    ok: true,
    production: true,
    target: COMMUNITY_DEMO_PRODUCTION_TARGET,
    fixtureSha256: await demoFixtureSha256(),
    batch: data.batch.id,
    ...preflight,
  };
  try {
    const result = mode === "apply"
      ? await applyDemo(sql, data, { ...options, preflight })
      : await rollbackDemo(sql, data, { ...options, preflight });
    return {
      ok: true,
      production: true,
      target: COMMUNITY_DEMO_PRODUCTION_TARGET,
      fixtureSha256: await demoFixtureSha256(),
      batch: data.batch.id,
      ...result,
    };
  } catch {
    return { ok: false, reason: "database-operation-unconfirmed-run-preflight-before-retry" };
  }
}

async function main() {
  const data = await readDemoData();
  const report = validateDemoData(data);
  if (!report.ok) throw new Error(`Demo validation failed:\n${report.errors.join("\n")}`);
  if (args.has("--dry-run")) {
    console.log(JSON.stringify({ ok: true, mode: "dry-run", readOnly: true, fixtureSha256: await demoFixtureSha256(), batch: data.batch, ...report.summary }, null, 2));
    return;
  }
  const { mode, databaseUrl, production } = operationConfig(data);
  const sql = neon(databaseUrl);
  if (production) {
    const result = await runProductionDemo(sql, data, {
      mode,
      databaseUrl,
      target: valueArg("--target"),
      vercelEnv: process.env.VERCEL_ENV,
      writeOptIn: process.env.WAVE_COMMUNITY_DEMO_WRITE,
      productionWriteOptIn: process.env.WAVE_COMMUNITY_DEMO_PRODUCTION_WRITE,
    });
    if (!result.ok) throw new Error(`Community demo production procedure stopped: ${result.reason}.`);
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  let result;
  try {
    result = mode === "apply" ? await applyDemo(sql, data) : await rollbackDemo(sql, data);
  } catch {
    throw new Error("The community demo database operation could not be confirmed. Run the preflight before retrying.");
  }
  console.log(JSON.stringify({ ok: true, production, target: production ? COMMUNITY_DEMO_PRODUCTION_TARGET : "non-production", fixtureSha256: await demoFixtureSha256(), batch: data.batch.id, ...result }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : "Demo command failed."); process.exitCode = 1; });
}
