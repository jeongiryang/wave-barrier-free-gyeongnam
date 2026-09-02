"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

const DRIFT_SELECTOR = [
  ".manifesto > h2",
  ".product-story-copy",
  ".region-story-copy",
  ".landing-community-copy",
  ".evidence-story > div:first-child",
  ".landing-cta h2",
].join(",");

export function useLandingMotion() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");
  const landingRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    const driftNodes = Array.from(document.querySelectorAll<HTMLElement>(DRIFT_SELECTOR));
    const prefersCalm = () => media.matches || root.dataset.motion === "calm";

    const resetMotion = () => {
      landingRef.current?.style.setProperty("--landing-progress", "0");
      landingRef.current?.style.setProperty("--hero-shift", "0px");
      landingRef.current?.style.setProperty("--pointer-rx", "0");
      landingRef.current?.style.setProperty("--pointer-ry", "0");
      driftNodes.forEach((node) => node.style.setProperty("--land-drift", "0px"));
    };

    const updateDrift = () => {
      if (prefersCalm()) {
        resetMotion();
        return;
      }
      const viewportHeight = Math.max(window.innerHeight, 1);
      for (const node of driftNodes) {
        const rect = node.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewportHeight) continue;
        const center = rect.top + (rect.height / 2);
        const normalized = (viewportHeight / 2 - center) / viewportHeight;
        const offset = Math.max(-16, Math.min(16, normalized * 32));
        node.style.setProperty("--land-drift", `${offset.toFixed(2)}px`);
      }
    };

    const update = () => {
      const y = window.scrollY;
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      setScrolled(y > 32);
      if (y > lastY + 6) setScrollDirection("down");
      if (y < lastY - 6) setScrollDirection("up");
      if (prefersCalm()) resetMotion();
      else {
        landingRef.current?.style.setProperty("--landing-progress", String(Math.min(y / max, 1)));
        landingRef.current?.style.setProperty("--hero-shift", `${Math.min(y, 820)}px`);
      }
      updateDrift();
      lastY = y;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    media.addEventListener("change", update);
    const preferenceObserver = new MutationObserver(update);
    preferenceObserver.observe(root, { attributes: true, attributeFilter: ["data-motion"] });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      media.removeEventListener("change", update);
      preferenceObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    const nodes = document.querySelectorAll<HTMLElement>("[data-land-reveal]");
    const prefersCalm = () => media.matches || root.dataset.motion === "calm";
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        (entry.target as HTMLElement).classList.toggle("is-visible", prefersCalm() || entry.isIntersecting);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -10%" });
    nodes.forEach((node) => observer.observe(node));

    const syncPreference = () => {
      if (prefersCalm()) nodes.forEach((node) => node.classList.add("is-visible"));
      else nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        node.classList.toggle("is-visible", rect.bottom > 0 && rect.top < window.innerHeight * .9);
      });
    };
    syncPreference();
    media.addEventListener("change", syncPreference);
    const preferenceObserver = new MutationObserver(syncPreference);
    preferenceObserver.observe(root, { attributes: true, attributeFilter: ["data-motion"] });
    return () => {
      observer.disconnect();
      media.removeEventListener("change", syncPreference);
      preferenceObserver.disconnect();
    };
  }, []);

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const rect = landingRef.current?.getBoundingClientRect();
    if (!rect || !landingRef.current) return;
    if (document.documentElement.dataset.motion === "calm" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    landingRef.current.style.setProperty("--pointer-x", `${event.clientX}px`);
    landingRef.current.style.setProperty("--pointer-y", `${event.clientY}px`);
    landingRef.current.style.setProperty("--pointer-rx", String((event.clientX / Math.max(window.innerWidth, 1) - .5) * 2));
    landingRef.current.style.setProperty("--pointer-ry", String((event.clientY / Math.max(window.innerHeight, 1) - .5) * 2));
  }

  return { landingRef, scrolled, scrollDirection, handlePointerMove };
}
