"use client";
import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";

const items = [
  { ko: "운영시간", en: "Opening hours", path: "M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" },
  { ko: "날씨", en: "Weather", path: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0" },
  { ko: "이동수단", en: "Transport", path: "M5 16V6q0-3 7-3t7 3v10q0 2-2 2H7q-2 0-2-2ZM5 10h14M8 14h.01M16 14h.01M7 18v3m10-3v3" },
  { ko: "편의시설", en: "Facilities", path: "M12 7v8m-6-7 6 2 6-2m-6 7-4 6m4-6 4 6M14 4a2 2 0 1 1-4 0 2 2 0 0 1 4 0" },
];
export default function LandingDepartureScene() {
  const en = useSitePreferences().locale === "en";
  return <section id="departure" tabIndex={-1} className="horizon-departure" aria-labelledby="departure-scene-title">
    <div className="horizon-section-heading" data-land-reveal>
      <p className="horizon-eyebrow">{en ? "BEFORE YOU GO" : "출발하기 전, 한 번 더"}</p>
      <h2 id="departure-scene-title">{en ? "A lighter heart." : "마음은 가볍게."}<br /><em>{en ? "One more check." : "준비는 한 번 더."}</em></h2>
      <p>{en ? "Opening hours, weather, transport and facilities. A little preparation makes room for your day." : <>운영시간과 날씨, 이동수단과 편의시설.<br />작은 확인이 여행의 여유를 만듭니다.</>}</p>
      <ul className="horizon-checks" aria-label={en ? "What to recheck" : "출발 전 다시 살펴볼 정보"}>{items.map(item => <li key={item.ko}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={item.path} /></svg><span>{en ? item.en : item.ko}</span></li>)}</ul>
      <Link href="/planner" className="horizon-blue-button">{en ? "Prepare my journey" : "내 여행 준비하기"}<span aria-hidden="true">↗</span></Link>
    </div>
  </section>;
}
