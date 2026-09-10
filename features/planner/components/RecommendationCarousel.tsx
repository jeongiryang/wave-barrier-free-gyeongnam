"use client";

import { lazy, Suspense, useId, useRef, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import PlaceFacilitySummary from "./PlaceFacilitySummary";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import { originalLanguage } from "../place-copy";
import { planNotices, planFailureHeadings } from "../condition-copy";

function InformationUnavailable({ en }: { en: boolean }) {
  return <p role="status">{planNotices.error[en ? 1 : 0]}</p>;
}
const ProviderFailureNotice = lazy(() => import("./ProviderFailureNotice").catch(() => ({ default: InformationUnavailable })));

const ExplorationPlaces = lazy(() => import("./ExplorationPlaces").catch(() => ({ default: InformationUnavailable })));

function PhotoUnavailable() {
  const { locale } = useSitePreferences();
  return <div className="smart-spot-image place-visual failed"><span className="smart-image-fallback" role="status"><small>{locale === "en" ? "Official photo unavailable" : "공식 사진을 확인할 수 없어요"}</small></span></div>;
}
const SmartSpotImage = lazy(() => import("../../tourism/components/SmartSpotImage").catch(() => ({ default: PhotoUnavailable })));

function PlaceChoiceCard({ place, region, index, saved, current, en, onToggle, onDetails }: {
  place: Place; region: string; index: number; saved: boolean; current: boolean; en: boolean;
  onToggle: () => void; onDetails: () => void;
}) {
  const id = useId();
  const say = (ko: string, english: string) => en ? english : ko;
  const action = saved ? say("일정에서 빼기", "Remove from itinerary") : say("일정에 추가", "Add to itinerary");
  return <article className="place-card" data-result-current={current} aria-labelledby={`${id}-title`}>
    <Suspense fallback={<div className="smart-spot-image place-visual loading" aria-hidden="true" />}><SmartSpotImage src={place.image} title={place.name} region={place.city || region} tag={say("관광지", "Place")} rank={index + 1} contentId={place.id} className="place-visual" showMeta={false} /></Suspense>
    <button className="reference-heart" type="button" aria-label={`${place.name} ${say("일정 담기", "Save place")}`} aria-pressed={saved} disabled={!saved && !current} onClick={onToggle}><svg viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21C6 16 2 12 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 4-4 8-10 13Z" /></svg></button>
    <div className="place-content">
      <p className="place-region" lang={originalLanguage(place.city || region)}>{place.city || region}</p>
      <h3 id={`${id}-title`} lang={originalLanguage(place.name)}>{place.name}</h3>
      <p className="place-address" lang={originalLanguage(place.address || place.summary)}>{place.address || place.summary}</p>
      <PlaceFacilitySummary place={place} en={en} />
      <div className="place-actions">
        <button type="button" className={`primary${saved ? " saved" : ""}`} disabled={!saved && !current} onClick={onToggle} aria-pressed={saved} aria-labelledby={`${id}-title ${id}-action`}>
          <span id={`${id}-action`} className="sr-only">{action}</span><span aria-hidden="true">{action}</span><span aria-hidden="true">{saved ? "✓" : "+"}</span>
        </button>
        <button type="button" onClick={onDetails}>{say("이용 정보", "Visitor information")} <span aria-hidden="true">↗</span></button>
      </div>
    </div>
  </article>;
}

export default function RecommendationCarousel({ region, activePlaces, planController, tripSelection, onGenerate, onSelectPlace }: {
  region: string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  tripSelection: ReturnType<typeof useTripSelection>;
  onGenerate: (revealResults?: boolean) => void | Promise<void>;
  onSelectPlace: (place: Place) => void;
}) {
  const { locale, motion } = useSitePreferences();
  const en = locale === "en";
  const say = (ko: string, english: string) => en ? english : ko;
  const cardsRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState("all");
  const filters = [{ id: "all", label: say("추천순", "Recommended") }, { id: "sea", label: say("바다", "Coast") }, { id: "indoor", label: say("실내", "Indoor") }, { id: "route", label: say("접근로 확인", "Reported access path") }, { id: "restroom", label: say("장애인 화장실", "Accessible toilet") }, { id: "confirmed", label: say("조건 확인만", "Required facilities reported") }];
  const visiblePlaces = activePlaces.filter(place => {
    if (filter === "all") return true;
    const words = `${place.name} ${place.summary}`;
    if (filter === "sea") return /바다|해안|해변|해수욕장|항구|섬/.test(words);
    if (filter === "indoor") return /실내|박물관|미술관|전시관|과학관|문학관/.test(words);
    const reported = new Set(place.accessibility?.filter(item => item.state === "confirmed").map(item => item.key));
    if (filter !== "confirmed") return reported.has(filter);
    const required = planController.plan?.criteria?.facilityKeys || [];
    return required.length > 0 && required.every(key => reported.has(key));
  });
  const { loading, planError, selected, plan, dirty, resultCurrent } = planController;
  const { saved, toggleSaved } = tripSelection;
  const explorationPlaces = plan?.explorationPlaces ?? [];
  const incomplete = plan?.statuses.some(status => status.state === "error" || status.partial);
  const scrollCards = (direction: number) => cardsRef.current?.scrollBy({ left: direction * Math.min(window.innerWidth * .78, 480), behavior: motion === "calm" ? "instant" : "smooth" });
  return <>
    <div className="journey-subheading"><div><h2 aria-label={say("내 조건에 맞는 여행지", "Places for your trip")}>{say(`${region || "경남"}, 어떤 여행지가 끌리나요?`, "Places for your trip")}</h2></div><div className="carousel-actions"><button type="button" onClick={() => scrollCards(-1)} aria-label={say("이전 여행지", "Previous places")}>←</button><button type="button" onClick={() => scrollCards(1)} aria-label={say("다음 여행지", "Next places")}>→</button></div></div>
    <p className="stage-guidance">{say("확인된 편의와 아직 모르는 정보를 함께 보고, 마음에 드는 곳을 일정에 담으세요.", "Compare reported facilities and missing information, then add places to your itinerary.")}</p>
    {en && <p className="original-language-note">Place names, addresses and facility evidence may be available only in Korean. Original records are preserved.</p>}
    <div className="reference-result-meta"><div role="group" aria-label={say("여행지 결과 필터", "Filter place results")}>{filters.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div><strong>{en ? `${visiblePlaces.length} places` : `추천 ${visiblePlaces.length}곳`}{incomplete ? say(" · 일부 결과", " · partial results") : ""}</strong></div>
    {incomplete && plan && <Suspense fallback={<InformationUnavailable en={en} />}><ProviderFailureNotice en={en} statuses={plan.statuses} /></Suspense>}
    {dirty && <div className="result-notice" role="status"><strong>{say("조건이 변경됐어요.", "Your preferences have changed.")}</strong><p>{say("아래는 이전 조건의 결과예요. 다시 찾기 전에는 새 일정에 추가할 수 없습니다.", "These are previous results. Search again before adding places.")}</p><button type="button" disabled={loading || !selected.length} onClick={() => void onGenerate(false)}>{say("변경한 조건으로 다시 찾기", "Search with new preferences")}</button></div>}
    {planError && <div className="result-notice error" role="alert"><strong>{planFailureHeadings[planError][en ? 1 : 0]}</strong><p>{say("선택한 조건과 기존 일정은 유지됩니다. 잠시 후 다시 시도해 주세요.", "Your choices and existing itinerary are kept. Please try again shortly.")}</p><button type="button" disabled={loading || !selected.length} onClick={() => void onGenerate(false)}>{say("다시 시도", "Try again")}</button></div>}
    <div className="place-carousel" ref={cardsRef} aria-busy={loading}>
      {loading && <p className="sr-only" role="status">{say("여행지를 찾고 있어요.", "Finding places.")}</p>}
      {loading && !plan && [0, 1, 2].map((item) => <article className="place-card place-card-skeleton" key={item} aria-hidden="true"><div className="skeleton-visual" /><div className="skeleton-copy"><i /><b /><span /></div></article>)}
      {!loading && !activePlaces.length && !planError && !incomplete && <div className="place-empty" role="status"><h3>{!plan ? say("어떤 곳으로 떠나볼까요?", "Where will your next trip take you?") : say("선택한 조건에 맞는 여행지를 찾지 못했어요.", "No places match these preferences yet.")}</h3><p>{say("필요한 편의는 유지한 채 지역이나 여행 취향을 바꿔보세요.", "Keep your facility needs and try another region or interest.")}</p><a href="#conditions">{say("여행 조건 다시 선택", "Review preferences")}</a><button type="button" disabled={!selected.length} onClick={() => void onGenerate(false)}>{say("여행지 찾기", "Find places")}</button></div>}
      {!loading && activePlaces.length > 0 && !visiblePlaces.length && <p role="status">{say("현재 검색 결과 중 이 조건에 맞는 여행지가 없어요. 다른 필터를 선택해 주세요.", "No current results match this filter. Choose another filter.")}</p>}
      {visiblePlaces.map((place, index) => <PlaceChoiceCard key={place.id} place={place} region={region} index={index} saved={saved.includes(place.id)} current={resultCurrent} en={en} onToggle={() => toggleSaved(place.id)} onDetails={() => onSelectPlace(place)} />)}
    </div>
    {explorationPlaces.length > 0 && <Suspense fallback={<InformationUnavailable en={en} />}><ExplorationPlaces places={explorationPlaces} en={en} onSelectPlace={onSelectPlace} /></Suspense>}
  </>;
}
