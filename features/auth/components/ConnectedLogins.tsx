"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "../../../lib/auth/client";
import type { LoginMethods } from "../hooks/useLoginMethods";

export default function ConnectedLogins({ methods, onUnlink }: { methods: LoginMethods | null; onUnlink: () => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function connect() {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const result = await authClient.linkSocial({ provider: "kakao", callbackURL: "/account", errorCallbackURL: "/account?error=kakao" });
      if (result.error) throw new Error("failed");
    } catch {
      setPending(false);
      setMessage("다시 로그인한 뒤 같은 이메일의 카카오 계정을 연결해 주세요.");
    }
  }
  async function unlink() {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const result = await authClient.unlinkAccount({ providerId: "kakao" });
      if (result.error) throw new Error("failed");
      onUnlink();
      setMessage("카카오 연결을 해제했습니다. 이메일 로그인과 기존 여행자 이야기는 유지됩니다.");
    } catch { setMessage("연결을 해제하지 못했습니다. 다시 로그인한 뒤 시도해 주세요."); }
    finally { setPending(false); }
  }
  async function reauthenticate() {
    if (pending) return;
    setPending(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("failed");
      router.push("/login?next=%2Faccount");
    } catch { setPending(false); setMessage("다시 로그인할 준비를 하지 못했습니다. 잠시 후 시도해 주세요."); }
  }
  return <section aria-labelledby="connected-logins-title">
    <h3 id="connected-logins-title">로그인 방법</h3>
    {!methods ? <p role="status">로그인 방법을 확인하고 있습니다. 오래 걸리면 다시 로그인해 주세요.</p> : <>
      <p>{methods.kakao ? "카카오 계정이 연결되어 있습니다." : "기존 계정에 카카오를 연결하면 같은 여행자 이야기로 이어집니다."}</p>
      {methods.kakao
        ? methods.password
          ? <button className="auth-submit" type="button" disabled={pending} onClick={unlink}>카카오 연결 해제</button>
          : <p>카카오 연결을 해제하려면 먼저 <a href="/forgot-password">이메일 비밀번호를 설정</a>해 주세요.</p>
        : <button className="auth-submit kakao-login-button" type="button" disabled={pending} onClick={connect}>카카오 계정 연결</button>}
    </>}
    {(message || params.has("error")) && <p className="auth-message" role="status">{message || "카카오 계정을 연결하지 못했습니다. 두 계정의 이메일이 같은지 확인하고 다시 로그인해 주세요."}</p>}
    <button className="auth-submit" type="button" disabled={pending} onClick={reauthenticate}>다시 로그인</button>
  </section>;
}
