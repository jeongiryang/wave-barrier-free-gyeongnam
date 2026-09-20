"use client";

import { useState } from "react";
import { FACILITIES } from "../../../lib/facility-selection.js";
import { useSavedPlaceEvidence } from "../hooks/useSavedPlaceEvidence";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { Place } from "../types";
import { facilityName, originalLanguage } from "../place-copy";
import { StatusShapeIcon } from "../../../components/AccessIcons";

export default function PlaceEvidenceSummary({ place: original }: { place: Place }) {
  const [requested, setRequested] = useState(false);
  const refreshed = useSavedPlaceEvidence([original.id], FACILITIES.map(item => item.key), requested);
  const place = refreshed.places.find(item => item.id === original.id) || original;
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
    {items.length > 0 && <div className="evidence-counts" role="group" aria-label={say("공식 데이터 확인 범위", "Official information coverage")}>
      <span>{say("확인됨", "Reported available")} {confirmed}</span>
      <span>{say("미확인", "Not reported")} {unknown}</span>
      <span>{say("없음으로 기록", "Reported unavailable")} {negative}</span>
    </div>}

    {items.length > 0 ? <div className="place-decision-summary">{groups.map((group) => {
      const records = items.filter((item) => item.state === group.state);
      return records.length > 0 && <section key={group.state} aria-labelledby={`facility-group-${group.state}`}>
      <h3 id={`facility-group-${group.state}`}>{group.title} <span>{records.length}</span></h3>
      <dl className="facility-evidence-list">{records.map((item) => <div key={item.key} data-state={item.state}>
      <dt><span lang={originalLanguage(facilityName(item.key, item.label, en))}>{facilityName(item.key, item.label, en)}</span><span><StatusShapeIcon kind={item.state === "confirmed" ? "confirmed" : item.state === "negative" ? "negative" : "unknown"} />{item.state === "confirmed" ? say("확인됨", "Reported available") : item.state === "negative" ? say("없음으로 기록", "Reported unavailable") : say("미확인", "Not reported")}</span></dt>
      <dd lang={originalLanguage(item.detail)}>{item.detail || say("제공된 정보가 없습니다. 시설에 직접 확인해 주세요.", "No information supplied. Please check with the venue.")}</dd>
    </div>)}</dl></section>;
    })}</div> : <p>{say("공식 데이터에서 항목별 편의정보를 아직 확인하지 못했어요. 시설이 없다는 뜻은 아니며, 다시 조회하거나 방문 전에 문의해 주세요.", "Item-level facilities have not been confirmed in the official data. This does not mean the facilities are unavailable. Reload the information or contact the venue before visiting.")}</p>}
    {(!items.length || requested) && <div className="place-evidence-refresh"><button type="button" disabled={refreshed.loading} onClick={() => { if (requested) refreshed.retry(); else setRequested(true); }}>{refreshed.loading ? say('편의정보 조회 중', 'Loading facilities') : say('편의정보 다시 조회', 'Reload facilities')}</button><p role="status">{refreshed.notice}</p></div>}
    <details className="place-evidence"><summary>{say("출처·확인 시각·계산 방법", "Source, retrieval time and method")}</summary>
      <div className="modal-data"><span><small>{say("출처", "Source")}</small><span lang={originalLanguage(place.source)}>{place.source}</span></span><span><small>{say("조회 시각", "Retrieved")}</small>{place.checkedAt ? new Date(place.checkedAt).toLocaleString(en ? "en-GB" : "ko-KR") : say("확인되지 않음", "Not available")}</span></div>
      <p>{say("추천 정렬에는 선택한 공식 항목 중 긍정적으로 확인된 항목의 비율(확인됨 ÷ 전체 선택 항목)을 사용합니다. 시설 없음과 미확인은 구분하며 사진·인기·후기는 계산에 넣지 않습니다. 조회 시각은 제공처의 시설 갱신일이 아닙니다.", "Recommendations use the proportion of selected fields reported available. Missing and negative records remain distinct. Photos, popularity and reviews do not change the calculation. Retrieval time is not the provider's facility update date.")}</p>
    </details>
  </>;
}
