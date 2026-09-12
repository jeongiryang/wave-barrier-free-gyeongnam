"use client";

import { useEffect, useRef, type RefObject } from "react";

/** A native horizontal rail follows the final scene, then releases to the page.
 * Pointer/keyboard browsing takes priority; short screens follow normal page scroll. */
export function useRegionFilm(rail: RefObject<HTMLDivElement | null>, counterRail: RefObject<HTMLDivElement | null>, calm: boolean) {
  const track = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = track.current, viewport = rail.current, opposite = counterRail.current;
    const stage = section?.querySelector<HTMLElement>(".region-showcase-stage");
    if (!section || !viewport || !opposite || !stage) return;
    const media = matchMedia("(prefers-reduced-motion: no-preference)");
    let frame = 0, engaged = false;
    const update = () => {
      frame = 0;

      if (section.dataset.film !== "true" || engaged || section.dataset.helpTourActive === "true") return;
      const rect = section.getBoundingClientRect();
      const stickyTop = 116;
      const sticky = section.dataset.filmSticky === "true";
      const distance = Math.max(1, sticky ? section.offsetHeight - (innerHeight - stickyTop) : section.offsetHeight + innerHeight - stickyTop);
      const progress = Math.max(0, Math.min(1, ((sticky ? stickyTop : innerHeight) - rect.top) / distance));
      // Scroll offsets run in opposite directions, so the top pictures travel
      // right and the lower pictures travel left as the reader moves down.
      viewport.scrollTo({ left: (1 - progress) * Math.max(0, viewport.scrollWidth - viewport.clientWidth), behavior: "instant" });
      opposite.scrollTo({ left: progress * Math.max(0, opposite.scrollWidth - opposite.clientWidth), behavior: "instant" });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const configure = () => {
      section.dataset.film = String(media.matches && !calm);
      section.dataset.filmSticky = String(media.matches && !calm && innerWidth > 960 && innerHeight >= 740);
      if (stage.offsetHeight > innerHeight - 116) section.dataset.filmSticky = "false";
      schedule();
    };
    const engage = () => { engaged = true; };
    const onWheel = (event: WheelEvent) => { if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) engage(); else if (event.deltaY) { engaged = false; schedule(); } };
    let touchX = 0, touchY = 0;
    const touchStart = (event: TouchEvent) => { touchX = event.touches[0]?.clientX || 0; touchY = event.touches[0]?.clientY || 0; };
    const touchMove = (event: TouchEvent) => { const point = event.touches[0]; if (point && Math.abs(point.clientY - touchY) > Math.abs(point.clientX - touchX)) { engaged = false; schedule(); } };
    section.addEventListener("touchstart", touchStart, { passive: true });
    section.addEventListener("touchmove", touchMove, { passive: true });
    section.addEventListener("pointerdown", engage, { passive: true });
    section.addEventListener("keydown", engage);
    section.addEventListener("focusin", engage);
    section.addEventListener("wheel", onWheel, { passive: true });
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", configure);
    media.addEventListener("change", configure);
    const observer = new ResizeObserver(() => {
      if (section.dataset.filmSticky === "true" && stage.offsetHeight > innerHeight - 116) section.dataset.filmSticky = "false";
      schedule();
    });
    observer.observe(viewport);
    observer.observe(opposite);
    observer.observe(stage);
    configure();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      section.removeEventListener("pointerdown", engage); section.removeEventListener("keydown", engage);
      section.removeEventListener("focusin", engage);
      section.removeEventListener("wheel", onWheel); removeEventListener("scroll", schedule);
      section.removeEventListener("touchstart", touchStart); section.removeEventListener("touchmove", touchMove);
      removeEventListener("resize", configure); media.removeEventListener("change", configure);
    };
  }, [calm, rail, counterRail]);
  return track;
}
