"use client";
import { lazy, Suspense, useCallback, useState } from 'react';
import type { useTripSelection } from '../hooks/useTripSelection';
import type { useItineraryRoutes } from '../hooks/useItineraryRoutes';
import type { RoutePoint } from '../../routing/types';
import type { Place } from '../types';
import type { TripProgress, TripProgressMemory } from '../../../lib/on-trip.js';
function DayToolUnavailable() { return <p role="alert">여행 도구를 불러오지 못했어요. 저장한 일정은 그대로입니다. <button type="button" onClick={()=>window.location.reload()}>화면 다시 불러오기</button></p>; }
const OnTripGuide=lazy(()=>import('./OnTripGuide').catch(()=>({default:DayToolUnavailable})));
const OfflineTripPack=lazy(()=>import('./OfflineTripPack').catch(()=>({default:DayToolUnavailable})));
export default function TripDayTools(props:{trip:ReturnType<typeof useTripSelection>;coverage:ReturnType<typeof useItineraryRoutes>;origin:RoutePoint;region:string;onSelectPlace:(place:Place)=>void}) {
 const [mode,setMode]=useState<'progress'|'pack'|null>(null);
 const [progressMemory,setProgressMemory]=useState<TripProgressMemory>({});
 const rememberProgress=useCallback((identity:string,value:TripProgress,unsaved=false)=>setProgressMemory(current=>Object.fromEntries([[identity,{value,unsaved}],...Object.entries(current).filter(([key])=>key!==identity).slice(0,19)])),[]);
 return <section className="account-settings">
  <h3>떠나는 날, 여행을 이어서</h3><p>방문한 곳부터 이어가고, 필요한 정보를 챙겨두세요.</p>
  <div className="travel-book-actions"><button type="button" aria-pressed={mode==='progress'} onClick={()=>setMode(mode==='progress'?null:'progress')}>여행 당일 진행</button><button type="button" aria-pressed={mode==='pack'} onClick={()=>setMode(mode==='pack'?null:'pack')}>여행 요약 챙기기</button></div>
  {mode==='progress'&&<div className="travel-book-actions" role="group" aria-label="진행할 여행 날짜">{props.trip.tripDays.map(day=><button type="button" key={day} aria-pressed={props.trip.activeDay===day} onClick={()=>props.trip.setActiveDay(day)}>{day.slice(5).replace('-', '월 ')}일</button>)}</div>}
  {mode&&<Suspense fallback={<p role="status">여행 정보를 준비하고 있어요.</p>}>{mode==='progress'?<OnTripGuide {...props} progressMemory={progressMemory} onProgressChange={rememberProgress}/>:<OfflineTripPack {...props} progressMemory={progressMemory}/>}</Suspense>}
 </section>;
}
