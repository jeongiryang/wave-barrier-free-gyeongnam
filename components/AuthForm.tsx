"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth/client";

type AuthMode = "login" | "register";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/community";
}

function friendlyError(raw: string) {
  if (/fetch|network|503|unavailable/i.test(raw)) return "계정 서비스 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  if (/invalid|credential|password|401/i.test(raw)) return "이메일 또는 비밀번호를 확인해 주세요.";
  if (/already|exist|duplicate/i.test(raw)) return "이미 사용 중인 이메일입니다. 로그인해 주세요.";
  return raw || "요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export default function AuthForm({ mode, returnTo }: { mode: AuthMode; returnTo?: string }) {
  const router = useRouter();
  const registering = mode === "register";
  const { data: session, isPending } = authClient.useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const next = safeNext(returnTo || null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    const name = String(form.get("name") || "").trim();
    setMessage("");
    setSuccess(false);

    if (registering && (name.length < 2 || name.length > 40)) {
      setMessage("표시 이름은 2자 이상 40자 이하로 입력해 주세요.");
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setMessage("비밀번호는 8자 이상 128자 이하로 입력해 주세요.");
      return;
    }
    if (registering && password !== confirmPassword) {
      setMessage("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const result = registering
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message || "인증을 완료하지 못했습니다.");
      setSuccess(true);
      setMessage(registering ? "W.A.V.E 계정이 만들어졌습니다. 여행자 이야기로 이동합니다." : "로그인했습니다. 이전 화면으로 이동합니다.");
      window.setTimeout(() => router.push(next), 450);
    } catch (error) {
      setMessage(friendlyError(error instanceof Error ? error.message : ""));
    } finally {
      setSubmitting(false);
    }
  }

  if (!isPending && session?.user) {
    return (
      <section className="auth-card auth-signed-in" aria-labelledby="auth-title">
        <p className="auth-kicker">W.A.V.E ACCOUNT</p>
        <h1 id="auth-title">이미 로그인되어 있습니다.</h1>
        <p>{session.user.name || session.user.email} 계정으로 여행자 기능을 이용할 수 있습니다.</p>
        <a className="auth-primary-link" href={next}>계속하기 <span aria-hidden="true">→</span></a>
      </section>
    );
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title" aria-busy={submitting}>
      <p className="auth-kicker">W.A.V.E ACCOUNT</p>
      <h1 id="auth-title">{registering ? "여행자 계정 만들기" : "여행을 이어가세요"}</h1>
      <p className="auth-description">W.A.V.E 전용 계정입니다. 다른 기관의 계정이나 비밀번호를 요구하지 않습니다.</p>
      <form onSubmit={submit} noValidate>
        {registering && <div className="auth-field"><label htmlFor="auth-name">표시 이름</label><input id="auth-name" name="name" autoComplete="name" minLength={2} maxLength={40} required aria-describedby="auth-name-help" /><small id="auth-name-help">게시글과 댓글에 표시되며 이메일은 공개하지 않습니다.</small></div>}
        <div className="auth-field"><label htmlFor="auth-email">이메일</label><input id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} required /></div>
        <div className="auth-field"><label htmlFor="auth-password">비밀번호</label><div className="password-field"><input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} minLength={8} maxLength={128} required aria-describedby="auth-password-help auth-message" /><button type="button" aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>{showPassword ? "숨기기" : "보기"}</button></div><small id="auth-password-help">8자 이상 입력해 주세요.</small></div>
        {registering && <div className="auth-field"><label htmlFor="auth-confirm-password">비밀번호 확인</label><input id="auth-confirm-password" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required aria-describedby="auth-message" /></div>}
        <p id="auth-message" className={`auth-message${success ? " success" : ""}`} role={message ? "alert" : undefined} aria-live="polite">{message}</p>
        <button className="auth-submit" type="submit" disabled={submitting || isPending}>{submitting ? "안전하게 처리하는 중…" : registering ? "가입하고 시작하기" : "로그인"}</button>
      </form>
      <div className="auth-switch">{registering ? "이미 계정이 있나요?" : "처음 방문하셨나요?"} <a href={`${registering ? "/login" : "/register"}?next=${encodeURIComponent(next)}`}>{registering ? "로그인" : "회원가입"}</a></div>
      <aside className="auth-trust" aria-label="계정과 개인정보 안내"><strong>계정 보안 안내</strong><p>인증은 기존 Neon Auth가 처리하며 W.A.V.E 커뮤니티 DB에 비밀번호를 저장하지 않습니다. 여행 설계와 지도는 로그인 없이 이용할 수 있고, 현재 위치는 기기 안에서만 사용합니다.</p></aside>
    </section>
  );
}
