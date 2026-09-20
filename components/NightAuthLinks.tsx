'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { safeAuthReturnPath } from '../lib/auth/return-path.js';
import { useHydratedSession } from '../features/auth/hooks/useHydratedSession';
function AuthLinks({ next, onIntent }: { next: string; onIntent?: () => void }) {
  return <><Link className="night-login" href={`/login?next=${encodeURIComponent(next)}`} onPointerEnter={onIntent} onFocus={onIntent}>로그인</Link><Link className="night-signup" href={`/register?next=${encodeURIComponent(next)}`} onPointerEnter={onIntent} onFocus={onIntent}>회원가입</Link></>;
}
function SessionObserver({ onSession }: { onSession: (authenticated: boolean) => void }) {
  const { data: session, isPending } = useHydratedSession();
  useEffect(() => { if (!isPending) onSession(Boolean(session?.user)); }, [session, isPending, onSession]);
  return null;
}
export default function NightAuthLinks() {
  const pathname = usePathname() || '/planner';
  const [intent, setIntent] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const search = useSearchParams();
  const isAuth = ['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname);
  const next = safeAuthReturnPath(isAuth ? search.get('next') : pathname + (search.size ? `?${search.toString()}` : ''));
  // The public introduction does not need a session until an account action.
  return <>{(pathname !== '/' || intent) && <SessionObserver onSession={setAuthenticated} />}{!authenticated && <AuthLinks next={next} onIntent={() => setIntent(true)} />}</>;
}
