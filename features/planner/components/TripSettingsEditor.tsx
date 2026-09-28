"use client";
import NightIcon from '../../../components/NightIcon';

import WaveSelect from "../../../components/WaveSelect";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { TripTravelMode } from "../../../lib/trip-travel-mode.js";
import { localDate } from "../utils";
import { boundedTripEnd, offsetTripDate, validTripDate } from "../../../lib/trip-dates.js";
import { usePlaceDialogFocus } from "../hooks/usePlaceDialogFocus";
import AccessibleDateInput from "../../../components/AccessibleDateInput";

type Props = { trip: ReturnType<typeof useTripSelection>; onClose?: () => void };
const subscribeToClock = () => () => undefined;
function SettingsForm({ trip, onClose }: Props) {
  const today = useSyncExternalStore(subscribeToClock, localDate, () => '');
  const [startDraft, setStartDraft] = useState<string | null>(trip.travelStart || null);
  const [endDraft, setEndDraft] = useState<string | null>(trip.travelEnd || trip.travelStart || null);
  const start = startDraft ?? today;
  const end = endDraft ?? today;
  const validStart = validTripDate(start);
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
    if (!initial) onClose?.();
  }}>

    <div className="simple-settings-fields">
      <label>시작일<AccessibleDateInput required value={start} onChange={event => { const day = event.target.value; setStartDraft(day); if (validTripDate(day)) setEndDraft(boundedTripEnd(day, end)); }} /></label>
      <label>마지막 날<AccessibleDateInput required min={validStart ? start : undefined} max={validStart ? offsetTripDate(start, 6) : undefined} value={end} onChange={event => setEndDraft(event.target.value)} /></label>
      <label>이동 수단<WaveSelect value={transport} onChange={event => setTransport(event.target.value as TripTravelMode)}><option value="transit">대중교통</option><option value="car">자동차</option><option value="walk">도보</option><option value="bicycle">자전거</option></WaveSelect></label>
      <label>하루 시작<input type="time" required value={time} onChange={event => setTime(event.target.value)} /></label>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="simple-editor-footer">{onClose && <button type="button" onClick={onClose}>{initial ? '나중에 만들기' : '취소'}</button>}<button type="submit" className="primary">{initial ? '시간표 만들기' : '적용'}</button></div>
  </form>;
}
export function InitialTripSetup({ trip, children, onTool }: Props & { children?: ReactNode; onTool: (tool: string) => void }) {
  const [notice, setNotice] = useState('');
  return <section id="itinerary-setup" lang="ko" className="simple-initial-setup" aria-labelledby="trip-setup-title">
    <nav className="trip-setup-steps" aria-label="여행 준비 단계"><button type="button" onClick={() => onTool('conditions')}>1 조건 선택</button><span aria-hidden="true">→</span><button type="button" onClick={() => onTool('places')}>2 여행지 담기</button><span aria-hidden="true">→</span><strong aria-current="step">3 일정 만들기</strong></nav>
    <h2 id="trip-setup-title" className="sr-only">일정 날짜와 이동 수단 정하기</h2>
    <section className="trip-setup-basket" aria-label="일정에 넣을 장소"><h3>담은 장소 {trip.saved.length}곳</h3>{trip.orderedSavedPlaces.map(place => <div key={place.id}><strong>{place.name}</strong><button type="button" aria-label={place.name + ' 담은 장소에서 빼기'} onClick={() => { const result = trip.applyTripCommand({ type: 'remove', id: place.id }); setNotice(result.ok ? place.name + '을 뺐어요.' : result.reason); }}>빼기 ×</button></div>)}{!trip.saved.length && <p>담은 장소가 없어요. 여행지를 먼저 골라주세요.</p>}{notice && <p role="status">{notice}</p>}{trip.canUndoCommand && <button type="button" onClick={() => { trip.undoCommand(); setNotice(''); }}>방금 변경 되돌리기</button>}</section>
    {children}{trip.saved.length > 0 && <SettingsForm trip={trip} onClose={() => onTool('places')} />}
  </section>;
}
export default function TripSettingsEditor({ trip, onClose }: Props & { onClose: () => void }) {
  const ref = usePlaceDialogFocus(true, onClose);
  return <dialog ref={ref} lang="ko" className="simple-dialog" aria-labelledby="trip-settings-title"><header><h2 id="trip-settings-title" tabIndex={-1}>여행 설정</h2><button type="button" aria-label="여행 설정 닫기" onClick={onClose} data-icon-action="" title="닫기"><NightIcon name="close" size={20}/><span className="sr-only">닫기</span></button></header><SettingsForm trip={trip} onClose={onClose} /></dialog>;
}
