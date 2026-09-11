"use client";
import { useEffect, useRef, useState } from 'react';
import type { useTripSelection } from '../hooks/useTripSelection';
import type { useItineraryRoutes } from '../hooks/useItineraryRoutes';
import { buildSplitReunion, defaultSplitChoice, splitDayPlaces, splitIdentity, splitSignature, readSplitRecords, writeSplitRecord, deleteSplitRecord, type SplitChoice, type SplitRecord } from '../../../lib/split-reunion.js';
import { formatScheduleTime } from '../optimization/itinerary-schedule.js';
import { courseCard, courseGrid, courseActions, courseLabel, courseInput, courseCopy, coursePrimary } from './small-trip-styles';

export default function SplitReunion({ trip, coverage, origin }: { trip: ReturnType<typeof useTripSelection>; coverage: ReturnType<typeof useItineraryRoutes>; origin:{lat:number;lng:number} }) {
  const [records, setRecords] = useState<SplitRecord[]>([]), [raw, setRaw] = useState<string | null>(null), [ready, setReady] = useState(false), [notice, setNotice] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { signature: string; choice: SplitChoice }>>({}), [previewKey, setPreviewKey] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  function reload() {
    try { const stored = readSplitRecords(localStorage); setRecords(stored.records); setRaw(stored.raw); setReady(true); setNotice('저장한 합류 계획을 불러왔어요. 편집 중인 선택은 유지합니다.'); }
    catch { setReady(false); setNotice('합류 계획을 읽지 못했어요. 기존 저장 내용을 보존했습니다. 브라우저 저장 설정을 확인한 뒤 다시 불러주세요.'); }
  }
  useEffect(() => { const frame = requestAnimationFrame(() => { try { const stored = readSplitRecords(localStorage); setRecords(stored.records); setRaw(stored.raw); setReady(true); } catch { setNotice('합류 계획을 읽지 못했어요. 저장 내용을 덮어쓰지 않습니다.'); } }); return () => cancelAnimationFrame(frame); }, []);
  const day = trip.activeDay, input = { places: trip.orderedSavedPlaces, days: trip.tripDays, assignments: trip.scheduleAssignments, startTime: trip.dayStartTime, origin, visitMinutesByPlaceId: trip.visitMinutesByPlaceId, breakMinutesByPlaceId: trip.breakMinutesByPlaceId, fixedVisits: trip.fixedVisits, dayDeadlines: trip.dayDeadlines, routeMinutesByPlaceId: coverage.routeMinutes };
  const identity = splitIdentity(input, day), signature = splitSignature(input, day), places = splitDayPlaces(input, day);
  const saved = records.find(record => record.identity === identity), draft = drafts[identity];
  const stale = Boolean((draft || saved) && (draft?.signature || saved?.signature) !== signature);
  const choice = draft?.choice || saved?.choice || defaultSplitChoice(input, day);
  const middle = places.slice(places.findIndex(place => place.id === choice.startId) + 1, places.findIndex(place => place.id === choice.reunionId));
  const result = buildSplitReunion(input, choice), key = JSON.stringify([signature, choice]), showing = previewKey === key && !stale;
  const hasUnsaved = Boolean(draft && (!saved || draft.signature !== saved.signature || JSON.stringify(draft.choice) !== JSON.stringify(saved.choice)));
  function edit(next: SplitChoice) { setDrafts(values => ({ ...values, [identity]: { signature, choice: next } })); setPreviewKey(''); setNotice(''); }
  function changeEnds(field: 'startId' | 'reunionId', value: string) {
    const next = { ...choice, [field]: value };
    const between = places.slice(places.findIndex(place => place.id === next.startId) + 1, places.findIndex(place => place.id === next.reunionId));
    edit({ ...next, assignments: Object.fromEntries(between.map((place, index) => [place.id, choice.assignments[place.id] || (index % 2 ? 'B' : 'A')])) });
  }
  function save() {
    if (!showing || !result.ok || !result.canSave || !ready || stale) return;
    try { const next = writeSplitRecord(localStorage, { identity, signature, choice, savedAt: new Date().toISOString() }, raw); setRecords(next.records); setRaw(next.raw); setNotice('합류 약속을 저장했어요. 여행 요약 파일에도 선택해서 담을 수 있습니다.'); }
    catch { setNotice('저장하지 못했어요. 다른 화면의 변경·저장 공간·20개 상한을 확인하고 다시 불러온 뒤 저장해 주세요. 현재 선택은 유지됩니다.'); }
  }
  function remove(record: SplitRecord) {
    try { const next = deleteSplitRecord(localStorage, record.identity, raw); setRecords(next.records); setRaw(next.raw); setNotice('선택한 합류 약속의 저장본을 지웠어요. 원래 여행 일정은 그대로입니다.'); }
    catch { setNotice('저장본을 지우지 못했어요. 다시 불러와 최신 내용을 확인해 주세요.'); }
  }
  return <section aria-label="동행과 합류 계획" style={{ ...courseCard, marginTop: 20 }}>
    <h3 style={{ margin: 0, fontSize: 26 }}>잠깐 따로, 다시 함께</h3>
    <p style={courseCopy}>쉬어 가거나 조금 더 둘러본 뒤 같은 장소에서 만나요. A·B 일정은 함께 정하는 약속이며 위치를 추적하지 않습니다.</p>
    <label style={courseLabel}>합류를 계획할 날짜<select style={courseInput} value={day} onChange={event => { trip.setActiveDay(event.target.value); setPreviewKey(''); }}>{trip.tripDays.map(value => <option key={value}>{value}</option>)}</select></label>
    <p style={courseCopy}>원래 일정의 순서·체류·고정 약속은 유지됩니다. 분리 출발 전의 공통 일정은 원래 시간표에서 확인해 주세요.</p>
    {stale ? <div><p role="status" style={courseCopy}>원래 일정의 순서나 시간이 바뀌었어요. 저장본을 적용하지 않고 새 조건으로 다시 계획합니다.</p><div className="travel-book-actions" style={courseActions}><button type="button" onClick={() => edit(defaultSplitChoice(input, day))}>바뀐 일정으로 다시 계획</button></div></div> : places.length < 3 ? <p style={courseCopy}>같은 날짜에 장소를 세 곳 이상 담으면 중간 방문을 나눌 수 있어요. 앞·뒤 장소에서는 모두 함께 만납니다.</p> : <>
      <div style={courseGrid}>
        <label style={courseLabel}>함께 출발할 장소<select style={courseInput} value={choice.startId} onChange={event => changeEnds('startId', event.target.value)}>{places.slice(0, -2).map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
        <label style={courseLabel}>다시 만날 장소<select style={courseInput} value={choice.reunionId} onChange={event => changeEnds('reunionId', event.target.value)}>{places.slice(2).map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></label>
        <label style={courseLabel}>따로 출발할 시각<input style={courseInput} type="time" value={choice.departureTime} onChange={event => edit({ ...choice, departureTime: event.target.value })}/></label>
        <label style={courseLabel}>다시 만날 시각<input style={courseInput} type="time" value={choice.reunionTime} onChange={event => edit({ ...choice, reunionTime: event.target.value })}/></label>
        {(['A', 'B'] as const).map(group => <label key={group} style={courseLabel}>{group} 출발 장소에서 더 머무는 시간<select style={courseInput} value={group === 'A' ? choice.waitA : choice.waitB} onChange={event => edit({ ...choice, [group === 'A' ? 'waitA' : 'waitB']: Number(event.target.value) })}>{[0,15,30,45,60,90,120,180,240].map(value => <option key={value} value={value}>{value ? `${value}분 머물기` : '바로 이동'}</option>)}</select></label>)}
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}><legend style={{ fontSize: 18, marginBottom: 12 }}>중간 장소를 어떻게 나눌까요?</legend><div style={courseGrid}>{middle.map(place => <label key={place.id} style={courseLabel}>{place.name}<select style={courseInput} value={choice.assignments[place.id] || 'A'} onChange={event => edit({ ...choice, assignments: { ...choice.assignments, [place.id]: event.target.value as 'A' | 'B' } })}><option value="A">A 일정에 방문</option><option value="B">B 일정에 방문</option></select></label>)}</div></fieldset>
      <p style={courseCopy}>각 장소는 한 일정에 남겨 두고 원래 체류·휴식 시간을 사용합니다. 중간에 고정한 장소는 나누지 않습니다. 방문할 중간 장소가 없는 쪽은 출발 장소에서 더 머물거나 합류 장소로 바로 이동할 수 있어요.</p>
      <div className="travel-book-actions" style={courseActions}><button type="button" style={coursePrimary} disabled={!trip.storageReady || !result.ok} onClick={() => { setPreviewKey(key); requestAnimationFrame(() => heading.current?.focus()); }}>A·B 합류 계획 보기</button>{draft && <button type="button" onClick={() => { setDrafts(values => Object.fromEntries(Object.entries(values).filter(([id]) => id !== identity))); setPreviewKey(''); setNotice('편집을 취소하고 저장한 선택으로 돌아왔어요.'); }}>편집 취소</button>}</div>
      {!result.ok && <p role="status" style={courseCopy}>{result.error}</p>}
      {showing && result.ok && <section aria-label="A와 B 합류 미리보기" style={{ display: 'grid', gap: 20 }}>
        <h4 ref={heading} tabIndex={-1} style={{ margin: 0, fontSize: 24, scrollMarginTop: 150 }}>{formatScheduleTime(result.meetAt)}, {result.reunion.name}에서 만나요</h4>
        <p style={courseCopy}>{formatScheduleTime(result.departure)} {result.start.name}에서 따로 출발합니다. 이동은 조회한 동일 구간만 재사용하며, 나뉜 구간은 직선거리 기반 추정입니다. 실제 도보 시간·접근성과 현장 운영은 별도로 확인하세요.</p>
        <div style={courseGrid}>{result.branches.map(branch => <section key={branch.group} aria-label={`${branch.group}의 나뉜 일정`} style={courseCard}><h5 style={{ fontSize: 24, margin: 0 }}>{branch.group} 일정</h5><p style={courseCopy}>출발 장소에서 {branch.group === 'A' ? choice.waitA : choice.waitB}분 더 머뭅니다.</p><ol style={{ margin: 0, paddingLeft: 22 }}>{branch.entries.map(entry => <li key={entry.place.id} style={{ paddingBlock: 12 }}><strong>{formatScheduleTime(entry.arrivesAt)} {entry.place.name}</strong><p style={courseCopy}>이동 {entry.travelMinutes}분 · {entry.travelSource === 'route' ? '조회한 동일 구간' : entry.travelSource === 'estimate' ? '거리 기반 추정' : '이동 미확인·계산용 참고'}{entry.visitMinutes ? ` · 체류 ${entry.visitMinutes}분` : ''}{entry.breakMinutes ? ` · 휴식 ${entry.breakMinutes}분` : ''}</p></li>)}</ol><p style={{ ...courseCopy, color: 'var(--ink)' }}>{branch.lateMinutes ? `합류 약속보다 약 ${branch.lateMinutes}분 늦어요.` : `합류 장소에서 약 ${branch.waitingMinutes}분 기다리는 계획이에요.`}</p>{branch.unknown > 0 && <p style={courseCopy}>이동을 확인하지 못한 구간 {branch.unknown}곳이 있어 실제 도착 가능 여부는 미확인입니다.</p>}</section>)}</div>
        {[...result.notes,...result.warnings].map(warning => <p key={warning} style={courseCopy}>{warning}</p>)}
        {!result.canSave && <p role="status" style={courseCopy}>합류 시각이나 공통 약속에 맞게 시간을 바꾼 뒤 저장해 주세요.</p>}
        <div className="travel-book-actions" style={courseActions}><button type="button" style={coursePrimary} disabled={!ready || !result.canSave} onClick={save}>합류 약속 저장</button></div>
      </section>}
    </>}
    {hasUnsaved && <p style={courseCopy}>아직 저장하지 않은 선택이 있어요. 날짜와 여행 도구를 바꿔도 유지되며, 화면을 떠나기 전에 합류 약속을 저장해 주세요.</p>}
    {saved && <p style={courseCopy}>저장 {new Date(saved.savedAt).toLocaleString('ko-KR')} · 이동 시간은 지금 확인 가능한 정보로 다시 계산합니다.</p>}
    <p role="status" style={courseCopy}>{notice}</p>
    <details className="place-evidence"><summary>저장한 합류 약속 관리</summary><div className="travel-book-actions" style={courseActions}><button type="button" onClick={reload}>합류 약속 다시 불러오기</button></div><p style={courseCopy}>최대 20개를 보관하며 이전 계획을 자동으로 지우지 않습니다.</p>{records.map(record => <div key={record.identity} style={{ ...courseCard, marginTop: 12 }}><p style={courseCopy}>{record.choice.day} · {record.choice.departureTime}–{record.choice.reunionTime} · {new Date(record.savedAt).toLocaleString('ko-KR')}</p><div className="travel-book-actions" style={courseActions}><button type="button" onClick={() => remove(record)}>{record.choice.day} {record.choice.departureTime} 합류 저장본 삭제</button></div></div>)}</details>
  </section>;
}
