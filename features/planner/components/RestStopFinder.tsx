"use client";
import { useState } from "react";
import { restStopCandidates } from "../../../lib/rest-stop-candidates.js";
import type { StopPurpose } from "../../../lib/trip-comfort.js";
import type { Place } from "../types";
import type { useTripSelection } from "../hooks/useTripSelection";
import PlaceFacilitySummary from "./PlaceFacilitySummary";

export default function RestStopFinder({ trip, places, requiredKeys, onSelectPlace, en = false }: {
  trip: ReturnType<typeof useTripSelection>; places: Place[]; requiredKeys: string[]; onSelectPlace: (place: Place) => void; en?: boolean;
}) {
  const [choice, setChoice] = useState(""), [purpose, setPurpose] = useState<StopPurpose>("rest");
  const [radius, setRadius] = useState(5), [includeUnknown, setIncludeUnknown] = useState(false), [minutes, setMinutes] = useState(15), [notice, setNotice] = useState("");
  const dayPlaces = trip.orderedSavedPlaces.filter(place => (trip.scheduleAssignments[place.id] || trip.tripDays[0]) === trip.activeDay);
  const anchor = dayPlaces.find(place => place.id === choice) || dayPlaces.at(-1);
  const next = dayPlaces[dayPlaces.findIndex(place => place.id === anchor?.id) + 1];
  const pinnedAfter = anchor && dayPlaces.slice(dayPlaces.indexOf(anchor) + 1).some(place => trip.fixedVisits[place.id]);
  const candidates = restStopCandidates({ places, anchor, next, savedIds: trip.saved, requiredKeys, purpose, includeUnknown, radiusKm: radius });
  const say = (ko: string, english: string) => en ? english : ko;
  return <details className="place-evidence rest-stop-finder" style={{ marginBlock: 12 }}>
    <summary>{say("쉬어 갈 곳·화장실 추가", "Add a rest or restroom stop")}</summary>
    <div className="modal-data">
      <p>{say("현재 검색한 여행지에서 가까운 곳을 찾아 짧게 들러요. 확인된 편의와 미확인 정보를 구분해 고를 수 있습니다.", "Find a nearby place in the current results for a short stop. Review confirmed and unreported facilities.")}</p>
      {anchor ? <>
        <div className="auth-field"><label>{say("이 장소 다음에 들르기", "Stop after this place")}<select value={anchor.id} onChange={event => setChoice(event.target.value)}>{dayPlaces.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label></div>
        <div className="auth-field"><label>{say("필요한 곳", "Type of stop")}<select value={purpose} onChange={event => setPurpose(event.target.value as StopPurpose)}><option value="rest">{say("쉬어 갈 곳", "Rest stop")}</option><option value="restroom">{say("장애인 화장실", "Accessible restroom")}</option></select></label></div>
        <div className="auth-field"><label>{say("주변 범위", "Search radius")}<select value={radius} onChange={event => setRadius(Number(event.target.value))}>{[1, 3, 5, 10, 20].map(value => <option value={value} key={value}>{say(`직선거리 ${value}km`, `Within ${value} km straight line`)}</option>)}</select></label></div>
        <div className="auth-field"><label>{say("잠시 머무는 시간", "Short visit duration")}<select value={minutes} onChange={event => setMinutes(Number(event.target.value))}>{[15, 30, 45, 60].map(value => <option key={value} value={value}>{value}{say("분", " min")}</option>)}</select></label></div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}><input type="checkbox" checked={includeUnknown} onChange={event => setIncludeUnknown(event.target.checked)} />{say("편의 미확인 장소도 보기", "Include unreported facilities")}</label>
        {pinnedAfter && <p role="status">{say("이 뒤에 고정된 장소가 있어요. 고정된 장소 뒤를 선택하거나 먼저 고정을 해제해 주세요.", "A later visit has a fixed position. Choose a point after it or release its pin first.")}</p>}
        <p role="status">{say(`조건에 맞는 가까운 곳 ${candidates.length}곳`, `${candidates.length} nearby places in these results`)}</p>
        {!candidates.length && <p>{say("범위를 넓히거나 미확인 장소를 포함해 보세요. 다른 지역·활동을 검색해도 담아 둔 일정은 유지됩니다.", "Widen the radius or include unreported facilities. Searching another region or activity keeps your saved trip.")}</p>}
        {candidates.map(candidate => <article className="reference-info-card" key={candidate.place.id}>
          <h3>{candidate.place.name}</h3>
          <p>{say(`선택한 장소에서 직선 ${candidate.distanceKm.toFixed(1)}km`, `${candidate.distanceKm.toFixed(1)} km from the selected stop, straight line`)} · {candidate.extraTravelMinutes === null ? say("우회시간 미확인", "Detour time unknown") : say(`거리 기반 추정 이동 +${candidate.extraTravelMinutes}분`, `Estimated extra travel ${candidate.extraTravelMinutes} min`)}</p>
          <p>{say(`체류 ${minutes}분을 일정에 더해요.`, `Adds a ${minutes}-minute visit.`)} {say("실제 이동시간과 쉬는 공간 운영은 확인이 필요해요.", "Check actual travel time and available resting space.")}</p>
          {purpose === "restroom" && <p><b>{candidate.restroom?.state === "confirmed" ? say("장애인 화장실 정보 있음", "Accessible restroom reported") : say("장애인 화장실 미확인", "Accessible restroom unreported")}</b> · {candidate.restroom?.detail || say("시설에 위치와 운영 여부를 물어보세요.", "Ask the venue about location and availability.")}</p>}
          <PlaceFacilitySummary place={candidate.place} en={en} />
          <p className="modal-note">{candidate.place.source} {candidate.place.checkedAt && Number.isFinite(Date.parse(candidate.place.checkedAt)) ? `· ${say("조회", "Retrieved")} ${new Date(candidate.place.checkedAt).toLocaleDateString(en ? "en-GB" : "ko-KR")}` : ""}</p>
          <div className="travel-book-actions"><button type="button" onClick={() => onSelectPlace(candidate.place)}>{say("이용 정보 확인", "Visitor information")}</button><button type="button" disabled={Boolean(pinnedAfter) || trip.saved.length >= 12} onClick={() => {
            if (trip.addRestStop(anchor.id, candidate.place, minutes, purpose)) setNotice(say(`${candidate.place.name}을 ${anchor.name} 다음에 ${minutes}분 일정으로 담았어요.`, `Added ${candidate.place.name} after ${anchor.name} for ${minutes} minutes.`));
          }}>{say("쉬는 일정에 추가", "Add short stop")}</button></div>
        </article>)}
        {trip.saved.length >= 12 && <p>{say("저장·공유할 여행은 최대 12곳입니다. 장소 하나를 빼고 추가해 주세요.", "A saved/shared trip can contain 12 places. Remove a place before adding another.")}</p>}
      </> : <p>{say("먼저 오늘 일정에 여행지를 담아주세요.", "Add a place to this day's itinerary first.")}</p>}
      <p role="status">{notice}</p>
    </div>
  </details>;
}
