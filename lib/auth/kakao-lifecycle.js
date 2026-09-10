import { timingSafeEqual } from "node:crypto";

export function validKakaoWebhook(authorization, params, adminKey) {
  if (!/^[a-f0-9]{32}$/i.test(adminKey || "")) return false;
  const expected = Buffer.from(`KakaoAK ${adminKey}`);
  const actual = Buffer.from(authorization || "");
  return actual.length === expected.length && timingSafeEqual(actual, expected)
    && params.getAll("app_id").length === 1 && params.get("app_id") === "1539906"
    && params.getAll("user_id").length === 1 && /^[1-9][0-9]{0,18}$/.test(params.get("user_id") || "");
}

export function createKakaoUnlink(adminKey, request = fetch) {
  if (!/^[a-f0-9]{32}$/i.test(adminKey || "")) throw new Error("KAKAO_UNLINK_NOT_CONFIGURED");
  return async (accountId) => {
    if (!/^[1-9][0-9]{0,18}$/.test(accountId)) throw new Error("KAKAO_UNLINK_INVALID_ACCOUNT");
    try {
      const result = await request("https://kapi.kakao.com/v1/user/unlink", {
        method: "POST",
        headers: { Authorization: `KakaoAK ${adminKey}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
        body: new URLSearchParams({ target_id_type: "user_id", target_id: accountId }),
        signal: AbortSignal.timeout(8_000),
        redirect: "error",
      });
      const body = await result.json();
      // Kakao -101 means this app no longer has a linked user: an idempotent unlink.
      if ((!result.ok || String(body.id) !== accountId) && !(result.status === 400 && body.code === -101)) throw new Error("refused");
    } catch {
      throw new Error("KAKAO_UNLINK_FAILED");
    }
  };
}
