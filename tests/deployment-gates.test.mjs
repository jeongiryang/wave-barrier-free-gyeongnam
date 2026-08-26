import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  productionEnvironmentErrors,
  REQUIRED_PRODUCTION_ENV,
} from "../lib/deployment/production-env.js";

const validEnv = Object.fromEntries(REQUIRED_PRODUCTION_ENV.map((name) => [name, `${name.toLowerCase()}-configured-value`]));
validEnv.NEON_AUTH_COOKIE_SECRET = "x".repeat(32);
validEnv.COMMUNITY_MODERATOR_USER_IDS = "user_a,user_b";

test("production deployment rejects missing or unsafe account configuration", () => {
  assert.deepEqual(productionEnvironmentErrors(validEnv), []);
  assert.match(productionEnvironmentErrors({ ...validEnv, DATABASE_URL: "" }).join("\n"), /DATABASE_URL/);
  assert.match(productionEnvironmentErrors({ ...validEnv, NEON_AUTH_COOKIE_SECRET: "short" }).join("\n"), /32자/);
  assert.match(productionEnvironmentErrors({ ...validEnv, COMMUNITY_MODERATOR_USER_IDS: "valid,bad id" }).join("\n"), /잘못되거나/);
  assert.match(productionEnvironmentErrors({ ...validEnv, COMMUNITY_MODERATOR_USER_IDS: "same,same" }).join("\n"), /잘못되거나/);
});

test("CD validates env and applies migration before build and deploy", async () => {
  const workflow = await readFile(new URL("../.github/workflows/cd.yml", import.meta.url), "utf8");
  const envCheck = workflow.indexOf("check-production-env.mjs");
  const migration = workflow.indexOf("apply-community-moderation-migration.mjs");
  const build = workflow.indexOf("vercel@50.15.1 build");
  const deploy = workflow.indexOf("vercel@50.15.1 deploy");
  assert.ok(envCheck > 0 && envCheck < migration);
  assert.ok(migration < build && build < deploy);
  assert.match(workflow, /--env-file=\.vercel\/\.env\.production\.local/);
});

test("moderation migration is split into one atomic Neon transaction", async () => {
  const [migration, runner] = await Promise.all([
    readFile(new URL("../migrations/002_community_moderation.sql", import.meta.url), "utf8"),
    readFile(new URL("../scripts/apply-community-moderation-migration.mjs", import.meta.url), "utf8"),
  ]);
  assert.ok(migration.split(/^-- migrate:split\s*$/m).filter((part) => part.trim()).length >= 9);
  assert.match(runner, /sql\.transaction\(statements\.map/);
  assert.doesNotMatch(runner, /console\.log\([^\n]*(?:DATABASE_URL|databaseUrl)/);
});
