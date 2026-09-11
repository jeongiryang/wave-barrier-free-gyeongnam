"use client";

import { useEffect, useRef, type RefObject } from "react";

/** A native horizontal rail follows the final scene, then releases to the page.
 * Pointer/keyboard browsing takes priority; short screens use an ordinary rail. */
export function useRegionFilm(rail: RefObject<HTMLDivElement | null>, counterRail: RefObject<HTMLDivElement | null>, calm: boolean) {
  const track = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = track.current, viewport = rail.current, opposite = counterRail.current;
    const stage = section?.querySelector<HTMLElement>(".region-showcase-stage");
    if (!section || !viewport || !opposite || !stage) return;
    const media = matchMedia("(min-width: 961px) and (min-height: 740px) and (prefers-reduced-motion: no-preference)");
    let frame = 0, engaged = false;
    const update = () => {
      frame = 0;
      const linked = section.dataset.film === "true";
      if (linked && stage.offsetHeight > innerHeight - 116) section.dataset.film = "false";
      if (section.dataset.film !== "true" || engaged || section.dataset.helpTourActive === "true" || section.contains(document.activeElement)) return;
      const rect = section.getBoundingClientRect();
      const stickyTop = 116;
      const distance = Math.max(1, section.offsetHeight - (innerHeight - stickyTop));
      const progress = Math.max(0, Math.min(1, (stickyTop - rect.top) / distance));
      // Scroll offsets run in opposite directions, so the top pictures travel
      // right and the lower pictures travel left as the reader moves down.
      viewport.scrollTo({ left: (1 - progress) * Math.max(0, viewport.scrollWidth - viewport.clientWidth), behavior: "instant" });
      opposite.scrollTo({ left: progress * Math.max(0, opposite.scrollWidth - opposite.clientWidth), behavior: "instant" });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const configure = () => {
      section.dataset.film = String(media.matches && !calm);
      if (stage.offsetHeight > innerHeight - 116) section.dataset.film = "false";
      schedule();
    };
    const engage = () => { engaged = true; };
    const onWheel = (event: WheelEvent) => { if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) engage(); };
    section.addEventListener("pointerdown", engage, { passive: true });
    section.addEventListener("keydown", engage);
    viewport.addEventListener("wheel", onWheel, { passive: true });
    opposite.addEventListener("wheel", onWheel, { passive: true });
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", configure);
    media.addEventListener("change", configure);
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    observer.observe(opposite);
    configure();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      section.removeEventListener("pointerdown", engage); section.removeEventListener("keydown", engage);
      viewport.removeEventListener("wheel", onWheel); removeEventListener("scroll", schedule);
      opposite.removeEventListener("wheel", onWheel);
      removeEventListener("resize", configure); media.removeEventListener("change", configure);
    };
  }, [calm, rail, counterRail]);
  return track;
}
