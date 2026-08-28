import { parseModeratorUserIds } from "../community/moderation.js";

export const REQUIRED_PRODUCTION_ENV = [
  "TOUR_API_SERVICE_KEY_ENCODED",
  "KAKAO_MAP_JAVASCRIPT_KEY",
  "KAKAO_REST_API_KEY",
  "DATABASE_URL",
  "NEON_AUTH_BASE_URL",
  "NEON_AUTH_COOKIE_SECRET",
  "CRON_SECRET",
];

export function productionEnvironmentErrors(env) {
  const errors = REQUIRED_PRODUCTION_ENV
    .filter((name) => !String(env[name] ?? "").trim())
    .map((name) => `${name}: 값이 없습니다.`);

  const cookieSecret = String(env.NEON_AUTH_COOKIE_SECRET ?? "");
  if (cookieSecret && cookieSecret.length < 32) {
    errors.push("NEON_AUTH_COOKIE_SECRET: 32자 이상이어야 합니다.");
  }

  const cronSecret = String(env.CRON_SECRET ?? "").trim();
  if (cronSecret && cronSecret.length < 32) {
    errors.push("CRON_SECRET: 32자 이상이어야 합니다.");
  }

  // 운영자 목록은 선택 사항이다. 비어 있으면 moderation-actions의 권한 검사가
  // 모든 운영 요청을 403으로 거부해 fail-closed 상태가 된다. 값이 제공된 경우에만
  // 잘못되거나 중복된 ID를 Production 설정 오류로 취급한다.
  const rawModeratorIds = String(env.COMMUNITY_MODERATOR_USER_IDS ?? "");
  const configuredModeratorIds = rawModeratorIds.split(",").map((id) => id.trim()).filter(Boolean);
  const moderatorIds = parseModeratorUserIds(rawModeratorIds);
  if (configuredModeratorIds.length > 0 && moderatorIds.length !== configuredModeratorIds.length) {
    errors.push("COMMUNITY_MODERATOR_USER_IDS: 잘못되거나 중복된 ID가 있습니다.");
  }
  return errors;
}
