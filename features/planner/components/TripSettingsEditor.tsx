"use client";
import { useState, useSyncExternalStore } from "react";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { TripTravelMode } from "../../../lib/trip-travel-mode.js";
import { localDate } from "../utils";
import { boundedTripEnd, offsetTripDate } from "../../../lib/trip-dates.js";
import { usePlaceDialogFocus } from "../hooks/usePlaceDialogFocus";

type Props = { trip: ReturnType<typeof useTripSelection>; onClose?: () => void };
const subscribeToClock = () => () => undefined;
function SettingsForm({ trip, onClose }: Props) {
  const today = useSyncExternalStore(subscribeToClock, localDate, () => '');
  const [startDraft, setStartDraft] = useState<string | null>(trip.travelStart || null);
  const [endDraft, setEndDraft] = useState<string | null>(trip.travelEnd || trip.travelStart || null);
  const start = startDraft ?? today;
  const end = endDraft ?? today;
  const [time, setTime] = useState(trip.dayStartTime);
  const [transport, setTransport] = useState<TripTravelMode>(trip.travelMode);
  const [error, setError] = useState('');
  const settingsKey = JSON.stringify([trip.travelStart, trip.travelEnd, trip.dayStartTime, trip.travelMode]);
  const revision = useState(settingsKey)[0];
  const initial = !trip.travelStart;
  return <form className="simple-settings-form" onSubmit={event => {
    event.preventDefault();
    if (revision !== settingsKey) { setError('다른 곳에서 일정이 변경됐어요. 닫고 다시 열어 주세요.'); return; }
    const result = trip.applyTripCommand({ type: 'schedule', start, end, startTime: time, transport });
    if (!result.ok) { setError(result.reason); return; }
    onClose?.();
  }}>
    {initial && <p>날짜와 이동 수단을 정하면 담은 장소로 시간표를 만들어요.</p>}
    <div className="simple-settings-fields">
      <label>시작일<input type="date" required value={start} onChange={event => { const day = event.target.value; setStartDraft(day); if (day) setEndDraft(boundedTripEnd(day, end)); }} /></label>
      <label>마지막 날<input type="date" required min={start} max={start ? offsetTripDate(start, 6) : undefined} value={end} onChange={event => setEndDraft(event.target.value)} /></label>
      <label>이동 수단<select value={transport} onChange={event => setTransport(event.target.value as TripTravelMode)}><option value="transit">대중교통</option><option value="car">자동차</option><option value="walk">도보</option><option value="bicycle">자전거</option></select></label>
      <label>하루 시작<input type="time" required value={time} onChange={event => setTime(event.target.value)} /></label>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="simple-editor-footer">{onClose && <button type="button" onClick={onClose}>취소</button>}<button type="submit" className="primary">{initial ? '시간표 만들기' : '적용'}</button></div>
  </form>;
}
export function InitialTripSetup({ trip }: Props) {
  return <section lang="ko" className="simple-initial-setup" aria-labelledby="trip-setup-title"><h2 id="trip-setup-title">언제 떠날까요?</h2><SettingsForm trip={trip} /><p className="simple-collected-places">담은 장소 · {trip.orderedSavedPlaces.map(place => place.name).join(' · ')}</p></section>;
}
export default function TripSettingsEditor({ trip, onClose }: Props & { onClose: () => void }) {
  const ref = usePlaceDialogFocus(true, onClose);
  return <dialog ref={ref} lang="ko" className="simple-dialog" aria-labelledby="trip-settings-title"><header><h2 id="trip-settings-title" tabIndex={-1}>여행 설정</h2><button type="button" aria-label="여행 설정 닫기" onClick={onClose}>×</button></header><SettingsForm trip={trip} onClose={onClose} /></dialog>;
}
