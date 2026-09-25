"use client";

import Link from "next/link";
import { useSitePreferences } from "./SitePreferences";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { navigationScroll } from "../lib/header-scroll.js";
import { readTripValue } from "../lib/current-trip-storage.js";
import WaveHeaderTools from "./WaveHeaderTools";
import NavIcon from "./NavIcons";
import NightIcon from './NightIcon';

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

export default function WaveHeader({ current, savedCount, onSaved, onSearch, onNew, className = "" }: {
  current: "intro" | "planner" | "community" | "travel-book" | "festivals" | "other";
  savedCount?: number;
  onSaved?: () => void;
  onSearch?: () => void;
  onNew?: () => void;
  className?: string;
}) {
  const en = useSitePreferences().locale === "en";
  const night = true;
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
    <Link className="wave-wordmark" href={current === "intro" ? "#top" : "/"} aria-label={en ? "WAVE home" : "WAVE 홈"}>{night && <svg className="night-wave-mark" viewBox="0 0 64 40" aria-hidden="true"><path fill="#17d6ff" d="M1 21C18 27 22-7 46 10L61 20C42 8 29 40 1 21Z"/><path fill="#1199ff" d="M6 28C28 37 36 10 62 23C42 19 37 50 6 28Z"/><path fill="#85eaff" d="M13 14C27 13 30-2 46 7C33 4 26 23 13 14Z"/></svg>}<span>WAVE</span>{night && <small>모두가 떠나는,<br/>더 넓은 경남</small>}</Link>
    <nav aria-label={en ? "Main menu" : "주요 메뉴"}>
      <Link href="/" aria-current={current === "intro" ? "page" : undefined}><NavIcon name="intro" /><span>{en ? "About WAVE" : "서비스 소개"}</span></Link>
      <Link href="/planner" aria-current={current === "planner" ? "page" : undefined}><NavIcon name="planner" /><span>{en ? "Plan a trip" : "여행 설계"}</span></Link>
      <Link href="/festivals" aria-current={current === "festivals" ? "page" : undefined}><NavIcon name="festivals" /><span>{en ? "Festivals" : "축제"}</span></Link>
      <Link href="/community" aria-current={current === "community" ? "page" : undefined}><NavIcon name="community" /><span>{en ? "Community" : "커뮤니티"}</span></Link>
    </nav>
    <div className="wave-header-actions" style={{ position: "relative", display: "flex", justifySelf: "end" }}>{night && <><Link className="night-search-link" href="/planner#places" onClick={event => { if (onSearch && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); onSearch(); } }} aria-label="여행지 검색"><NightIcon name="search"/></Link></>}<WaveHeaderTools onNew={onNew} />{onSaved ? <button className="wave-my-trips" type="button" onClick={onSaved} aria-label={`내 여행, 담은 장소 ${count}곳`}>{bookmark}</button>
      : <Link className="wave-my-trips" href="/travel-book" aria-current={current === "travel-book" ? "page" : undefined} aria-label={`내 여행, 담은 장소 ${count}곳`}>{bookmark}</Link>}</div>
  </header>;
}
