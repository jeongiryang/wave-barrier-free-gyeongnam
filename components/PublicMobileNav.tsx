"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export type PublicNavLink = {
  href: string;
  label: string;
  current?: boolean;
};

/** A compact replacement for public header links that disappear on narrow screens. */
export default function PublicMobileNav({ links }: { links: PublicNavLink[] }) {
  const [open, setOpen] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const panelId = `public-nav-${useId().replace(/:/g, "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setInteractive(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!open) return;
    const firstLink = rootRef.current?.querySelector<HTMLAnchorElement>("nav a");
    firstLink?.focus();

    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    };
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

  return <div className="public-mobile-nav" ref={rootRef}>
    <button
      ref={triggerRef}
      className="public-mobile-nav-trigger"
      type="button"
      disabled={!interactive}
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={open ? "주요 메뉴 닫기" : "주요 메뉴 열기"}
      onClick={() => setOpen((current) => !current)}
    >
      <span aria-hidden="true">{open ? "×" : "☰"}</span>
    </button>
    {open && <nav id={panelId} className="public-mobile-nav-panel" aria-label="모바일 주요 메뉴">
      {links.map((link) => <Link
        key={link.href}
        href={link.href}
        aria-current={link.current ? "page" : undefined}
        onClick={() => setOpen(false)}
      >{link.label}</Link>)}
    </nav>}
  </div>;
}
