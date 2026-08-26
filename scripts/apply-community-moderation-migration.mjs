import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL이 없어 migration을 적용할 수 없습니다.");
  process.exit(1);
}

const migration = await readFile(
  new URL("../migrations/002_community_moderation.sql", import.meta.url),
  "utf8",
);
const statements = migration
  .split(/^-- migrate:split\s*$/m)
  .map((statement) => statement.trim())
  .filter(Boolean);

const sql = neon(databaseUrl);
await sql.transaction(statements.map((statement) => sql.query(statement)));
console.log(`002_community_moderation.sql 적용 완료 (${statements.length}개 statement)`);
