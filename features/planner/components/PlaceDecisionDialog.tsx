"use client";
import LoadingState from "../../../components/LoadingState";

import { lazy, Suspense, type RefObject } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { Place } from "../types";
import { originalLanguage } from "../place-copy";

function DetailsUnavailable() {
  const { locale } = useSitePreferences();
  return <p role="alert">{locale === "en" ? "These details could not load. Close this dialog and reload the page to try again. Your itinerary remains available." : "상세 화면을 불러오지 못했어요. 닫고 페이지를 새로 열어 다시 시도해 주세요. 일정은 계속 이용할 수 있습니다."}</p>;
}
const PlaceDecisionContent = lazy(() => import("./PlaceDecisionContent").catch(() => ({ default: DetailsUnavailable })));
const PlaceAudioGuide = lazy(() => import('./PlaceAudioGuide'));

export type PlaceDecisionDialogProps = {
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

export default function PlaceDecisionDialog(props: PlaceDecisionDialogProps) {
  const { place, region, dialogRef, onClose } = props;
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const location = place.city || region;
  return <dialog className="place-modal native-place-dialog" aria-labelledby="place-modal-title" ref={dialogRef}>
      <button className="modal-close" type="button" onClick={onClose} aria-label={en ? "Close" : "닫기"}>×</button>
      <div className="modal-visual" style={place.image ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(4,25,44,.72)), url("${place.image}")` } : undefined}><span lang={originalLanguage(location)}>{location}</span></div>
      <div className="modal-body">
        <p className="section-kicker">{en ? "Facility information" : "편의정보 자세히 보기"}</p><h2 id="place-modal-title" lang={originalLanguage(place.name)} tabIndex={-1}>{place.name}</h2><p lang={originalLanguage(place.address || place.summary)}>{place.address || place.summary}</p>
        {en && <p className="original-language-note">Place names, addresses and facility evidence are shown in their original language, which may be Korean. Visitor stories are not translated.</p>}
        <button type="button" aria-pressed={props.saved} disabled={!props.saved && props.canSave === false} onClick={props.onToggleSaved}>{props.saved ? en ? "Remove from itinerary" : "일정에서 빼기" : en ? "Add to itinerary" : "일정에 추가"}<span aria-hidden="true">{props.saved ? "−" : "+"}</span></button>
        {!props.saved && props.canSave === false && <p>{en ? "Only current recommendations with confirmed matching facilities can be added. Search again if you changed your preferences." : "현재 추천에서 필요한 편의가 확인된 장소만 일정에 추가할 수 있습니다. 조건을 바꿨다면 여행지를 다시 찾아주세요."}</p>}
        <Suspense fallback={<LoadingState>{en ? "Loading place details…" : "상세 정보를 불러오는 중…"}</LoadingState>}><PlaceDecisionContent {...props} location={location} /></Suspense>
        <Suspense fallback={null}><PlaceAudioGuide key={place.id} id={place.id} /></Suspense>
      </div>
  </dialog>;
}
