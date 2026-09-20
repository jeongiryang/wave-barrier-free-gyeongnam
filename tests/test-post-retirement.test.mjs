import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("test-post retirement hides only the two named IDs and preserves all records", async t => {
  const sql = await readFile(new URL("../migrations/016_retire_test_posts.sql", import.meta.url), "utf8");
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  db.exec("CREATE TABLE community_posts(id TEXT PRIMARY KEY,title TEXT,moderation_status TEXT)");
  const insert = db.prepare("INSERT INTO community_posts VALUES(?,?,'active')");
  insert.run("f8adec55-71f0-4a34-9b17-666ca8fc101d", "오류 확인 테스트");
  insert.run("560f4a61-767c-43e0-b956-f724fb61f484", "질문드립니다");
  insert.run("unrelated", "질문드립니다");
  db.exec(sql);
  db.exec(sql);
  assert.equal(db.prepare("SELECT count(*) n FROM community_posts").get().n, 3);
  assert.equal(db.prepare("SELECT count(*) n FROM community_posts WHERE moderation_status='hidden'").get().n, 2);
  assert.equal(db.prepare("SELECT moderation_status FROM community_posts WHERE id='unrelated'").get().moderation_status, "active");
});
