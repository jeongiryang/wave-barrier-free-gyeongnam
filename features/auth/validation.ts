import { checkAuthCredentials } from "../../lib/auth/credentials.js";
import type { AuthCredentials, AuthMode } from "./types";

export { AUTH_FALLBACK_PATH, safeAuthReturnPath } from "../../lib/auth/return-path.js";
export { looksLikeEmail } from "../../lib/auth/credentials.js";

export function friendlyAuthError(raw: string) {
  if (/fetch|network|503|unavailable/i.test(raw)) return "계정 서비스 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  if (/invalid|credential|password|401/i.test(raw)) return "이메일 또는 비밀번호를 확인해 주세요.";
  if (/already|exist|duplicate/i.test(raw)) return "이미 사용 중인 이메일입니다. 로그인해 주세요.";
  return raw || "요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function readAuthCredentials(mode: AuthMode, form: FormData): { value?: AuthCredentials; error?: string; field?: string } {
  return checkAuthCredentials(mode, {
    email: String(form.get("email") || ""),
    password: String(form.get("password") || ""),
    name: String(form.get("name") || ""),
    confirmPassword: String(form.get("confirmPassword") || ""),
  });
}
