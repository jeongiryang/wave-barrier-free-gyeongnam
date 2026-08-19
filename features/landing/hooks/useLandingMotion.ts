"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

export function useLandingMotion() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("down");
  const landingRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      setScrolled(y > 32);
      if (y > lastY + 6) setScrollDirection("down");
      if (y < lastY - 6) setScrollDirection("up");
      landingRef.current?.style.setProperty("--landing-progress", String(Math.min(y / max, 1)));
      landingRef.current?.style.setProperty("--hero-shift", `${Math.min(y, 820)}px`);
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
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = document.querySelectorAll<HTMLElement>("[data-land-reveal]");
    if (reduced) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) (entry.target as HTMLElement).classList.add("is-visible");
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -10%" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const rect = landingRef.current?.getBoundingClientRect();
    if (!rect || !landingRef.current) return;
    landingRef.current.style.setProperty("--pointer-x", `${event.clientX}px`);
    landingRef.current.style.setProperty("--pointer-y", `${event.clientY}px`);
    landingRef.current.style.setProperty("--pointer-rx", String((event.clientX / Math.max(window.innerWidth, 1) - .5) * 2));
    landingRef.current.style.setProperty("--pointer-ry", String((event.clientY / Math.max(window.innerHeight, 1) - .5) * 2));
  }

  return { landingRef, scrolled, scrollDirection, handlePointerMove };
}
