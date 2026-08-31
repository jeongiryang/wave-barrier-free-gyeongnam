import type { Place } from "../types";

export default function PlaceEvidenceSummary({ place }: { place: Place }) {
  const hasPositiveEvidence = typeof place.score === "number" && place.score > 0;
  return <>
    <div className="place-decision-summary">
      <section><h3>{hasPositiveEvidence ? "잘 맞는 이유" : "추천에서 분리한 이유"}</h3><ul>{hasPositiveEvidence ? place.features.slice(0, 4).map((feature) => <li key={feature}><span>✓</span>{feature} 정보 확인</li>) : <li><span>i</span>{place.score === 0 ? "공식 편의정보에서 선택 조건과 일치하는 항목을 확인하지 못했습니다." : "현재 선택 조건에서 판단할 공식 편의정보가 부족합니다."}</li>}</ul></section>
      <section className="needs-check"><h3>더 확인할 부분</h3><ul><li><span>?</span>{place.unknownFields ? `${place.unknownFields}개 편의 항목의 정보가 없습니다.` : "시설 운영상태는 방문 전에 다시 확인해 주세요."}</li>{Boolean(place.negativeFields) && <li><span>!</span>{place.negativeFields}개 조건은 맞지 않는 정보가 확인됐습니다.</li>}</ul></section>
    </div>
    <details className="place-evidence"><summary>공식 근거 자세히 보기</summary><ul>{place.details.length ? place.details.map((detail) => <li key={detail}><span>{hasPositiveEvidence ? "✓" : "i"}</span>{detail}</li>) : <li><span>i</span>공식 데이터에 상세 편의정보가 없습니다.</li>}</ul><div className="modal-data"><span><small>공식 정보</small>{place.source}</span><span><small>확인 시각</small>{place.checkedAt ? new Date(place.checkedAt).toLocaleString("ko-KR") : "이번 검색에서 조회"}</span></div></details>
    {typeof place.confidence === "number" && <div className="modal-confidence"><span><small>정보 확인률</small><b>{place.confidence}%</b></span><span><small>확인된 항목</small><b>{place.knownFields || 0}개</b></span><span><small>정보 없음</small><b>{place.unknownFields || 0}개</b></span></div>}
  </>;
}
