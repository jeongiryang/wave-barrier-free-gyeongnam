import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { securePostgresUrl } from "../lib/deployment/environment-validation.js";
import { orderedMigrationStatements, PRODUCTION_MIGRATION_NAMES } from "../lib/deployment/migrations.js";

const databaseUrl = securePostgresUrl(process.env.DATABASE_URL, { allowLocalhost: true });
if (!databaseUrl) {
  console.error("안전한 DATABASE_URL이 없어 migration을 적용할 수 없습니다.");
  process.exit(1);
}

const migrations = await Promise.all(PRODUCTION_MIGRATION_NAMES.map((name) => (
  readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8")
)));
const statements = orderedMigrationStatements(migrations);

const sql = neon(databaseUrl);
await sql.transaction(statements.map((statement) => sql.query(statement)));
console.log(`001~005 Production migration 적용 완료 (${statements.length}개 statement)`);
