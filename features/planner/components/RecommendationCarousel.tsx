"use client";

import { lazy, Suspense, useId, useRef } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import SmartSpotImage from "../../tourism/components/SmartSpotImage";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import { facilityName, originalLanguage } from "../place-copy";
import { planNotices } from "../condition-copy";

function InformationUnavailable({ en }: { en: boolean }) {
  return <p role="status">{planNotices.error[en ? 1 : 0]}</p>;
}
const ProviderFailureNotice = lazy(() => import("./ProviderFailureNotice").catch(() => ({ default: InformationUnavailable })));

const ExplorationPlaces = lazy(() => import("./ExplorationPlaces").catch(() => ({ default: InformationUnavailable })));

function PlaceChoiceCard({ place, region, index, saved, current, en, onToggle, onDetails }: {
  place: Place; region: string; index: number; saved: boolean; current: boolean; en: boolean;
  onToggle: () => void; onDetails: () => void;
}) {
  const id = useId();
  const items = place.accessibility ?? [];
  const confirmed = items.filter(item => item.state === "confirmed");
  const unknown = items.length ? items.filter(item => item.state === "unknown").length : place.unknownFields;
  const negative = items.length ? items.filter(item => item.state === "negative").length : place.negativeFields;
  const say = (ko: string, english: string) => en ? english : ko;
  const action = saved ? say("일정에서 빼기", "Remove from itinerary") : say("일정에 추가", "Add to itinerary");
  return <article className="place-card" data-result-current={current} aria-labelledby={`${id}-title`}>
    <SmartSpotImage src={place.image} title={place.name} region={place.city || region} tag={say("관광지", "Place")} rank={index + 1} contentId={place.id} className="place-visual" showMeta={false} />
    <div className="place-content">
      <p className="place-region" lang={originalLanguage(place.city || region)}>{place.city || region}</p>
      <h3 id={`${id}-title`} lang={originalLanguage(place.name)}>{place.name}</h3>
      <p className="place-address" lang={originalLanguage(place.address || place.summary)}>{place.address || place.summary}</p>
      <div className="place-facilities">
        <strong>{confirmed.length ? say("확인된 편의", "Reported facilities") : say("편의정보 확인이 필요해요", "Check the facility information")}</strong>
        {confirmed.length > 0 ? <ul>{confirmed.slice(0, 3).map(item => <li key={item.key}><span aria-hidden="true">✓</span> <span lang={originalLanguage(facilityName(item.key, item.label, en))}>{facilityName(item.key, item.label, en)}</span></li>)}</ul> : <p>{say("항목별로 확인된 편의가 없습니다. 이용 정보를 살펴보세요.", "No facilities are confirmed at item level. Review the visitor information.")}</p>}
      </div>
      {(Boolean(unknown) || Boolean(negative)) && <p className="facility-caution">
        {Boolean(unknown) && <span>{say("미확인", "Not reported")} {unknown}{say("개", "")}</span>}
        {Boolean(negative) && <span>{say("조건 불일치", "Reported unavailable")} {negative}{say("개", "")}</span>}
      </p>}
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
  const { loading, planError, selected, plan, dirty, resultCurrent } = planController;
  const { saved, toggleSaved } = tripSelection;
  const explorationPlaces = plan?.explorationPlaces ?? [];
  const incomplete = plan?.statuses.some(status => status.state === "error" || status.partial);
  const scrollCards = (direction: number) => cardsRef.current?.scrollBy({ left: direction * Math.min(window.innerWidth * .78, 480), behavior: motion === "calm" ? "instant" : "smooth" });
  return <>
    <div className="journey-subheading"><div><h2>{say("내 조건에 맞는 여행지", "Places for your trip")}</h2></div><div className="carousel-actions"><button type="button" onClick={() => scrollCards(-1)} aria-label={say("이전 여행지", "Previous places")}>←</button><button type="button" onClick={() => scrollCards(1)} aria-label={say("다음 여행지", "Next places")}>→</button></div></div>
    <p className="stage-guidance">{say("확인된 편의와 아직 모르는 정보를 함께 보고, 마음에 드는 곳을 일정에 담으세요.", "Compare reported facilities and missing information, then add places to your itinerary.")}</p>
    {en && <p className="original-language-note">Place names, addresses and facility evidence may be available only in Korean. Original records are preserved.</p>}
    {incomplete && plan && <Suspense fallback={<InformationUnavailable en={en} />}><ProviderFailureNotice en={en} statuses={plan.statuses} /></Suspense>}
    {dirty && <div className="result-notice" role="status"><strong>{say("조건이 변경됐어요.", "Your preferences have changed.")}</strong><p>{say("아래는 이전 조건의 결과예요. 다시 찾기 전에는 새 일정에 추가할 수 없습니다.", "These are previous results. Search again before adding places.")}</p><button type="button" disabled={loading || !selected.length} onClick={() => void onGenerate(false)}>{say("변경한 조건으로 다시 찾기", "Search with new preferences")}</button></div>}
    {planError && <div className="result-notice error" role="alert"><strong>{say("여행지를 불러오지 못했어요.", "We couldn't load places.")}</strong><p>{say("기존 결과와 내 일정은 보관했어요. 연결 상태를 확인하고 다시 시도해 주세요.", "Your previous results and itinerary are kept. Check your connection and try again.")}</p><button type="button" disabled={loading || !selected.length} onClick={() => void onGenerate(false)}>{say("다시 시도", "Try again")}</button></div>}
    <div className="place-carousel" ref={cardsRef} aria-busy={loading}>
      {loading && <p className="sr-only" role="status">{say("여행지를 찾고 있어요.", "Finding places.")}</p>}
      {loading && !plan && [0, 1, 2].map((item) => <article className="place-card place-card-skeleton" key={item} aria-hidden="true"><div className="skeleton-visual" /><div className="skeleton-copy"><i /><b /><span /></div></article>)}
      {!loading && !activePlaces.length && !planError && !incomplete && <div className="place-empty" role="status"><h3>{!plan ? say("어떤 곳으로 떠나볼까요?", "Where will your next trip take you?") : say("선택한 조건에 맞는 여행지를 찾지 못했어요.", "No places match these preferences yet.")}</h3><p>{say("필요한 편의는 유지한 채 지역이나 여행 취향을 바꿔보세요.", "Keep your facility needs and try another region or interest.")}</p><a href="#conditions">{say("여행 조건 다시 선택", "Review preferences")}</a><button type="button" disabled={!selected.length} onClick={() => void onGenerate(false)}>{say("여행지 찾기", "Find places")}</button></div>}
      {activePlaces.map((place, index) => <PlaceChoiceCard key={place.id} place={place} region={region} index={index} saved={saved.includes(place.id)} current={resultCurrent} en={en} onToggle={() => toggleSaved(place.id)} onDetails={() => onSelectPlace(place)} />)}
    </div>
    {explorationPlaces.length > 0 && <Suspense fallback={<InformationUnavailable en={en} />}><ExplorationPlaces places={explorationPlaces} en={en} onSelectPlace={onSelectPlace} /></Suspense>}
  </>;
}
