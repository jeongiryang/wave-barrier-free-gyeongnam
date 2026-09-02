import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("community seed is idempotent and explicitly marked as sample content", async () => {
  const sql = await source("migrations/004_community_seed.sql");
  assert.match(sql, /ON CONFLICT \(id\) DO UPDATE/);
  assert.match(sql, /\[샘플\]/);
  assert.match(sql, /실제 여행자가 작성한 글이 아닌 이용 예시/);
  assert.match(sql, /'active'/);
});
