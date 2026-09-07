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
    const seen = new WeakSet<HTMLElement>();
    const reveal = (node: HTMLElement) => { node.classList.add("is-visible"); observer?.unobserve(node); };
    const observer = !reduced && typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target as HTMLElement); });
    }, { threshold: 0, rootMargin: "0px 0px -7%" }) : null;
    const register = (node: HTMLElement) => {
      if (seen.has(node)) return;
      seen.add(node);
      if (observer) observer.observe(node); else reveal(node);
    };
    const scan = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches("[data-reveal]")) register(root);
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach(register);
    };
    // Lazy editors and replacement weather/map panels mount after the plan response.
    scan(document);
    const mutations = new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node instanceof HTMLElement) scan(node); })));
    mutations.observe(document.body, { childList: true, subtree: true });
    const revealFocusedContent = (event: FocusEvent) => {
      let node = event.target instanceof HTMLElement ? event.target : null;
      while (node) { if (node.matches("[data-reveal]")) reveal(node); node = node.parentElement; }
    };
    document.addEventListener("focusin", revealFocusedContent);
    return () => { observer?.disconnect(); mutations.disconnect(); document.removeEventListener("focusin", revealFocusedContent); };
  }, [motion, plan]);

  return { headerHidden, scrolled };
}
