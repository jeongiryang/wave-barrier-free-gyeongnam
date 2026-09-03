import {
  completeCommunityAccountDeletion,
  prepareCommunityAccountDeletion,
  revokeCommunityAccountDeletion,
} from "../../../features/community/server/account-repository";
import { getAuth } from "../../../lib/auth/server";
import { readSameOriginJson } from "../../../lib/server-request";

function response(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function POST(request: Request) {
  const parsed = await readSameOriginJson(request, 2_048);
  if (parsed.response) return parsed.response;
  const password = String(parsed.body.password || "");
  const confirmation = String(parsed.body.confirmation || "");
  if (password.length < 8 || password.length > 128 || confirmation !== "계정 삭제") {
    return response({ error: "현재 비밀번호와 확인 문구를 다시 확인해 주세요." }, 400);
  }

  const auth = getAuth();
  if (!auth) return response({ error: "계정 서비스 연결이 지연되고 있습니다." }, 503);
  const session = await auth.getSession().catch(() => null);
  const userId = String(session?.data?.user?.id || "");
  if (!userId) return response({ error: "로그인이 필요한 기능입니다.", login: "/login?next=%2Faccount" }, 401);

  const prepared = await prepareCommunityAccountDeletion(userId).catch(() => null);
  if (!prepared) return response({ error: "계정에 연결된 서비스 데이터를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  const callbackURL = new URL(`/account/delete-complete?token=${prepared.token}`, request.url).toString();
  let result;
  try {
    result = await auth.deleteUser({ password, callbackURL });
  } catch {
    await revokeCommunityAccountDeletion(prepared.sql, prepared.hash).catch(() => undefined);
    return response({ error: "계정 삭제를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
  if (result.error || !result.data?.success) {
    await revokeCommunityAccountDeletion(prepared.sql, prepared.hash).catch(() => undefined);
    return response({ error: "현재 비밀번호와 계정 상태를 확인한 뒤 다시 시도해 주세요." }, 400);
  }
  if (result.data.message === "Verification email sent") {
    return response({ ok: true, pendingVerification: true });
  }
  try {
    const cleaned = await completeCommunityAccountDeletion(prepared.sql, prepared.token);
    if (cleaned) return response({ ok: true, deleted: true });
  } catch {
    // 인증 계정은 이미 삭제됐다. 정리 권한을 폐기하지 않고 완료 화면에서 다시 시도한다.
  }
  return response({ ok: true, cleanupPending: true, cleanupToken: prepared.token }, 202);
}
