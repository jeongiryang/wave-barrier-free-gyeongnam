import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { load as loadYaml } from "js-yaml";
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

test("CD migrates an unpromoted protected candidate before production promotion", async () => {
  const workflow = await readFile(new URL("../.github/workflows/cd.yml", import.meta.url), "utf8");
  assert.doesNotThrow(() => loadYaml(workflow));
  const build = workflow.indexOf("vercel@50.15.1 build");
  const candidate = workflow.indexOf("--skip-domain");
  const candidateHealth = workflow.indexOf("후보 health smoke test");
  const migration = workflow.indexOf("/api/deployment/migrate");
  const promote = workflow.indexOf("vercel@50.15.1 promote");
  assert.ok(build > 0 && build < candidate);
  assert.ok(candidate < candidateHealth && candidateHealth < migration && migration < promote);
  assert.match(workflow, /COMMUNITY_MIGRATION_TOKEN/);
  // Native curl 모드에서는 path 뒤 인자가 system curl로 전달된다. Vercel global 옵션은
  // 반드시 `curl` 서브커맨드 앞에 두어 CLI가 먼저 소비하게 한다.
  assert.match(workflow, /vercel@54\.14\.0 --scope="\$VERCEL_ORG_ID" --token="\$VERCEL_TOKEN" curl \/api\/health --deployment "\$CANDIDATE_URL"/);
  assert.match(workflow, /vercel@54\.14\.0 --scope="\$VERCEL_ORG_ID" --token="\$VERCEL_TOKEN" curl \/api\/deployment\/migrate --deployment "\$CANDIDATE_URL"/);
  assert.match(workflow, /-X POST -H "Authorization: Bearer \$COMMUNITY_MIGRATION_TOKEN"/);
  assert.doesNotMatch(workflow, /vercel@54\.14\.0 curl[^\n]+--(?:scope|token)/);
  assert.match(workflow, /vercel@50\.15\.1 (?:pull|build|deploy|promote)/);
  assert.doesNotMatch(workflow, /--location --output \/dev\/null --write-out '%\{url_effective\}'/);
  assert.match(workflow, /grep -Fq '\"ok\":true'/);
  assert.match(workflow, /grep -Fq '\"004_community_seed\.sql\"'/);
  assert.match(workflow, /grep -Fq '\"checkedAt\"'/);
  assert.match(workflow, /vercel@50\.15\.1 rollback/);
  assert.match(workflow, /promote[^\n]+--scope="\$VERCEL_ORG_ID"/);
  assert.match(workflow, /rollback[^\n]+--scope="\$VERCEL_ORG_ID"/);
  assert.doesNotMatch(workflow, /steps\.[a-z0-9_]+-[a-z0-9_-]+/i);
  const finalHealthStep = workflow.slice(workflow.indexOf("- name: 프로덕션 health와 실패 시 rollback"));
  assert.equal(finalHealthStep.match(/^        env:/gm)?.length, 1);
});

test("production migrations are split into atomic Neon transactions", async () => {
  const [migration, trips, runner] = await Promise.all([
    readFile(new URL("../migrations/002_community_moderation.sql", import.meta.url), "utf8"),
    readFile(new URL("../migrations/003_trips.sql", import.meta.url), "utf8"),
    readFile(new URL("../scripts/apply-community-moderation-migration.mjs", import.meta.url), "utf8"),
  ]);
  assert.ok(migration.split(/^-- migrate:split\s*$/m).filter((part) => part.trim()).length >= 9);
  assert.equal(trips.split(/^-- migrate:split\s*$/m).filter((part) => part.trim()).length, 5);
  assert.match(runner, /sql\.transaction\(statements\.map/);
  assert.doesNotMatch(runner, /console\.log\([^\n]*(?:DATABASE_URL|databaseUrl)/);
});

test("the migration endpoint is token-protected and uses the canonical SQL", async () => {
  const [handler, worker] = await Promise.all([
    readFile(new URL("../server/deployment/migration-handler.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
  ]);
  assert.match(handler, /VERCEL_ENV !== "production"/);
  assert.match(handler, /COMMUNITY_MIGRATION_TOKEN/);
  assert.match(handler, /002_community_moderation\.sql\?raw/);
  assert.match(handler, /003_trips\.sql\?raw/);
  assert.match(handler, /004_community_seed\.sql\?raw/);
  assert.match(handler, /\[moderationMigration, tripsMigration/);
  assert.match(handler, /communitySeedMigration/);
  assert.match(handler, /sql\.transaction\(statements\.map/);
  assert.match(worker, /\/api\/deployment\/migrate/);
});
