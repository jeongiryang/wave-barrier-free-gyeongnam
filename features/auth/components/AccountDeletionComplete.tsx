"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function AccountDeletionComplete({ token: serverToken }: { token?: string }) {
  const searchParams = useSearchParams();
  const token = serverToken || searchParams.get("token") || undefined;
  const [state, setState] = useState<"working" | "done" | "error">(token ? "working" : "error");

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch("/api/account/complete-deletion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    }).then((response) => {
      if (!response.ok) throw new Error("cleanup-failed");
      setState("done");
      window.history.replaceState(null, "", "/account/delete-complete");
    }).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setState("error");
    });
    return () => controller.abort();
  }, [token]);

  if (state === "working") return <div className="auth-signed-in"><p role="status" aria-live="polite">계정에 연결된 서비스 데이터를 안전하게 정리하는 중…</p></div>;
  if (state === "done") return <div className="auth-signed-in"><p role="status">계정과 서버에 연결된 커뮤니티 데이터를 삭제했습니다.</p><Link className="auth-primary-link" href="/">서비스 홈으로 이동</Link></div>;
  return <div className="auth-signed-in"><p role="alert">삭제 확인이 만료됐거나 데이터 정리를 완료하지 못했습니다. 운영 문의로 알려 주세요.</p><Link className="auth-primary-link" href="/">서비스 홈으로 이동</Link></div>;
}
