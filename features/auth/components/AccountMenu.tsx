"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authClient } from "../../../lib/auth/client";
import { useHydratedSession } from "../hooks/useHydratedSession";
import { useSitePreferences } from "../../../components/SitePreferences";
import ProfileIcon from "./ProfileIcon";

export default function AccountMenu({ loginHref = "/login", initialOpen = false, iconOnly = false }: { loginHref?: string; initialOpen?: boolean; iconOnly?: boolean }) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const { data: session, isPending } = useHydratedSession();
  const [failed, setFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const signOutLock = useRef(false);
  const entry = useRef<HTMLElement | null>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menu.current && event.target instanceof Node && !menu.current.contains(event.target)) menu.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  useEffect(() => {
    if (initialOpen && !isPending) entry.current?.focus();
  }, [initialOpen, isPending]);

  if (isPending) return <span className="account-loading" role="status" aria-label={en ? "Loading account status" : "계정 상태를 불러오는 중"}><i /></span>;
  if (!session?.user) return <a ref={(element) => { entry.current = element; }} className="account-button" aria-label={en ? "Log in" : "로그인"} href={loginHref}>{iconOnly ? <ProfileIcon /> : en ? "Log in" : "로그인"}</a>;

  const label = session.user.name?.trim() || session.user.email;
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
    <details className="account-menu" ref={menu} open={initialOpen || undefined} onKeyDown={event => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault(); event.currentTarget.open = false; entry.current?.focus();
      }
    }}>
      <summary ref={(element) => { entry.current = element; }} role="button" aria-label={en ? `${label} account menu` : `${label} 계정 메뉴`}>{iconOnly ? <ProfileIcon /> : <><span>{label}</span><i aria-hidden="true">⌄</i></>}</summary>
      <div className="account-popover">
        <strong>{label}</strong><small>{en ? "WAVE account" : "WAVE 계정"}</small>
        <a href="/account">{en ? "Manage account" : "계정 관리"}</a>
        <Link href="/my-trips">{en ? "Saved account trips" : "계정에 저장한 여행"}</Link>
        <Link href="/guide">{en ? "Travel guide (Korean)" : "여행 저장·동행 사용법"}</Link>
        <button type="button" disabled={signingOut} onClick={signOut}>{signingOut ? en ? "Logging out…" : "로그아웃 중…" : en ? "Log out" : "로그아웃"}</button>
        {failed && <p role="alert">{en ? "We couldn't log you out. Please try again." : "로그아웃을 완료하지 못했습니다. 다시 시도해 주세요."}</p>}
      </div>
    </details>
  );
}
