"use client";
import { useEffect, useRef, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import { landingSections } from "../sections";
export default function LandingSectionProgress() {
  const en = useSitePreferences().locale === "en";
  const [current, setCurrent] = useState(0);
  const [intro, setIntro] = useState(true);
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0; let next = 0;
      landingSections.forEach((section,index) => { const node = document.getElementById(section.id); if (node && node.getBoundingClientRect().top <= innerHeight * .42) next = index; });
      setCurrent(next); setIntro(document.documentElement.classList.contains("arrival-open"));
      const nav = navigation.current;
      nav?.querySelectorAll<HTMLElement>("a,.story-progress-mobile").forEach(control => {
        const bounds = control.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        // Each label can cross a different scene boundary on a transparent rail.
        const behind = document.elementsFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2).find(node => !nav.contains(node));
        control.dataset.surface = behind?.closest(".landing-hero,.horizon-chapters,.horizon-account,.landing-cta,.editorial-photo") ? "dark" : "light";
      });
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new MutationObserver(schedule); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const size = new ResizeObserver(schedule); size.observe(document.body);
    const reduction = matchMedia("(prefers-reduced-motion: reduce)"); reduction.addEventListener("change", schedule);
    document.addEventListener("transitionend", schedule);
    schedule(); addEventListener("scroll",schedule,{ passive:true }); addEventListener("resize",schedule);
    return () => { cancelAnimationFrame(frame); removeEventListener("scroll",schedule); removeEventListener("resize",schedule); observer.disconnect(); size.disconnect(); reduction.removeEventListener("change", schedule); document.removeEventListener("transitionend", schedule); };
  }, []);
  const jump = (index: number) => {
    const node = document.getElementById(landingSections[index].id);
    if (!node) return;
    history.replaceState(history.state,"",`#${landingSections[index].id}`);
    node.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    node.focus({ preventScroll:true });
  };
  return <nav ref={navigation} className="story-progress" hidden={intro} aria-label={en ? "Introduction sections" : "서비스 소개 페이지 탐색"}>
    <ol id="story-progress-list">{landingSections.map((section,index) => <li key={section.id}><a href={`#${section.id}`} aria-current={current === index ? "location" : undefined} onClick={event => {event.preventDefault();jump(index);}}><span>{section[en ? "en" : "ko"]}</span><b>{String(index+1).padStart(2,"0")}</b></a></li>)}</ol>
    <label className="story-progress-mobile"><span aria-hidden="true">{String(current+1).padStart(2,"0")} / {String(landingSections.length).padStart(2,"0")}</span><select aria-label={en ? "Jump to an introduction section" : "소개 섹션으로 이동"} value={current} onChange={event => jump(Number(event.target.value))}>{landingSections.map((section,index) => <option key={section.id} value={index}>{index+1} / {landingSections.length} · {section[en ? "en" : "ko"]}</option>)}</select></label>
  </nav>;
}
