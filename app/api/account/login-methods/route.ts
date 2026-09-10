import { headers } from "next/headers";
import { isKakaoAuthConfigured } from "../../../../lib/auth/server";
import { readyNativeAuth } from "../../../../lib/auth/native-runtime";

export async function GET() {
  const options = { headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } };
  if (!isKakaoAuthConfigured()) return Response.json({ enabled: false }, options);
  try {
    const auth = await readyNativeAuth();
    const accounts = await auth.api.listUserAccounts({ headers: await headers() });
    return Response.json({ enabled: true, password: accounts.some((account) => account.providerId === "credential"), kakao: accounts.some((account) => account.providerId === "kakao") }, options);
  } catch {
    return Response.json({ error: "로그인 방법을 확인하지 못했습니다. 다시 로그인해 주세요." }, { ...options, status: 401 });
  }
}
