"use client";
import { useState } from "react";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { Place } from "../types";
import { usePlaceDialogFocus } from "../hooks/usePlaceDialogFocus";
import { visitDurationFor } from "../optimization/itinerary-schedule.js";
import VisitDurationControl from "./VisitDurationControl";
import TripBreakControl from "./TripBreakControl";
import FixedVisitControl from "./FixedVisitControl";
import type { FixedVisit } from "../../../lib/trip-time-constraints.js";
import type { StopPurpose } from "../../../lib/trip-comfort.js";
export default function StopEditor({ place, trip, onClose }: { place: Place; trip: ReturnType<typeof useTripSelection>; onClose: () => void }) {
  const id = place.id;
  const [day, setDay] = useState(trip.scheduleAssignments[id] || trip.tripDays[0] || '');
  const [minutes, setMinutes] = useState<number | null>(trip.visitMinutesByPlaceId[id] ?? null);
  const [rest, setRest] = useState<number | null>(trip.breakMinutesByPlaceId[id] ?? null);
  const [purpose, setPurpose] = useState<StopPurpose | null>(trip.restPurposeByPlaceId[id] ?? null);
  const [fixed, setFixed] = useState<FixedVisit | null>(trip.fixedVisits[id] ?? null);
  const [error, setError] = useState('');
  const [revision] = useState(trip.voiceRevision);
  const ref = usePlaceDialogFocus(true, onClose);
  const sameDay = trip.orderedPlaceIds.filter(key => (trip.scheduleAssignments[key] || trip.tripDays[0]) === day);
  const position = Math.max(0, sameDay.indexOf(id) < 0 ? sameDay.length : sameDay.indexOf(id));
  function apply(remove = false) {
    if (revision !== trip.voiceRevision) { setError('다른 곳에서 일정이 변경됐어요. 닫고 다시 열어 주세요.'); return; }
    const change = { type: 'stop' as const, id, day, minutes, breakMinutes: rest, purpose, fixed };
    const result = trip.applyTripCommand(remove ? (trip.fixedVisits[id] && !fixed ? [{ type: 'stop', id, fixed: null }, { type: 'remove', id }] : { type: 'remove', id }) : change);
    if (!result.ok) { setError(result.reason); return; }
    onClose();
  }
  return <dialog ref={ref} lang="ko" className="simple-dialog simple-stop-editor" aria-labelledby="stop-editor-title">
    <header><h2 id="stop-editor-title" tabIndex={-1}>{place.name} 수정</h2><button type="button" aria-label="일정 수정 닫기" onClick={onClose}>×</button></header>
    <div className="simple-settings-fields"><label>방문 날짜<select value={day} onChange={event => setDay(event.target.value)} disabled={Boolean(fixed)}>{!trip.tripDays.includes(day) && <option value={day}>{day || '날짜 미정'}</option>}{trip.tripDays.map(date => <option key={date}>{date}</option>)}</select></label>
      <VisitDurationControl name={place.name} value={minutes ?? undefined} defaultMinutes={visitDurationFor(place)} onChange={setMinutes} />
    </div>
    <details className="simple-stop-options"><summary>휴식·고정 방문</summary><div className="simple-settings-fields"><TripBreakControl name={place.name} value={rest ?? undefined} purpose={purpose ?? undefined} onChange={setRest} onPurpose={setPurpose} /><FixedVisitControl name={place.name} value={fixed ?? undefined} position={position} onChange={setFixed} /></div></details>
    {error && <p role="alert">{error}</p>}
    <div className="simple-editor-footer"><button type="button" className="simple-remove" disabled={Boolean(fixed)} onClick={() => apply(true)}>일정에서 빼기</button><button type="button" onClick={onClose}>취소</button><button type="button" className="primary" onClick={() => apply()}>적용</button></div>
  </dialog>;
}

