"use client";

import type { Place } from "../types";
import { useSitePreferences } from "../../../components/SitePreferences";

export default function PlaceParticipationActions({ place, location, feedbackText, feedbackState, onFeedbackChange, onSubmitFeedback }: {
  place: Place;
  location: string;
  feedbackText: string;
  feedbackState: "idle" | "sending" | "done" | "error";
  onFeedbackChange: (value: string) => void;
  onSubmitFeedback: () => void;
}) {
  const { locale } = useSitePreferences();
  const say = (ko: string, en: string) => locale === "en" ? en : ko;
  return <>
    <a className="place-external-review" href={`https://map.kakao.com/link/search/${encodeURIComponent(`${place.name} ${place.address || location}`)}`} target="_blank" rel="noreferrer"><span><b>{say("방문 후기·사진", "Visitor reviews and photos")}</b><small>{say("카카오 장소 상세에서 최신 이용 후기를 확인합니다. 새 창으로 열립니다.", "Check recent reviews on Kakao Maps. Opens in a new tab; content may be Korean.")}</small></span><i aria-hidden="true">↗</i></a>
    <a className="place-community-link" href={`/community?placeId=${encodeURIComponent(place.id)}&placeName=${encodeURIComponent(place.name)}&region=${encodeURIComponent(location)}`}><span><b>{say("이 장소의 여행 후기", "Visitor stories for this place")}</b><small>{say("공식 정보와 분리된 질문·현장 경험을 확인하세요.", "Questions and visitor experiences are separate from official information.")}</small></span><i aria-hidden="true">→</i></a>
    <a className="place-field-report-link" href={`/community/new?category=review&placeId=${encodeURIComponent(place.id)}&placeName=${encodeURIComponent(place.name)}&region=${encodeURIComponent(location)}`}><span><b>{say("구조화 현장 후기 쓰기", "Write a field report")}</b><small>{say("방문일과 항목별 확인 상태를 공식 근거와 분리해 남깁니다.", "Record your visit date and facility observations separately from official evidence.")}</small></span><i aria-hidden="true">＋</i></a>
    <div className="feedback-box">
      <label htmlFor="feedback-message">{say("현장 정보가 다른가요?", "Has the facility information changed?")}</label>
      <textarea id="feedback-message" aria-describedby="feedback-guidance" value={feedbackText} onChange={(event) => onFeedbackChange(event.target.value)} placeholder={say("달라진 접근로·화장실·승강기 정보를 알려주세요.", "Describe changed paths, toilets or elevators.")} rows={3} />
      <p id="feedback-guidance">{say("5자 이상 입력해 주세요. 개인정보는 적지 마세요.", "Enter at least 5 characters. Do not include personal information.")}</p>
      <button type="button" onClick={onSubmitFeedback} disabled={feedbackText.trim().length < 5 || feedbackState === "sending"}>{feedbackState === "sending" ? say("접수 중", "Sending") : feedbackState === "done" ? say("접수 완료 ✓", "Report received ✓") : say("정보 수정 제보", "Report a correction")}</button>
      <div role="status">{feedbackState === "done" && say("제보가 접수됐습니다. 공식 시설 정보는 검토 전까지 바뀌지 않습니다.", "Your report was received. Official facility information has not been changed.")}</div>
      {feedbackState === "error" && <small role="alert">{say("제보 접수를 확인하지 못했습니다. 입력 내용은 보관했으니 다시 시도해 주세요.", "We couldn't confirm receipt. Your text is kept; please try again.")}</small>}
    </div>
  </>;
}
