"use client";
import { useEffect, type RefObject } from "react";

/** Animate on entry, never hide content while waiting for JavaScript or an observer. */
export default function useLandingReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!root.current || !window.IntersectionObserver || !Element.prototype.animate) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const cancel = () => { animations.forEach(animation => animation.cancel()); animations.clear(); };
    const reduced = () => media.matches || document.documentElement.dataset.motion === "calm";
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (reduced()) return;
        const animation = entry.target.animate([
          { opacity: 0, transform: "translateY(18px)" },
          { opacity: 1, transform: "none" },
        ], { duration: 550, easing: "cubic-bezier(.22,1,.36,1)" });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      });
    }, { threshold: .08, rootMargin: "0px 0px -5% 0px" });
    root.current.querySelectorAll("[data-land-reveal]").forEach(node => observer.observe(node));
    const onPreference = () => { if (reduced()) cancel(); };
    const preferenceObserver = new MutationObserver(onPreference);
    preferenceObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
    media.addEventListener("change", onPreference);
    return () => { observer.disconnect(); preferenceObserver.disconnect(); media.removeEventListener("change", onPreference); cancel(); };
  }, [root]);
}
