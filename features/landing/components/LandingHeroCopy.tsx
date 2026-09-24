"use client";
import { useEffect, useRef, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";

const messages = {
  ko: [['더 넓은 세상을', '함께, WAVE'], ['나만의 속도로', '편안한 여행을'], ['새로운 경남을', '나루와 함께'], ['함께 떠날수록', '더 가까운 여행']],
  en: [['A wider world', 'Together, WAVE'], ['At your own pace', 'A gentler journey'], ['Discover Gyeongnam', 'With Naru'], ['Travel together', 'Feel closer']],
};
export default function LandingHeroCopy() {
  const { locale, motion } = useSitePreferences();
  const [index, setIndex] = useState(0), [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const en = locale === 'en', calm = motion === 'calm';
  useEffect(() => {
    if (calm || paused || hovered || focused) return;
    let visible = true;
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; });
    if (root.current) observer.observe(root.current);
    const timer = window.setInterval(() => {
      if (visible && !document.hidden && !document.documentElement.dataset.introPending && !document.querySelector('.arrival-scene[open]')) setIndex(current => (current + 1) % 4);
    }, 6000);
    return () => { clearInterval(timer); observer.disconnect(); };
  }, [calm, paused, hovered, focused]);
  const copy = messages[en ? 'en' : 'ko'][calm ? 0 : index];
  return <div className="night-hero-headline" ref={root} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <h1 id="landing-title" tabIndex={-1} aria-label={messages[en ? 'en' : 'ko'][0].join(' ')}><span className="night-hero-phrase" key={`${locale}-${calm ? 0 : index}`} aria-hidden="true"><span>{copy[0]}</span><em>{copy[1]}</em></span></h1>
    {!calm && <button type="button" className="night-hero-motion" aria-label={en ? (paused ? 'Resume headline rotation' : 'Pause headline rotation') : (paused ? '대표 문구 전환 재생' : '대표 문구 전환 일시정지')} onClick={() => setPaused(value => !value)}><span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span></button>}
  </div>;
}
