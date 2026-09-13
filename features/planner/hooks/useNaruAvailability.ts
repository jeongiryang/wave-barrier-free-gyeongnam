'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** A transient probe failure is recoverable; a successful chat is newer evidence. */
export function useNaruAvailability(open: boolean) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const sequence = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const invalidate = useCallback(() => {
    sequence.current++;
    pending.current?.abort();
    pending.current = null;
  }, []);
  const markConnected = useCallback(() => {
    invalidate();
    setAvailable(true);
    setChecking(false);
  }, [invalidate]);
  const recheck = useCallback(async () => {
    if (!open) return;
    invalidate();
    const id = sequence.current;
    const control = new AbortController();
    pending.current = control;
    setChecking(true);
    const timer = setTimeout(() => control.abort(), 10000);
    try {
      const response = await fetch('/api/assistant', { signal: control.signal, cache: 'no-store' });
      const data = await response.json();
      if (id === sequence.current) setAvailable(response.ok && data.available === true);
    } catch {
      if (id === sequence.current) setAvailable(false);
    } finally {
      clearTimeout(timer);
      if (id === sequence.current) { pending.current = null; setChecking(false); }
    }
  }, [open, invalidate]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => { void recheck(); });
    const online = () => { void recheck(); };
    window.addEventListener('online', online);
    return () => {
      cancelAnimationFrame(frame);
      invalidate();
      window.removeEventListener('online', online);
    };
  }, [open, recheck, invalidate]);
  return { available, checking, recheck, markConnected };
}
