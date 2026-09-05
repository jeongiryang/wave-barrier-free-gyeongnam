"use client";

import { useSitePreferences } from "../../../components/SitePreferences";
import type { Place } from "../types";

export default function PlaceEvidenceSummary({ place }: { place: Place }) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const say = (ko: string, english: string) => en ? english : ko;
  const items = place.accessibility || [];
  const confirmed = items.length ? items.filter((item) => item.state === "confirmed").length : Math.max(0, (place.knownFields || 0) - (place.negativeFields || 0));
  return <>
    <div className="evidence-counts" aria-label={say("공식 데이터 확인 범위", "Official information coverage")}>
      <span>{say("확인됨", "Reported available")} {confirmed}</span>
      <span>{say("미확인", "Not reported")} {place.unknownFields || 0}</span>
      <span>{say("불일치", "Reported unavailable")} {place.negativeFields || 0}</span>
    </div>
    <p>{say("확인됨은 공식 데이터에 해당 편의가 기재됐다는 뜻입니다. 현장 접근 가능성을 보장하지 않습니다.", "Reported available means the facility appears in the official record. It does not guarantee access at the venue.")}</p>
    {items.length > 0 ? <dl className="facility-evidence-list">{items.map((item) => <div key={item.key} data-state={item.state}>
      <dt><span lang="ko">{item.label}</span><span>{item.state === "confirmed" ? say("확인됨", "Available") : item.state === "negative" ? say("불일치", "Unavailable") : say("미확인", "Not reported")}</span></dt>
      <dd lang={item.detail ? "ko" : undefined}>{item.detail || say("제공된 정보가 없습니다. 시설에 직접 확인해 주세요.", "No information supplied. Please check with the venue.")}</dd>
    </div>)}</dl> : <p>{say("이전 저장 자료에는 항목별 근거가 없습니다. 최신 정보를 다시 조회해 주세요.", "This saved record has no item-level evidence. Search again for current information.")}</p>}
    <details className="place-evidence"><summary>{say("출처·확인 시각·계산 방법", "Source, retrieval time and method")}</summary>
      <div className="modal-data"><span><small>{say("출처", "Source")}</small>{place.source}</span><span><small>{say("조회 시각", "Retrieved")}</small>{place.checkedAt ? new Date(place.checkedAt).toLocaleString(en ? "en-GB" : "ko-KR") : say("확인되지 않음", "Not available")}</span></div>
      <p>{say("추천 정렬에는 선택한 공식 항목 중 긍정적으로 확인된 항목의 비율(확인됨 ÷ 전체 선택 항목)을 사용합니다. 불일치와 미확인은 구분하며 사진·인기·후기는 계산에 넣지 않습니다. 조회 시각은 제공처의 시설 갱신일이 아닙니다.", "Recommendations use the proportion of selected fields reported available. Missing and negative records remain distinct. Photos, popularity and reviews do not change the calculation. Retrieval time is not the provider's facility update date.")}</p>
    </details>
  </>;
}
