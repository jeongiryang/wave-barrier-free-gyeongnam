"use client";

import Link from "next/link";
import { useSitePreferences } from "./SitePreferences";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { navigationScroll } from "../lib/header-scroll.js";
import { readTripValue } from "../lib/current-trip-storage.js";
import WaveHeaderTools from "./WaveHeaderTools";

function subscribe(update: () => void) {
  window.addEventListener("storage", update);
  window.addEventListener("focus", update);
  return () => { window.removeEventListener("storage", update); window.removeEventListener("focus", update); };
}
function savedSnapshot() {
  try {
    const ids: unknown = JSON.parse(readTripValue(window.localStorage, "wave-saved-places") || "[]");
    return Array.isArray(ids) ? new Set(ids.filter(id => typeof id === "string")).size : 0;
  } catch { return 0; }
}

export default function WaveHeader({ current, savedCount, onSaved, className = "" }: {
  current: "intro" | "planner" | "community" | "travel-book";
  savedCount?: number;
  onSaved?: () => void;
  className?: string;
}) {
  const en = useSitePreferences().locale === "en";
  const header = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let state = { y: window.scrollY, direction: 0, distance: 0, hidden: false };
    let frame = 0;
    const update = () => {
      frame = 0;
      const locked = Boolean(header.current?.contains(document.activeElement) || header.current?.querySelector('[aria-expanded="true"], details[open]'));
      state = navigationScroll(state, window.scrollY, locked);
      setHidden(state.hidden);
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const focus = () => { state = { ...state, hidden: false, distance: 0 }; setHidden(false); };
    const node = header.current;
    window.addEventListener("scroll", scroll, { passive: true });
    node?.addEventListener("focusin", focus);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", scroll); node?.removeEventListener("focusin", focus); };
  }, []);
  const storedCount = useSyncExternalStore(subscribe, savedSnapshot, () => 0);
  const count = savedCount ?? storedCount;
  const bookmark = <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M6 20V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15l-6-4-6 4Z" /></svg><span className="wave-trip-count" aria-hidden="true">{count}</span></>;
  return <header ref={header} className={`wave-header ${className}`} data-hidden={hidden}>
    <Link className="wave-wordmark" href={current === "intro" ? "#top" : "/"} aria-label={en ? "WAVE home" : "WAVE 홈"}>WAVE</Link>
    <nav aria-label={en ? "Main menu" : "주요 메뉴"}>
      <Link href="/" aria-current={current === "intro" ? "page" : undefined}>{en ? "About WAVE" : "서비스 소개"}</Link>
      <Link href="/planner" aria-current={current === "planner" ? "page" : undefined}>{en ? "Plan a trip" : "여행 설계"}</Link>
      <Link href="/community" aria-current={current === "community" ? "page" : undefined}>{en ? "Community" : "커뮤니티"}</Link>
    </nav>
    <div className="wave-header-actions" style={{ position: "relative", display: "flex", justifySelf: "end" }}><WaveHeaderTools />{onSaved ? <button className="wave-my-trips" type="button" onClick={onSaved} aria-label={`내 여행, 담은 장소 ${count}곳`}>{bookmark}</button>
      : <Link className="wave-my-trips" href="/travel-book" aria-current={current === "travel-book" ? "page" : undefined} aria-label={`내 여행, 담은 장소 ${count}곳`}>{bookmark}</Link>}</div>
  </header>;
}
