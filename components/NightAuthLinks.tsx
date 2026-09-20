'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { safeAuthReturnPath } from '../lib/auth/return-path.js';
import { useHydratedSession } from '../features/auth/hooks/useHydratedSession';
export default function NightAuthLinks() {
  const { data: session } = useHydratedSession();
  const pathname = usePathname() || '/planner';
  const search = useSearchParams();
  const isAuth = ['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname);
  const next = safeAuthReturnPath(isAuth ? search.get('next') : pathname + (search.size ? `?${search.toString()}` : ''));
  if (session?.user) return null;
  return <><Link className="night-login" href={`/login?next=${encodeURIComponent(next)}`}>로그인</Link><Link className="night-signup" href={`/register?next=${encodeURIComponent(next)}`}>회원가입</Link></>;
}
