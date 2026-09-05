import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { load as loadYaml } from "js-yaml";
import {
  productionEnvironmentErrors,
  REQUIRED_PRODUCTION_ENV,
} from "../lib/deployment/production-env.js";
import {
  orderedMigrationStatements,
  PRODUCTION_MIGRATION_NAMES,
  splitMigrationStatements,
} from "../lib/deployment/migrations.js";

const validEnv = Object.fromEntries(REQUIRED_PRODUCTION_ENV.map((name) => [name, `${name.toLowerCase()}-configured-value`]));
validEnv.DATABASE_URL = "postgresql://wave:secret@ep-wave.us-east-2.aws.neon.tech/wave?sslmode=require";
validEnv.NEON_AUTH_BASE_URL = "https://ep-wave.neonauth.us-east-2.aws.neon.tech/neondb/auth";
validEnv.NEON_AUTH_COOKIE_SECRET = "x".repeat(32);
validEnv.CRON_SECRET = "y".repeat(64);
validEnv.COMMUNITY_MODERATOR_USER_IDS = "user_a,user_b";

test("production deployment rejects missing or unsafe account configuration", () => {
  assert.deepEqual(productionEnvironmentErrors(validEnv), []);
  assert.deepEqual(productionEnvironmentErrors({ ...validEnv, COMMUNITY_MODERATOR_USER_IDS: "" }), []);
  assert.ok(!REQUIRED_PRODUCTION_ENV.includes("COMMUNITY_MODERATOR_USER_IDS"));
  assert.ok(REQUIRED_PRODUCTION_ENV.includes("CRON_SECRET"));
  assert.match(productionEnvironmentErrors({ ...validEnv, DATABASE_URL: "" }).join("\n"), /DATABASE_URL/);
  assert.match(productionEnvironmentErrors({ ...validEnv, DATABASE_URL: "mysql://db.example.com/wave" }).join("\n"), /postgres/);
  assert.match(productionEnvironmentErrors({ ...validEnv, DATABASE_URL: "postgresql://wave:secret@db.example.com/wave?sslmode=disable" }).join("\n"), /TLS/);
  assert.match(productionEnvironmentErrors({ ...validEnv, DATABASE_URL: "postgresql://wave:secret@db.example.com/wave?sslmode=require&sslmode=disable" }).join("\n"), /TLS/);
  assert.match(productionEnvironmentErrors({ ...validEnv, DATABASE_URL: "postgresql://wave:secret@127.0.0.1/wave?sslmode=require" }).join("\n"), /TLS/);
  assert.match(productionEnvironmentErrors({ ...validEnv, NEON_AUTH_BASE_URL: "http://ep-wave.neon.tech/auth" }).join("\n"), /HTTPS/);
  assert.match(productionEnvironmentErrors({ ...validEnv, NEON_AUTH_BASE_URL: "https://neon.tech/auth" }).join("\n"), /HTTPS/);
  assert.match(productionEnvironmentErrors({ ...validEnv, NEON_AUTH_BASE_URL: "https://neon.tech.attacker.example/auth" }).join("\n"), /HTTPS/);
  assert.match(productionEnvironmentErrors({ ...validEnv, NEON_AUTH_COOKIE_SECRET: "short" }).join("\n"), /32자/);
  assert.match(productionEnvironmentErrors({ ...validEnv, CRON_SECRET: "short" }).join("\n"), /CRON_SECRET.*32자/);
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
  // Vercel Cron은 프로젝트 Production 환경의 CRON_SECRET을 Authorization Bearer로 보낸다.
  // CD가 배포마다 별도 값을 --env로 덮으면 스케줄러와 함수가 서로 다른 값을 보게 된다.
  assert.match(workflow, /vercel@50\.15\.1 env ls production/);
  assert.match(workflow, /env add CRON_SECRET production --sensitive/);
  assert.doesNotMatch(workflow, /--env CRON_SECRET=/);
  assert.doesNotMatch(workflow, /cron_token|cron_value/);
  // Native curl은 실제 curl 인자를 그대로 넘긴다. CI 인증과 프로젝트 선택은
  // VERCEL_TOKEN/VERCEL_ORG_ID/VERCEL_PROJECT_ID 환경변수와 pull로 만든 링크에 맡긴다.
  assert.match(workflow, /vercel@54\.14\.0 curl \/api\/health --deployment "\$CANDIDATE_URL"/);
  assert.match(workflow, /vercel@54\.14\.0 curl \/api\/deployment\/migrate --deployment "\$CANDIDATE_URL"/);
  assert.match(workflow, /-X POST -H "Authorization: Bearer \$COMMUNITY_MIGRATION_TOKEN"/);
  assert.doesNotMatch(workflow, /vercel@54\.14\.0[^\n]+--(?:scope|token)[^\n]+curl/);
  assert.doesNotMatch(workflow, /vercel@54\.14\.0 curl[^\n]+--(?:scope|token)/);
  assert.match(workflow, /VERCEL_TOKEN: \$\{\{ secrets\.VERCEL_TOKEN \}\}/);
  assert.match(workflow, /VERCEL_ORG_ID: \$\{\{ secrets\.VERCEL_ORG_ID \}\}/);
  assert.match(workflow, /VERCEL_PROJECT_ID: \$\{\{ secrets\.VERCEL_PROJECT_ID \}\}/);
  assert.match(workflow, /vercel@50\.15\.1 (?:pull|build|deploy|promote)/);
  assert.match(workflow, /grep -Fq '\"ok\":true'/);
  assert.match(workflow, /grep -Fq '\"001_community\.sql\"'/);
  assert.match(workflow, /grep -Fq '\"002_community_moderation\.sql\"'/);
  assert.match(workflow, /grep -Fq '\"003_trips\.sql\"'/);
  assert.match(workflow, /grep -Fq '\"004_community_seed\.sql\"'/);
  assert.match(workflow, /grep -Fq '\"005_community_field_reports\.sql\"'/);
  assert.match(workflow, /grep -Fq '\"006_retire_community_seed\.sql\"'/);
  assert.match(workflow, /grep -Fq '\"checkedAt\"'/);
  assert.match(workflow, /vercel@50\.15\.1 rollback/);
  assert.match(workflow, /promote[^\n]+--scope="\$VERCEL_ORG_ID"/);
  assert.match(workflow, /rollback[^\n]+--scope="\$VERCEL_ORG_ID"/);
  assert.doesNotMatch(workflow, /steps\.[a-z0-9_]+-[a-z0-9_-]+/i);
  const finalHealthStep = workflow.slice(workflow.indexOf("- name: 프로덕션 health와 실패 시 rollback"));
  assert.equal(finalHealthStep.match(/^        env:/gm)?.length, 1);
});

test("fresh databases receive the complete idempotent migration chain in one transaction", async () => {
  const [sources, runner] = await Promise.all([
    Promise.all(PRODUCTION_MIGRATION_NAMES.map((name) => (
      readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8")
    ))),
    readFile(new URL("../scripts/apply-community-moderation-migration.mjs", import.meta.url), "utf8"),
  ]);
  assert.deepEqual(sources.map((source) => splitMigrationStatements(source).length), [9, 9, 5, 1, 4, 1, 2, 1]);
  const statements = orderedMigrationStatements(sources);
  assert.match(statements[0], /CREATE TABLE IF NOT EXISTS community_posts/);
  assert.match(statements[1], /CREATE TABLE IF NOT EXISTS community_comments/);
  assert.match(statements[2], /CREATE TABLE IF NOT EXISTS community_likes/);
  assert.ok(statements.findIndex((statement) => /ALTER TABLE community_posts/.test(statement)) >= 9);
  assert.ok(statements.findIndex((statement) => /INSERT INTO community_posts/.test(statement)) > statements.findIndex((statement) => /CREATE TABLE IF NOT EXISTS itineraries/.test(statement)));
  assert.ok(splitMigrationStatements(sources[0]).every((statement) => /IF NOT EXISTS/.test(statement)));
  assert.ok(splitMigrationStatements(sources[2]).every((statement) => /IF NOT EXISTS/.test(statement)));
  assert.match(sources[3], /ON CONFLICT \(id\) DO UPDATE/);
  assert.ok(splitMigrationStatements(sources[4]).every((statement) => /IF NOT EXISTS/.test(statement)));
  assert.match(sources[5], /author_id = 'wave-seed'/);
  assert.match(sources[5], /moderation_status = 'hidden'/);
  assert.match(sources[6], /CREATE TABLE IF NOT EXISTS account_deletion_grants/);
  assert.ok(splitMigrationStatements(sources[6]).every((statement) => /IF NOT EXISTS/.test(statement)));
  assert.match(sources[7], /SET moderation_status = 'under_review'/);
  assert.match(sources[7], /WHERE p.moderation_status = 'active'/);
  assert.doesNotMatch(sources[7], /DELETE FROM|DROP TABLE/);
  assert.deepEqual(orderedMigrationStatements(sources), statements);
  assert.match(runner, /PRODUCTION_MIGRATION_NAMES/);
  assert.match(runner, /orderedMigrationStatements\(migrations\)/);
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
  assert.match(handler, /001_community\.sql\?raw/);
  assert.match(handler, /002_community_moderation\.sql\?raw/);
  assert.match(handler, /003_trips\.sql\?raw/);
  assert.match(handler, /004_community_seed\.sql\?raw/);
  assert.match(handler, /005_community_field_reports\.sql\?raw/);
  assert.match(handler, /006_retire_community_seed\.sql\?raw/);
  assert.match(handler, /007_account_deletion\.sql\?raw/);
  assert.match(handler, /008_review_date_integrity\.sql\?raw/);
  assert.match(handler, /accountDeletionMigration,\s*reviewDateIntegrityMigration,/);
  assert.match(handler, /orderedMigrationStatements\(\[/);
  assert.match(handler, /communityMigration,\s*moderationMigration,\s*tripsMigration/);
  assert.match(handler, /communitySeedMigration/);
  assert.match(handler, /communitySeedRetirementMigration/);
  assert.match(handler, /accountDeletionMigration/);
  assert.match(handler, /PRODUCTION_MIGRATION_NAMES/);
  assert.match(handler, /sql\.transaction\(statements\.map/);
  assert.match(worker, /\/api\/deployment\/migrate/);
});
