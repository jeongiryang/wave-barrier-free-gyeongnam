import { parseModeratorUserIds, validateCommunityReport, validateModerationDecision } from "../../../lib/community/moderation.js";
import { readSameOriginJson } from "../../../lib/server-request";
import { authenticatedCommunityUser, communityResponse, databaseUnavailable } from "./http";
import { applyCommunityModeration, createCommunityReport, listOpenCommunityReports } from "./moderation-repository";

function moderatorIds() {
  return new Set(parseModeratorUserIds(process.env.COMMUNITY_MODERATOR_USER_IDS));
}

async function moderatorUser() {
  const auth = await authenticatedCommunityUser();
  if (auth.error) return auth;
  if (!moderatorIds().has(auth.user.id)) return { error: communityResponse({ error: "운영자 권한이 필요합니다." }, 403) };
  return auth;
}

export async function reportCommunityTarget(request: Request, postId: string, targetType: "post" | "comment", targetId: string) {
  const auth = await authenticatedCommunityUser();
  if (auth.error) return auth.error;
  const parsed = await readSameOriginJson(request, 1200);
  if (parsed.response) return parsed.response;
  const validated = validateCommunityReport(parsed.body);
  if (validated.error || !validated.value) return communityResponse({ error: validated.error || "신고 내용을 확인해 주세요." }, 400);
  const result = await createCommunityReport({ reporterId: auth.user.id, postId, targetType, targetId, ...validated.value });
  if ("unavailable" in result) return databaseUnavailable("신고");
  if ("missing" in result) return communityResponse({ error: "신고할 내용을 찾을 수 없습니다." }, 404);
  if ("ownContent" in result) return communityResponse({ error: "본인이 작성한 내용은 신고할 수 없습니다." }, 400);
  if ("rateLimited" in result) return communityResponse({ error: "신고 횟수가 많습니다. 잠시 후 다시 시도해 주세요." }, 429);
  if ("duplicate" in result) return communityResponse({ error: "이미 운영팀에 전달한 내용입니다." }, 409);
  return communityResponse({ reported: true, underReview: result.underReview }, 201);
}

export async function listModerationQueue() {
  const auth = await moderatorUser();
  if (auth.error) return auth.error;
  const reports = await listOpenCommunityReports();
  return reports ? communityResponse({ reports }) : databaseUnavailable("운영 목록");
}

export async function moderateCommunityTarget(request: Request) {
  const auth = await moderatorUser();
  if (auth.error) return auth.error;
  const parsed = await readSameOriginJson(request, 1000);
  if (parsed.response) return parsed.response;
  const validated = validateModerationDecision(parsed.body);
  if (validated.error || !validated.value) return communityResponse({ error: validated.error || "운영 처리 내용을 확인해 주세요." }, 400);
  const result = await applyCommunityModeration(validated.value.targetType, validated.value.targetId, validated.value.status);
  if ("unavailable" in result) return databaseUnavailable("운영 처리");
  if ("missing" in result) return communityResponse({ error: "처리할 내용을 찾을 수 없습니다." }, 404);
  return communityResponse({ ok: true });
}
