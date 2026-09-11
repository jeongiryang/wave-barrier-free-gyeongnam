"use client";

import { useEffect, useRef, type RefObject } from "react";

/** A native horizontal rail follows the final scene, then releases to the page.
 * Pointer/keyboard browsing takes priority; short screens use an ordinary rail. */
export function useRegionFilm(rail: RefObject<HTMLDivElement | null>, calm: boolean) {
  const track = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = track.current, viewport = rail.current;
    if (!section || !viewport) return;
    const media = matchMedia("(min-width: 961px) and (min-height: 740px) and (prefers-reduced-motion: no-preference)");
    let frame = 0, engaged = false;
    const update = () => {
      frame = 0;
      const linked = media.matches && !calm;
      section.dataset.film = String(linked);
      if (!linked || engaged || section.contains(document.activeElement)) return;
      const rect = section.getBoundingClientRect();
      const stickyTop = 116;
      const distance = Math.max(1, section.offsetHeight - (innerHeight - stickyTop));
      const progress = Math.max(0, Math.min(1, (stickyTop - rect.top) / distance));
      viewport.scrollLeft = progress * Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const engage = () => { engaged = true; };
    const onWheel = (event: WheelEvent) => { if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) engage(); };
    section.addEventListener("pointerdown", engage, { passive: true });
    section.addEventListener("keydown", engage);
    viewport.addEventListener("wheel", onWheel, { passive: true });
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    update();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      section.removeEventListener("pointerdown", engage); section.removeEventListener("keydown", engage);
      viewport.removeEventListener("wheel", onWheel); removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule); media.removeEventListener("change", schedule);
    };
  }, [calm, rail]);
  return track;
}
