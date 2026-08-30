"use client";

import type { AuthMode } from "../types";
import { useAuthForm } from "../hooks/useAuthForm";

export default function AuthForm({ mode, returnTo }: { mode: AuthMode; returnTo?: string }) {
  const auth = useAuthForm(mode, returnTo);

  /**
   * 문제가 된 칸에만 표시를 붙이고, 그 칸에서 안내 문구를 읽도록 연결한다.
   * 화면 낭독기가 칸에 들어온 순간 무엇이 잘못됐는지 함께 읽어 준다.
   */
  function fieldProps(field: string, describedBy?: string) {
    const invalid = auth.invalidField === field;
    return {
      "aria-invalid": invalid || undefined,
      "aria-describedby": [describedBy, invalid ? "auth-message" : ""].filter(Boolean).join(" ") || undefined,
    };
  }

  if (!auth.isPending && auth.session?.user) {
    return (
      <section className="auth-card auth-signed-in" aria-labelledby="auth-title">
        <p className="auth-kicker">W.A.V.E ACCOUNT</p>
        <h1 id="auth-title">이미 로그인되어 있습니다.</h1>
        <p>{auth.session.user.name || auth.session.user.email} 계정으로 여행자 기능을 이용할 수 있습니다.</p>
        <a className="auth-primary-link" href={auth.next}>계속하기 <span aria-hidden="true">→</span></a>
      </section>
    );
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title" aria-busy={auth.submitting}>
      <p className="auth-kicker">W.A.V.E ACCOUNT</p>
      <h1 id="auth-title">{auth.registering ? "여행자 계정 만들기" : "여행을 이어가세요"}</h1>
      <p className="auth-description">W.A.V.E 전용 계정입니다. 다른 기관의 계정이나 비밀번호를 요구하지 않습니다.</p>
      <form onSubmit={auth.submit} onInput={auth.clearInvalid} noValidate>
        {auth.registering && <div className="auth-field"><label htmlFor="auth-name">표시 이름</label><input id="auth-name" name="name" autoComplete="name" minLength={2} maxLength={40} required {...fieldProps("name", "auth-name-help")} /><small id="auth-name-help">게시글과 댓글에 표시되며 이메일은 공개하지 않습니다.</small></div>}
        <div className="auth-field"><label htmlFor="auth-email">이메일</label><input id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} required {...fieldProps("email")} /></div>
        <div className="auth-field"><label htmlFor="auth-password">비밀번호</label><div className="password-field"><input id="auth-password" name="password" type={auth.showPassword ? "text" : "password"} autoComplete={auth.registering ? "new-password" : "current-password"} minLength={8} maxLength={128} required {...fieldProps("password", "auth-password-help")} /><button type="button" aria-pressed={auth.showPassword} onClick={auth.togglePassword}>{auth.showPassword ? "숨기기" : "보기"}</button></div><small id="auth-password-help">8자 이상 입력해 주세요.</small></div>
        {auth.registering && <div className="auth-field"><label htmlFor="auth-confirm-password">비밀번호 확인</label><input id="auth-confirm-password" name="confirmPassword" type={auth.showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required {...fieldProps("confirmPassword")} /></div>}
        <p id="auth-message" className={`auth-message${auth.success ? " success" : ""}`} role={auth.message ? "alert" : undefined} aria-live="polite">{auth.message}</p>
        <button className="auth-submit" type="submit" disabled={auth.submitting || auth.isPending}>{auth.submitting ? "안전하게 처리하는 중…" : auth.registering ? "가입하고 시작하기" : "로그인"}</button>
      </form>
      <div className="auth-switch">{auth.registering ? "이미 계정이 있나요?" : "처음 방문하셨나요?"} <a href={`${auth.registering ? "/login" : "/register"}?next=${encodeURIComponent(auth.next)}`}>{auth.registering ? "로그인" : "회원가입"}</a></div>
      <aside className="auth-trust" aria-label="계정과 개인정보 안내"><strong>계정 보안 안내</strong><p>인증은 기존 Neon Auth가 처리하며 W.A.V.E 커뮤니티 DB에 비밀번호를 저장하지 않습니다. 여행 설계와 지도는 로그인 없이 이용할 수 있고, 현재 위치는 기기 안에서만 사용합니다.</p></aside>
    </section>
  );
}
