export const COMMUNITY_REPORT_REASONS = ["incorrect", "unsafe", "spam", "abuse", "privacy", "other"];
export const COMMUNITY_MODERATION_STATES = ["active", "under_review", "hidden"];

const MAX_MODERATOR_IDS = 100;
const MAX_MODERATOR_ID_LENGTH = 128;

/** 운영자 설정은 잘못된 항목을 버려 권한을 부여하지 않는 방향으로 정규화한다. */
export function parseModeratorUserIds(value) {
  const ids = String(value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && id.length <= MAX_MODERATOR_ID_LENGTH && !/[\s\u0000-\u001f\u007f,]/.test(id));
  return [...new Set(ids)].slice(0, MAX_MODERATOR_IDS);
}

export function validateCommunityReport(body) {
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const details = typeof body?.details === "string" ? body.details.trim().slice(0, 500) : "";
  if (!COMMUNITY_REPORT_REASONS.includes(reason)) return { error: "신고 이유를 선택해 주세요." };
  return { value: { reason, details } };
}

export function validateModerationDecision(body) {
  const targetType = body?.targetType === "post" || body?.targetType === "comment" ? body.targetType : "";
  const targetId = typeof body?.targetId === "string" ? body.targetId.trim().slice(0, 64) : "";
  const status = typeof body?.status === "string" ? body.status : "";
  if (!targetType || !targetId || !["active", "hidden"].includes(status)) {
    return { error: "운영 처리 대상을 확인해 주세요." };
  }
  return { value: { targetType, targetId, status } };
}
