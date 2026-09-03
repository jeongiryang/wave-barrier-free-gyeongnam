import { completeCommunityAccountDeletionFromToken } from "../../../../features/community/server/account-repository";
import { readSameOriginJson } from "../../../../lib/server-request";

function response(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function POST(request: Request) {
  const parsed = await readSameOriginJson(request, 1_024);
  if (parsed.response) return parsed.response;
  const token = String(parsed.body.token || "");
  try {
    const completed = await completeCommunityAccountDeletionFromToken(token);
    if (completed === null) return response({ error: "서비스 데이터 정리 기능을 준비 중입니다." }, 503);
    if (!completed) return response({ error: "삭제 확인이 만료됐거나 이미 처리됐습니다." }, 410);
    return response({ ok: true });
  } catch {
    return response({ error: "서비스 데이터 정리를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}
