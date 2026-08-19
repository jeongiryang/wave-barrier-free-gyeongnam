import type { AuthCredentials, AuthMode } from "./types";

export function safeAuthReturnPath(value: string | null | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/community";
}

export function friendlyAuthError(raw: string) {
  if (/fetch|network|503|unavailable/i.test(raw)) return "계정 서비스 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  if (/invalid|credential|password|401/i.test(raw)) return "이메일 또는 비밀번호를 확인해 주세요.";
  if (/already|exist|duplicate/i.test(raw)) return "이미 사용 중인 이메일입니다. 로그인해 주세요.";
  return raw || "요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function readAuthCredentials(mode: AuthMode, form: FormData): { value?: AuthCredentials; error?: string } {
  const value = {
    email: String(form.get("email") || "").trim(),
    password: String(form.get("password") || ""),
    name: String(form.get("name") || "").trim(),
  };
  const confirmPassword = String(form.get("confirmPassword") || "");

  if (mode === "register" && (value.name.length < 2 || value.name.length > 40)) {
    return { error: "표시 이름은 2자 이상 40자 이하로 입력해 주세요." };
  }
  if (value.password.length < 8 || value.password.length > 128) {
    return { error: "비밀번호는 8자 이상 128자 이하로 입력해 주세요." };
  }
  if (mode === "register" && value.password !== confirmPassword) {
    return { error: "비밀번호 확인이 일치하지 않습니다." };
  }
  return { value };
}
