"use client";
import { useEffect, useRef } from "react";
import { horizonPhotos } from "../horizon-photos";

/** A two-second visual handoff. It never traps focus or blocks the actual page. */
export default function LandingIntro() {
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = scene.current;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let seen = document.documentElement.dataset.introSeen === "1";
    try { seen ||= sessionStorage.getItem("wave-arrival-session-v1") === "done"; } catch { /* In-memory fallback. */ }
    if (!root || seen || media.matches || document.documentElement.dataset.motion === "calm" || window.scrollY > 24) return;
    const photo = root.querySelector<HTMLElement>(".arrival-picture")!;
    const word = root.querySelector<HTMLElement>(".arrival-word")!;
    const mask = root.querySelector<HTMLElement>(".arrival-letter-mask")!;
    const target = document.querySelector<HTMLElement>(".landing-hero-landscape, .horizon-hero-photo");
    const logo = document.querySelector<HTMLElement>(".wave-wordmark");
    if (!target || !logo) return;
    const end = target.getBoundingClientRect(), brand = logo.getBoundingClientRect();
    const width = Math.min(innerWidth * .82, 1000), height = width * end.height / end.width;
    const left = (innerWidth - width) / 2, top = Math.max(48, (innerHeight - height) / 2);
    Object.assign(photo.style, { left: `${end.left}px`, top: `${end.top}px`, width: `${end.width}px`, height: `${end.height}px` });
    Object.assign(word.style, { left: `${brand.left}px`, top: `${brand.top}px`, width: `${brand.width}px`, height: `${brand.height}px`, font: getComputedStyle(logo).font, letterSpacing: getComputedStyle(logo).letterSpacing });
    root.hidden = false;
    const start = `translate(${left - end.left}px, ${top - end.top}px) scale(${width / end.width}, ${height / end.height})`;
    const centerBrand = `translate(${innerWidth / 2 - brand.left - brand.width * 3 / 2}px, ${innerHeight / 2 - brand.top - brand.height * 3 / 2}px) scale(3)`;
    const timing = { duration: 2000, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" as const };
    const animations = [
      photo.animate([{ transform: start, offset: 0 }, { transform: start, offset: .58 }, { transform: "none", offset: 1 }], timing),
      mask.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: .18 }, { opacity: 0, offset: .56 }, { opacity: 0, offset: 1 }], timing),
      word.animate([{ transform: centerBrand, opacity: 0, offset: 0 }, { transform: centerBrand, opacity: 0, offset: .45 }, { transform: centerBrand, opacity: 1, offset: .58 }, { transform: "none", opacity: 1, offset: 1 }], timing),
      root.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: .82 }, { opacity: 0, offset: 1 }], timing),
    ];
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      root.hidden = true;
      animations.forEach(animation => animation.cancel());
      document.documentElement.dataset.introSeen = "1";
      try { sessionStorage.setItem("wave-arrival-session-v1", "done"); } catch { /* Never block navigation. */ }
    };
    const timer = setTimeout(finish, 2000);
    const reduction = () => { if (media.matches) finish(); };
    const visibility = () => { if (document.hidden) finish(); };
    for (const name of ["pointerdown", "keydown", "wheel", "touchstart", "resize"] as const) window.addEventListener(name, finish, { passive: true, capture: true });
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", reduction);
    return () => {
      clearTimeout(timer); finish();
      for (const name of ["pointerdown", "keydown", "wheel", "touchstart", "resize"] as const) window.removeEventListener(name, finish, true);
      document.removeEventListener("visibilitychange", visibility); media.removeEventListener("change", reduction);
    };
  }, []);
  return <div ref={scene} className="arrival-scene" hidden aria-hidden="true">
    <div className="arrival-picture"><img src={horizonPhotos.coast.image} alt="" decoding="async" />
      <svg className="arrival-letter-mask" viewBox="0 0 1000 750" preserveAspectRatio="none"><defs><mask id="arrival-word-cutout"><rect width="1000" height="750" fill="white"/><text x="500" y="455" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="255" letterSpacing="-18" fill="black">WAVE</text></mask></defs><rect width="1000" height="750" fill="var(--surface)" mask="url(#arrival-word-cutout)" /></svg>
    </div><span className="arrival-word">WAVE</span>
  </div>;
}
