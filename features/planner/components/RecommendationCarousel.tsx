"use client";

import { useRef } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import SmartSpotImage from "../../tourism/components/SmartSpotImage";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";

export default function RecommendationCarousel({ region, activePlaces, planController, tripSelection, onGenerate, onSelectPlace }: {
  t: (key: string, fallback: string) => string;
  region: string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  route: ReturnType<typeof useRoutePlanning>;
  tripSelection: ReturnType<typeof useTripSelection>;
  onGenerate: (revealResults?: boolean) => void | Promise<void>;
  onSelectPlace: (place: Place) => void;
}) {
  const { locale, motion } = useSitePreferences();
  const en = locale === "en";
  const say = (ko: string, english: string) => en ? english : ko;
  const cardsRef = useRef<HTMLDivElement>(null);
  const { loading, planError, selected, plan, dirty, resultCurrent } = planController;
  const { saved, toggleSaved } = tripSelection;
  const explorationPlaces = plan?.explorationPlaces ?? [];
  const scrollCards = (direction: number) => cardsRef.current?.scrollBy({ left: direction * Math.min(window.innerWidth * .78, 480), behavior: motion === "calm" ? "instant" : "smooth" });
  return <>
    <div className="journey-subheading"><div><h2>{say("내 조건에 맞는 여행지", "Places for your trip")}</h2></div><div className="carousel-actions"><button type="button" onClick={() => scrollCards(-1)} aria-label={say("이전 여행지", "Previous places")}>←</button><button type="button" onClick={() => scrollCards(1)} aria-label={say("다음 여행지", "Next places")}>→</button></div></div>
    <p className="stage-guidance">{say("확인된 편의와 아직 모르는 정보를 함께 보고, 마음에 드는 곳을 일정에 담으세요.", "Compare reported facilities and missing information, then add places to your itinerary.")}</p>
    {dirty && <div className="result-notice" role="status"><strong>{say("조건이 변경됐어요.", "Your preferences have changed.")}</strong><p>{say("아래는 이전 조건의 결과예요. 다시 찾기 전에는 새 일정에 추가할 수 없습니다.", "These are previous results. Search again before adding places.")}</p><button type="button" disabled={loading || !selected.length} onClick={() => void onGenerate(false)}>{say("변경한 조건으로 다시 찾기", "Search with new preferences")}</button></div>}
    {planError && <div className="result-notice error" role="alert"><strong>{say("여행지를 불러오지 못했어요.", "We couldn't load places.")}</strong><p>{say("기존 결과와 내 일정은 보관했어요. 연결 상태를 확인하고 다시 시도해 주세요.", "Your previous results and itinerary are kept. Check your connection and try again.")}</p><button type="button" disabled={loading || !selected.length} onClick={() => void onGenerate(false)}>{say("다시 시도", "Try again")}</button></div>}
    <div className="place-carousel" ref={cardsRef} aria-busy={loading}>
      {loading && <p className="sr-only" role="status">{say("여행지를 찾고 있어요.", "Finding places.")}</p>}
      {loading && !plan && [0, 1, 2].map((item) => <article className="place-card place-card-skeleton" key={item} aria-hidden="true"><div className="skeleton-visual" /><div className="skeleton-copy"><i /><b /><span /></div></article>)}
      {!loading && !activePlaces.length && !planError && <div className="place-empty" role="status"><h3>{!plan ? say("어떤 곳으로 떠나볼까요?", "Where will your next trip take you?") : say("선택한 조건에 맞는 여행지를 찾지 못했어요.", "No places match these preferences yet.")}</h3><p>{say("필요한 편의는 유지한 채 지역이나 여행 취향을 바꿔보세요.", "Keep your facility needs and try another region or interest.")}</p><a href="#conditions">{say("여행 조건 다시 선택", "Review preferences")}</a><button type="button" disabled={!selected.length} onClick={() => void onGenerate(false)}>{say("여행지 찾기", "Find places")}</button></div>}
      {activePlaces.map((place, index) => {
        const confirmed = place.accessibility?.filter((item) => item.state === "confirmed");
        return <article className="place-card" key={place.id} data-result-current={resultCurrent}>
          <SmartSpotImage src={place.image} title={place.name} region={place.city || region} tag={say("관광지", "Place")} rank={index + 1} contentId={place.id} className="place-visual" showMeta={false}><span className="city-chip">{place.city || region}</span></SmartSpotImage>
          <div className="place-content"><h3>{place.name}</h3><p className="place-address">{place.address || place.summary}</p>
            <div className="feature-list" lang="ko">{(confirmed?.map((item) => item.label) || place.features).slice(0, 3).map((feature) => <span key={feature}>✓ {feature}</span>)}</div>
            <p className="facility-caution">{say("방문 전 확인", "Before visiting")}: {place.unknownFields || 0}{say("개 항목 미확인", " facilities not reported")}{Boolean(place.negativeFields) && ` · ${place.negativeFields}${say("개 불일치", " not available")}`}</p>
            <div className="place-actions"><button type="button" onClick={() => onSelectPlace(place)}>{say("편의시설 보기", "View facilities")}</button><button type="button" className={saved.includes(place.id) ? "saved" : "primary"} disabled={!saved.includes(place.id) && !resultCurrent} onClick={() => toggleSaved(place.id)} aria-pressed={saved.includes(place.id)} aria-label={`${place.name} ${saved.includes(place.id) ? say("일정에서 빼기", "Remove from itinerary") : say("일정에 추가", "Add to itinerary")}`}>{saved.includes(place.id) ? say("추가됨 · 빼기", "Added · remove") : say("일정에 추가", "Add to itinerary")}</button></div>
          </div>
        </article>;
      })}
    </div>
    {explorationPlaces.length > 0 && <details className="exploration-places"><summary>{say("편의정보가 부족한 다른 장소", "Other places with insufficient facility information")} ({explorationPlaces.length})</summary><p>{say("필요한 편의를 확인하지 못해 추천과 일정 추가에서 제외했어요.", "These places are excluded from recommendations and itinerary additions because your needs could not be confirmed.")}</p><div>{explorationPlaces.map((place) => <article key={place.id}><div><h3>{place.name}</h3><p>{place.address}</p></div><span>{place.score === 0 ? say("조건 불일치", "No matching facilities") : say("정보 미확인", "Information missing")}</span><button type="button" onClick={() => onSelectPlace(place)}>{say("이용 정보 확인", "View information")}</button></article>)}</div></details>}
  </>;
}
