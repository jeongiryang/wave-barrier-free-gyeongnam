"use client";
import { useEffect, useState } from "react";
import { FACILITIES } from "../../../lib/facility-selection.js";
import { samePublicPlace } from "../../../lib/place-identity";
import { plannerJson } from "../services/api";
import { usePlaceDialogFocus } from "../hooks/usePlaceDialogFocus";
import { facilityComparison } from "../../../lib/place-decision-tools.js";
import { facilityName, originalLanguage } from "../place-copy";
import type { Place } from "../types";

export default function PlaceComparisonDialog({ places, requiredKeys, saved, current, en, onClose, onToggle }: {
  places: Place[]; requiredKeys: string[]; saved: string[]; current: boolean; en: boolean;
  onClose: () => void; onToggle: (place: Place) => void;
}) {
  const dialog = usePlaceDialogFocus(true, onClose);
  const [keys, setKeys] = useState(requiredKeys.length ? requiredKeys.slice(0, 6) : ['route', 'restroom', 'parking']);
  const [fresh, setFresh] = useState<Place[]>([]);
  const [state, setState] = useState('idle');
  const signature = JSON.stringify([places.map(place => [place.id, place.name, place.address, place.mapX, place.mapY]), keys]);
  useEffect(() => {
    const controller = new AbortController();
    const ids = places.filter(place => /^[1-9]\d{0,11}$/.test(place.id) && !place.source.includes('사용자')).map(place => place.id);
    const timer = setTimeout(() => {
      setFresh([]);
      if (!ids.length || !keys.length) { setState('idle'); return; }
      setState('loading');
      void plannerJson<{ places: Place[] }>(`/api/wave?action=places&ids=${ids.join(',')}&profiles=${keys.join(',')}`, { signal: controller.signal, timeoutMs: 14000 })
        .then(result => { if (!controller.signal.aborted) { const accepted = result.places.filter(next => places.some(previous => previous.id === next.id && samePublicPlace(previous, next))); setFresh(accepted); setState(accepted.some(place => place.facilityLookupState === 'error') || accepted.length < ids.length ? 'error' : 'done'); } })
        .catch(() => { if (!controller.signal.aborted) setState('error'); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  // The selected places and criteria define a complete request; stale requests abort.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  const compared = places.map(place => fresh.find(next => next.id === place.id && next.facilityLookupState !== 'error') || place);
  const rows = facilityComparison(compared, keys);
  const labels = en ? { confirmed: "Reported available", negative: "Does not meet this need", unknown: "Not reported" } : { confirmed: "확인됨", negative: "조건과 맞지 않음", unknown: "미확인" };
  return <dialog ref={dialog} className="region-change-dialog place-comparison-dialog" aria-labelledby="place-comparison-title">
    <header><div><p className="section-kicker">{en ? "YOUR CHOICE" : "나에게 맞는 여행지"}</p><h2 id="place-comparison-title" tabIndex={-1}>{en ? "Compare facilities" : "편의를 나란히 살펴보세요."}</h2></div><button type="button" onClick={onClose} aria-label={en ? "Close comparison" : "편의 비교 닫기"}>×</button></header>
    <p>{en ? "Compare the official records for your needs. Unreported information does not mean a facility is absent." : "나에게 필요한 편의부터 공식 기록을 살펴보세요. 미확인은 시설이 없다는 뜻이 아니에요."}</p>
    <fieldset className="comparison-facilities"><legend>{en ? 'Compare up to six facilities' : '비교할 편의 선택 · 최대 6개'}</legend>{FACILITIES.map(item => <label key={item.key}><input type="checkbox" checked={keys.includes(item.key)} disabled={!keys.includes(item.key) && keys.length >= 6} onChange={() => { setFresh([]); setKeys(previous => previous.includes(item.key) ? previous.filter(key => key !== item.key) : [...previous, item.key]); }} />{en ? item.en : item.label}</label>)}</fieldset>
    <p className="modal-note">{en ? 'Comparison choices do not change your trip requirements.' : '여기에서 고른 비교 항목은 여행의 필수 편의 조건을 바꾸지 않아요.'}</p>
    {state === 'loading' && <p role="status">{en ? 'Checking official facilities…' : '선택한 편의의 공식 기록을 확인하고 있어요…'}</p>}
    {state === 'error' && <p role="status">{en ? 'Some records could not be refreshed. Previously retrieved evidence remains; other items are unconfirmed.' : '일부 기록을 새로 조회하지 못했어요. 기존 근거는 유지하며 나머지 항목은 미확인입니다.'}</p>}
    {!current && <p role="status">{en ? "Preferences changed. Search again before adding a new place." : "조건이 바뀌었어요. 새 장소를 담으려면 다시 검색해 주세요."}</p>}
    <div className="place-comparison-scroll" tabIndex={0} role="region" aria-label={en ? "Facility comparison table" : "장소별 편의 비교표"}>
      <table style={{ minWidth: 80 + places.length * 140 }}><caption className="sr-only">{en ? `${places.length} places` : `${places.length}곳 편의 비교`}</caption><thead><tr><th scope="col">{en ? "Facility" : "살펴볼 편의"}</th>{places.map(place => <th scope="col" key={place.id}><span lang={originalLanguage(place.name)}>{place.name}</span><small>{place.city}</small></th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.key}><th scope="row">{facilityName(row.key, row.label, en)}</th>{row.values.map((item, index) => <td key={places[index].id} data-state={item.state}><strong>{labels[item.state]}</strong><p lang={originalLanguage(item.detail)}>{item.detail || (en ? "Check with the venue." : "시설에 직접 확인해 주세요.")}</p></td>)}</tr>)}
          {!rows.length && <tr><td colSpan={places.length + 1}>{en ? 'Choose facilities above to compare.' : '위에서 비교할 편의를 선택해 주세요.'}</td></tr>}
          <tr><th scope="row">{en ? "Source / retrieved" : "출처·조회 시각"}</th>{compared.map(place => <td key={place.id}><p>{place.source}</p><small>{place.checkedAt && Number.isFinite(Date.parse(place.checkedAt)) ? new Date(place.checkedAt).toLocaleString(en ? "en" : "ko") : en ? "Time unavailable" : "조회 시각 미확인"}</small></td>)}</tr>
          <tr><th scope="row">{en ? "Your itinerary" : "내 일정"}</th>{places.map(place => <td key={place.id}><button type="button" aria-pressed={saved.includes(place.id)} disabled={!saved.includes(place.id) && !current} onClick={() => onToggle(place)}>{saved.includes(place.id) ? en ? "Remove" : "일정에서 빼기" : en ? "Add" : "일정에 담기"}</button></td>)}</tr>
        </tbody>
      </table>
    </div>
    <p className="modal-note">{en ? "Need to check something? Make an inquiry card in Visitor information. On a small screen, scroll the table sideways." : "더 확인하고 싶다면 이용 정보에서 문의 카드를 만들어 보세요. 작은 화면에서는 표를 좌우로 넘길 수 있어요."}</p>
  </dialog>;
}
