import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { demoFixtureSha256, readDemoData, runProductionDemo, validateDemoData } from "../scripts/community-demo.mjs";
import { COMMUNITY_DEMO_PRODUCTION_TARGET } from "../lib/deployment/community-demo-operation.js";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("demo corpus has exact regional distribution, unique conversations and no factual evidence fields", async () => {
  const data = await readDemoData();
  const report = validateDemoData(data);
  assert.deepEqual(report.errors, []);
  assert.equal(report.summary.posts, 360);
  assert.equal(report.summary.comments, 720);
  assert.equal(report.summary.uniqueTitles, 360);
  assert.equal(report.summary.uniqueBodies, 360);
  assert.equal(report.summary.uniqueComments, 720);
  assert.deepEqual(new Set(Object.values(report.summary.regions)), new Set([20]));
  assert.equal(Object.values(report.summary.categories).reduce((total, count) => total + count, 0), 360);
  assert.ok(Object.values(report.summary.categories).every((count) => count > 0));
  assert.ok(data.posts.every((post) => post.category !== "field-report" && post.placeId === null && post.visitDate === null));
  assert.ok(data.posts.every((post) => post.createdAt <= Date.UTC(2026, 8, 20, 23, 59, 59)));
  assert.ok(data.comments.every((comment) => comment.createdAt <= Date.UTC(2026, 8, 20, 23, 59, 59)));
  assert.equal("likes" in data, false);
});

test("all 18 regions include practical varied topics with coherent synthetic replies", async () => {
  const data = await readDemoData();
  const topicWords = ["충전", "부모님", "사진", "하루와 이틀", "짐", "간식", "앨범", "속도", "유모차", "기념품", "신발", "늦잠", "식사", "가방", "일기", "음악", "취소", "겉옷", "투표", "영수증"];
  for (const region of Object.keys(validateDemoData(data).summary.regions)) {
    const regional = data.posts.filter((post) => post.region === region);
    assert.equal(regional.length, 20);
    assert.ok(topicWords.every((word) => regional.some((post) => post.title.includes(word))));
    const sample = regional.find((post) => post.category === "review");
    assert.ok(sample && /여행|사진|일정|가방|동행/.test(sample.content));
    const replies = data.comments.filter((comment) => comment.postId === sample.id);
    assert.equal(replies.length, 2);
    assert.ok(replies.every((comment) => comment.content.includes(region) && comment.content.includes(`‘${sample.title.split(", ")[1]}’`)));
  }
  const together = data.posts.filter((post) => post.category === "together").map((post) => post.content).join("\n");
  assert.doesNotMatch(together, /(?:010[- ]?\d|@|카카오톡|오픈채팅|연락처|DM\b)/i);
});

test("demo categories follow each conversation's intent", async () => {
  const data = await readDemoData();
  const expected = new Map([
    ["충전기를 두고 온 여행기", "tips"], ["부모님과 일정 속도를 맞춘 이야기", "review"], ["역광 사진만 남은 날", "place"],
    ["하루와 이틀 사이에서 고민 중", "general"], ["짐을 너무 많이 챙긴 뒤의 메모", "review"], ["간식 취향이 갈린 동행들", "travel-talk"],
    ["공유 앨범을 정리하는 방식", "tips"], ["일정 속도로 살짝 다퉜던 날", "together"], ["유모차 여행 가방에 뭘 넣을까요", "general"],
    ["기념품을 하나만 고른다면", "place"], ["신발 선택을 잘못한 날", "review"], ["아침형과 늦잠형이 함께 떠날 때", "together"],
    ["식사 시간이 다른 친구와의 계획", "together"], ["작은 가방을 따로 챙길지 고민", "general"], ["세 줄 여행 일기를 써 봤어요", "tips"],
    ["이동 중 음악을 틀지 말지", "travel-talk"], ["마지막 계획을 취소한 날", "review"], ["겉옷을 몇 벌 챙길지 묻습니다", "general"],
    ["단체방 투표가 더 어려웠던 이유", "travel-talk"], ["여행 뒤 영수증과 메모 정리", "tips"],
  ]);
  for (const post of data.posts) assert.equal(post.category, expected.get(post.title.split(", ")[1]));
});

test("search and pagination cover the full opt-in corpus without synthetic likes", async () => {
  const data = await readDemoData();
  const pageSize = 12;
  assert.equal(Math.ceil(data.posts.length / pageSize), 30);
  assert.equal(data.posts.slice(29 * pageSize, 30 * pageSize).length, 12);
  assert.equal(data.posts.filter((post) => post.title.includes("충전기")).length, 18);
  assert.equal(data.posts.filter((post) => post.category === "review").length, 72);
  assert.equal("likes" in data, false);
});

test("dry-run is read-only and succeeds without DATABASE_URL", () => {
  const env = { ...process.env };
  delete env.DATABASE_URL;
  delete env.WAVE_COMMUNITY_DEMO_WRITE;
  const result = spawnSync(process.execPath, ["scripts/community-demo.mjs", "--dry-run"], { cwd: new URL("..", import.meta.url), env, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.readOnly, true);
  assert.equal(report.posts, 360);
  assert.equal(report.comments, 720);
  assert.match(report.fixtureSha256, /^[a-f0-9]{64}$/);
});

test("validator freezes approved batch metadata and the title disclosure", async () => {
  const data = await readDemoData();
  assert.match(await demoFixtureSha256(), /^[a-f0-9]{64}$/);
  const wrongBatch = structuredClone(data);
  wrongBatch.batch.id = "another-batch";
  assert.match(validateDemoData(wrongBatch).errors.join("\n"), /approved fixture/);
  const wrongTitle = structuredClone(data);
  wrongTitle.posts[0].title = wrongTitle.posts[0].title.replace("[시연] ", "");
  assert.match(validateDemoData(wrongTitle).errors.join("\n"), /valid \[시연\] title/);
});

test("production preflight requires the exact non-secret target and returns only sanitized counts", async () => {
  const data = await readDemoData();
  let calls = 0;
  const snapshot = {
    database_name: "neondb", read_only: "on", schema_matches: true, batch_metadata_matches: true,
    batch_rows: "0", posts_total: "4", posts_active: "3", posts_non_demo: "4", posts_non_demo_active: "3",
    posts_batch: "0", posts_batch_active: "0", posts_batch_hidden: "0", comments_total: "2", comments_active: "2",
    comments_non_demo: "2", comments_non_demo_active: "2", comments_batch: "0", comments_batch_active: "0",
    comments_batch_hidden: "0", real_comments_on_batch_posts: "0", likes_total: "1", likes_on_batch_posts: "0",
    likes_on_non_batch_posts: "1", reports_total: "1", reports_open: "1", reports_on_batch_posts: "0",
    reports_on_non_batch_posts: "1", foreign_post_collisions: "0", foreign_comment_collisions: "0",
    extra_batch_posts: "0", extra_batch_comments: "0",
  };
  const sql = {
    query: (text, params = []) => ({ text, params }),
    transaction: async (_queries, options) => {
      calls += 1;
      assert.deepEqual(options, { readOnly: true, isolationLevel: "RepeatableRead" });
      return [[], [snapshot]];
    },
  };
  const databaseUrl = "postgresql://owner:secret@ep-nameless-voice-azo6m14c.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
  const rejected = await runProductionDemo(sql, data, { mode: "preflight", databaseUrl, target: "wrong/neondb" });
  assert.deepEqual(rejected, { ok: false, reason: "production-target-mismatch" });
  assert.equal(calls, 0);
  const accepted = await runProductionDemo(sql, data, { mode: "preflight", databaseUrl, target: COMMUNITY_DEMO_PRODUCTION_TARGET });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.snapshot.postsNonDemo, 4);
  assert.equal(JSON.stringify(accepted).includes("secret"), false);
  assert.equal(calls, 1);
});

test("mutations require explicit batch ownership and a database", () => {
  const env = { ...process.env, WAVE_COMMUNITY_DEMO_WRITE: "1" };
  delete env.DATABASE_URL;
  const result = spawnSync(process.execPath, ["scripts/community-demo.mjs", "--apply", "--batch=wave-community-demo-2026-v1", "--owner=wave-community-demo-fixtures"], { cwd: new URL("..", import.meta.url), env, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DATABASE_URL/);
});

test("rollback hides only owned demo rows and preserves real interactions", async () => {
  const cli = await source("scripts/community-demo.mjs");
  assert.match(cli, /UPDATE community_comments SET moderation_status='hidden' WHERE demo_batch_id=\$1/);
  assert.match(cli, /UPDATE community_posts SET moderation_status='hidden' WHERE demo_batch_id=\$1/);
  assert.match(cli, /preservedRealInteractions: true/);
  assert.doesNotMatch(cli, /DELETE FROM community_(?:posts|comments|likes|reports)/);
  assert.match(cli, /demo_batch_id IS DISTINCT FROM \$2/);
  assert.match(cli, /pg_advisory_xact_lock/);
});

test("repository projections and mappers carry the persisted demo marker", async () => {
  const [repository, mapperSource] = await Promise.all([
    source("features/community/server/post-read-repository.ts"),
    source("features/community/server/post-mappers.ts"),
  ]);
  assert.equal((repository.match(/p\.created_at,p\.updated_at,p\.demo_batch_id,jsonb/g) || []).length, 8);
  const compiled = ts.transpileModule(mapperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", compiled)((name) => name.includes("field-report")
    ? { normalizeAccessibilityReports: () => [], normalizeJournalPlaces: () => [] }
    : { normalizeVisitPhotos: () => ({ photos: [] }) }, loaded, loaded.exports);
  const row = { id: "demo", category: "general", title: "title", content: "body", author_name: "데모 여행자", author_id: "wave-demo-author-01", created_at: 1, updated_at: 1, demo_batch_id: "wave-community-demo-2026-v1", field_reports: [], journal_places: [], photo_count: 0 };
  assert.equal(loaded.exports.mapCommunityPost(row).demoBatchId, "wave-community-demo-2026-v1");
  assert.equal(loaded.exports.mapCommunityComment(row).demoBatchId, "wave-community-demo-2026-v1");
});

test("list, detail and comment UI label mapped demo rows but leave real rows unlabelled", async () => {
  const [mapperSource, labelSource, list, detail, comments] = await Promise.all([
    source("features/community/server/post-mappers.ts"), source("features/community/components/CommunityDemoLabel.tsx"),
    source("features/community/components/CommunityPostList.tsx"), source("features/community/components/CommunityPostArticle.tsx"), source("features/community/components/CommunityComments.tsx"),
  ]);
  const mapperJs = ts.transpileModule(mapperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mapper = { exports: {} };
  new Function("require", "module", "exports", mapperJs)((name) => name.includes("field-report")
    ? { normalizeAccessibilityReports: () => [], normalizeJournalPlaces: () => [] }
    : { normalizeVisitPhotos: () => ({ photos: [] }) }, mapper, mapper.exports);
  const base = { id: "post", category: "general", title: "title", content: "body", author_name: "작성자", author_id: "author", created_at: 1, updated_at: 1, field_reports: [], journal_places: [], photo_count: 0 };
  const demoPost = mapper.exports.mapCommunityPost({ ...base, demo_batch_id: "wave-community-demo-2026-v1" });
  const realPost = mapper.exports.mapCommunityPost({ ...base, demo_batch_id: null });
  const demoComment = mapper.exports.mapCommunityComment({ ...base, demo_batch_id: "wave-community-demo-2026-v1" });

  const labelJs = ts.transpileModule(labelSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const label = { exports: {} };
  new Function("require", "module", "exports", labelJs)(createRequire(import.meta.url), label, label.exports);
  const Label = label.exports.default;
  assert.match(renderToStaticMarkup(createElement(Label, { demoBatchId: demoPost.demoBatchId })), /합성 데모 예시/);
  assert.match(renderToStaticMarkup(createElement(Label, { demoBatchId: demoComment.demoBatchId, kind: "comment" })), /합성 데모 댓글/);
  assert.equal(renderToStaticMarkup(createElement(Label, { demoBatchId: realPost.demoBatchId })), "");
  for (const component of [list, detail, comments]) assert.match(component, /CommunityDemoLabel/);
});

test("metadata migration is additive and legacy seed retirement remains untouched", async () => {
  const [migration, retirement, handler] = await Promise.all([
    source("migrations/019_community_demo_metadata.sql"),
    source("migrations/006_retire_community_seed.sql"),
    source("server/deployment/migration-handler.ts"),
  ]);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS demo_batch_id/);
  assert.doesNotMatch(migration, /INSERT INTO|UPDATE community_posts|DELETE FROM/);
  assert.match(retirement, /author_id = 'wave-seed'/);
  assert.match(handler, /019_community_demo_metadata\.sql\?raw/);
  assert.doesNotMatch(handler, /community-demo-wave-2026-v1|community-demo\.mjs/);
});
