"use client";

import { useRef, useState, type FormEvent } from "react";
import { authClient } from "../../../lib/auth/client";
import { looksLikeEmail } from "../validation";

const GENERIC_SUCCESS = "입력한 주소가 등록된 계정이면 비밀번호 재설정 메일을 보냈습니다. 받은편지함과 스팸함을 확인해 주세요.";

export default function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const lock = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    setMessage("");
    setSuccess(false);
    if (!looksLikeEmail(email)) {
      setMessage("이메일 형식을 확인해 주세요. 예: wave@example.com");
      document.getElementById("recovery-email")?.focus();
      return;
    }
    lock.current = true;
    setSubmitting(true);
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error && /fetch|network|503|unavailable/i.test(result.error.message || "")) {
        throw new Error("network");
      }
      setSuccess(true);
      setMessage(GENERIC_SUCCESS);
    } catch {
      setMessage("계정 서비스 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
      lock.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  return <>
    <p className="auth-description">가입할 때 사용한 이메일을 입력하면 재설정 링크를 보내드립니다. 계정 존재 여부는 화면에 구분해 표시하지 않습니다.</p>
    <form onSubmit={submit} noValidate>
      <div className="auth-field"><label htmlFor="recovery-email">이메일</label><input id="recovery-email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} required aria-describedby="recovery-message" /></div>
      <p id="recovery-message" className={`auth-message${success ? " success" : ""}`} role={message ? "status" : undefined} aria-live="polite">{message}</p>
      <button className="auth-submit" type="submit" disabled={submitting || success}>{submitting ? "전송하는 중…" : success ? "메일을 확인해 주세요" : "재설정 메일 보내기"}</button>
    </form>
    <div className="auth-switch"><a href="/login">로그인으로 돌아가기</a></div>
  </>;
}
