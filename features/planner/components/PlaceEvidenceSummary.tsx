"use client";

import { useSitePreferences } from "../../../components/SitePreferences";
import type { Place } from "../types";
import { facilityName, originalLanguage } from "../place-copy";

export default function PlaceEvidenceSummary({ place }: { place: Place }) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const say = (ko: string, english: string) => en ? english : ko;
  const items = place.accessibility || [];
  const confirmed = items.length ? items.filter((item) => item.state === "confirmed").length : Math.max(0, (place.knownFields || 0) - (place.negativeFields || 0));
  const unknown = items.length ? items.filter((item) => item.state === "unknown").length : place.unknownFields || 0;
  const negative = items.length ? items.filter((item) => item.state === "negative").length : place.negativeFields || 0;
  const groups = [
    { state: "confirmed", title: say("공식 기록에 있는 편의", "Facilities in the official record") },
    { state: "unknown", title: say("방문 전 확인할 편의", "Facilities to check before visiting") },
    { state: "negative", title: say("제공되지 않는 것으로 기록된 편의", "Facilities reported unavailable") },
  ] as const;
  return <>
    <div className="evidence-counts" role="group" aria-label={say("공식 데이터 확인 범위", "Official information coverage")}>
      <span>{say("확인됨", "Reported available")} {confirmed}</span>
      <span>{say("미확인", "Not reported")} {unknown}</span>
      <span>{say("불일치", "Reported unavailable")} {negative}</span>
    </div>
    <p>{say("확인됨은 공식 데이터에 해당 편의가 기재됐다는 뜻입니다. 현장 접근 가능성을 보장하지 않습니다.", "Reported available means the facility appears in the official record. It does not guarantee access at the venue.")}</p>
    {items.length > 0 ? <div className="place-decision-summary">{groups.map((group) => {
      const records = items.filter((item) => item.state === group.state);
      return records.length > 0 && <section key={group.state} aria-labelledby={`facility-group-${group.state}`}>
      <h3 id={`facility-group-${group.state}`}>{group.title} <span>{records.length}</span></h3>
      <dl className="facility-evidence-list">{records.map((item) => <div key={item.key} data-state={item.state}>
      <dt><span lang={originalLanguage(facilityName(item.key, item.label, en))}>{facilityName(item.key, item.label, en)}</span><span>{item.state === "confirmed" ? say("확인됨", "Reported available") : item.state === "negative" ? say("불일치", "Reported unavailable") : say("미확인", "Not reported")}</span></dt>
      <dd lang={originalLanguage(item.detail)}>{item.detail || say("제공된 정보가 없습니다. 시설에 직접 확인해 주세요.", "No information supplied. Please check with the venue.")}</dd>
    </div>)}</dl></section>;
    })}</div> : <p>{say("이전 저장 자료에는 항목별 근거가 없습니다. 최신 정보를 다시 조회해 주세요.", "This saved record has no item-level evidence. Search again for current information.")}</p>}
    <details className="place-evidence"><summary>{say("출처·확인 시각·계산 방법", "Source, retrieval time and method")}</summary>
      <div className="modal-data"><span><small>{say("출처", "Source")}</small><span lang={originalLanguage(place.source)}>{place.source}</span></span><span><small>{say("조회 시각", "Retrieved")}</small>{place.checkedAt ? new Date(place.checkedAt).toLocaleString(en ? "en-GB" : "ko-KR") : say("확인되지 않음", "Not available")}</span></div>
      <p>{say("추천 정렬에는 선택한 공식 항목 중 긍정적으로 확인된 항목의 비율(확인됨 ÷ 전체 선택 항목)을 사용합니다. 불일치와 미확인은 구분하며 사진·인기·후기는 계산에 넣지 않습니다. 조회 시각은 제공처의 시설 갱신일이 아닙니다.", "Recommendations use the proportion of selected fields reported available. Missing and negative records remain distinct. Photos, popularity and reviews do not change the calculation. Retrieval time is not the provider's facility update date.")}</p>
    </details>
  </>;
}
