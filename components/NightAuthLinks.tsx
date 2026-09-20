'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { safeAuthReturnPath } from '../lib/auth/return-path.js';
import { useHydratedSession } from '../features/auth/hooks/useHydratedSession';
type SessionState = 'pending' | 'guest' | 'authenticated';
function SessionObserver({ onSession }: { onSession: (state: SessionState) => void }) {
  const { data: session, isPending } = useHydratedSession();
  useEffect(() => { onSession(isPending ? 'pending' : session?.user ? 'authenticated' : 'guest'); }, [session, isPending, onSession]);
  return null;
}
export default function NightAuthLinks() {
  const pathname = usePathname() || '/planner';
  const [intent, setIntent] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('pending');
  const search = useSearchParams();
  const isAuth = ['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname);
  const next = safeAuthReturnPath(isAuth ? search.get('next') : pathname + (search.size ? `?${search.toString()}` : ''));
  // The public introduction does not need a session until an account action.
  // Keep this anchor mounted when the session resolves so keyboard focus stays put.
  return <>{(pathname !== '/' || intent) && <SessionObserver onSession={setSessionState} />}<Link className="night-login" href={sessionState === 'guest' ? `/login?next=${encodeURIComponent(next)}` : '/account'} onPointerEnter={() => setIntent(true)} onFocus={() => setIntent(true)}>{sessionState === 'guest' ? '로그인' : sessionState === 'authenticated' ? '계정 관리' : '계정'}</Link>{sessionState === 'guest' && <Link className="night-signup" href={`/register?next=${encodeURIComponent(next)}`}>회원가입</Link>}</>;
}
