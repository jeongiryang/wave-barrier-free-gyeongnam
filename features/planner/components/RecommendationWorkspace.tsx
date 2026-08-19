"use client";

import { useRef } from "react";
import SmartSpotImage from "../../../components/SmartSpotImage";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";

interface RecommendationWorkspaceProps {
  t: (key: string, fallback: string) => string;
  region: string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  route: ReturnType<typeof useRoutePlanning>;
  tripSelection: ReturnType<typeof useTripSelection>;
  onGenerate: (revealResults?: boolean) => void | Promise<void>;
  onSelectPlace: (place: Place) => void;
}

export default function RecommendationWorkspace({
  t,
  region,
  activePlaces,
  planController,
  route,
  tripSelection,
  onGenerate,
  onSelectPlace,
}: RecommendationWorkspaceProps) {
  const cardsRef = useRef<HTMLDivElement>(null);
  const { loading, planError, selected } = planController;
  const { loadRoutes } = route;
  const {
    saved,
    scheduleAssignments,
    tripDays,
    orderedSavedPlaces,
    orderExplanation,
    assignPlaceToDay,
    toggleSaved,
  } = tripSelection;
  const scrollCards = (direction: number) => {
    cardsRef.current?.scrollBy({ left: direction * Math.min(window.innerWidth * 0.78, 480), behavior: "smooth" });
  };

  return <section className="places-section" id="places">
    <div className="workspace-heading" data-reveal>
      <div><span>02</span><h2>{t("placesTitle", "추천 여행지")}</h2></div>
      <div className="carousel-actions"><button type="button" onClick={() => scrollCards(-1)} aria-label="이전 여행지">←</button><button type="button" onClick={() => scrollCards(1)} aria-label="다음 여행지">→</button></div>
    </div>
    <div className="place-carousel" ref={cardsRef} aria-busy={loading}>
      {loading && [0, 1, 2].map((item) => <article className="place-card place-card-skeleton" key={`place-skeleton-${item}`} aria-hidden="true"><div className="skeleton-visual" /><div className="skeleton-copy"><i /><b /><span /><span /><em /></div></article>)}
      {!loading && !activePlaces.length && <div className={`place-empty${planError ? " error" : ""}`} role={planError ? "alert" : "status"}><span aria-hidden="true">{planError ? "!" : "⌖"}</span><h3>{planError ? "공식 관광정보 연결이 지연되고 있습니다." : `${region}에서 현재 조건에 맞는 장소를 찾지 못했습니다.`}</h3><p>{planError ? "기존 결과나 임시 장소를 섞지 않았습니다. 잠시 뒤 공식 데이터를 다시 조회해 주세요." : "지역·테마·편의 조건을 바꾸면 결과가 자동으로 다시 검색됩니다."}</p><button type="button" onClick={() => void onGenerate(false)} disabled={!selected.length}>공식 데이터 다시 조회</button></div>}
      {!loading && activePlaces.map((place, index) => <article className="place-card" key={place.id} data-reveal>
        <SmartSpotImage src={place.image} title={place.name} region={place.city || region} tag="관광지" rank={index + 1} contentId={place.id} className={`place-visual visual-${index % 4}`} showMeta={false}>
          <span className="city-chip">{place.city || region}</span>
          <span className="place-rank">추천 {String(index + 1).padStart(2, "0")}</span>
          <button type="button" className={saved.includes(place.id) ? "save-card saved" : "save-card"} onClick={() => toggleSaved(place.id)} aria-label={`${place.name} 보관하기`}>{saved.includes(place.id) ? "♥" : "♡"}</button>
        </SmartSpotImage>
        <div className="place-content">
          <div className="place-title"><div><h3>{place.name}</h3><p>{place.summary}</p></div><span className={`score-badge ${place.score === null ? "pending" : ""}`}><b>{place.score === null ? "판단 보류" : `${place.score}%`}</b><small>{place.score === null ? "공식 편의근거 부족" : "선택 편의조건 일치"}</small></span></div>
          <div className="feature-list">{place.features.slice(0, 3).map((feature) => <span key={feature}>✓ {feature}</span>)}</div>
          {typeof place.confidence === "number" && <div className="confidence-row"><span>정보 확인률 <b>{place.confidence}%</b></span><span>정보 없음 {place.unknownFields || 0}개</span></div>}
          <div className="place-actions"><button type="button" onClick={() => onSelectPlace(place)}>접근성 상세 <span aria-hidden="true">↗</span></button><button type="button" onClick={() => { void loadRoutes(place); document.getElementById("navigation")?.scrollIntoView({ behavior: "smooth" }); }}>이곳까지 길찾기 <span aria-hidden="true">→</span></button></div>
        </div>
      </article>)}
    </div>
    {orderedSavedPlaces.length > 0 && <section className="day-planner" data-reveal aria-label="날짜별 여행 일정">
      <header><div><span>나의 여행 일정</span><h3>이동 부담을 줄이는 순서로 정리했어요.</h3></div><p>{orderExplanation} 장소 선택은 공유하기 전까지 이 기기에만 저장됩니다.</p></header>
      <div className="day-planner-grid">{tripDays.map((day, dayIndex) => <article key={day}>
        <div><small>DAY {String(dayIndex + 1).padStart(2, "0")}</small><strong>{new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${day}T12:00:00`))}</strong></div>
        <ol>{orderedSavedPlaces.filter((place) => (scheduleAssignments[place.id] || tripDays[0]) === day).map((place, index) => <li key={place.id}><span>{index + 1}</span><div><b>{place.name}</b><small>{place.address || place.city}</small></div><select aria-label={`${place.name} 여행 날짜`} value={scheduleAssignments[place.id] || tripDays[0]} onChange={(event) => assignPlaceToDay(place.id, event.target.value)}>{tripDays.map((date, dateIndex) => <option key={date} value={date}>DAY {dateIndex + 1}</option>)}</select></li>)}</ol>
        {!orderedSavedPlaces.some((place) => (scheduleAssignments[place.id] || tripDays[0]) === day) && <p>보관한 장소의 날짜를 이 날로 바꿔 추가하세요.</p>}
      </article>)}</div>
    </section>}
  </section>;
}
