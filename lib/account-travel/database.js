import { Kysely, PostgresDialect } from "kysely";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { securePostgresUrl } from "../deployment/environment-validation.js";
import { travelRepository } from "./repository.js";

let repository;
export function accountTravelRepository() {
  if (repository) return repository;
  const connectionString = securePostgresUrl(process.env.DATABASE_URL, { allowLocalhost: process.env.NODE_ENV !== "production" });
  if (!connectionString) throw new Error("TRAVEL_DATABASE_UNAVAILABLE");
  neonConfig.webSocketConstructor = globalThis.WebSocket;
  const pool = new Pool({ connectionString, max: 3, connectionTimeoutMillis: 8000, idleTimeoutMillis: 10000 });
  pool.on("error", () => {});
  repository = travelRepository(new Kysely({ dialect: new PostgresDialect({ pool }) }));
  return repository;
}
