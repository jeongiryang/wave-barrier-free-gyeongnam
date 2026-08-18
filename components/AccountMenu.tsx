"use client";

import { createAuthClient } from "@neondatabase/auth/next";
import { useEffect, useRef, useState, type FormEvent } from "react";

const authClient = createAuthClient();

export default function AccountMenu() {
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : triggerRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const name = String(form.get("name") || "여행자").trim();
    try {
      const result = mode === "sign-up"
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message || "로그인을 완료하지 못했습니다.");
      setOpen(false);
      window.location.reload();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.";
      setMessage(/fetch|network|503/i.test(raw) ? "로그인 기능을 준비 중입니다. 운영 설정 후 이용할 수 있어요." : raw);
    } finally { setSubmitting(false); }
  }

  if (session?.user) return <div className="account-menu signed-in"><span>{session.user.name || session.user.email}</span><button type="button" onClick={async () => { await authClient.signOut(); window.location.reload(); }}>로그아웃</button></div>;

  return <>
    <button className="account-button" type="button" onClick={() => setOpen(true)} disabled={isPending} ref={triggerRef}>{isPending ? "확인 중" : "로그인"}</button>
    {open && <div className="modal-backdrop account-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title" aria-describedby="account-description" ref={dialogRef}>
        <button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="로그인 창 닫기">×</button>
        <span className="dialog-kicker">W.A.V.E ACCOUNT</span>
        <h2 id="account-title">{mode === "sign-in" ? "내 여행을 이어가세요." : "여행자 계정을 만들어요."}</h2>
        <p id="account-description">W.A.V.E 전용 계정으로 로그인합니다. 다른 기관의 계정이나 비밀번호를 요구하지 않습니다.</p>
        <form onSubmit={submit}>
          {mode === "sign-up" && <label>이름<input name="name" autoComplete="name" required minLength={2} /></label>}
          <label>이메일<input name="email" type="email" autoComplete="email" required /></label>
          <label>비밀번호<input name="password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={8} /></label>
          {message && <p className="account-message" role="alert">{message}</p>}
          <button className="account-submit" type="submit" disabled={submitting}>{submitting ? "처리 중…" : mode === "sign-in" ? "로그인" : "가입하기"}</button>
        </form>
        <button className="account-switch" type="button" onClick={() => { setMode((value) => value === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }}>{mode === "sign-in" ? "처음이신가요? 계정 만들기" : "이미 계정이 있나요? 로그인"}</button>
        <small>여행 보관함은 현재 이 브라우저에 저장되며, 공유 링크만 30일간 보관합니다. 현재 위치 좌표는 계정이나 서버에 저장하지 않습니다.</small>
      </div>
    </div>}
  </>;
}
