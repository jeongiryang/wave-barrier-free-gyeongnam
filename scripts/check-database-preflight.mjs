import { readFileSync } from "node:fs";
import { PRODUCTION_DATABASE_TARGET } from "../lib/deployment/database-preflight.js";

try {
  const report = JSON.parse(readFileSync(0, "utf8"));
  const counts = [report.totalPosts, report.activePosts, report.affected008];
  if (report.ok !== true || report.mode !== "inspect" || report.readOnly !== true
    || Object.entries(PRODUCTION_DATABASE_TARGET).some(([key, value]) => report.target?.[key] !== value)
    || counts.some((value) => !Number.isSafeInteger(value) || value < 0)
    || counts[2] > counts[1] || counts[1] > counts[0]
    || !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(report.checkedAt)) throw new Error();
  // Construct a whitelist, rather than printing the raw server/CLI response.
  console.log(JSON.stringify({
    ok: true, mode: "inspect", readOnly: true, target: PRODUCTION_DATABASE_TARGET,
    totalPosts: counts[0], activePosts: counts[1], affected008: counts[2], checkedAt: report.checkedAt,
  }));
} catch {
  console.error("Production DB read-only preflight failed; no migration or promotion is authorised.");
  process.exitCode = 1;
}
