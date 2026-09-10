import { Pool, neonConfig } from "@neondatabase/serverless";
import { Kysely, PostgresDialect, sql } from "kysely";
import { securePostgresUrl } from "../deployment/environment-validation.js";

export function nativeDatabase(value) {
  const connectionString = securePostgresUrl(value, { allowLocalhost: process.env.NODE_ENV !== "production" });
  if (!connectionString) throw new Error("AUTH_DATABASE_NOT_CONFIGURED");
  neonConfig.webSocketConstructor = globalThis.WebSocket;
  const pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 8_000, idleTimeoutMillis: 10_000 });
  pool.on("error", () => {}); // Provider errors can contain connection details.
  const db = new Kysely({ dialect: new PostgresDialect({ pool }) });
  return { db: db.withSchema("neon_auth"), type: "postgres", transaction: true };
}

/** Catalog check only. Runtime never creates or migrates managed authentication tables. */
export async function requireNativeSchema(database) {
  const result = await sql`SELECT to_regclass('neon_auth.wave_account_provider_unique') IS NOT NULL AS account_guard,
    to_regclass('neon_auth."rateLimit"') IS NOT NULL AS rate_limit`.execute(database.db);
  if (!result.rows[0]?.account_guard || !result.rows[0]?.rate_limit) throw new Error("AUTH_DATABASE_MIGRATION_REQUIRED");
}
