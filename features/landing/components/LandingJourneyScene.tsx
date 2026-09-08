"use client";

import { useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";

const stops = [
  { id: "example-coast", image: "hero-coast-small.webp", ko: "바다 산책", en: "Coastal walk", time: "10:00", x: 46, y: 110 },
  { id: "example-garden", image: "travel-together-small.webp", ko: "정원 쉼터", en: "Garden rest", time: "13:00", x: 180, y: 46 },
  { id: "example-harbor", image: "harbor-closing-small.webp", ko: "항구 풍경", en: "Harbor view", time: "16:00", x: 314, y: 110 },
] as const;

const steps = [
  ["편의와 추천", "Needs & places", "필요한 편의부터, 가고 싶은 장소로", "From your needs to places to visit"],
  ["날짜와 일정", "Date & itinerary", "같은 하루에 세 장소를 담아요", "Put three stops into the same day"],
  ["지도와 이동", "Map & journeys", "고른 순서 그대로, 이동을 살펴봐요", "Keep the same stops and order on the map"],
  ["출발 전 확인", "Before leaving", "떠나기 전, 달라진 정보까지 확인해요", "Review what may have changed before leaving"],
] as const;

export default function LandingJourneyScene() {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const [step, setStep] = useState(0);
  return <section className="journey-scene" aria-labelledby="journey-scene-title">
    <div className="journey-scene-copy" data-land-reveal>
      <p className="section-kicker">{en ? "Your places, one connected journey" : "고른 장소가, 하나의 여행으로"}</p>
      <h2 id="journey-scene-title">{en ? "A day you choose." : "내가 고른 하루."}<br /><em>{en ? "A route you can check." : "직접 확인하는 이동."}</em></h2>
      <p>{en ? "Place each stop on a day. Keep that day's places and order together on the map, then check every leg before you leave." : "장소를 날짜에 담으세요. 그날의 장소와 순서를 지도에서 이어 보고, 출발 전에 모든 이동 구간을 확인하세요."}</p>
      <a href="/planner">{en ? "Build my itinerary" : "내 일정 만들기"} <span aria-hidden="true">↗</span></a>
      <details className="journey-source-details">
        <summary>{en ? "How to read the information" : "정보를 확인하는 방법"}</summary>
        <p>{en ? "Reported facilities come from official tourism records. W.A.V.E explains how they match your selections; this is not an accessibility certification. Missing information remains unconfirmed." : "확인된 편의시설은 공식 관광정보에 기재된 내용이에요. W.A.V.E는 내 선택과 맞는 항목을 설명하며, 접근성을 인증하지 않아요. 정보가 없으면 미확인으로 남겨요."}</p>
        <p>{en ? "Route results, estimates and visitor experiences are shown separately. The time we checked a record is not the date a facility was last updated." : "조회된 경로·추정값·여행자 경험은 구분해 표시해요. W.A.V.E의 조회 시각은 시설 정보의 갱신일과 달라요."}</p>
      </details>
    </div>
    <figure className="journey-scene-visual journey-stage" data-land-reveal>
      <div className="journey-stage-controls" role="group" aria-label={en ? "Choose a planning step" : "여행 계획 소개 단계 선택"}>
        {steps.map((item, index) => <button key={item[0]} type="button" aria-pressed={step === index} aria-controls="journey-stage-panel" onClick={() => setStep(index)}>
          <b aria-hidden="true">{index + 1}</b>{item[en ? 1 : 0]}
        </button>)}
      </div>
      <div className="journey-day"><span>{en ? "TRY THE PLANNING EXAMPLE" : "직접 눌러 보는 여행 예시"}</span><strong aria-hidden="true">0{step + 1}</strong><p id="journey-stage-title" aria-live="polite" aria-atomic="true">{steps[step][en ? 3 : 2]}</p></div>
      <div key={step} id="journey-stage-panel" className="journey-stage-board" role="region" aria-labelledby="journey-stage-title">
        {step === 0 && <div className="journey-choice-list">
          <p>{en ? "Example needs to choose" : "이런 편의가 필요하다면"}</p>
          <div>{[["휠체어 이동", "Wheelchair access"], ["무장애 화장실", "Accessible toilet"], ["걷기 부담 줄이기", "Less walking"]].map(([ko, english]) => <span key={ko}>{en ? english : ko}</span>)}</div>
          <p>{en ? "Compare recorded facilities and information still to be checked." : "장소마다 확인된 편의와 미확인 정보를 나눠 살펴봐요"}</p>
        </div>}
        {step === 1 && <table className="journey-week">
          <caption>{en ? "September · example trip on the 17th" : "9월 · 17일에 떠나는 하루 일정 예시"}</caption>
          <thead><tr>{(en ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["월", "화", "수", "목", "금", "토", "일"]).map(day => <th key={day} scope="col">{day}</th>)}</tr></thead>
          <tbody><tr>{[14, 15, 16, 17, 18, 19, 20].map(day => <td key={day} data-selected={day === 17}><span>{day}</span></td>)}</tr></tbody>
        </table>}
        {step === 2 && <div className="journey-map-example">
          <p>{en ? "Stop order illustration · not a route result" : "장소를 잇는 순서 그림 · 실제 경로가 아니에요"}</p>
          <svg viewBox="0 0 360 160" aria-hidden="true" focusable="false">
            <path d="M46 110 C90 110 110 46 180 46 S270 110 314 110" fill="none" stroke="var(--blue)" strokeWidth="3" strokeDasharray="6 6" />
            {stops.map((stop, index) => <g key={stop.id} data-example-stop-id={stop.id}>
              <circle cx={stop.x} cy={stop.y} r="22" fill="var(--surface)" stroke="var(--blue)" strokeWidth="3" />
              <text x={stop.x} y={stop.y + 7} textAnchor="middle" fontSize="22" fill="var(--ink)">{index + 1}</text>
            </g>)}
          </svg>
        </div>}
        {step === 3 && <dl className="journey-review">
          {[["이동", "세 장소 사이 모든 구간", "Journeys", "Every leg between the three stops"], ["날씨", "여행 날짜의 예보와 상황", "Weather", "Forecast and conditions for your dates"], ["이용 정보", "운영시간과 필요한 편의", "Visitor information", "Opening hours and the facilities you need"]].map(item => <div key={item[0]}><dt>{item[en ? 2 : 0]}</dt><dd>{item[en ? 3 : 1]}</dd></div>)}
        </dl>}
        <ol className="journey-scene-stops">
          {stops.map((stop, index) => <li key={stop.id} data-example-stop-id={stop.id}>
            <img src={`/media/wave-story/${stop.image}`} width="840" height="473" loading="lazy" alt="" />
            <b>{index + 1}</b><span><strong>{en ? `Example: ${stop.en}` : `예시 ${stop.ko}`}</strong><small>{step === 1 ? `${stop.time} · ${en ? "example visit" : "방문 예시"}` : step === 2 ? (en ? "Check each journey" : "장소 사이 이동 확인") : step === 3 ? (en ? "Recheck before leaving" : "출발 전에 다시 확인") : (en ? "Review facility information" : "편의 정보 살펴보기")}</small></span>
          </li>)}
        </ol>
      </div>
      <figcaption>{en ? "A guide to the planning flow. Imagined scenes and connecting lines are not real places or navigation results." : "일정 이용 흐름을 보여주는 그림입니다. 상상 풍경과 연결선은 실제 장소나 길찾기 결과가 아닙니다."}</figcaption>
    </figure>
  </section>;
}
