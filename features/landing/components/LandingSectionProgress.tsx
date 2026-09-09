"use client";
import { useEffect, useRef, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import { landingSections } from "../sections";
export default function LandingSectionProgress() {
  const en = useSitePreferences().locale === "en";
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);
  const [intro, setIntro] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const rail = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => { frame = 0; let next = 0; landingSections.forEach((section,index) => { const node = document.getElementById(section.id); if (node && node.getBoundingClientRect().top <= innerHeight * .42) next = index; }); setCurrent(next); setIntro(document.documentElement.classList.contains("arrival-open")); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new MutationObserver(schedule); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    schedule(); addEventListener("scroll",schedule,{ passive:true }); addEventListener("resize",schedule);
    return () => { cancelAnimationFrame(frame); removeEventListener("scroll",schedule); removeEventListener("resize",schedule); observer.disconnect(); };
  }, []);
  const close = () => { setOpen(false); setDismissed(true); };
  const jump = (index: number) => {
    const node = document.getElementById(landingSections[index].id);
    if (!node) return;
    close(); history.replaceState(history.state,"",`#${landingSections[index].id}`);
    node.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    node.focus({ preventScroll:true });
  };
  return <nav className="story-progress" ref={rail} hidden={intro} data-open={open} aria-label={en ? "Introduction sections" : "서비스 소개 페이지 탐색"}
    onPointerEnter={event => { if(event.pointerType === "mouse" && !dismissed) setOpen(true); }}
    onPointerLeave={() => { setDismissed(false); if(!rail.current?.contains(document.activeElement)) setOpen(false); }}
    onFocusCapture={() => { if(!dismissed) setOpen(true); }}
    onBlurCapture={event => { if(!event.currentTarget.contains(event.relatedTarget)) {setOpen(false);setDismissed(false);} }}
    onKeyDown={event => { if(event.key === "Escape") {event.preventDefault();close();trigger.current?.focus();} }}>
    <button ref={trigger} className="story-progress-compact" type="button" aria-expanded={open} aria-controls="story-progress-list" onClick={() => {setDismissed(false);setOpen(value => !value);}} aria-label={en ? "Browse introduction sections" : "소개 섹션 목록"}>
      <span>{landingSections[current][en ? "en" : "ko"]}</span><b>{String(current+1).padStart(2,"0")}</b><i aria-hidden="true"><i style={{height:`${(current+1)/landingSections.length*100}%`}}/></i><small>{String(landingSections.length).padStart(2,"0")}</small>
    </button>
    <ol id="story-progress-list" hidden={!open}>{landingSections.map((section,index) => <li key={section.id}><a href={`#${section.id}`} aria-current={current === index ? "location" : undefined} onClick={event => {event.preventDefault();jump(index);}}><span>{section[en ? "en" : "ko"]}</span><b>{String(index+1).padStart(2,"0")}</b></a></li>)}</ol>
    <label className="story-progress-mobile"><span aria-hidden="true">{String(current+1).padStart(2,"0")} / {String(landingSections.length).padStart(2,"0")}</span><select aria-label={en ? "Jump to an introduction section" : "소개 섹션으로 이동"} value={current} onChange={event => jump(Number(event.target.value))}>{landingSections.map((section,index) => <option key={section.id} value={index}>{index+1} / {landingSections.length} · {section[en ? "en" : "ko"]}</option>)}</select></label>
  </nav>;
}
