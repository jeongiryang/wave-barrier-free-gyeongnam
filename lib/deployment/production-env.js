import { parseModeratorUserIds } from "../community/moderation.js";

export const REQUIRED_PRODUCTION_ENV = [
  "TOUR_API_SERVICE_KEY_ENCODED",
  "KAKAO_MAP_JAVASCRIPT_KEY",
  "KAKAO_REST_API_KEY",
  "DATABASE_URL",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
  "COMMUNITY_MODERATOR_USER_IDS",
];

export function productionEnvironmentErrors(env) {
  const errors = REQUIRED_PRODUCTION_ENV
    .filter((name) => !String(env[name] ?? "").trim())
    .map((name) => `${name}: 값이 없습니다.`);

  const cookieSecret = String(env.NEON_AUTH_COOKIE_SECRET ?? "");
  if (cookieSecret && cookieSecret.length < 32) {
    errors.push("NEON_AUTH_COOKIE_SECRET: 32자 이상이어야 합니다.");
  }

  const rawModeratorIds = String(env.COMMUNITY_MODERATOR_USER_IDS ?? "");
  const configuredModeratorIds = rawModeratorIds.split(",").map((id) => id.trim()).filter(Boolean);
  const moderatorIds = parseModeratorUserIds(rawModeratorIds);
  if (configuredModeratorIds.length > 0 && moderatorIds.length !== configuredModeratorIds.length) {
    errors.push("COMMUNITY_MODERATOR_USER_IDS: 잘못되거나 중복된 ID가 있습니다.");
  }
  return errors;
}
