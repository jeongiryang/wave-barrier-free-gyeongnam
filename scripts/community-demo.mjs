import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { neon } from "@neondatabase/serverless";
import { matchesProductionDatabase } from "../lib/deployment/database-preflight.js";
import { securePostgresUrl } from "../lib/deployment/environment-validation.js";
import { splitMigrationStatements } from "../lib/deployment/migrations.js";

const DATA_URL = new URL("../data/community-demo-wave-2026-v1.json", import.meta.url);
const MIGRATION_URL = new URL("../migrations/019_community_demo_metadata.sql", import.meta.url);
const EXPECTED_REGIONS = ["창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", "의령", "함안", "창녕", "고성", "남해", "하동", "산청", "함양", "거창", "합천"];
const EXPECTED_CATEGORIES = ["general", "place", "review", "tips", "together", "travel-talk"];
const args = new Set(process.argv.slice(2));
const valueArg = (name) => process.argv.slice(2).find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) || "";

export async function readDemoData() {
  return JSON.parse(await readFile(DATA_URL, "utf8"));
}

export function validateDemoData(data) {
  const errors = [];
  if (data?.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!data?.batch?.id || !data?.batch?.ownerKey || !data?.batch?.label) errors.push("batch metadata is incomplete");
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
    if (![post.placeId, post.placeName, post.visitDate].every((value) => value === null) || post.fieldReports?.length || post.journalPlaces?.length || post.visitPhotos?.length) errors.push(`post ${post.id} contains unsupported factual fields`);
    if (!/^(이 글은|합성|화면 검수|시연용|실제 작성자|아래 내용|가상의 여행)/.test(post.content)) errors.push(`post ${post.id} lacks an opening synthetic notice`);
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
    if (comment.demoBatchId !== data.batch.id || !String(comment.authorId).startsWith("wave-demo-commenter-") || !String(comment.authorName).startsWith("데모 답글 ")) errors.push(`comment ${comment.id} is not batch-owned`);
    if (!/^(합성 데모|실제 이용자 답변|가상의 대화|화면 검수용)/.test(comment.content)) errors.push(`comment ${comment.id} lacks an opening synthetic notice`);
  }
  for (const [postId, count] of commentsPerPost) if (count !== 2) errors.push(`${postId} must have 2 comments`);
  return { ok: errors.length === 0, errors, summary: { posts: posts.length, comments: comments.length, regions: byRegion, categories: byCategory, uniqueTitles: new Set(posts.map((post) => post.title)).size, uniqueBodies: new Set(posts.map((post) => post.content)).size, uniqueComments: new Set(comments.map((comment) => comment.content)).size } };
}

function mutationConfig(data) {
  const mode = args.has("--apply") ? "apply" : args.has("--rollback") ? "rollback" : "";
  if (!mode || (args.has("--apply") && args.has("--rollback"))) throw new Error("Choose exactly one mutation: --apply or --rollback.");
  if (process.env.WAVE_COMMUNITY_DEMO_WRITE !== "1") throw new Error("Set WAVE_COMMUNITY_DEMO_WRITE=1 to opt in to a demo mutation.");
  if (valueArg("--batch") !== data.batch.id || valueArg("--owner") !== data.batch.ownerKey) throw new Error("The exact --batch and --owner values are required.");
  const databaseUrl = securePostgresUrl(process.env.DATABASE_URL, { allowLocalhost: true });
  if (!databaseUrl) throw new Error("A safe DATABASE_URL is required for demo mutations.");
  if (process.env.VERCEL_ENV === "production" || matchesProductionDatabase(databaseUrl)) throw new Error("Production demo mutations are prohibited.");
  const host = new URL(databaseUrl).hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!local && !args.has("--allow-remote")) throw new Error("Remote demo mutations require the explicit --allow-remote flag.");
  return { mode, databaseUrl };
}

function insertQuery(table, columns, rows, casts = {}) {
  const params = [];
  const values = rows.map((row) => `(${columns.map((column) => {
    params.push(row[column]);
    return `$${params.length}${casts[column] || ""}`;
  }).join(",")})`).join(",");
  return { text: `INSERT INTO ${table} (${columns.map((column) => column.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)).join(",")}) VALUES ${values}` , params };
}

export async function applyDemo(sql, data) {
  const migration = splitMigrationStatements(await readFile(MIGRATION_URL, "utf8"));
  await sql.transaction(migration.map((statement) => sql.query(statement)));
  const postIds = data.posts.map((post) => post.id);
  const commentIds = data.comments.map((comment) => comment.id);
  const postColumns = ["id", "authorId", "authorName", "category", "title", "content", "region", "placeId", "placeName", "createdAt", "updatedAt", "moderationStatus", "visitDate", "fieldReports", "journalPlaces", "visitPhotos", "demoBatchId"];
  const commentColumns = ["id", "postId", "authorId", "authorName", "content", "createdAt", "updatedAt", "moderationStatus", "demoBatchId"];
  const queries = [
    sql.query("SELECT pg_advisory_xact_lock(hashtext($1))", [data.batch.id]),
    sql.query("INSERT INTO community_demo_batches (id,owner_key,label,created_at) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING", [data.batch.id, data.batch.ownerKey, data.batch.label, Date.UTC(2026, 8, 20)]),
    sql.query("SELECT 1 / CASE WHEN EXISTS (SELECT 1 FROM community_demo_batches WHERE id=$1 AND owner_key=$2) THEN 1 ELSE 0 END ownership_ok", [data.batch.id, data.batch.ownerKey]),
    sql.query("SELECT 1 / CASE WHEN NOT EXISTS (SELECT 1 FROM community_posts WHERE id=ANY($1::text[]) AND demo_batch_id IS DISTINCT FROM $2) THEN 1 ELSE 0 END post_ids_ok", [postIds, data.batch.id]),
    sql.query("SELECT 1 / CASE WHEN NOT EXISTS (SELECT 1 FROM community_comments WHERE id=ANY($1::text[]) AND demo_batch_id IS DISTINCT FROM $2) THEN 1 ELSE 0 END comment_ids_ok", [commentIds, data.batch.id]),
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
  queries.push(sql.query("SELECT 1 / CASE WHEN (SELECT count(*) FROM community_posts WHERE demo_batch_id=$1)=360 AND (SELECT count(*) FROM community_comments WHERE demo_batch_id=$1)=720 THEN 1 ELSE 0 END counts_ok", [data.batch.id]));
  await sql.transaction(queries);
  return { action: "apply", posts: 360, comments: 720 };
}

export async function rollbackDemo(sql, data) {
  const table = await sql.query("SELECT to_regclass('public.community_demo_batches') batch_table");
  if (!table[0]?.batch_table) return { action: "rollback", postsHidden: 0, commentsHidden: 0, alreadyAbsent: true };
  const existing = await sql.query("SELECT owner_key FROM community_demo_batches WHERE id=$1", [data.batch.id]);
  if (!existing[0]) return { action: "rollback", postsHidden: 0, commentsHidden: 0, alreadyAbsent: true };
  if (existing[0].owner_key !== data.batch.ownerKey) throw new Error("The demo batch ID belongs to a different owner.");
  const results = await sql.transaction([
    sql.query("UPDATE community_comments SET moderation_status='hidden' WHERE demo_batch_id=$1 AND moderation_status<>'hidden' AND EXISTS (SELECT 1 FROM community_demo_batches WHERE id=$1 AND owner_key=$2) RETURNING id", [data.batch.id, data.batch.ownerKey]),
    sql.query("UPDATE community_posts SET moderation_status='hidden' WHERE demo_batch_id=$1 AND moderation_status<>'hidden' AND EXISTS (SELECT 1 FROM community_demo_batches WHERE id=$1 AND owner_key=$2) RETURNING id", [data.batch.id, data.batch.ownerKey]),
  ]);
  return { action: "rollback", postsHidden: results[1].length, commentsHidden: results[0].length, preservedRealInteractions: true };
}

async function main() {
  const data = await readDemoData();
  const report = validateDemoData(data);
  if (!report.ok) throw new Error(`Demo validation failed:\n${report.errors.join("\n")}`);
  if (args.has("--dry-run")) {
    console.log(JSON.stringify({ ok: true, mode: "dry-run", readOnly: true, batch: data.batch, ...report.summary }, null, 2));
    return;
  }
  const { mode, databaseUrl } = mutationConfig(data);
  const sql = neon(databaseUrl);
  const result = mode === "apply" ? await applyDemo(sql, data) : await rollbackDemo(sql, data);
  console.log(JSON.stringify({ ok: true, batch: data.batch.id, ...result }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : "Demo command failed."); process.exitCode = 1; });
}
