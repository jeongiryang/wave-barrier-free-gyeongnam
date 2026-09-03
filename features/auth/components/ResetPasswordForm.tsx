"use client";

import { useRef, useState, type FormEvent } from "react";
import { authClient } from "../../../lib/auth/client";

export default function ResetPasswordForm({ token }: { token?: string }) {
  const [message, setMessage] = useState(token ? "" : "유효한 재설정 링크가 필요합니다. 이메일에서 받은 링크를 다시 열어 주세요.");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const lock = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !token) return;
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password") || "");
    const confirmation = String(form.get("confirmPassword") || "");
    setMessage("");
    if (newPassword.length < 8 || newPassword.length > 128) {
      setMessage("새 비밀번호는 8자 이상 128자 이하로 입력해 주세요.");
      document.getElementById("reset-password")?.focus();
      return;
    }
    if (newPassword !== confirmation) {
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      document.getElementById("reset-confirm-password")?.focus();
      return;
    }
    lock.current = true;
    setSubmitting(true);
    try {
      const result = await authClient.resetPassword({ newPassword, token });
      if (result.error) throw new Error(result.error.message || "reset-failed");
      setSuccess(true);
      setMessage("비밀번호를 새로 설정했습니다. 이제 새 비밀번호로 로그인해 주세요.");
    } catch {
      setMessage("재설정 링크가 만료됐거나 이미 사용됐습니다. 새 링크를 요청해 주세요.");
      lock.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  return <>
    <p className="auth-description">새 비밀번호를 설정하면 이전 링크는 다시 사용할 수 없습니다.</p>
    <form onSubmit={submit} noValidate>
      <div className="auth-field"><label htmlFor="reset-password">새 비밀번호</label><div className="password-field"><input id="reset-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required aria-describedby="reset-password-help reset-message" /><button type="button" aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>{showPassword ? "숨기기" : "보기"}</button></div><small id="reset-password-help">8자 이상 128자 이하로 입력해 주세요.</small></div>
      <div className="auth-field"><label htmlFor="reset-confirm-password">새 비밀번호 확인</label><input id="reset-confirm-password" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required aria-describedby="reset-message" /></div>
      <p id="reset-message" className={`auth-message${success ? " success" : ""}`} role={message ? "alert" : undefined} aria-live="polite">{message}</p>
      <button className="auth-submit" type="submit" disabled={!token || submitting || success}>{submitting ? "변경하는 중…" : success ? "변경 완료" : "새 비밀번호 저장"}</button>
    </form>
    <div className="auth-switch">{success ? <a href="/login">새 비밀번호로 로그인</a> : <a href="/forgot-password">재설정 링크 다시 받기</a>}</div>
  </>;
}
