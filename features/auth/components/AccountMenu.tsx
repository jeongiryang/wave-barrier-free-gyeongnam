"use client";

import { useState } from "react";
import { authClient } from "../../../lib/auth/client";
import { useHydratedSession } from "../hooks/useHydratedSession";

export default function AccountMenu({ loginHref = "/login" }: { loginHref?: string }) {
  const { data: session, isPending } = useHydratedSession();
  const [message, setMessage] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  if (isPending) return <span className="account-loading" role="status" aria-label="계정 상태를 불러오는 중"><i /></span>;
  if (!session?.user) return <a className="account-button" href={loginHref}>로그인</a>;

  const label = session.user.name?.trim() || session.user.email;
  async function signOut() {
    setSigningOut(true);
    setMessage("");
    const result = await authClient.signOut();
    if (result.error) {
      setMessage("로그아웃을 완료하지 못했습니다. 다시 시도해 주세요.");
      setSigningOut(false);
      return;
    }
    window.location.reload();
  }

  return (
    <details className="account-menu">
      <summary aria-label={`${label} 계정 메뉴`}><span>{label}</span><i aria-hidden="true">⌄</i></summary>
      <div className="account-popover">
        <strong>{label}</strong><small>W.A.V.E 계정</small>
        <button type="button" disabled={signingOut} onClick={signOut}>{signingOut ? "로그아웃 중…" : "로그아웃"}</button>
        {message && <p role="alert">{message}</p>}
      </div>
    </details>
  );
}
