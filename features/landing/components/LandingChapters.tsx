"use client";
import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";

export default function LandingChapters() {
  const en = useSitePreferences().locale === "en";
  return <section id="story" className="simple-product-story simple-section" aria-labelledby="how-title" tabIndex={-1}>
    <div><h2 id="how-title">{en ? "From places to an itinerary" : "장소 선택부터 일정 공유까지"}</h2>
      <ul className="simple-feature-list">
        <li><strong>{en ? "Check facilities" : "필요한 시설 확인"}</strong><p>{en ? "Compare reported facilities and missing information." : "승강기, 화장실 등 필요한 시설과 확인되지 않은 정보를 구분해 볼 수 있어요."}</p></li>
        <li><strong>{en ? "Arrange your day" : "날짜별 일정 정리"}</strong><p>{en ? "Review visiting order and travel on the map." : "방문 순서와 머무는 시간을 바꾸고 지도에서 이동을 확인해요."}</p></li>
        <li><strong>{en ? "Save and share" : "저장하고 공유"}</strong><p>{en ? "Continue later and share your trip by link or KakaoTalk." : "만든 여행을 이어서 편집하고 링크나 카카오톡으로 공유해요."}</p></li>
      </ul><Link href="/planner" className="simple-text-link">{en ? "Find places" : "여행지 찾아보기"} <span aria-hidden="true">→</span></Link>
    </div>
    <div className="simple-product-preview" aria-label={en ? "Example itinerary screen" : "일정 화면 예시"}>
      <div className="preview-heading"><strong>{en ? "My itinerary" : "내 일정"}</strong><span>{en ? "Example" : "화면 예시"}</span></div>
      <div className="preview-day">{en ? "Day 1 · Tongyeong" : "첫째 날 · 통영"}</div>
      <div className="preview-stop"><time>10:00</time><div><strong>이순신공원</strong><span>{en ? "Stay for 60 minutes" : "60분 머무르기"}</span></div></div>
      <div className="preview-stop"><time>11:30</time><div><strong>통영시립박물관</strong><span>{en ? "Stay for 90 minutes" : "90분 머무르기"}</span></div></div>
      <div className="preview-toolbar"><span>{en ? "Map" : "지도"}</span><span>{en ? "Edit" : "수정"}</span><span>{en ? "Share" : "공유"}</span></div>
    </div>
  </section>;
}
