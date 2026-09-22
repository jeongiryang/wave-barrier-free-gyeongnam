import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

test("all demo titles disclose the synthetic content within the database title limit", async () => {
  const data = JSON.parse(await readFile(new URL("../data/community-demo-wave-2026-v1.json", import.meta.url), "utf8"));
  assert.equal(data.posts.length, 360);
  for (const post of data.posts) {
    assert.ok(post.title.startsWith("[시연] "), post.id);
    assert.ok(Array.from(post.title).length <= 120, post.id);
  }
});

test("all public projections label legacy demo titles exactly once without changing real titles", async () => {
  const source = await readFile(new URL("../features/community/server/post-mappers.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  new Function("require", "module", "exports", compiled)((name) => name.includes("field-report")
    ? { normalizeAccessibilityReports: () => [], normalizeJournalPlaces: () => [] }
    : { normalizeVisitPhotos: () => ({ photos: [] }) }, loaded, loaded.exports);
  const row = { id: "demo", title: "가방을 가볍게 챙기는 법", demo_batch_id: "wave-community-demo-2026-v1" };
  assert.equal(loaded.exports.mapCommunityPost(row).title, "[시연] 가방을 가볍게 챙기는 법");
  assert.equal(loaded.exports.mapCommunityPost({ ...row, title: "[시연] 가방을 가볍게 챙기는 법" }).title, "[시연] 가방을 가볍게 챙기는 법");
  assert.equal(loaded.exports.mapCommunityPost({ ...row, demo_batch_id: null }).title, row.title);
  assert.equal(loaded.exports.mapCommunityPost({ ...row, demo_batch_id: undefined }).title, row.title);
});
