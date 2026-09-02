"use client";

import { useEffect, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import { prefersReducedMotion } from "../../../lib/reduced-motion.js";
import type { PlanData } from "../types";

export function usePlannerChrome(plan: PlanData | null) {
  const { motion } = useSitePreferences();
  const [headerHidden, setHeaderHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      const y = window.scrollY;
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      document.documentElement.style.setProperty("--scroll-progress", `${Math.min((y / max) * 100, 100)}%`);
      document.documentElement.style.setProperty("--scroll-shift", `${Math.min(y, 900)}px`);
      setScrolled(y > 24);
      if (y > lastY + 9 && y > 130) setHeaderHidden(true);
      if (y < lastY - 9 || y < 80) setHeaderHidden(false);
      lastY = y;
      frame = 0;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const restoreForKeyboard = (event: FocusEvent) => {
      if ((event.target as HTMLElement | null)?.closest(".site-header")) setHeaderHidden(false);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", restoreForKeyboard);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", restoreForKeyboard);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (reduced) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const node = entry.target as HTMLElement;
        if (entry.isIntersecting) node.classList.add("is-visible");
        else if (entry.boundingClientRect.top > 0) node.classList.remove("is-visible");
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -7%" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [motion, plan]);

  return { headerHidden, scrolled };
}
