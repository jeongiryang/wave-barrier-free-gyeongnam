import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { load } from "js-yaml";
import { DATABASE_PREFLIGHT_SQL, inspectProductionDatabase, matchesProductionDatabase, PRODUCTION_DATABASE_TARGET } from "../lib/deployment/database-preflight.js";

const connection = "postgresql://fixture:public-test-password@ep-nameless-voice-azo6m14c-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const validRow = { database_name: "neondb", read_only: "on", schema_matches: true, non_array_journals: "0", total_posts: "8", active_posts: "4", affected_008: "3" };
function database(row = validRow) {
  const calls = [];
  return {
    calls,
    query: (query) => query,
    transaction: async (queries, options) => { calls.push({ queries, options }); return [[], [row]]; },
  };
}

test("preflight binds both pooled and direct URLs to the reviewed production endpoint and database", () => {
  assert.equal(matchesProductionDatabase(connection), true);
  assert.equal(matchesProductionDatabase(connection.replace("-pooler", "")), true);
  for (const value of [
    connection.replace("azo6m14c", "other"), connection.replace("neondb?", "another?"),
    connection.replace("neon.tech", "neon.tech.attacker.example"),
    connection.replace("sslmode=require", "sslmode=disable"), "invalid", "",
  ]) assert.equal(matchesProductionDatabase(value), false);
});

test("read-only preflight returns aggregate evidence and never a password, URL or user rows", async () => {
  const sql = database();
  const report = await inspectProductionDatabase(sql, connection);
  assert.equal(report.ok, true);
  assert.deepEqual([report.totalPosts, report.activePosts, report.affected008], [8, 4, 3]);
  assert.deepEqual(report.target, PRODUCTION_DATABASE_TARGET);
  assert.equal(sql.calls.length, 1);
  assert.deepEqual(sql.calls[0].options, { readOnly: true, isolationLevel: "RepeatableRead" });
  assert.match(sql.calls[0].queries[0], /statement_timeout.*10s.*lock_timeout.*2s/);
  assert.doesNotMatch(DATABASE_PREFLIGHT_SQL, /\b(?:INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE)\b/i);
  assert.doesNotMatch(JSON.stringify(report), /public-test-password|postgres|fixture/);
});

test("mismatched binding does not even query the database", async () => {
  const sql = database();
  assert.deepEqual(await inspectProductionDatabase(sql, connection.replace("azo6m14c", "other")), { ok: false, reason: "database-target-mismatch" });
  assert.equal(sql.calls.length, 0);
});

test("writable transactions, unknown schemas, malformed journals and inconsistent counts cannot pass", async () => {
  for (const delta of [
    { read_only: "off" }, { database_name: "wrong" }, { schema_matches: false },
    { non_array_journals: 1 }, { total_posts: "unknown" }, { affected_008: 5 }, { active_posts: 9 },
  ]) assert.equal((await inspectProductionDatabase(database({ ...validRow, ...delta }), connection)).ok, false);
  assert.equal((await inspectProductionDatabase(database(undefined), connection)).ok, true);
  assert.equal((await inspectProductionDatabase(database(null), connection)).ok, false);
});

test("provider failures never leak raw messages into evidence", async () => {
  const sql = database();
  sql.transaction = async () => { throw new Error(`sensitive fixture ${connection}`); };
  assert.deepEqual(await inspectProductionDatabase(sql, connection), { ok: false, reason: "database-preflight-unavailable" });
});

test("CI evidence renderer whitelists fields and fails closed on invalid or non-JSON provider responses", async () => {
  const report = await inspectProductionDatabase(database(), connection);
  const command = new URL("../scripts/check-database-preflight.mjs", import.meta.url);
  const run = (input) => spawnSync(process.execPath, [command.pathname.replace(/^\/(\w:)/, "$1")], { input, encoding: "utf8" });
  const success = run(JSON.stringify({ ...report, connection, privateUser: "not-for-logs" }));
  assert.equal(success.status, 0, success.stderr);
  assert.deepEqual(JSON.parse(success.stdout), report);
  for (const input of [connection, JSON.stringify({ ...report, readOnly: false }), JSON.stringify({ ...report, affected008: 5 })]) {
    const result = run(input);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.doesNotMatch(result.stderr, /public-test-password|postgres|not-for-logs/);
  }
});

test("manual preflight is Owner-only, exact-CI-gated and cannot mutate DB, aliases or environment configuration", async () => {
  const source = await readFile(new URL("../.github/workflows/cd.yml", import.meta.url), "utf8");
  const workflow = load(source);
  assert.equal(workflow.on.workflow_dispatch.inputs.preflight_only.default, true);
  assert.match(workflow.jobs.deploy.if, /github.actor == github.repository_owner/);
  assert.match(workflow.jobs.deploy.if, /inputs.preflight_only \|\| github.ref == 'refs\/heads\/main'/);
  const steps = workflow.jobs.deploy.steps;
  const ci = steps.findIndex((step) => step.name === "수동 후보의 동일 SHA CI 성공 확인");
  assert.ok(ci > 0 && ci < steps.findIndex((step) => step.name === "의존성 설치"));
  const inspect = steps.findIndex((step) => /X-Wave-Migration-Mode: inspect/.test(step.run || ""));
  assert.ok(inspect > 0 && inspect < steps.findIndex((step) => step.name === "후보 환경 검증과 커뮤니티 migration"));
  for (const name of ["Production Cron secret 보장", "후보 환경 검증과 커뮤니티 migration", "프로덕션 승격", "프로덕션 health와 실패 시 rollback"]) {
    assert.equal(steps.find((step) => step.name === name).if, "${{ !inputs.preflight_only }}");
  }
  assert.match(steps[inspect].run, /check-database-preflight.mjs/);
  assert.doesNotMatch(steps[inspect].run, /printf[^\n|]+\$response[^\n|]+>>?\s*"?\$(?:GITHUB|RUNNER)/);
});
