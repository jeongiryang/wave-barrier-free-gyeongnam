export const PRODUCTION_MIGRATION_NAMES = Object.freeze([
  "001_community.sql",
  "002_community_moderation.sql",
  "003_trips.sql",
  "004_community_seed.sql",
  "005_community_field_reports.sql",
]);

/** @param {string} source */
export function splitMigrationStatements(source) {
  return String(source)
    .split(/^-- migrate:split\s*$/m)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

/**
 * 파일명 배열과 같은 순서의 SQL 원문을 하나의 원자적 실행 계획으로 만든다.
 * @param {string[]} sources
 */
export function orderedMigrationStatements(sources) {
  if (!Array.isArray(sources) || sources.length !== PRODUCTION_MIGRATION_NAMES.length) {
    throw new Error("Production migration 원문을 모두 확인하지 못했습니다.");
  }
  return sources.flatMap(splitMigrationStatements);
}
