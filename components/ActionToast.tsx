"use client";
import { useEffect, useRef, useState } from 'react';
import { eventName, pendingKey } from '../lib/action-toast';

export default function ActionToast() {
  const [notice, setNotice] = useState<{ message: string; serial: number } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let serial = 0;
    const show = (message: string) => setNotice({ message, serial: ++serial });
    const receive = (event: Event) => { const message = (event as CustomEvent<unknown>).detail; if (typeof message === 'string' && message) show(message); };
    window.addEventListener(eventName, receive);
    try { const pending = JSON.parse(sessionStorage.getItem(pendingKey) || 'null'); sessionStorage.removeItem(pendingKey); if (pending?.expires > Date.now() && typeof pending.message === 'string') show(pending.message); } catch { /* Transient feedback is optional. */ }
    return () => window.removeEventListener(eventName, receive);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const node = root.current;
    // Manual popover stays above native dialogs without moving keyboard focus.
    node?.showPopover?.();
    const timer = setTimeout(() => setNotice(null), 2800);
    return () => { clearTimeout(timer); node?.hidePopover?.(); };
  }, [notice]);
  return <div ref={root} popover="manual" className="wave-action-toast" role="status" aria-live="polite" aria-atomic="true">{notice?.message}</div>;
}
