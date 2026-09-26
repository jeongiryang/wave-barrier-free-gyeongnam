"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { authClient } from "../../../lib/auth/client";
import { useHydratedSession } from "../hooks/useHydratedSession";
import { useSitePreferences } from "../../../components/SitePreferences";
import { useHeaderPopover } from "../../../components/useHeaderPopover";
import ProfileIcon from "./ProfileIcon";

export default function AccountMenu({ loginHref = "/login", initialOpen = false, iconOnly = false }: { loginHref?: string; initialOpen?: boolean; iconOnly?: boolean }) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const { data: session, isPending } = useHydratedSession();
  const [failed, setFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const signOutLock = useRef(false);
  const entry = useRef<HTMLElement | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(initialOpen);
  const initialFocusPending = useRef(initialOpen);
  useHeaderPopover(panel, entry, open, () => setOpen(false));
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menu.current && event.target instanceof Node && !menu.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  useEffect(() => {
    if (!initialFocusPending.current) return;
    // Closing or leaving the menu cancels the initial focus request. A late
    // session response must not pull focus out of the user's next task.
    if (!open) { initialFocusPending.current = false; return; }
    if (!isPending) {
      initialFocusPending.current = false;
      entry.current?.focus();
    }
  }, [isPending, open]);

  const label = session?.user?.name?.trim() || session?.user?.email || (en ? "Account" : "계정");
  async function signOut() {
    if (signOutLock.current) return;
    signOutLock.current = true;
    setSigningOut(true);
    setFailed(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("sign-out-failed");
      window.location.reload();
    } catch {
      setFailed(true);
      setSigningOut(false);
      signOutLock.current = false;
    }
  }

  return (
    <div className="account-menu" ref={menu} data-open={open} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault(); setOpen(false); entry.current?.focus();
      }
    }}>
      <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} ref={(element) => { entry.current = element; }} role="button" aria-label={en ? `${label} account menu` : `${label} 계정 메뉴`}>{iconOnly ? <ProfileIcon /> : <><span>{label}</span></>}</button>
      {open && <div id={panelId} ref={panel} popover="auto" className="account-popover header-dropdown">
        {isPending ? <p role="status">{en ? "Loading account status" : "계정 상태를 불러오는 중"}</p> : !session?.user ? <>
          <strong>{en ? "Your WAVE account" : "나의 WAVE 계정"}</strong>
          <a href={loginHref}>{en ? "Log in" : "로그인"}</a>
          <a href="/register">{en ? "Create account" : "회원가입"}</a>
        </> : <>
        <strong>{label}</strong><small>{en ? "WAVE account" : "WAVE 계정"}</small>
        <a href="/account">{en ? "Manage account" : "계정 관리"}</a>
        <Link href="/my-trips">{en ? "Saved account trips" : "계정에 저장한 여행"}</Link>
        <Link href="/guide">{en ? "Travel guide (Korean)" : "여행 저장·동행 사용법"}</Link>
        <button type="button" disabled={signingOut} onClick={signOut}>{signingOut ? en ? "Logging out…" : "로그아웃 중…" : en ? "Log out" : "로그아웃"}</button>
        {failed && <p role="alert">{en ? "We couldn't log you out. Please try again." : "로그아웃을 완료하지 못했습니다. 다시 시도해 주세요."}</p>}
      </>}
      </div>}
    </div>
  );
}
