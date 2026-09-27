"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

const subscribeReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function usePreviewReady() { return useSyncExternalStore(subscribeReady, clientReady, serverReady); }

/** Local demonstrations never read or write the visitor's trip. */
export default function usePreviewPlayback(frames: number, delay = 4000, scrollPlayback = true) {
  const ready = usePreviewReady();
  const ref = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(0);
  const [manual, setManual] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const canObserve = typeof IntersectionObserver === 'function';
    const update = () => setReduced(!canObserve || document.documentElement.dataset.motion === 'calm');
    update();
    const settings = new MutationObserver(update);
    settings.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] });
    const node = ref.current;
    let inView = false;
    const visibility = () => setVisible(inView && !document.hidden);
    const observer = canObserve ? new IntersectionObserver(entries => { inView = entries[0].isIntersecting; visibility(); }, { threshold: .2 }) : null;
    if (node) observer?.observe(node);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer?.disconnect(); settings.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (!visible || paused || reduced || !scrollPlayback) return;
    let raf = 0;
    const move = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const bounds = ref.current?.getBoundingClientRect();
        if (!bounds) return;
        const progress = (innerHeight * .75 - bounds.top) / (bounds.height + innerHeight * .25);
        setFrame(Math.max(0, Math.min(frames - 1, Math.floor(progress * frames))));
      });
    };
    window.addEventListener('scroll', move, { passive: true });
    return () => { window.removeEventListener('scroll', move); cancelAnimationFrame(raf); };
  }, [visible, paused, reduced, frames, scrollPlayback]);
  useEffect(() => {
    if (!visible || paused || reduced) return;
    const timer = window.setInterval(() => setFrame(value => (value + 1) % frames), delay);
    return () => clearInterval(timer);
  }, [visible, paused, reduced, frames, delay]);
  return { ref, ready, frame: reduced && !manual ? frames - 1 : frame, paused, reduced, toggle: () => setPaused(value => !value), select: (value: number) => { setFrame(value); setManual(true); setPaused(true); } };
}
