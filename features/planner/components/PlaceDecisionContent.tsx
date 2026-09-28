"use client";
import LoadingState from "../../../components/LoadingState";
import NightIcon from "../../../components/NightIcon";

import { lazy, Suspense, useId, useRef, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { Place } from "../types";
import type { PlaceDecisionDialogProps } from "./PlaceDecisionDialog";
import PlaceSensory from './PlaceSensory';
import PlaceVisitHours from "./PlaceVisitHours";

function DetailsUnavailable() {
  const { locale } = useSitePreferences();
  return <p role="alert">{locale === "en" ? "These details could not load. Close this dialog and reload the page to try again. Your itinerary remains available." : "상세 화면을 불러오지 못했어요. 닫고 페이지를 새로 열어 다시 시도해 주세요. 일정은 계속 이용할 수 있습니다."}</p>;
}
const PlaceEvidenceSummary = lazy(() => import("./PlaceEvidenceSummary").catch(() => ({ default: DetailsUnavailable })));
const PlaceParticipationActions = lazy(() => import("./PlaceParticipationActions").catch(() => ({ default: DetailsUnavailable })));
const PlaceInquiryCard = lazy(() => import("./PlaceInquiryCard").catch(() => ({ default: DetailsUnavailable })));
const PlaceArrivalPreview = lazy(() => import('./PlaceArrivalPreview'));
const PlaceAudioGuide = lazy(() => import('./PlaceAudioGuide'));

function StoriesUnavailable({ place, location }: { place: Place; location: string }) {
  const { locale } = useSitePreferences();
  return <div className="place-community-stories">
    <p role="status">{locale === "en" ? "Visitor stories couldn't open here. You can read them on the community page." : "현장 후기 화면을 열지 못했습니다. 커뮤니티에서 확인할 수 있습니다."}</p>
    <a href={`/community?placeId=${encodeURIComponent(place.id)}&placeName=${encodeURIComponent(place.name)}&region=${encodeURIComponent(location)}`}>{locale === "en" ? "Open community" : "커뮤니티 열기"}</a>
  </div>;
}

const PlaceCommunityStories = lazy(() => import("./PlaceCommunityStories").catch(() => ({ default: StoriesUnavailable })));

export default function PlaceDecisionContent(props: PlaceDecisionDialogProps & { location: string }) {
  const { place, location } = props;
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const labels = en ? ['Overview', 'Access and facilities', 'Visitor stories'] : ['기본정보', '이용과 편의', '후기'];
  return <>
    <div className="place-detail-tabs" role="tablist" aria-label={en ? 'Place information' : '장소 정보'}>
      {labels.map((label, index) => <button key={index} ref={node => { tabRefs.current[index] = node; }} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => {
        const next = event.key === 'ArrowRight' ? (index + 1) % labels.length : event.key === 'ArrowLeft' ? (index + labels.length - 1) % labels.length : event.key === 'Home' ? 0 : event.key === 'End' ? labels.length - 1 : null;
        if (next === null) return;
        event.preventDefault();
        setActive(next);
        tabRefs.current[next]?.focus({ preventScroll: true });
      }}><NightIcon name={['info', 'access', 'chat'][index]} size={18} /><span>{label}</span></button>)}
    </div>
    {/* Keep panels mounted so questions, reports and arrival progress survive tab changes. */}
    <div className="place-detail-panel" role="tabpanel" id={`${id}-panel-0`} aria-labelledby={`${id}-tab-0`} hidden={active !== 0} tabIndex={0}>
        <PlaceVisitHours expanded id={place.id} name={place.name} en={en} />
        <Suspense fallback={<LoadingState>{en ? "Preparing visitor questions…" : "방문 전 문의를 준비하고 있어요…"}</LoadingState>}><PlaceInquiryCard key={place.id} place={place} en={en} /></Suspense>
        <Suspense fallback={null}><PlaceAudioGuide expanded key={place.id} id={place.id} guidance={props.guidancePreferences} /></Suspense>
    </div>
    <div className="place-detail-panel" role="tabpanel" id={`${id}-panel-1`} aria-labelledby={`${id}-tab-1`} hidden={active !== 1} tabIndex={0}>
        <Suspense fallback={<LoadingState>{en ? "Loading facility details…" : "편의정보를 불러오는 중…"}</LoadingState>}><PlaceEvidenceSummary key={place.id} place={place} refresh={props.latestEvidence} /></Suspense>
        <PlaceSensory place={place}/>
        <details className="place-review-arrival"><summary>{en ? 'Parking, entrance and facilities preview' : '주차·입구·시설 미리보기'}</summary><Suspense fallback={<LoadingState>{en ? 'Preparing arrival information…' : '주차·입구 정보를 준비하고 있어요.'}</LoadingState>}><PlaceArrivalPreview key={place.id} place={place} onClose={props.onClose} onOpenRestrooms={props.onClose} /></Suspense></details>
    </div>
    <div className="place-detail-panel" role="tabpanel" id={`${id}-panel-2`} aria-labelledby={`${id}-tab-2`} hidden={active !== 2} tabIndex={0}>
        <Suspense fallback={<LoadingState>{en ? "Preparing visitor stories." : "현장 후기 화면을 준비하고 있어요."}</LoadingState>}>
          <PlaceCommunityStories place={place} location={location} />
        </Suspense>
        <Suspense fallback={<LoadingState>{en ? "Loading visitor links and correction form…" : "후기 링크와 제보 양식을 불러오는 중…"}</LoadingState>}><PlaceParticipationActions place={place} location={location} feedbackText={props.feedbackText} feedbackState={props.feedbackState} onFeedbackChange={props.onFeedbackChange} onSubmitFeedback={props.onSubmitFeedback} /></Suspense>
    </div>
    <a className="information-guide-link" href="/policies#travel-information-policy" target="_blank" rel="noreferrer">{en ? "Information guide (new tab)" : "정보 이용 안내 (새 창)"}</a>
  </>;
}

