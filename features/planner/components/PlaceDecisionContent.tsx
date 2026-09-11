"use client";

import { lazy, Suspense } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { Place } from "../types";
import type { PlaceDecisionDialogProps } from "./PlaceDecisionDialog";

function DetailsUnavailable() {
  const { locale } = useSitePreferences();
  return <p role="alert">{locale === "en" ? "These details could not load. Close this dialog and reload the page to try again. Your itinerary remains available." : "상세 화면을 불러오지 못했어요. 닫고 페이지를 새로 열어 다시 시도해 주세요. 일정은 계속 이용할 수 있습니다."}</p>;
}
const PlaceEvidenceSummary = lazy(() => import("./PlaceEvidenceSummary").catch(() => ({ default: DetailsUnavailable })));
const PlaceParticipationActions = lazy(() => import("./PlaceParticipationActions").catch(() => ({ default: DetailsUnavailable })));
const PlaceInquiryCard = lazy(() => import("./PlaceInquiryCard").catch(() => ({ default: DetailsUnavailable })));

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
  return <>
        <Suspense fallback={<p role="status">{en ? "Loading facility details…" : "편의정보를 불러오는 중…"}</p>}><PlaceEvidenceSummary place={place} /></Suspense>
        <Suspense fallback={<p role="status">{en ? "Preparing visitor questions…" : "방문 전 문의를 준비하고 있어요…"}</p>}><PlaceInquiryCard key={place.id} place={place} en={en} /></Suspense>
        <Suspense fallback={<p role="status">{en ? "Preparing visitor stories." : "현장 후기 화면을 준비하고 있어요."}</p>}>
          <PlaceCommunityStories place={place} location={location} />
        </Suspense>
        <Suspense fallback={<p role="status">{en ? "Loading visitor links and correction form…" : "후기 링크와 제보 양식을 불러오는 중…"}</p>}><PlaceParticipationActions place={place} location={location} feedbackText={props.feedbackText} feedbackState={props.feedbackState} onFeedbackChange={props.onFeedbackChange} onSubmitFeedback={props.onSubmitFeedback} /></Suspense>
        <small className="modal-note">{en ? "Facility records are not a safety certification. Missing information does not mean a facility is absent. Confirm current conditions with the venue before visiting." : "공식 시설 정보는 안전 인증이나 접근 가능성 보장이 아닙니다. 미확인은 시설이 없다는 뜻이 아닙니다. 방문 전 시설에 현재 운영 상태를 확인해 주세요."}</small>
  </>;
}

