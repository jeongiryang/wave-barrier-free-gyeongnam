import { neon } from "@neondatabase/serverless";
import moderationMigration from "../../migrations/002_community_moderation.sql?raw";
import tripsMigration from "../../migrations/003_trips.sql?raw";
import communitySeedMigration from "../../migrations/004_community_seed.sql?raw";
import communityFieldReportsMigration from "../../migrations/005_community_field_reports.sql?raw";
import { productionEnvironmentErrors } from "../../lib/deployment/production-env.js";
import { securePostgresUrl } from "../../lib/deployment/environment-validation.js";
import { json } from "../shared/http";

function migrationStatements(source: string) {
  return source
    .split(/^-- migrate:split\s*$/m)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function sameToken(actual: string, expected: string) {
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(actualHash);
  const right = new Uint8Array(expectedHash);
  return left.every((value, index) => value === right[index]);
}

export async function handleProductionMigration(request: Request) {
  if (request.method !== "POST" || process.env.VERCEL_ENV !== "production") {
    return json({ error: "지원하지 않는 경로입니다." }, 404);
  }
  const expected = process.env.COMMUNITY_MIGRATION_TOKEN?.trim() || "";
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (expected.length < 32 || !supplied || !(await sameToken(supplied, expected))) {
    return json({ error: "지원하지 않는 경로입니다." }, 404);
  }

  const envErrors = productionEnvironmentErrors(process.env);
  if (envErrors.length > 0) return json({ error: "Production 환경 설정이 불완전합니다.", fields: envErrors }, 503);

  const statements = [
    ...[moderationMigration, tripsMigration].flatMap(migrationStatements),
    ...[communitySeedMigration, communityFieldReportsMigration].flatMap(migrationStatements),
  ];
  const databaseUrl = securePostgresUrl(process.env.DATABASE_URL);
  if (!databaseUrl) return json({ error: "Production 데이터베이스 연결 설정이 안전하지 않습니다." }, 503);
  const sql = neon(databaseUrl);
  await sql.transaction(statements.map((statement) => sql.query(statement)));
  return json({ ok: true, migrations: ["002_community_moderation.sql", "003_trips.sql", "004_community_seed.sql", "005_community_field_reports.sql"], statements: statements.length });
}
