"use client";
import { useMemo, useState } from 'react';
import type { useTripSelection } from '../hooks/useTripSelection';
import type { useItineraryRoutes } from '../hooks/useItineraryRoutes';
import type { RoutePoint } from '../../routing/types';
import type { VisitInfo } from '../../../lib/visit-hours.js';
import { buildItinerarySchedule } from '../optimization/itinerary-schedule.js';
import { fetchVisitInfo } from '../services/visit-info';
import { onTripIdentity, readOnTrip, type TripProgressMemory } from '../../../lib/on-trip.js';
import { offlineTripText, offlineTripHtml } from '../../../lib/trip-offline.js';
import { budgetIdentity, readSavedBudget, summarizeBudget } from '../../../lib/trip-budget.js';

export default function OfflineTripPack({trip,coverage,origin,region,progressMemory}:{trip:ReturnType<typeof useTripSelection>;coverage:ReturnType<typeof useItineraryRoutes>;origin:RoutePoint;region:string;progressMemory:TripProgressMemory}) {
  const [info,setInfo]=useState<Record<string,VisitInfo>>({}),[loading,setLoading]=useState(''),[notice,setNotice]=useState('');
  const [includeProgress,setIncludeProgress]=useState(true);
  const [includeBudget,setIncludeBudget]=useState(false);
  const schedule=useMemo(()=>buildItinerarySchedule({places:trip.orderedSavedPlaces,days:trip.tripDays,assignments:trip.scheduleAssignments,startTime:trip.dayStartTime,origin,routeMinutesByPlaceId:coverage.routeMinutes,visitMinutesByPlaceId:trip.visitMinutesByPlaceId,breakMinutesByPlaceId:trip.breakMinutesByPlaceId,fixedVisits:trip.fixedVisits}),[trip.orderedSavedPlaces,trip.tripDays,trip.scheduleAssignments,trip.dayStartTime,origin,coverage.routeMinutes,trip.visitMinutesByPlaceId,trip.breakMinutesByPlaceId,trip.fixedVisits]);
  const complete = schedule.reduce((count,day)=>count+day.entries.length,0)===trip.orderedSavedPlaces.length;
  async function check(id:string) {if(loading)return;setLoading(id);setNotice('');try{const result=await fetchVisitInfo(id);setInfo(values=>({...values,[id]:result}));setNotice('확인한 이용 정보를 요약 파일에 함께 넣습니다.');}catch{setNotice('이용 정보를 불러오지 못했어요. 확인하지 못한 항목은 미확인으로 보관합니다.');}finally{setLoading('');}}
  function download(kind:'html'|'txt') {
    if(!complete || !trip.orderedSavedPlaces.length || loading)return;
    try {
      const progress = includeProgress ? Object.fromEntries(schedule.map(day=>{const identity=onTripIdentity(day.entries.map(entry=>entry.place),day.day);return [day.day,progressMemory[identity]?.unsaved ? progressMemory[identity].value : readOnTrip(localStorage,identity,day.entries.map(entry=>entry.place.id),true)];})) : {};
      const savedBudget=includeBudget?readSavedBudget(localStorage,budgetIdentity(trip.orderedSavedPlaces,trip.tripDays),trip.saved,trip.tripDays):null;
      if(includeBudget&&!savedBudget){setNotice('저장한 여행비가 없어요. 여행비 계획에서 저장하거나 여행비 포함을 끄고 다시 저장해 주세요.');return;}
      const budget=savedBudget?summarizeBudget({places:trip.orderedSavedPlaces,days:trip.tripDays,assignments:trip.scheduleAssignments,budget:savedBudget,routes:coverage.costByPlaceId}):undefined;
      const input={title:`${region} · ${trip.travelStart} 여행`,schedule,info,savedAt:new Date().toISOString(),progress,budget};
      const content=kind==='html'?offlineTripHtml(input):offlineTripText(input),url=URL.createObjectURL(new Blob([content],{type:kind==='html'?'text/html;charset=utf-8':'text/plain;charset=utf-8'}));
      const anchor=document.createElement('a');anchor.href=url;anchor.download=`WAVE-여행요약-${trip.travelStart}.${kind}`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('여행 요약을 저장했어요. 다운로드한 파일은 인터넷 없이도 열 수 있습니다.');
    } catch {setNotice('요약 파일을 만들지 못했어요. 다시 시도하거나 진행 기록·여행비 포함을 끄고 저장해 주세요.');}
  }
  return <section className="account-settings" aria-label="여행 요약 파일">
    <h3>연결이 약해도, 여행은 이어서</h3><p style={{fontSize:14,lineHeight:1.7}}>여행 날짜·순서·주소·편의 정보를 읽기 쉬운 파일로 챙겨두세요. 문의처와 이용시간은 아래에서 확인한 내용이 함께 담깁니다.</p>
    <details className="place-evidence"><summary>담을 장소와 문의처 확인</summary><div className="modal-data">{trip.orderedSavedPlaces.map(place=><article key={place.id}><h4>{place.name}</h4><p style={{fontSize:14,lineHeight:1.7}}>{place.address||'주소 미확인'}</p><p style={{fontSize:14,lineHeight:1.7}}>{info[place.id]?.phone?`문의 ${info[place.id].phone}`:'문의처 미확인'}</p><div className="travel-book-actions"><button type="button" style={{fontSize:14}} disabled={Boolean(loading)} onClick={()=>void check(place.id)}>{loading===place.id?'이용 정보 확인 중…':`${place.name} 문의·이용 정보 확인`}</button></div></article>)}</div></details>
    <label className="departure-review-check"><input type="checkbox" checked={includeProgress} onChange={event=>setIncludeProgress(event.target.checked)}/>직접 표시한 방문 완료·건너뛰기 기록 포함</label>
    <label className="departure-review-check"><input type="checkbox" checked={includeBudget} onChange={event=>setIncludeBudget(event.target.checked)}/>저장한 여행비 계획 포함</label>
    {!complete&&<p role="status">여행 기간 밖에 있는 장소의 날짜를 먼저 확인해 주세요.</p>}<div className="travel-book-actions"><button type="button" style={{fontSize:14}} disabled={!complete||!trip.orderedSavedPlaces.length||Boolean(loading)} onClick={()=>download('html')}>여행 요약 파일 저장</button><button type="button" style={{fontSize:14}} disabled={!complete||!trip.orderedSavedPlaces.length||Boolean(loading)} onClick={()=>download('txt')}>텍스트로 저장</button></div>
    <p className="modal-note" style={{fontSize:13,lineHeight:1.7}}>HTML 파일을 브라우저로 열면 인쇄 메뉴에서 인쇄하거나 PDF로 보관할 수 있습니다. 파일에는 저장 시각과 미확인 항목을 표시합니다. 실시간 도착·날씨, 로그인과 지도 조회는 연결이 필요합니다.</p><p role="status">{notice}</p>
  </section>;
}
