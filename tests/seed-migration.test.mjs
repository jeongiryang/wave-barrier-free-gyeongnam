import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("legacy community seeds are preserved for rollback but retired from public use", async () => {
  const [seed, retirement] = await Promise.all([
    source("migrations/004_community_seed.sql"),
    source("migrations/006_retire_community_seed.sql"),
  ]);
  assert.match(seed, /ON CONFLICT \(id\) DO UPDATE/);
  assert.match(retirement, /UPDATE community_posts/);
  assert.match(retirement, /author_id = 'wave-seed'/);
  assert.match(retirement, /moderation_status = 'hidden'/);
  assert.doesNotMatch(retirement, /DELETE FROM/);
});
