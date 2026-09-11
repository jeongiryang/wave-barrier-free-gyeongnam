"use client";
import { usePlaceDialogFocus } from "../hooks/usePlaceDialogFocus";
import { facilityComparison } from "../../../lib/place-decision-tools.js";
import { facilityName, originalLanguage } from "../place-copy";
import type { Place } from "../types";

export default function PlaceComparisonDialog({ places, requiredKeys, saved, current, en, onClose, onToggle }: {
  places: Place[]; requiredKeys: string[]; saved: string[]; current: boolean; en: boolean;
  onClose: () => void; onToggle: (place: Place) => void;
}) {
  const dialog = usePlaceDialogFocus(true, onClose);
  const rows = facilityComparison(places, requiredKeys);
  const labels = en ? { confirmed: "Reported available", negative: "Does not meet this need", unknown: "Not reported" } : { confirmed: "확인됨", negative: "조건과 맞지 않음", unknown: "미확인" };
  return <dialog ref={dialog} className="region-change-dialog place-comparison-dialog" aria-labelledby="place-comparison-title">
    <header><div><p className="section-kicker">{en ? "YOUR CHOICE" : "나에게 맞는 여행지"}</p><h2 id="place-comparison-title" tabIndex={-1}>{en ? "Compare facilities" : "편의를 나란히 살펴보세요."}</h2></div><button type="button" onClick={onClose} aria-label={en ? "Close comparison" : "편의 비교 닫기"}>×</button></header>
    <p>{en ? "Compare the official records for your needs. Unreported information does not mean a facility is absent." : "나에게 필요한 편의부터 공식 기록을 살펴보세요. 미확인은 시설이 없다는 뜻이 아니에요."}</p>
    {!current && <p role="status">{en ? "Preferences changed. Search again before adding a new place." : "조건이 바뀌었어요. 새 장소를 담으려면 다시 검색해 주세요."}</p>}
    <div className="place-comparison-scroll" tabIndex={0} role="region" aria-label={en ? "Facility comparison table" : "장소별 편의 비교표"}>
      <table style={{ minWidth: 80 + places.length * 140 }}><caption className="sr-only">{en ? `${places.length} places` : `${places.length}곳 편의 비교`}</caption><thead><tr><th scope="col">{en ? "Facility" : "살펴볼 편의"}</th>{places.map(place => <th scope="col" key={place.id}><span lang={originalLanguage(place.name)}>{place.name}</span><small>{place.city}</small></th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.key}><th scope="row">{facilityName(row.key, row.label, en)}</th>{row.values.map((item, index) => <td key={places[index].id} data-state={item.state}><strong>{labels[item.state]}</strong><p lang={originalLanguage(item.detail)}>{item.detail || (en ? "Check with the venue." : "시설에 직접 확인해 주세요.")}</p></td>)}</tr>)}
          {!rows.length && <tr><td colSpan={places.length + 1}>{en ? "These results have no item-level facility records. Search with your facility needs to compare the evidence." : "항목별 편의 기록이 없는 결과예요. 필요한 편의를 선택해 다시 검색하면 근거를 비교할 수 있습니다."}</td></tr>}
          <tr><th scope="row">{en ? "Source / retrieved" : "출처·조회 시각"}</th>{places.map(place => <td key={place.id}><p>{place.source}</p><small>{place.checkedAt && Number.isFinite(Date.parse(place.checkedAt)) ? new Date(place.checkedAt).toLocaleString(en ? "en" : "ko") : en ? "Time unavailable" : "조회 시각 미확인"}</small></td>)}</tr>
          <tr><th scope="row">{en ? "Your itinerary" : "내 일정"}</th>{places.map(place => <td key={place.id}><button type="button" aria-pressed={saved.includes(place.id)} disabled={!saved.includes(place.id) && !current} onClick={() => onToggle(place)}>{saved.includes(place.id) ? en ? "Remove" : "일정에서 빼기" : en ? "Add" : "일정에 담기"}</button></td>)}</tr>
        </tbody>
      </table>
    </div>
    <p className="modal-note">{en ? "Need to check something? Make an inquiry card in Visitor information. On a small screen, scroll the table sideways." : "더 확인하고 싶다면 이용 정보에서 문의 카드를 만들어 보세요. 작은 화면에서는 표를 좌우로 넘길 수 있어요."}</p>
  </dialog>;
}
