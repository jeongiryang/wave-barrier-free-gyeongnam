"use client";

import HydratedAuthForm from "./HydratedAuthForm";
import type { AuthMode } from "../types";
import { useAuthForm } from "../hooks/useAuthForm";
import KakaoLogin from "./KakaoLogin";

function FieldIcon({ kind }: { kind: "email" | "lock" | "eye" }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">{kind === "email" ? <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></> : kind === "lock" ? <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></> : <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}</svg>;
}

export default function AuthForm({ mode, returnTo, kakaoEnabled = false }: { mode: AuthMode; returnTo?: string; kakaoEnabled?: boolean }) {
  const auth = useAuthForm(mode, returnTo);
  function fieldProps(field: string, describedBy?: string) {
    const invalid = auth.invalidField === field;
    return { "aria-invalid": invalid || undefined, "aria-describedby": [describedBy, invalid ? "auth-message" : ""].filter(Boolean).join(" ") || undefined };
  }
  if (!auth.isPending && auth.session?.user) return <section className="auth-card auth-signed-in" aria-labelledby="auth-title">
    <p className="auth-kicker">WELCOME TO WAVE</p><h1 id="auth-title">여행을 이어가세요.</h1>
    <p>{auth.session.user.name || auth.session.user.email}님, 다시 만나 반가워요.</p>
    <a className="auth-primary-link" href={auth.next}>계속하기 <span aria-hidden="true">→</span></a>
    <a className="auth-guest" href="/account">계정 관리</a>
  </section>;

  return <section className="auth-card" aria-labelledby="auth-title" aria-busy={auth.submitting}>
    <p className="auth-kicker">WELCOME TO WAVE</p>
    <h1 id="auth-title">{auth.registering ? "우리의 여행을 시작해요." : "여행을 이어가세요."}</h1>
    <p className="auth-description">{auth.registering ? <>마음에 드는 여행을 담고,<br />함께 나눌 이야기를 시작하세요.</> : <>저장한 여행과 나눈 이야기를<br />WAVE에서 다시 만나세요.</>}</p>
    {kakaoEnabled && <KakaoLogin returnTo={returnTo} />}
    <HydratedAuthForm onSubmit={auth.submit} onInput={auth.clearError} noValidate>
      {auth.registering && <div className="auth-field"><label htmlFor="auth-name">표시 이름</label><input id="auth-name" name="name" autoComplete="name" placeholder="여행에서 사용할 이름" minLength={2} maxLength={40} required {...fieldProps("name", "auth-name-help")} /><small id="auth-name-help">2–40자로 입력해 주세요. 게시글과 댓글에 표시됩니다.</small></div>}
      <div className="auth-field"><label htmlFor="auth-email">이메일</label><div className="auth-input-icon"><FieldIcon kind="email" /><input id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="hello@example.com" maxLength={254} required {...fieldProps("email")} /></div></div>
      <div className="auth-field"><label htmlFor="auth-password">비밀번호</label><div className="password-field auth-input-icon"><FieldIcon kind="lock" /><input id="auth-password" name="password" type={auth.showPassword ? "text" : "password"} autoComplete={auth.registering ? "new-password" : "current-password"} placeholder="비밀번호를 입력하세요" minLength={8} maxLength={128} required {...fieldProps("password", auth.registering ? "auth-password-help" : undefined)} /><button type="button" aria-label={auth.showPassword ? "비밀번호 숨기기" : "비밀번호 표시"} aria-controls={auth.registering ? "auth-password auth-confirm-password" : "auth-password"} aria-pressed={auth.showPassword} disabled={auth.isPending} onClick={auth.togglePassword}><FieldIcon kind="eye" /></button></div>{auth.registering && <small id="auth-password-help">8–128자로 입력해 주세요.</small>}</div>
      {auth.registering && <div className="auth-field"><label htmlFor="auth-confirm-password">비밀번호 확인</label><input id="auth-confirm-password" name="confirmPassword" type={auth.showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} maxLength={128} required {...fieldProps("confirmPassword")} /></div>}
      {!auth.registering && <div className="auth-recovery-link"><span>나의 여행을 한곳에서</span><a href="/forgot-password">비밀번호 찾기</a></div>}
      <p id="auth-message" className={`auth-message${auth.success ? " success" : ""}`} role={auth.message ? "alert" : undefined} aria-live="polite">{auth.message}</p>
      <button className="auth-submit" type="submit" disabled={auth.submitting || auth.isPending || auth.success}>{auth.success ? "이동하는 중…" : auth.submitting ? "처리하는 중…" : auth.registering ? "가입하고 시작하기" : <>로그인 <span aria-hidden="true">→</span></>}</button>
    </HydratedAuthForm>
    <div className="auth-switch">{auth.registering ? "이미 계정이 있나요?" : "WAVE가 처음이신가요?"} <a href={`${auth.registering ? "/login" : "/register"}?next=${encodeURIComponent(auth.next)}`}>{auth.registering ? "로그인" : "회원가입"} <span aria-hidden="true">↗</span></a></div>
    {auth.registering && <p className="auth-legal">가입 전 <a href="/privacy">개인정보처리방침</a>과 <a href="/terms">이용약관</a>을 확인해 주세요.</p>}
    <div className="auth-guest"><a href="/planner">로그인 없이 둘러보기 <span aria-hidden="true">↗</span></a><small>여행지 탐색과 일정 설계는 바로 이용할 수 있어요.</small></div>
  </section>;
}
