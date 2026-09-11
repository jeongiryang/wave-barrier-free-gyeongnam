"use client";
import { useState } from "react";
import { usePlaceDialogFocus } from "../hooks/usePlaceDialogFocus";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place, WeatherData } from "../types";
import type { RoutePoint } from "../../routing/types";
import type { VisitInfo } from "../../../lib/visit-hours.js";
import { alternativeCandidates, type AlternativeReason } from "../../../lib/trip-alternatives.js";
import { facilityComparison } from "../../../lib/place-decision-tools.js";
import { facilityName } from "../place-copy";
import { fetchVisitInfo } from "../services/visit-info";
import PlaceVisitHours from "./PlaceVisitHours";
import PlaceDateComparison from "./PlaceDateComparison";
import { useAlternativePool } from "../hooks/useAlternativePool";

const reasonOptions = [{ id: "distance", label: "너무 멀어요" }, { id: "visited", label: "이미 가본 곳이에요" }, { id: "rest", label: "더 짧게 둘러볼래요" }, { id: "indoor", label: "실내 공간으로" }, { id: "discover", label: "새로운 곳을 볼래요" }] as const;
export default function AlternativeComparisonDialog({ original, initialReason, places, trip, origin, requiredKeys, current, weather, seenIds, region, themes, profiles, onApply, onClose }: {
  original: Place; initialReason: AlternativeReason; places: Place[]; trip: ReturnType<typeof useTripSelection>; origin: RoutePoint; requiredKeys: string[]; current: boolean; weather: WeatherData | null; seenIds: string[]; region: string; themes: string; profiles: string[]; onApply: (place: Place) => void; onClose: () => void;
}) {
  const dialog = usePlaceDialogFocus(true, onClose);
  const [reason, setReason] = useState(initialReason), [choice, setChoice] = useState("");
  const [info, setInfo] = useState<Record<string, VisitInfo>>({}), [loading, setLoading] = useState("");
  const [notice, setNotice] = useState("");
  const [includeUnknown, setIncludeUnknown] = useState(false);
  const pool = useAlternativePool({ region, themes, profiles, places, current, requiredKeys, indoor: reason === "indoor" });
  const day = trip.scheduleAssignments[original.id] || trip.tripDays[0];
  const dayPlaces = trip.orderedSavedPlaces.filter(place => (trip.scheduleAssignments[place.id] || trip.tripDays[0]) === day), position = dayPlaces.findIndex(place => place.id === original.id);
  const before = dayPlaces[position - 1] || { mapX: String(origin.lng), mapY: String(origin.lat) }, after = dayPlaces[position + 1];
  const candidates = alternativeCandidates({ places: pool.places, original, before, after, savedIds: trip.saved, requiredKeys: pool.requiredKeys, includeUnknown, reason, visitedIds: reason === "discover" ? [...seenIds, ...pool.seen] : seenIds, indoorById: Object.fromEntries(Object.entries(info).map(([id, value]) => [id, value.setting])), originalVisitMinutes: trip.visitMinutesByPlaceId[original.id] });
  const toInspect = reason === "indoor" ? alternativeCandidates({ places: pool.places.filter(place => !info[place.id]), original, before, after, savedIds: trip.saved, requiredKeys: pool.requiredKeys, includeUnknown, reason: "visited", visitedIds: [] }) : [];
  const comparison = [original, ...candidates.map(candidate => candidate.place)], rows = facilityComparison(comparison, pool.requiredKeys);
  const selected = candidates.find(candidate => candidate.place.id === choice), pinned = Boolean(trip.fixedVisits[original.id]);
  const forecast = weather?.days.find(value => value.date === day);
  async function check(place: Place) {
    if (loading) return; setLoading(place.id); setNotice("");
    try { const result = await fetchVisitInfo(place.id); setInfo(values => ({ ...values, [place.id]: result })); }
    catch { setNotice("실내 공간 정보를 확인하지 못했어요. 잠시 뒤 다시 확인해 주세요."); }
    finally { setLoading(""); }
  }
  return <dialog className="region-change-dialog place-comparison-dialog" ref={dialog} aria-labelledby="alternative-title">
    <header><div><p className="section-kicker">나의 선택을 이어서</p><h2 id="alternative-title" tabIndex={-1}>이곳만 바꿔 볼까요?</h2></div><button type="button" onClick={onClose} aria-label="대안 비교 닫기">×</button></header>
    <p><b>{original.name}</b> · {day} · {position + 1}번째 방문. 다른 장소와 날짜·순서는 유지합니다.</p>
    <div className="travel-book-actions" role="group" aria-label="바꾸고 싶은 이유">{reasonOptions.map(option => <button key={option.id} type="button" aria-pressed={reason === option.id} style={{ background: reason === option.id ? "var(--accent)" : "var(--paper)", color: reason === option.id ? "white" : "var(--ink)" }} onClick={() => { setReason(option.id); setChoice(""); }}>{option.label}</button>)}</div>
    <p>{pool.source} · 현재 여행의 편의 {pool.requiredKeys.length}개를 기준으로 비교합니다. 모두 확인된 후보를 먼저 보여드려요.</p><label className="departure-review-check"><input type="checkbox" checked={includeUnknown} onChange={event => { setIncludeUnknown(event.target.checked); setChoice(""); }} />편의 미확인 후보도 직접 비교</label>{includeUnknown && <p>미확인 편의는 시설에 따로 확인해야 합니다. 조건과 맞지 않는다고 확인된 후보는 제외합니다.</p>}
    {pinned && <p role="status">고정한 장소입니다. 교체하려면 일정 수정에서 고정을 해제해 주세요.</p>}
    {!pool.current && <p role="status">선택 조건이 바뀌었어요. 아래에서 같은 편의로 새 후보를 찾아주세요.</p>}
    <details className="place-evidence"><summary>{reason === "indoor" ? "같은 편의로 문화 공간 찾기" : "경남의 다른 후보 살펴보기"}</summary><div className="modal-data">
      <p>{reason === "indoor" ? "실내 공간을 확인하기 위해 역사·문화 장소를 찾아요. 현재 일정과 편의는 유지합니다." : "고른 활동과 편의는 그대로, 아직 살펴보지 않은 경남의 여행지를 만나보세요."}</p>
      <label className="auth-field">살펴볼 지역<select value={pool.selectedRegion} onChange={event => pool.setSelectedRegion(event.target.value)}>{pool.regions.map(name => <option key={name}>{name}</option>)}</select></label>
      <div className="travel-book-actions"><button type="button" disabled={pool.loading || !profiles.length || !themes} onClick={() => { setChoice(""); void pool.search(reason === "indoor"); }}>{pool.loading ? "후보 찾는 중…" : "같은 편의로 후보 찾기"}</button>{pool.loading && <button type="button" onClick={pool.cancel}>찾기 중단</button>}</div>
      <p role="status">{pool.notice}</p>
    </div></details>
    {reason === "indoor" && <>
      <p>{forecast ? `${day} · ${forecast.label} · 강수확률 ${forecast.rainProbability}% · 최고 ${forecast.max}°` : "여행 날짜의 예보는 아직 확인되지 않았어요."}</p>
      <p>공식 설명에 실내 전시·체험·휴게 공간이 명시된 경우만 보여줍니다. 장소까지의 이동과 일부 야외 구간, 당일 운영은 따로 확인하세요.</p>
      {toInspect.map(({ place }) => <div className="travel-book-actions" key={place.id}><span>{place.name}</span><button type="button" disabled={Boolean(loading)} onClick={() => void check(place)}>{loading === place.id ? "확인 중…" : "실내 공간 정보 확인"}</button></div>)}
      {Object.entries(info).filter(([id, value]) => pool.places.some(place => place.id === id) && value.setting?.state !== "indoor-space").map(([id]) => <p key={id}>{pool.places.find(place => place.id === id)?.name}: 공식 설명에서 실내 공간을 확인하지 못했어요.</p>)}
    </>}
    {!candidates.length && <p role="status">지금 검색 결과에는 이 조건을 충족하는 대안이 없어요. 현재 일정을 유지하고 다른 활동이나 지역을 검색할 수 있습니다.</p>}
    {candidates.length > 0 && <>
      {reason === "discover" && <div className="travel-book-actions"><button type="button" onClick={() => { pool.rememberSeen(candidates.map(candidate => candidate.place.id)); setChoice(""); }}>다음 후보 보기</button></div>}
      <div className="place-comparison-scroll" tabIndex={0} role="region" aria-label="원안과 대안 비교표"><table style={{ minWidth: 80 + comparison.length * 140 }}><caption className="sr-only">원안과 후보 편의·시간 비교</caption><thead><tr><th scope="col">살펴볼 항목</th>{comparison.map((place, index) => <th scope="col" key={place.id}>{index === 0 ? "원래 일정" : `대안 ${index}`}<small>{place.name}</small></th>)}</tr></thead><tbody>
        <tr><th scope="row">앞뒤 이동 변화</th><td>현재 일정 기준</td>{candidates.map(candidate => <td key={candidate.place.id}>{candidate.travelDelta === null ? "미확인" : `거리 기반 추정 ${candidate.travelDelta > 0 ? "+" : ""}${candidate.travelDelta}분`}</td>)}</tr>
        <tr><th scope="row">머무는 시간 변화</th><td>현재 일정 기준</td>{candidates.map(candidate => <td key={candidate.place.id}>{candidate.visitMinutes}분 · {candidate.visitDelta > 0 ? "+" : ""}{candidate.visitDelta}분</td>)}</tr>
        {rows.map(row => <tr key={row.key}><th scope="row">{facilityName(row.key, row.label, false)}</th>{row.values.map((value, index) => <td data-state={value.state} key={comparison[index].id}><b>{{ confirmed: "확인됨", negative: "조건과 맞지 않음", unknown: "미확인" }[value.state]}</b><p>{value.detail || "시설에 확인해 주세요."}</p></td>)}</tr>)}
        <tr><th scope="row">출처</th>{comparison.map(place => <td key={place.id}>{place.source}</td>)}</tr>
        <tr><th scope="row">내 선택</th><td>유지 중</td>{candidates.map(candidate => <td key={candidate.place.id}><button type="button" aria-pressed={choice === candidate.place.id} onClick={() => setChoice(candidate.place.id)}>{choice === candidate.place.id ? "✓ 선택됨" : `${candidate.place.name} 선택`}</button></td>)}</tr>
      </tbody></table></div>
      {selected && <section className="account-settings"><h3>{selected.place.name}</h3>{selected.unknownKeys.length > 0 && <p role="status">이 후보는 필요한 편의 {selected.unknownKeys.length}개가 미확인입니다. 위 비교표와 문의처에서 확인하고 선택하세요.</p>}{selected.indoor && <p>공식 실내 공간 설명: {selected.indoor.detail}</p>}<PlaceVisitHours id={selected.place.id} name={selected.place.name} /><p>체류시간은 새 장소의 기본값으로 바뀝니다. 이전 장소에 넣은 휴식과 방문 목적은 해제되고, 다른 일정의 선택은 유지돼요.</p></section>}
    </>}
    <p className="modal-note">이동 차이는 직선거리 기반 추정입니다. 새 경로의 실제 이동 편의와 시간·혼잡이 더 낫다는 보장은 아니므로 교체한 뒤 다시 확인하세요.</p>
    <p role="status">{notice}</p>
    <div className="travel-book-actions"><button type="button" onClick={onClose}>현재 일정 유지</button><button type="button" disabled={!selected || !pool.current || pool.loading || pinned} onClick={() => { if (selected) { pool.rememberSeen([selected.place.id]); onApply(selected.place); } }}>선택한 장소로 교체</button></div>
    <details className="place-evidence"><summary>장소를 유지하고 날짜 비교</summary><div className="modal-data"><PlaceDateComparison place={original} trip={trip} onMoved={onClose} /></div></details>
  </dialog>;
}
