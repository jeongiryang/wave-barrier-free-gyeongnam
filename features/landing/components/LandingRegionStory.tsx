"use client";
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { landingRegions } from "../content";
import { regionShowcaseAlbums } from "../region-showcase-photos";
import { regionPhotoSource } from "../region-photo-sources";
import { useSitePreferences } from "../../../components/SitePreferences";
import { regionNames } from "../../../lib/gyeongnam-region-names";
import { regionSounds } from "../region-sound";

const RegionSoundPlayer = lazy(() => import("./RegionSoundPlayer"));

// Server-rendered links work immediately; the disclosure becomes usable after hydration.
const subscribeToClient = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

const firstRegions = ["통영", "거제", "남해", "하동", "산청"];
const orderedRegions = [...firstRegions, ...landingRegions.map(region => region.name).filter(name => !firstRegions.includes(name))];

export default function LandingRegionStory() {
  const en = useSitePreferences().locale === "en";
  const [expanded, setExpanded] = useState(false);
  const interactive = useSyncExternalStore(subscribeToClient, clientReady, serverReady);
  const grid = useRef<HTMLDivElement>(null);
  const revealed = useRef(new WeakSet<Element>());
  useEffect(() => {
    const nodes = grid.current?.querySelectorAll<HTMLElement>(".simple-region");
    if (!nodes || !window.IntersectionObserver || !Element.prototype.animate) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting || media.matches || revealed.current.has(entry.target)) return;
      revealed.current.add(entry.target);
      const animation = entry.target.animate([{ opacity: .25, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" });
      animations.add(animation);
      animation.onfinish = () => animations.delete(animation);
      observer.unobserve(entry.target);
    }), { threshold: .12 });
    const configure = () => { observer.disconnect(); if (media.matches) { animations.forEach(animation => animation.cancel()); animations.clear(); } else nodes.forEach(node => { if (!revealed.current.has(node)) observer.observe(node); }); };
    configure(); media.addEventListener('change', configure);
    return () => { observer.disconnect(); media.removeEventListener('change', configure); animations.forEach(animation => animation.cancel()); };
  }, [expanded]);
  return <section id="regions" className="simple-regions simple-section" aria-labelledby="regions-title" tabIndex={-1}>
    <header className="simple-section-heading" data-land-reveal><h2 id="regions-title">{en ? "Explore Gyeongnam" : "경남, 모두의 여행지"}</h2><p>{en ? "Choose a region to see its places." : "아름다운 자연과 따뜻한 사람이 있는, 누구나 즐길 수 있는 여행"}</p></header>
    {regionSounds.length > 0 && <Suspense fallback={null}><RegionSoundPlayer sound={regionSounds[0]} /></Suspense>}
    <div className="simple-region-grid" id="region-grid" ref={grid}>{orderedRegions.slice(0, expanded ? 18 : 5).map(name => {
      const photo = regionShowcaseAlbums[name][0];
      const label = en ? regionNames[name] : name;
      return <article className="simple-region" key={name}>
        <Link href={`/planner?region=${encodeURIComponent(name)}`} className="simple-region-link" aria-label={`${label} ${en ? "places" : "여행지 보기"}`}>
          <img ref={node => { if (node?.complete && !node.naturalWidth) node.style.opacity = "0"; }} src={photo.image} alt="" loading="lazy" decoding="async" width="640" height="480" onError={event => { event.currentTarget.style.opacity = "0"; }} />
          <div><h3>{label}</h3><span lang="ko">{photo.title}</span></div>
        </Link>
        <a className="simple-region-credit" lang="ko" href={regionPhotoSource(photo).href} target="_blank" rel="noopener noreferrer" aria-label={`${photo.title} 사진 원본, 새 탭`}>사진 출처</a>
      </article>;
    })}</div>
    <button className="simple-show-regions" type="button" disabled={!interactive} aria-expanded={expanded} aria-controls="region-grid" onClick={event => { setExpanded(value => !value); event.currentTarget.focus(); }}>{expanded ? (en ? "Show fewer regions" : "접기") : (en ? "View all 18 regions" : "18개 지역 모두 보기")} <span aria-hidden="true">{expanded ? "−" : "+"}</span></button>
  </section>;
}
