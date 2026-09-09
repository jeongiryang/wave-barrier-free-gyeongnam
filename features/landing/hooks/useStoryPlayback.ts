"use client";
import { useEffect, useRef, useState } from "react";

/** Local presentation only. No storage, product hooks or network calls. */
export function useStoryPlayback(steps: number, interval: number, loop = false) {
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [context, setContext] = useState({ inView: false, visible: false, still: true, intro: true });
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const sync = () => {
      const intro = document.documentElement.classList.contains("arrival-open");
      if (loop && intro) setIndex(0);
      setContext(current => ({ ...current, still: media.matches || connection?.saveData === true, visible: !document.hidden, intro }));
    };
    const observer = new IntersectionObserver(([entry]) => setContext(current => ({ ...current, inView: entry.isIntersecting })), { threshold: .3 });
    if (root.current) observer.observe(root.current);
    const introObserver = new MutationObserver(sync);
    introObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const frame = requestAnimationFrame(sync);
    media.addEventListener("change", sync); connection?.addEventListener("change", sync); document.addEventListener("visibilitychange", sync);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); introObserver.disconnect(); media.removeEventListener("change", sync); connection?.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); };
  }, [loop]);
  const completed = !loop && index === steps - 1;
  const running = context.inView && context.visible && !context.still && !context.intro && !paused && !completed;
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setIndex(current => loop ? (current + 1) % steps : Math.min(current + 1, steps - 1)), interval);
    return () => clearTimeout(timer);
  }, [running, index, steps, interval, loop]);
  return { root, index: context.still ? loop ? 0 : steps - 1 : index, running, paused, still: context.still, completed, toggle: () => {
    if (context.still) return;
    if (completed) { setIndex(0); setPaused(false); }
    else setPaused(current => !current);
  } };
}
