import type { Place } from "../types";

export default function PlaceParticipationActions({ place, location, saved, canSave = true, feedbackText, feedbackState, onToggleSaved, onFeedbackChange, onSubmitFeedback }: {
  place: Place;
  location: string;
  saved: boolean;
  canSave?: boolean;
  feedbackText: string;
  feedbackState: "idle" | "sending" | "done" | "error";
  onToggleSaved: () => void;
  onFeedbackChange: (value: string) => void;
  onSubmitFeedback: () => void;
}) {
  return <>
    <a className="place-external-review" href={`https://map.kakao.com/link/search/${encodeURIComponent(`${place.name} ${place.address || location}`)}`} target="_blank" rel="noreferrer"><span><b>방문 후기·사진</b><small>카카오 장소 상세에서 최신 이용 후기를 확인합니다.</small></span><i>↗</i></a>
    <a className="place-community-link" href={`/community?placeId=${encodeURIComponent(place.id)}&placeName=${encodeURIComponent(place.name)}&region=${encodeURIComponent(location)}`}><span><b>이 장소의 여행 후기</b><small>공식 정보와 분리된 질문·현장 경험을 확인하세요.</small></span><i>→</i></a>
    <a className="place-field-report-link" href={`/community/new?category=review&placeId=${encodeURIComponent(place.id)}&placeName=${encodeURIComponent(place.name)}&region=${encodeURIComponent(location)}`}><span><b>구조화 현장 후기 쓰기</b><small>방문일과 항목별 확인 상태를 공식 근거와 분리해 남깁니다.</small></span><i>＋</i></a>
    <button type="button" disabled={!saved && !canSave} onClick={onToggleSaved}>{saved ? "일정에서 빼기" : "일정에 추가"}<span>{saved ? "−" : "+"}</span></button>
    {!saved && !canSave && <p>현재 추천에서 필요한 편의가 확인된 장소만 일정에 추가할 수 있습니다. 조건을 바꿨다면 여행지를 다시 찾아주세요.</p>}
    <div className="feedback-box">
      <label htmlFor="feedback-message">현장 정보가 다른가요?</label>
      <textarea id="feedback-message" value={feedbackText} onChange={(event) => onFeedbackChange(event.target.value)} placeholder="달라진 접근로·화장실·승강기 정보를 알려주세요." rows={3} />
      <button type="button" onClick={onSubmitFeedback} disabled={feedbackText.trim().length < 5 || feedbackState === "sending"}>{feedbackState === "sending" ? "접수 중" : feedbackState === "done" ? "접수 완료 ✓" : "정보 수정 제보"}</button>
      {feedbackState === "error" && <small>제보 저장 상태를 확인해 주세요.</small>}
    </div>
  </>;
}
