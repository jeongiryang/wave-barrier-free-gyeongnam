"use client";

import type { RefObject } from "react";
import type { Place } from "../types";
import PlaceEvidenceSummary from "./PlaceEvidenceSummary";
import PlaceParticipationActions from "./PlaceParticipationActions";

type Props = {
  place: Place;
  region: string;
  saved: boolean;
  feedbackText: string;
  feedbackState: "idle" | "sending" | "done" | "error";
  dialogRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onToggleSaved: () => void;
  onFeedbackChange: (value: string) => void;
  onSubmitFeedback: () => void;
};

export default function PlaceDecisionDialog(props: Props) {
  const { place, region, dialogRef, onClose } = props;
  const location = place.city || region;
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="place-modal" role="dialog" aria-modal="true" aria-labelledby="place-modal-title" onMouseDown={(event) => event.stopPropagation()} ref={dialogRef}>
      <button className="modal-close" type="button" onClick={onClose} aria-label="닫기">×</button>
      <div className="modal-visual" style={place.image ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(4,25,44,.72)), url("${place.image}")` } : undefined}><span>{location}</span><b className={place.score === null ? "pending" : ""}>{place.score === null ? "판단 보류" : `${place.score}%`}<small>{place.score === null ? "공식 편의근거 부족" : "선택 편의조건 일치"}</small></b></div>
      <div className="modal-body">
        <p className="section-kicker">ACCESSIBILITY DETAIL</p><h2 id="place-modal-title">{place.name}</h2><p>{place.address || place.summary}</p>
        <PlaceEvidenceSummary place={place} />
        <PlaceParticipationActions place={place} location={location} saved={props.saved} feedbackText={props.feedbackText} feedbackState={props.feedbackState} onToggleSaved={props.onToggleSaved} onFeedbackChange={props.onFeedbackChange} onSubmitFeedback={props.onSubmitFeedback} />
        <small className="modal-note">편의조건 일치율은 선택한 조건 중 공식 데이터에서 긍정적으로 확인된 항목의 비율이며 공식 인증 점수가 아닙니다. 확인된 편의정보가 없으면 숫자를 만들지 않고 판단을 보류합니다. 시설 운영상태는 방문 전에 다시 확인해 주세요.</small>
      </div>
    </section>
  </div>;
}
