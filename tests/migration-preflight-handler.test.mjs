import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import * as environment from "../lib/deployment/environment-validation.js";
import * as production from "../lib/deployment/production-env.js";
import * as migrations from "../lib/deployment/migrations.js";
import * as preflight from "../lib/deployment/database-preflight.js";

const source = readFileSync(new URL("../server/deployment/migration-handler.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const token = "public-test-token-".repeat(3);
function handler(overrides = {}, rowOverrides = {}, authFailure = "") {
  const env = Object.fromEntries(production.REQUIRED_PRODUCTION_ENV.map((key) => [key, "public-fixture-value"]));
  Object.assign(env, {
    VERCEL_ENV: "production", COMMUNITY_MIGRATION_TOKEN: token,
    DATABASE_URL: "postgresql://fixture:public-password@ep-nameless-voice-azo6m14c.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
    NEON_AUTH_BASE_URL: "https://ep-fixture.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth",
    NEON_AUTH_COOKIE_SECRET: "x".repeat(32), CRON_SECRET: "y".repeat(64),
  }, overrides);
  const calls = [];
  const authChecks = [];
  const check = async (name) => { authChecks.push(name); if (authFailure === name) throw new Error("private provider details"); };
  const sql = {
    query: (query) => query,
    transaction: async (queries, options) => {
      calls.push({ queries, readOnly: options?.readOnly });
      return options?.readOnly ? [[], [{ database_name: "neondb", read_only: "on", schema_matches: true, non_array_journals: 0, total_posts: 8, active_posts: 4, affected_008: 3, ...rowOverrides }]] : [];
    },
  };
  const exports = {};
  const require = (name) => {
    if (name === "@neondatabase/serverless") return { neon: () => sql };
    if (name.endsWith("production-env.js")) return production;
    if (name.endsWith("environment-validation.js")) return environment;
    if (name.endsWith("database-preflight.js")) return preflight;
    if (name.endsWith("migrations.js")) return migrations;
    if (name.endsWith("auth/native-runtime")) return { readyNativeAuth: () => check("database") };
    if (name.endsWith("auth/mail.js")) return { verifyAccountMailer: () => check("smtp") };
    if (name.endsWith(".sql?raw")) return { default: readFileSync(new URL(`../migrations/${name.split("/").pop().replace("?raw", "")}`, import.meta.url), "utf8") };
    if (name === "../shared/http") return { json: (data, status = 200) => Response.json(data, { status }) };
    throw new Error(`Unexpected test module: ${name}`);
  };
  vm.runInNewContext(compiled, { exports, require, process: { env }, crypto: webcrypto, TextEncoder });
  return { run: exports.handleProductionMigration, calls, authChecks };
}
const request = (mode = "inspect", auth = token) => new Request("https://candidate.example/api/deployment/migrate", {
  method: "POST", headers: { authorization: `Bearer ${auth}`, "x-wave-migration-mode": mode },
});

test("actual authenticated inspect handler cannot execute the imported migrations", async () => {
  const h = handler();
  const response = await h.run(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).affected008, 3);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].readOnly, true);
  assert.ok(h.calls[0].queries.every((query) => !/\b(?:UPDATE|CREATE|DELETE|INSERT|ALTER)\b/i.test(query)));
});

test("unauthorised, non-production and invalid-mode requests do not query or mutate", async () => {
  for (const [overrides, req, expected] of [
    [{}, request("inspect", "invalid"), 404], [{ VERCEL_ENV: "preview" }, request(), 404],
    [{}, request("typo"), 400], [{ DATABASE_URL: "postgresql://fixture:public-password@ep-other.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" }, request(), 503],
  ]) {
    const h = handler(overrides);
    assert.equal((await h.run(req)).status, expected);
    assert.equal(h.calls.length, 0);
  }
});

test("apply requires successful read-only preflight and then keeps the canonical atomic chain", async () => {
  const bad = handler({}, { schema_matches: false });
  assert.equal((await bad.run(request("apply"))).status, 503);
  assert.equal(bad.calls.length, 1);
  assert.equal(bad.calls[0].readOnly, true);
  const good = handler();
  const response = await good.run(request("apply"));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).migrations, migrations.PRODUCTION_MIGRATION_NAMES);
  assert.equal(good.calls.length, 2);
  assert.equal(good.calls[0].readOnly, true);
  assert.match(good.calls[1].queries.at(-1), /SET moderation_status = 'under_review'/);
});

test("native candidate requires database and SMTP readiness before any migration", async () => {
  for (const failure of ["database", "smtp", ""]) {
    const h = handler({ WAVE_AUTH_BACKEND: "native" }, {}, failure);
    const response = await h.run(request());
    assert.equal(response.status, failure ? 503 : 200);
    assert.deepEqual(h.authChecks, failure === "database" ? ["database"] : ["database", "smtp"]);
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].readOnly, true);
    if (failure) assert.deepEqual(await response.json(), { ok: false, reason: "native-auth-preflight-failed" });
  }
});
