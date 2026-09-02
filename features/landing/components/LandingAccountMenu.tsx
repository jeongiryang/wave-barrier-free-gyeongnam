"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";

const ACCOUNT_IDLE_DELAY_MS = 4_000;
let accountMenuModule: ReturnType<typeof importAccountMenu> | null = null;

function importAccountMenu() {
  return import("../../auth/components/AccountMenu");
}

function preloadAccountMenu() {
  accountMenuModule ??= importAccountMenu().catch((error) => {
    accountMenuModule = null;
    throw error;
  });
  return accountMenuModule;
}

const DeferredAccountMenu = lazy(preloadAccountMenu);

/**
 * 공개 랜딩의 첫 렌더에서는 100KB(gzip)에 가까운 인증 SDK를 요청하지 않는다.
 * 사용자가 계정 영역에 관심을 보이거나 첫 화면의 유휴 시간이 지난 뒤에만
 * 실제 세션 UI를 붙인다. 그 전에도 로그인 링크는 그대로 사용할 수 있다.
 */
export default function LandingAccountMenu() {
  const [ready, setReady] = useState(false);
  const mounted = useRef(true);

  const reveal = () => {
    void preloadAccountMenu()
      .then(() => { if (mounted.current) setReady(true); })
      .catch(() => undefined);
  };

  useEffect(() => {
    mounted.current = true;
    const timer = window.setTimeout(reveal, ACCOUNT_IDLE_DELAY_MS);
    return () => {
      mounted.current = false;
      window.clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return <a
      className="account-button"
      href="/login"
      onPointerEnter={reveal}
      onFocus={() => { void preloadAccountMenu().catch(() => undefined); }}
      onTouchStart={() => { void preloadAccountMenu().catch(() => undefined); }}
    >로그인</a>;
  }

  return <Suspense fallback={<a className="account-button" href="/login">로그인</a>}>
    <DeferredAccountMenu />
  </Suspense>;
}
