/**
 * 로그인·가입 입력 검사.
 *
 * 이메일은 검사하지 않고 그대로 서버로 보내고 있었다. 그래서 이메일을 비우거나
 * 형식을 잘못 적어도 화면에서는 아무 말이 없다가, 서버 요청이 실패한 뒤
 * "계정 서비스 연결이 지연되고 있습니다"가 떴다. 사용자는 자기 입력이 아니라
 * 서비스가 느린 줄 안다. 무엇을 고쳐야 하는지 알 수 없는 안내였다.
 *
 * 검사 순서도 화면에 놓인 순서와 맞춘다. 위에서부터 채워 내려가는 사람에게
 * 아래쪽 항목 오류부터 알려 주면 어디를 봐야 할지 찾아야 한다.
 */

/** 이메일 길이 상한. RFC 5321이 정한 경로 최대 길이. */
const EMAIL_MAX = 254;
const NAME_MIN = 2;
const NAME_MAX = 40;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

/**
 * 형식이 이메일로 보이는지만 본다. 실제로 받는 주소인지는 메일이 도착해야 알 수
 * 있으므로, 여기서 지나치게 좁히면 멀쩡한 주소를 막게 된다. 공백이 없고,
 * `@`가 하나이며, 양쪽이 비어 있지 않고, 도메인에 점이 있는지까지만 확인한다.
 *
 * @param {string} email
 * @returns {boolean}
 */
export function looksLikeEmail(email) {
  if (typeof email !== "string" || !email || email.length > EMAIL_MAX) return false;
  if (/\s/.test(email)) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain) return false;
  if (!domain.includes(".")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
  return true;
}

/**
 * 화면 순서대로 검사해 첫 번째 문제 하나를 돌려준다.
 *
 * @param {"login" | "register"} mode
 * @param {{ email?: string, password?: string, name?: string, confirmPassword?: string }} raw
 * @returns {{ value?: { email: string, password: string, name: string }, error?: string, field?: "name" | "email" | "password" | "confirmPassword" }}
 */
export function checkAuthCredentials(mode, raw) {
  const email = String(raw?.email ?? "").trim();
  const password = String(raw?.password ?? "");
  const name = String(raw?.name ?? "").trim();
  const confirmPassword = String(raw?.confirmPassword ?? "");

  if (mode === "register" && (name.length < NAME_MIN || name.length > NAME_MAX)) {
    return { error: `표시 이름은 ${NAME_MIN}자 이상 ${NAME_MAX}자 이하로 입력해 주세요.`, field: "name" };
  }
  if (!email) {
    return { error: "이메일을 입력해 주세요.", field: "email" };
  }
  if (!looksLikeEmail(email)) {
    return { error: "이메일 형식을 확인해 주세요. 예: wave@example.com", field: "email" };
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return { error: `비밀번호는 ${PASSWORD_MIN}자 이상 ${PASSWORD_MAX}자 이하로 입력해 주세요.`, field: "password" };
  }
  if (mode === "register" && password !== confirmPassword) {
    return { error: "비밀번호 확인이 일치하지 않습니다.", field: "confirmPassword" };
  }
  return { value: { email, password, name } };
}
