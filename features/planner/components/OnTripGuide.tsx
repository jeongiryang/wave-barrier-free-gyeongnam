"use client";
import { useEffect, useMemo, useState } from 'react';
import type { useTripSelection } from '../hooks/useTripSelection';
import type { useItineraryRoutes } from '../hooks/useItineraryRoutes';
import type { RoutePoint } from '../../routing/types';
import type { Place } from '../types';
import { cleanOnTrip, onTripIdentity, readOnTrip, remainingOnTrip, saveOnTrip, type TripProgress } from '../../../lib/on-trip.js';
import { formatScheduleTime } from '../optimization/itinerary-schedule.js';
import { DayDeadlineSummary } from './DayDeadlineControl';
import { FixedVisitSummary } from './FixedVisitControl';
import { validTripClock } from '../../../lib/trip-time-constraints.js';

const fieldLabelStyle = { display:'grid', gap:8, fontSize:14, fontWeight:500 } as const;
const selectStyle = { width:'100%', minHeight:48, padding:'10px 12px', border:'1px solid var(--line)', borderRadius:12, background:'var(--paper)', color:'var(--ink)', font:'inherit', fontSize:16 } as const;
const nowClock = () => new Date().toLocaleTimeString('en-GB', { timeZone:'Asia/Seoul', hour:'2-digit', minute:'2-digit' });
function DayGuide({ trip, coverage, origin, onSelectPlace }: {trip:ReturnType<typeof useTripSelection>;coverage:ReturnType<typeof useItineraryRoutes>;origin:RoutePoint;onSelectPlace:(place:Place)=>void}) {
  const places = useMemo(() => trip.orderedSavedPlaces.filter(place => (trip.scheduleAssignments[place.id] || trip.tripDays[0]) === trip.activeDay), [trip.orderedSavedPlaces, trip.scheduleAssignments, trip.tripDays, trip.activeDay]);
  const ids = places.map(place => place.id), identity = onTripIdentity(places, trip.activeDay);
  const [progress, setProgress] = useState<TripProgress>(() => cleanOnTrip(null, ids));
  const [ready, setReady] = useState(false), [running, setRunning] = useState(false), [notice, setNotice] = useState('');
  const [undo, setUndo] = useState<TripProgress|null>(null), [resetting, setResetting] = useState(false);
  useEffect(() => {
    const load = (external = false) => {
      try { const saved = readOnTrip(localStorage, identity, places.map(place=>place.id)); setProgress(saved.updatedAt ? saved : {...saved, clock:nowClock()}); }
      catch {setNotice('진행 기록을 불러오지 못했어요. 원래 일정은 그대로입니다.');}
      if (external) {setRunning(false);setUndo(null);setNotice('다른 창에서 바뀐 진행 기록을 불러왔어요. 확인한 뒤 이어서 진행해 주세요.');}
      setReady(true);
    };
    load();
    const onStorage = (event:StorageEvent) => {if(event.key === 'wave-on-trip-v1' || event.key === null)load(true);};
    window.addEventListener('storage',onStorage);
    return () => window.removeEventListener('storage',onStorage);
  }, [identity, places]);
  const remaining = remainingOnTrip({ places, day:trip.activeDay, progress, origin, routeMinutesByPlaceId:coverage.routeMinutes, visitMinutesByPlaceId:trip.visitMinutesByPlaceId, breakMinutesByPlaceId:trip.breakMinutesByPlaceId, fixedVisits:trip.fixedVisits });
  const next = remaining.next, entry = remaining.entries[0];
  function persist(value:TripProgress) {
    const clean = cleanOnTrip({...value, updatedAt:new Date().toISOString()}, ids);setProgress(clean);
    try {saveOnTrip(localStorage,identity,clean,ids);return true;}
    catch {setNotice('진행 기록을 저장하지 못했어요. 화면을 닫기 전에 여행 요약 파일을 챙겨 주세요.');return false;}
  }
  function mark(state:'done'|'skipped') {
    if (!running || !validTripClock(progress.clock) || !next || (state === 'skipped' && trip.fixedVisits[next.id])) return;
    setUndo(progress);const value = {...progress, marks:{...progress.marks,[next.id]:{state,at:new Date().toISOString()}}, cursorId:state==='done'?next.id:progress.cursorId, clock:nowClock()};
    if(persist(value))setNotice(`${next.name} ${state==='done'?'방문을 완료했어요.':'방문을 건너뛰었어요.'} 원래 계획은 보관됩니다.`);
  }
  return <section className="account-settings" aria-label="여행 당일 진행">
    <p className="section-kicker">여행을 이어서</p><h3>{trip.activeDay} · {remaining.done}곳 방문 완료</h3>
    <p style={{fontSize:14,lineHeight:1.7}}>{remaining.skipped ? `${remaining.skipped}곳 건너뜀 · ` : ''}{remaining.entries.length}곳 남았어요. 실제 방문한 곳은 직접 완료로 표시해 주세요.</p>
    <div className="auth-field"><label style={fieldLabelStyle}>어디에서 이어가나요?<select style={selectStyle} value={progress.cursorId} disabled={!ready} onChange={event => {persist({...progress,cursorId:event.target.value});setUndo(null);}}><option value="">기존 출발지</option>{places.map(place=><option value={place.id} key={place.id}>{place.name}</option>)}</select></label></div>
    <div className="auth-field"><label style={fieldLabelStyle}>이어갈 시각<input style={{fontSize:16}} type="time" value={progress.clock} disabled={!ready} onChange={event=>{setUndo(null);if(validTripClock(event.target.value))persist({...progress,clock:event.target.value});else setProgress({...progress,clock:event.target.value});}}/></label></div>
    <div className="travel-book-actions"><button type="button" style={{fontSize:14}} disabled={!ready} onClick={()=>{setUndo(null);const value={...progress,clock:nowClock()};if(persist(value))setNotice('현재 한국 시각을 반영했어요.');}}>지금 시각으로</button><button type="button" style={{fontSize:14}} disabled={!ready || !validTripClock(progress.clock)} onClick={()=>{if(running){setRunning(false);if(persist(progress))setNotice('잠시 멈췄어요. 기록한 곳부터 다시 이어갈 수 있습니다.');}else{if(persist(progress))setNotice('선택한 위치와 시각부터 남은 일정을 보여드려요.');setRunning(true);}}}>{running?'잠시 멈추기':Object.keys(progress.marks).length?'이어서 진행':'여행 시작하기'}</button></div>
    {next && entry ? <article className="reference-info-card"><small>다음에 머물 곳</small><h3 style={{fontSize:22}}>{next.name}</h3><p style={{fontSize:14,lineHeight:1.7}}>{next.address || '주소 확인 필요'}</p><p style={{fontSize:14,lineHeight:1.7}}>{remaining.from}에서 {progress.clock} 출발 기준 · {entry.startsAtLabel} 도착 예상 · {entry.visitMinutes}분 머물기{entry.breakMinutes?` · 휴식 ${entry.breakMinutes}분`:''}</p><FixedVisitSummary fixed={trip.fixedVisits[next.id]} waiting={entry.waitingMinutes} late={entry.lateMinutes}/><div className="travel-book-actions"><button type="button" style={{fontSize:14}} disabled={!running || !validTripClock(progress.clock)} onClick={()=>mark('done')}>이곳 방문 완료</button><button type="button" style={{fontSize:14}} disabled={!running || !validTripClock(progress.clock) || Boolean(trip.fixedVisits[next.id])} onClick={()=>mark('skipped')}>이번에는 건너뛰기</button><button type="button" style={{fontSize:14}} onClick={()=>onSelectPlace(next)}>이용 정보 보기</button></div>{trip.fixedVisits[next.id]&&<p style={{fontSize:14,lineHeight:1.7}}>고정한 방문입니다. 건너뛰려면 일정 편집에서 고정을 해제해 주세요.</p>}</article>:<p style={{fontSize:14,lineHeight:1.7}}>이 날짜에 남은 방문이 없어요. 기록을 확인하거나 다른 날짜로 이어가세요.</p>}
    {undo&&<div className="travel-book-actions"><button type="button" style={{fontSize:14}} onClick={()=>{if(persist(undo))setNotice('직전 진행 표시를 되돌렸어요.');setUndo(null);}}>직전 진행 되돌리기</button></div>}
    {!!remaining.entries.length&&<><p style={{fontSize:14,lineHeight:1.7}}>남은 일정 종료 예상 {formatScheduleTime(remaining.entries.at(-1)!.endsAt)} · 확인된 이동 {remaining.entries.filter(item=>item.travelSource==='route').length}/{remaining.entries.length}구간</p><DayDeadlineSummary entries={remaining.entries} value={trip.dayDeadlines[trip.activeDay]}/></>}
    <details className="place-evidence"><summary>남은 일정과 진행 기록</summary><div className="modal-data"><ol>{places.map(place=><li key={place.id}><b>{place.name}</b> · {progress.marks[place.id]?.state==='done'?'방문 완료':progress.marks[place.id]?.state==='skipped'?'건너뜀':'방문 예정'}{remaining.entries.find(item=>item.place.id===place.id)&&` · ${remaining.entries.find(item=>item.place.id===place.id)!.startsAtLabel} 도착 예상`}</li>)}</ol><div className="travel-book-actions"><button type="button" style={{fontSize:14}} disabled={!Object.keys(progress.marks).length} onClick={()=>setResetting(true)}>진행 표시 다시 시작</button></div>{resetting&&<><p style={{fontSize:14,lineHeight:1.7}}>이 날짜의 진행 표시를 처음부터 시작할까요? 저장한 장소와 일정은 유지합니다.</p><div className="travel-book-actions"><button type="button" style={{fontSize:14}} onClick={()=>{setUndo(progress);persist({...cleanOnTrip(null,ids),clock:nowClock()});setResetting(false);setRunning(false);}}>진행 표시 초기화</button><button type="button" style={{fontSize:14}} onClick={()=>setResetting(false)}>기록 유지</button></div></>}</div></details>
    <p className="modal-note" style={{fontSize:13,lineHeight:1.7}}>선택한 장소를 출발점으로 계산하며 현재 위치를 추적하지 않습니다. 건너뛴 뒤 달라진 구간은 거리 기반 추정으로 다시 계산하고, 좌표가 없으면 이동 미확인으로 남깁니다. 실제 교통과 운영은 확인해 주세요.</p>
    <p role="status">{notice}</p>
  </section>;
}
export default function OnTripGuide(props:Parameters<typeof DayGuide>[0]) {
  const places=props.trip.orderedSavedPlaces.filter(place=>(props.trip.scheduleAssignments[place.id]||props.trip.tripDays[0])===props.trip.activeDay);
  return <DayGuide key={onTripIdentity(places,props.trip.activeDay)} {...props}/>;
}
