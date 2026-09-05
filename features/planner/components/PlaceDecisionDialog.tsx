"use client";

import type { RefObject } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { Place } from "../types";
import PlaceCommunityStories from "./PlaceCommunityStories";
import PlaceEvidenceSummary from "./PlaceEvidenceSummary";
import PlaceParticipationActions from "./PlaceParticipationActions";

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
        <p className="section-kicker">{en ? "Facility information" : "편의정보 자세히 보기"}</p><h2 id="place-modal-title" tabIndex={-1}>{place.name}</h2><p>{place.address || place.summary}</p>
        <PlaceEvidenceSummary place={place} />
        <PlaceCommunityStories place={place} location={location} />
        <PlaceParticipationActions place={place} location={location} saved={props.saved} canSave={props.canSave} feedbackText={props.feedbackText} feedbackState={props.feedbackState} onToggleSaved={props.onToggleSaved} onFeedbackChange={props.onFeedbackChange} onSubmitFeedback={props.onSubmitFeedback} />
        <small className="modal-note">{en ? "Facility records are not a safety certification. Missing information does not mean a facility is absent. Confirm current conditions with the venue before visiting." : "공식 시설 정보는 안전 인증이나 접근 가능성 보장이 아닙니다. 미확인은 시설이 없다는 뜻이 아닙니다. 방문 전 시설에 현재 운영 상태를 확인해 주세요."}</small>
      </div>
  </dialog>;
}
