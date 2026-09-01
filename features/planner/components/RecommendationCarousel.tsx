"use client";

import { useRef } from "react";
import { scrollToSection } from "../../../lib/reduced-motion.js";
import SmartSpotImage from "../../tourism/components/SmartSpotImage";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";

export default function RecommendationCarousel({ t, region, activePlaces, planController, route, tripSelection, onGenerate, onSelectPlace }: {
  t: (key: string, fallback: string) => string;
  region: string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  route: ReturnType<typeof useRoutePlanning>;
  tripSelection: ReturnType<typeof useTripSelection>;
  onGenerate: (revealResults?: boolean) => void | Promise<void>;
  onSelectPlace: (place: Place) => void;
}) {
  const cardsRef = useRef<HTMLDivElement>(null);
  const { loading, planError, selected, plan } = planController;
  const { loadRoutes } = route;
  const { saved, toggleSaved } = tripSelection;
  const explorationPlaces = plan?.explorationPlaces ?? [];
  const scrollCards = (direction: number) => cardsRef.current?.scrollBy({ left: direction * Math.min(window.innerWidth * 0.78, 480), behavior: "smooth" });

  return <>
    <div className="journey-subheading" data-reveal><div><span aria-hidden="true">2</span><h2>{t("placesTitle", "여행지 고르기")}</h2></div><div className="carousel-actions"><button type="button" onClick={() => scrollCards(-1)} aria-label="이전 여행지">←</button><button type="button" onClick={() => scrollCards(1)} aria-label="다음 여행지">→</button></div></div>
    <p className="stage-guidance">선택한 조건이 공식 정보에서 확인된 장소만 추천합니다. 마음에 드는 장소를 내 일정에 추가하세요.</p>
    <div className="place-carousel" ref={cardsRef} aria-busy={loading}>
      {loading && <p className="sr-only" role="status" aria-live="polite">여행 조건에 맞는 공식 관광정보를 불러오고 있어요.</p>}
      {loading && [0, 1, 2].map((item) => <article className="place-card place-card-skeleton" key={`place-skeleton-${item}`} aria-hidden="true"><div className="skeleton-visual" /><div className="skeleton-copy"><i /><b /><span /><span /><em /></div></article>)}
      {!loading && !activePlaces.length && <div className={`place-empty${planError ? " error" : ""}`} role={planError ? "alert" : "status"}><span aria-hidden="true">{planError ? "!" : "⌖"}</span><h3>{planError ? "공식 관광정보 연결이 지연되고 있습니다." : `${region}에서 선택한 편의조건이 공식 정보로 확인된 장소를 찾지 못했습니다.`}</h3><p>{planError ? "기존 결과나 임시 장소를 섞지 않았습니다. 잠시 뒤 공식 데이터를 다시 조회해 주세요." : explorationPlaces.length ? "공식 편의근거가 부족하거나 조건과 일치하지 않는 장소는 아래 ‘추가 탐색’으로 분리했습니다." : "지역·테마·편의 조건을 바꾸면 결과가 자동으로 다시 검색됩니다."}</p><button type="button" onClick={() => void onGenerate(false)} disabled={!selected.length}>공식 데이터 다시 조회</button></div>}
      {!loading && activePlaces.map((place, index) => <article className="place-card" key={place.id} data-reveal>
        <SmartSpotImage src={place.image} title={place.name} region={place.city || region} tag="관광지" rank={index + 1} contentId={place.id} className={`place-visual visual-${index % 4}`} showMeta={false}><span className="city-chip">{place.city || region}</span><span className="place-rank">추천 {String(index + 1).padStart(2, "0")}</span><button type="button" className={saved.includes(place.id) ? "save-card saved" : "save-card"} onClick={() => toggleSaved(place.id)} aria-pressed={saved.includes(place.id)} aria-label={`${place.name} ${saved.includes(place.id) ? "일정에서 빼기" : "일정에 추가"}`}>{saved.includes(place.id) ? "일정에 추가됨" : "일정에 추가"}</button></SmartSpotImage>
        <div className="place-content"><div className="place-title"><div><h3>{place.name}</h3><p>{place.summary}</p></div><span className={`score-badge ${place.score === null ? "pending" : ""}`}><b>{place.score === null ? "확인 필요" : `${place.score}%`}</b><small>{place.score === null ? "편의시설 정보 부족" : "필요한 편의와 일치"}</small></span></div><div className="feature-list">{place.features.slice(0, 3).map((feature) => <span key={feature}>✓ {feature}</span>)}</div>{typeof place.confidence === "number" && <div className="confidence-row"><span>공식 정보에서 확인됨 <b>{place.confidence}%</b></span><span>확인 필요 {place.unknownFields || 0}개</span></div>}<div className="place-actions"><button type="button" onClick={() => onSelectPlace(place)}>편의시설 보기 <span aria-hidden="true">↗</span></button><button type="button" onClick={() => { void loadRoutes(place); scrollToSection("navigation"); }}>길찾기 <span aria-hidden="true">→</span></button></div></div>
      </article>)}
    </div>
    {!loading && explorationPlaces.length > 0 && <section className="exploration-places" aria-labelledby="exploration-places-title">
      <header><div><span>확인 후 방문 추천</span><h4 id="exploration-places-title">편의시설 정보를 더 확인해야 하는 장소</h4></div><p>공식 근거가 부족해 일반 추천과 내 일정에는 넣지 않았습니다. 운영기관에서 최신 정보를 확인한 뒤 방문을 결정하세요.</p></header>
      <div>{explorationPlaces.map((place) => <article key={`explore-${place.id}`}>
        <div><small>{place.city || region}</small><h5>{place.name}</h5><p>{place.summary}</p></div>
        <span className={place.score === 0 ? "mismatch" : "unknown"}>{place.score === 0 ? "선택한 편의와 불일치" : "공식 정보 확인 필요"}</span>
        <div><button type="button" onClick={() => onSelectPlace(place)}>이용 정보 확인</button><button type="button" onClick={() => { void loadRoutes(place); scrollToSection("navigation"); }}>길찾기만 보기</button></div>
      </article>)}</div>
    </section>}
  </>;
}
