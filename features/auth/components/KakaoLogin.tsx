"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "../../../lib/auth/client";
import { safeAuthReturnPath } from "../validation";

export default function KakaoLogin({ returnTo }: { returnTo?: string }) {
  const params = useSearchParams();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const callbackError = params.has("error");
  async function signIn() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setMessage("");
    try {
      const result = await authClient.signIn.social({ provider: "kakao", callbackURL: safeAuthReturnPath(returnTo), errorCallbackURL: "/login?error=kakao" });
      if (result.error) throw new Error("failed");
    } catch {
      setMessage("카카오 로그인에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      lock.current = false;
      setPending(false);
    }
  }
  return <div className="kakao-auth">
    <button type="button" className="auth-submit kakao-login-button" onClick={signIn} disabled={pending}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.48 3 2 6.5 2 10.82c0 2.77 1.86 5.2 4.67 6.59l-.95 3.51c-.08.3.26.54.52.37l4.14-2.76c.53.07 1.07.11 1.62.11 5.52 0 10-3.5 10-7.82S17.52 3 12 3Z" /></svg>
      {pending ? "카카오로 이동하는 중…" : "카카오 로그인"}
    </button>
    {(message || callbackError) && <p className="auth-message" role="alert">{message || "카카오 로그인을 완료하지 못했습니다. 같은 이메일의 W.A.V.E 계정이 있다면 이메일로 로그인한 뒤 ‘계정 관리’에서 카카오를 연결해 주세요."}</p>}
    <p className="auth-switch">또는 이메일로 계속하기</p>
  </div>;
}
