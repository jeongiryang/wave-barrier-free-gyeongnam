import { headers } from "next/headers";
import { requiredCommunityUser } from "../../features/community/server/session";
import { readyNativeAuth } from "../../lib/auth/native-runtime";
import { readSameOriginJson } from "../../lib/server-request";
import { accountTravelRepository } from "../../lib/account-travel/database.js";
import { TravelError } from "../../lib/account-travel/model.js";
import { KakaoMessageError, privateTravelMessage, sendKakaoMemo } from "../../lib/kakao-travel.js";
function reply(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", ...(status === 429 ? { "Retry-After": "60" } : {}) } }); }
export async function kakaoMessageHandler(request: Request) {
  const parsed = await readSameOriginJson(request, 1024);
  if (parsed.response) return parsed.response;
  const session = await requiredCommunityUser();
  if (!session.user) return reply({ error: "로그인 상태를 확인한 뒤 나에게 보내기를 이용해 주세요." }, session.error === "unavailable" ? 503 : 401);
  try {
    const repo = accountTravelRepository();
    const trip = await repo.get(session.user.id, parsed.body.tripId);
    const auth = await readyNativeAuth();
    const context = await auth.$context;
    const account = (await context.internalAdapter.findAccounts(session.user.id)).find(account => account.providerId === "kakao");
    if (!account || !account.scope?.split(/[ ,]+/).includes("talk_message")) return reply({ code: "CONSENT_REQUIRED", error: "카카오 메시지 전송에 동의하면 나와의 채팅으로 일정을 보낼 수 있어요." }, 403);
    let token;
    try { token = await auth.api.getAccessToken({ body: { providerId: "kakao", accountId: account.accountId }, headers: await headers() }); }
    catch { return reply({ code: "CONSENT_REQUIRED", error: "카카오 연결을 다시 확인해 주세요." }, 403); }
    if (!token.accessToken) return reply({ code: "CONSENT_REQUIRED", error: "카카오 연결을 다시 확인해 주세요." }, 403);
    await repo.reserveKakaoSend(session.user.id, trip.id);
    await sendKakaoMemo(token.accessToken, privateTravelMessage(trip.payload, trip.id));
    return reply({ ok: true });
  } catch (error) {
    if (error instanceof TravelError || error instanceof KakaoMessageError) return reply({ error: error.message, ...(error instanceof KakaoMessageError ? { code: error.code } : {}) }, error.status);
    return reply({ error: "나에게 보내기를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}
