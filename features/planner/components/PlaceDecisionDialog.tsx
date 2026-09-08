"use client";

import { lazy, Suspense, type RefObject } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { Place } from "../types";
import { originalLanguage } from "../place-copy";

function DetailsUnavailable() {
  const { locale } = useSitePreferences();
  return <p role="alert">{locale === "en" ? "These details could not load. Close this dialog and reload the page to try again. No trip changes were made." : "상세 화면을 불러오지 못했어요. 닫고 페이지를 새로 열어 다시 시도해 주세요. 일정은 변경하지 않았습니다."}</p>;
}
const PlaceEvidenceSummary = lazy(() => import("./PlaceEvidenceSummary").catch(() => ({ default: DetailsUnavailable })));
const PlaceParticipationActions = lazy(() => import("./PlaceParticipationActions").catch(() => ({ default: DetailsUnavailable })));

function StoriesUnavailable({ place, location }: { place: Place; location: string }) {
  const { locale } = useSitePreferences();
  return <div className="place-community-stories">
    <p role="status">{locale === "en" ? "Visitor stories couldn't open here. You can read them on the community page." : "현장 후기 화면을 열지 못했습니다. 커뮤니티에서 확인할 수 있습니다."}</p>
    <a href={`/community?placeId=${encodeURIComponent(place.id)}&placeName=${encodeURIComponent(place.name)}&region=${encodeURIComponent(location)}`}>{locale === "en" ? "Open community" : "커뮤니티 열기"}</a>
  </div>;
}

const PlaceCommunityStories = lazy(() => import("./PlaceCommunityStories").catch(() => ({ default: StoriesUnavailable })));

type Props = {
  place: Place;
  region: string;
  saved: boolean;
  canSave?: boolean;
  feedbackText: string;
  feedbackState: "idle" | "sending" | "done" | "error";
  dialogRef: RefObject<HTMLDialogElement | null>;
  onClose: () => void;
  onToggleSaved: () => void;
  onFeedbackChange: (value: string) => void;
  onSubmitFeedback: () => void;
};

export default function PlaceDecisionDialog(props: Props) {
  const { place, region, dialogRef, onClose } = props;
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const location = place.city || region;
  return <dialog className="place-modal native-place-dialog" aria-labelledby="place-modal-title" ref={dialogRef}>
      <button className="modal-close" type="button" onClick={onClose} aria-label={en ? "Close" : "닫기"}>×</button>
      <div className="modal-visual" style={place.image ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(4,25,44,.72)), url("${place.image}")` } : undefined}><span>{location}</span></div>
      <div className="modal-body">
        <p className="section-kicker">{en ? "Facility information" : "편의정보 자세히 보기"}</p><h2 id="place-modal-title" lang={originalLanguage(place.name)} tabIndex={-1}>{place.name}</h2><p lang={originalLanguage(place.address || place.summary)}>{place.address || place.summary}</p>
        {en && <p className="original-language-note">Place names, addresses and facility evidence are shown in their original language, which may be Korean. Visitor stories are not translated.</p>}
        <Suspense fallback={<p role="status">{en ? "Loading facility details…" : "편의정보를 불러오는 중…"}</p>}><PlaceEvidenceSummary place={place} /></Suspense>
        <Suspense fallback={<p role="status">{en ? "Preparing visitor stories." : "현장 후기 화면을 준비하고 있어요."}</p>}>
          <PlaceCommunityStories place={place} location={location} />
        </Suspense>
        <Suspense fallback={<p role="status">{en ? "Loading place actions…" : "장소 선택 항목을 불러오는 중…"}</p>}><PlaceParticipationActions place={place} location={location} saved={props.saved} canSave={props.canSave} feedbackText={props.feedbackText} feedbackState={props.feedbackState} onToggleSaved={props.onToggleSaved} onFeedbackChange={props.onFeedbackChange} onSubmitFeedback={props.onSubmitFeedback} /></Suspense>
        <small className="modal-note">{en ? "Facility records are not a safety certification. Missing information does not mean a facility is absent. Confirm current conditions with the venue before visiting." : "공식 시설 정보는 안전 인증이나 접근 가능성 보장이 아닙니다. 미확인은 시설이 없다는 뜻이 아닙니다. 방문 전 시설에 현재 운영 상태를 확인해 주세요."}</small>
      </div>
  </dialog>;
}
