"use client";

import type { RefObject } from "react";
import type { Place } from "../types";

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

export default function PlaceDecisionDialog({
  place,
  region,
  saved,
  feedbackText,
  feedbackState,
  dialogRef,
  onClose,
  onToggleSaved,
  onFeedbackChange,
  onSubmitFeedback,
}: Props) {
  const location = place.city || region;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="place-modal" role="dialog" aria-modal="true" aria-labelledby="place-modal-title" onMouseDown={(event) => event.stopPropagation()} ref={dialogRef}>
        <button className="modal-close" type="button" onClick={onClose} aria-label="닫기">×</button>
        <div className="modal-visual" style={place.image ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(4,25,44,.72)), url("${place.image}")` } : undefined}>
          <span>{location}</span>
          <b className={place.score === null ? "pending" : ""}>{place.score === null ? "판단 보류" : `${place.score}%`}<small>{place.score === null ? "공식 편의근거 부족" : "선택 편의조건 일치"}</small></b>
        </div>
        <div className="modal-body">
          <p className="section-kicker">ACCESSIBILITY DETAIL</p>
          <h2 id="place-modal-title">{place.name}</h2>
          <p>{place.address || place.summary}</p>
          <div className="place-decision-summary">
            <section><h3>잘 맞는 이유</h3><ul>{place.features.length ? place.features.slice(0, 4).map((feature) => <li key={feature}><span>✓</span>{feature} 정보 확인</li>) : <li><span>i</span>현재 선택 조건에서 확정할 공식 편의정보가 부족합니다.</li>}</ul></section>
            <section className="needs-check"><h3>더 확인할 부분</h3><ul><li><span>?</span>{place.unknownFields ? `${place.unknownFields}개 편의 항목의 정보가 없습니다.` : "시설 운영상태는 방문 전에 다시 확인해 주세요."}</li>{Boolean(place.negativeFields) && <li><span>!</span>{place.negativeFields}개 조건은 맞지 않는 정보가 확인됐습니다.</li>}</ul></section>
          </div>
          <details className="place-evidence"><summary>공식 근거 자세히 보기</summary><ul>{place.details.length ? place.details.map((detail) => <li key={detail}><span>✓</span>{detail}</li>) : <li><span>i</span>공식 데이터에 상세 편의정보가 없습니다.</li>}</ul><div className="modal-data"><span><small>공식 정보</small>{place.source}</span><span><small>확인 시각</small>{place.checkedAt ? new Date(place.checkedAt).toLocaleString("ko-KR") : "이번 검색에서 조회"}</span></div></details>
          {typeof place.confidence === "number" && <div className="modal-confidence"><span><small>정보 확인률</small><b>{place.confidence}%</b></span><span><small>확인된 항목</small><b>{place.knownFields || 0}개</b></span><span><small>정보 없음</small><b>{place.unknownFields || 0}개</b></span></div>}
          <a className="place-external-review" href={`https://map.kakao.com/link/search/${encodeURIComponent(`${place.name} ${place.address || location}`)}`} target="_blank" rel="noreferrer"><span><b>방문 후기·사진</b><small>카카오 장소 상세에서 최신 이용 후기를 확인합니다.</small></span><i>↗</i></a>
          <a className="place-community-link" href={`/community?placeId=${encodeURIComponent(place.id)}&placeName=${encodeURIComponent(place.name)}&region=${encodeURIComponent(location)}`}><span><b>여행자가 직접 남긴 이야기</b><small>공식 정보와 분리된 질문·현장 경험을 확인하세요.</small></span><i>→</i></a>
          <button type="button" onClick={onToggleSaved}>여행 보관함에 {saved ? "빼기" : "담기"}<span>{saved ? "−" : "+"}</span></button>
          <div className="feedback-box">
            <label htmlFor="feedback-message">현장 정보가 다른가요?</label>
            <textarea id="feedback-message" value={feedbackText} onChange={(event) => onFeedbackChange(event.target.value)} placeholder="달라진 접근로·화장실·승강기 정보를 알려주세요." rows={3} />
            <button type="button" onClick={onSubmitFeedback} disabled={feedbackText.trim().length < 5 || feedbackState === "sending"}>{feedbackState === "sending" ? "접수 중" : feedbackState === "done" ? "접수 완료 ✓" : "정보 수정 제보"}</button>
            {feedbackState === "error" && <small>제보 저장 상태를 확인해 주세요.</small>}
          </div>
          <small className="modal-note">편의조건 일치율은 선택한 조건 중 공식 데이터에서 긍정적으로 확인된 항목의 비율이며 공식 인증 점수가 아닙니다. 확인된 편의정보가 없으면 숫자를 만들지 않고 판단을 보류합니다. 시설 운영상태는 방문 전에 다시 확인해 주세요.</small>
        </div>
      </section>
    </div>
  );
}
