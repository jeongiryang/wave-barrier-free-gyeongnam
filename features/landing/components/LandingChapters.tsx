"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";
import { horizonPhotos } from "../horizon-photos";
import EditorialPhoto from "./EditorialPhoto";

const photos = [horizonPhotos.park, horizonPhotos.garden, horizonPhotos.coast];
const chapters = [
  { label: "조건 고르기", title: ["가고 싶은 마음부터.", "여행은 시작되니까."], copy: "경남 18개 시·군, 바다와 문화, 숲길과 산책. 마음이 향하는 지역과 하고 싶은 활동을 골라보세요.", en: ["Start with a place", "you want to go."], enCopy: "Explore Gyeongnam’s 18 regions. Choose where to go and the activities you enjoy.", tags: ["여행 지역", "여행 날짜", "하고 싶은 활동"], enTags: ["Region", "Dates", "Activities"] },
  { label: "편의 살피기", title: ["좋아하는 곳에,", "필요한 편의까지."], copy: "접근로, 화장실, 승강기. 내게 필요한 편의와 장소별 공식 정보를 함께 살펴요. 아직 확인되지 않은 정보도 구분해서 보여드려요.", en: ["The places you love.", "The facilities you need."], enCopy: "Compare paths, toilets and lifts with official information. Details that still need checking are shown separately.", tags: ["접근로·승강기", "장애인 화장실", "확인 범위"], enTags: ["Paths and lifts", "Accessible toilets", "Evidence"] },
  { label: "일정 담기", title: ["하루의 순서는,", "내가 원하는 대로."], copy: "마음에 드는 장소를 담고, 날짜와 방문 순서를 정하세요. 일정과 이동을 한곳에서 살피며 우리에게 맞는 여행을 만들어가요.", en: ["Make room for", "your kind of day."], enCopy: "Save places, arrange dates and visiting order, then review your itinerary and journeys together.", tags: ["날짜별 일정", "방문 순서", "이동 확인"], enTags: ["Daily itinerary", "Visiting order", "Journeys"] },
];

export default function LandingChapters() {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const nodes = Array.from(root.current?.querySelectorAll<HTMLElement>(".horizon-chapter-copy") || []);
    let frame = 0;
    const update = () => {
      frame = 0;
      const probe = innerHeight * .55;
      let nearest = 0, distance = Infinity;
      nodes.forEach((node, index) => { const rect = node.getBoundingClientRect(); const next = Math.abs(rect.top + rect.height / 2 - probe); if (next < distance) { distance = next; nearest = index; } });
      setActive(nearest);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    schedule(); addEventListener("scroll", schedule, { passive: true }); addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); removeEventListener("scroll", schedule); removeEventListener("resize", schedule); };
  }, []);
  return <section id="story" tabIndex={-1} className="horizon-how" aria-labelledby="horizon-how-title">
    <header className="horizon-section-heading" data-land-reveal>
      <p className="horizon-eyebrow">{en ? "A LITTLE CLOSER" : "조금 더 가까운 여행"}</p>
      <h2 id="horizon-how-title">{en ? "A journey that feels distant," : "멀게 느껴졌던 여행을,"}<br /><em>{en ? "a little closer to you." : "조금 더 가까이."}</em></h2>
      <p>{en ? "Start with a landscape. Find the information and the day that work for you." : "좋아하는 풍경에서 시작해, 필요한 정보와 나의 일정으로 이어집니다."}</p>
    </header>
    <div className="horizon-chapters" ref={root} data-active-chapter={active}>
      <div className="horizon-chapter-backdrop-track"><div className="horizon-chapter-backdrops">{photos.map((photo, index) => <div key={photo.id} data-active={active === index} aria-hidden={active !== index} inert={active !== index}><EditorialPhoto photo={photo} /></div>)}
        <p className="horizon-chapter-index" aria-hidden="true"><b>{String(active + 1).padStart(2, "0")}</b><span>/ 03</span><small>{en ? "HOW TO WAVE" : "우리의 여행을 만드는 방법"}</small></p>
      </div></div>
      <div className="horizon-chapter-stream">{chapters.map((chapter, index) => <article key={chapter.label} className="horizon-chapter-copy" data-chapter={index}>
        <p className="horizon-eyebrow">0{index + 1} / {en ? ["CHOOSE", "CHECK", "PLAN"][index] : chapter.label}</p>
        <h3>{(en ? chapter.en : chapter.title).map(line => <span key={line}>{line}</span>)}</h3>
        <p>{en ? chapter.enCopy : chapter.copy}</p>
        <ul>{(en ? chapter.enTags : chapter.tags).map(tag => <li key={tag}>{tag}</li>)}</ul>
        {index === 2 && <Link className="horizon-text-link" href="/planner">{en ? "Plan my trip" : "여행 계획하기"}<span aria-hidden="true">↗</span></Link>}
      </article>)}</div>
    </div>
  </section>;
}
