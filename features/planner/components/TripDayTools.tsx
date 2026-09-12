"use client";
import LoadingState from "../../../components/LoadingState";
import { lazy, Suspense, useState } from 'react';
import type { useTripSelection } from '../hooks/useTripSelection';
import type { useItineraryRoutes } from '../hooks/useItineraryRoutes';
import type { RoutePoint } from '../../routing/types';
import type { Place } from '../types';
import { courseActions } from './small-trip-styles';
function DayToolUnavailable() { return <p role="alert">여행 도구를 불러오지 못했어요. 저장한 일정은 그대로입니다. <button type="button" onClick={()=>window.location.reload()}>화면 다시 불러오기</button></p>; }
const OnTripGuide=lazy(()=>import('./OnTripGuide').catch(()=>({default:DayToolUnavailable})));
const OfflineTripPack=lazy(()=>import('./OfflineTripPack').catch(()=>({default:DayToolUnavailable})));
const ReturnTransport=lazy(()=>import('./ReturnTransport').catch(()=>({default:DayToolUnavailable})));
const SplitReunion=lazy(()=>import('./SplitReunion').catch(()=>({default:DayToolUnavailable})));
export default function TripDayTools(props:{trip:ReturnType<typeof useTripSelection>;coverage:ReturnType<typeof useItineraryRoutes>;origin:RoutePoint;region:string;onSelectPlace:(place:Place)=>void}) {
 const [mode,setMode]=useState<'progress'|'pack'|'transport'|'split'|null>(null);
 const [splitMounted,setSplitMounted]=useState(false);
 const { progressMemory, rememberProgress } = props.trip;
 return <section className="account-settings">
  <h3>떠나는 날, 여행을 이어서</h3><p>방문한 곳부터 이어가고, 필요한 정보를 챙겨두세요.</p>
  <div className="travel-book-actions" style={courseActions}><button type="button" data-planner-tool="on-trip" aria-pressed={mode==='progress'} onClick={()=>setMode(mode==='progress'?null:'progress')}>여행 당일 진행</button><button type="button" data-planner-tool="offline" aria-pressed={mode==='pack'} onClick={()=>setMode(mode==='pack'?null:'pack')}>여행 요약 챙기기</button><button type="button" data-planner-tool="transport" aria-pressed={mode==='transport'} onClick={()=>setMode(mode==='transport'?null:'transport')}>돌아가는 교통 확인</button><button type="button" data-planner-tool="split" aria-pressed={mode==='split'} onClick={()=>{setSplitMounted(true);setMode(mode==='split'?null:'split');}}>동행과 합류 계획</button></div>
  {mode==='progress'&&<div className="travel-book-actions" role="group" aria-label="진행할 여행 날짜">{props.trip.tripDays.map(day=><button type="button" key={day} aria-pressed={props.trip.activeDay===day} onClick={()=>props.trip.setActiveDay(day)}>{day.slice(5).replace('-', '월 ')}일</button>)}</div>}
  {mode&&mode!=='split'&&<Suspense fallback={<LoadingState>여행 정보를 준비하고 있어요.</LoadingState>}>{mode==='progress'?<OnTripGuide {...props} progressMemory={progressMemory} onProgressChange={rememberProgress}/>:mode==='transport'?<ReturnTransport trip={props.trip}/>:<OfflineTripPack {...props} progressMemory={progressMemory}/>}</Suspense>}
  {splitMounted&&<div hidden={mode!=='split'}><Suspense fallback={<LoadingState>합류 계획을 준비하고 있어요.</LoadingState>}><SplitReunion trip={props.trip} coverage={props.coverage} origin={props.origin}/></Suspense></div>}
 </section>;
}
