'use client';
import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/** Notify the persistent workspace about an explicit planner link, after hydration. */
export default function PlannerNavigation({ onNaru }: { onNaru: (prompt?: string) => void }) {
  const pathname = usePathname(), search = useSearchParams().toString();
  const previousPath = useRef('');
  useEffect(() => {
    const entered = previousPath.current !== pathname;
    previousPath.current = pathname;
    if (pathname !== '/planner') return;
    const frame = requestAnimationFrame(() => {
      if (window.location.pathname !== '/planner') return;
      // Criteria edits also update search params; they must keep the user's focus.
      if (entered) window.dispatchEvent(new Event('wave:planner-navigation'));
      const url = new URL(window.location.href);
      if (url.searchParams.get('assistant') === 'naru') {
        onNaru(url.searchParams.get('prompt') || '');
        url.searchParams.delete('assistant'); url.searchParams.delete('prompt');
        window.history.replaceState(window.history.state, '', url);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, search, onNaru]);
  return null;
}
