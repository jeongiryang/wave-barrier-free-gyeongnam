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
        <p className="auth-kicker">W.A.V.E 계정</p>
        <h2 id="auth-title">이미 로그인되어 있습니다.</h2>
        <p>{auth.session.user.name || auth.session.user.email} 계정으로 여행자 기능을 이용할 수 있습니다.</p>
        <a className="auth-primary-link" href={auth.next}>계속하기 <span aria-hidden="true">→</span></a>
      </section>
    );
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title" aria-busy={auth.submitting}>
      <p className="auth-kicker">W.A.V.E 계정</p>
      <h2 id="auth-title">{auth.registering ? "여행자 계정 만들기" : "여행을 이어가세요"}</h2>
      <p className="auth-description">W.A.V.E 전용 계정입니다. 다른 기관의 계정이나 비밀번호를 요구하지 않습니다.</p>
      <form onSubmit={auth.submit} onInput={auth.clearError} noValidate>
        {auth.registering && <div className="auth-field"><label htmlFor="auth-name">표시 이름</label><input id="auth-name" name="name" autoComplete="name" minLength={2} maxLength={40} required {...fieldProps("name", "auth-name-help")} /><small id="auth-name-help">2자 이상 40자 이하로 입력해 주세요. 게시글과 댓글에는 이 이름만 표시됩니다.</small></div>}
        <div className="auth-field"><label htmlFor="auth-email">이메일</label><input id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} required {...fieldProps("email")} /></div>
        <div className="auth-field"><label htmlFor="auth-password">비밀번호</label><div className="password-field"><input id="auth-password" name="password" type={auth.showPassword ? "text" : "password"} autoComplete={auth.registering ? "new-password" : "current-password"} minLength={8} maxLength={128} required {...fieldProps("password", "auth-password-help")} /><button type="button" aria-label={auth.showPassword ? "비밀번호 숨기기" : "비밀번호 표시"} aria-controls={auth.registering ? "auth-password auth-confirm-password" : "auth-password"} aria-pressed={auth.showPassword} disabled={auth.isPending} onClick={auth.togglePassword}>{auth.showPassword ? "숨기기" : "보기"}</button></div><small id="auth-password-help">8자 이상 128자 이하로 입력해 주세요.</small></div>
        {auth.registering && <div className="auth-field"><label htmlFor="auth-confirm-password">비밀번호 확인</label><input id="auth-confirm-password" name="confirmPassword" type={auth.showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required {...fieldProps("confirmPassword")} /></div>}
        <p id="auth-message" className={`auth-message${auth.success ? " success" : ""}`} role={auth.message ? "alert" : undefined} aria-live="polite">{auth.message}</p>
        <button className="auth-submit" type="submit" disabled={auth.submitting || auth.isPending || auth.success}>{auth.success ? "이동하는 중…" : auth.submitting ? "안전하게 처리하는 중…" : auth.registering ? "가입하고 시작하기" : "로그인"}</button>
      </form>
      <div className="auth-switch">{auth.registering ? "이미 계정이 있나요?" : "처음 방문하셨나요?"} <a href={`${auth.registering ? "/login" : "/register"}?next=${encodeURIComponent(auth.next)}`}>{auth.registering ? "로그인" : "회원가입"}</a></div>
      <aside className="auth-trust" aria-label="계정과 개인정보 안내"><strong>계정 보안과 기능 범위</strong><p>비밀번호는 W.A.V.E의 커뮤니티 데이터에 저장하지 않습니다. 현재 계정은 가입·로그인·로그아웃만 제공하며, 비밀번호 재설정과 계정 탈퇴는 아직 지원하지 않습니다. 여행 설계와 지도는 로그인 없이 이용할 수 있고 현재 위치는 기기 안에서만 사용합니다.</p><div><a href="/privacy">개인정보 안내</a><a href="/terms">이용 안내</a></div></aside>
    </section>
  );
}
