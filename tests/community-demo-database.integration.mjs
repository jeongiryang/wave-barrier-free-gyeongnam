import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.WAVE_PGLITE_MODULE || "@electric-sql/pglite");
import ts from "typescript";
import { applyDemo, readDemoData, rollbackDemo } from "../scripts/community-demo.mjs";

test("demo refresh preserves real interactions, is idempotent and drives actual repository sorting", async () => {
  const db = new PGlite();
  try {
    for (const migration of ["001_community", "002_community_moderation", "005_community_field_reports", "012_community_visit_photos", "017_community_categories", "017_community_travel_talk", "018_community_field_report_kind", "019_community_demo_metadata"]) {
      await db.exec(await readFile(new URL(`../migrations/${migration}.sql`, import.meta.url), "utf8"));
    }
    const sql = {
      query: (text, params = []) => ({ text, params }),
      transaction: async (queries, options = {}) => db.transaction(async (tx) => {
        if (options.readOnly) await tx.exec("SET TRANSACTION READ ONLY");
        const rows = [];
        for (const query of queries) rows.push((await tx.query(query.text, query.params)).rows);
        return rows;
      }),
    };
    const data = await readDemoData();
    const oldData = structuredClone(data);
    for (const post of oldData.posts) post.demoLikeCount = 0;
    for (const comment of oldData.comments) comment.postId = comment.id.replace(/-comment-\d+$/, "");
    await applyDemo(sql, oldData, { requireExistingSchema: true });
    const postId = data.posts[0].id;
    await db.query("INSERT INTO community_posts (id,author_id,author_name,category,title,content,created_at,updated_at) VALUES ('real-post','real-user','여행자','general','실제 글','보존 대상',1,1)");
    await db.query("INSERT INTO community_comments (id,post_id,author_id,author_name,content,created_at,updated_at) VALUES ('real-comment',$1,'real-user','여행자','실제 댓글',2,2)", [postId]);
    await db.query("INSERT INTO community_likes (post_id,user_id,created_at) VALUES ($1,'real-user',3),('real-post','real-user',4)", [postId]);
    await db.query("INSERT INTO community_reports (id,reporter_id,post_id,target_type,target_id,reason,created_at) VALUES ('real-report','real-user',$1,'post',$1,'other',5)", [postId]);
    const realState = async () => Promise.all([
      db.query("SELECT * FROM community_posts WHERE id='real-post'"),
      db.query("SELECT * FROM community_comments WHERE id='real-comment'"),
      db.query("SELECT * FROM community_likes WHERE user_id='real-user' ORDER BY post_id"),
      db.query("SELECT * FROM community_reports WHERE id='real-report'"),
    ]).then((results) => results.map((r) => r.rows));
    const before = await realState();
    const likesBefore = (await db.query("SELECT count(*) AS n FROM community_likes")).rows[0].n;
    const refreshed = await applyDemo(sql, data, { requireExistingSchema: true });
    assert.equal(Number(likesBefore), 2);
    assert.equal(refreshed.after.likesTotal, data.posts.reduce((sum, p) => sum + p.demoLikeCount, 0) + 2);
    assert.deepEqual(await realState(), before);

    // Execute the production repository's SQL, not a separate approximation.
    const source = await readFile(new URL("../features/community/server/post-read-repository.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const query = async (strings, ...values) => (await db.query(strings.reduce((text, part, i) => text + (i ? `$${i}` : "") + part, ""), values)).rows;
    const loaded = { exports: {} };
    new Function("require", "module", "exports", compiled)((name) => name.includes("database") ? { communityDatabase: async () => query } : name.includes("post-mappers") ? { mapCommunityPost: (x) => x } : { communitySearchPattern: (x) => `%${x}%` }, loaded, loaded.exports);
    const pages = [];
    for (const sort of ["latest", "popular", "comments"]) {
      const { posts: rows } = await loaded.exports.listCommunityPosts({ category: "", search: "", placeId: "", limit: 12, offset: 0, page: 1, sort }, "");
      assert.equal(rows.length, 12);
      pages.push(rows);
      const field = sort === "popular" ? "like_count" : sort === "comments" ? "comment_count" : "created_at";
      assert.ok(rows.every((row, i) => i === 0 || Number(rows[i - 1][field]) >= Number(row[field])));
    }
    assert.equal(new Set(pages.map((page) => page[0].id)).size, 3);
    const repeated = await applyDemo(sql, data, { requireExistingSchema: true });
    assert.equal(repeated.after.likesTotal, refreshed.after.likesTotal);

    // rollbackDemo also uses a direct query before its transaction.
    const rollbackSql = { ...sql, query: (text, params = []) => text.startsWith("SELECT to_regclass") ? db.query(text, params).then((r) => r.rows) : sql.query(text, params) };
    await rollbackDemo(rollbackSql, data);
    assert.deepEqual(await realState(), before);
    assert.equal(Number((await db.query("SELECT count(*) AS n FROM community_posts WHERE demo_batch_id IS NOT NULL AND moderation_status='active'")).rows[0].n), 0);
    await applyDemo(sql, data, { requireExistingSchema: true });
    assert.deepEqual(await realState(), before);
    assert.equal(Number((await db.query("SELECT count(*) AS n FROM community_likes")).rows[0].n), refreshed.after.likesTotal);

    const reported = data.comments[0];
    await db.query("INSERT INTO community_reports (id,reporter_id,post_id,target_type,target_id,reason,created_at) VALUES ('comment-report','real-user',$1,'comment',$2,'other',6)", [reported.postId, reported.id]);
    const unsafe = structuredClone(data);
    unsafe.comments[0].postId = data.posts.find((p) => p.id !== reported.postId).id;
    await assert.rejects(applyDemo(sql, unsafe, { requireExistingSchema: true }), /division by zero/);
    assert.equal((await db.query("SELECT post_id FROM community_comments WHERE id=$1", [reported.id])).rows[0].post_id, reported.postId);
  } finally {
    await db.close();
  }
});
