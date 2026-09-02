"use client";

import type { MouseEvent, ReactNode } from "react";
import { scrollToSection } from "../lib/reduced-motion.js";

/**
 * Fragment navigation alone scrolls in every browser, but it does not reliably
 * move the keyboard/screen-reader focus. Keep the real href as a no-JS fallback
 * and explicitly focus the destination when React is available.
 */
export default function SkipLink({ href, children }: { href: `#${string}`; children: ReactNode }) {
  function skip(event: MouseEvent<HTMLAnchorElement>) {
    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    const addedTabIndex = !target.hasAttribute("tabindex");
    if (addedTabIndex) target.tabIndex = -1;
    target.focus({ preventScroll: true });
    scrollToSection(id);
    window.history.replaceState(null, "", href);

    if (addedTabIndex) {
      target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
    }
  }

  return <a className="skip-link" href={href} onClick={skip}>{children}</a>;
}
