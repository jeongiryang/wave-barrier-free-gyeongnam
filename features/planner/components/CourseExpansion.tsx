"use client";
import {useRef,useState} from 'react';
import type {Place,PlanData} from '../types';
import type {useTripSelection} from '../hooks/useTripSelection';
import {useSmallTripSearch} from '../hooks/useSmallTripSearch';
import {courseCandidates,type CoursePurpose} from '../../../lib/small-trip.js';
import {courseCard,courseGrid,courseActions,courseLabel,courseInput,courseCopy,coursePrimary} from './small-trip-styles';

type Props={trip:ReturnType<typeof useTripSelection>;region:string;themes:string;profiles:string[];plan:PlanData|null;current:boolean;onSelectPlace:(place:Place)=>void};
export default function CourseExpansion({trip,region,themes,profiles,plan,current,onSelectPlace}:Props){
 const [anchorId,setAnchorId]=useState(''),[purpose,setPurpose]=useState<CoursePurpose>('visit'),[radius,setRadius]=useState(5),[unknown,setUnknown]=useState(false),[minutes,setMinutes]=useState(45);
 const [chosenId,setChosenId]=useState(''),[notice,setNotice]=useState(''),[undo,setUndo]=useState<{id:string;anchorId:string;day:string;minutes:number;purpose?:'rest';order:string[];constraints:string}|null>(null);
 const constraints=JSON.stringify([trip.fixedVisits,trip.travelStart,trip.travelEnd,trip.dayStartTime]);
 const previewHeading=useRef<HTMLHeadingElement>(null);
 const anchor=trip.orderedSavedPlaces.find(place=>place.id===anchorId)||trip.orderedSavedPlaces.at(-1);
 const requestedThemes=purpose==='food'?'food':purpose==='rest'?'nature':themes;
 const search=useSmallTripSearch(region,requestedThemes,profiles);
 const data=search.data||(current&&requestedThemes===themes?plan:null),keys=data?.criteria?.facilityKeys||[];
 const candidates=anchor&&keys.length?courseCandidates({places:[...(data?.places||[]),...(data?.explorationPlaces||[])],anchor,savedIds:trip.saved,requiredKeys:keys,includeUnknown:unknown,purpose,radiusKm:radius}):[];
 const selected=candidates.find(row=>row.place.id===chosenId);
 function apply(){
  if(!selected||!anchor)return;
  const day=trip.scheduleAssignments[anchor.id]||trip.tripDays[0],order=[...trip.orderedPlaceIds];order.splice(order.indexOf(anchor.id)+1,0,selected.place.id);
  if(!trip.addCourseStop(anchor.id,selected.place,minutes,purpose==='rest'?'rest':undefined)){setNotice('고정 일정의 순서나 날짜를 지키기 위해 추가하지 않았어요. 다른 기준 장소를 골라주세요.');return;}
  setUndo({id:selected.place.id,anchorId:anchor.id,day,minutes,purpose:purpose==='rest'?'rest':undefined,order,constraints});setChosenId('');setNotice(`${anchor.name} 다음에 ${selected.place.name}을 담았어요. 날짜와 다른 장소는 유지했습니다.`);
 }
 function undoAddition(){
  if(!undo)return;
  const changed=constraints!==undo.constraints||JSON.stringify(trip.orderedPlaceIds)!==JSON.stringify(undo.order)||(trip.scheduleAssignments[undo.id]||trip.tripDays[0])!==undo.day||trip.visitMinutesByPlaceId[undo.id]!==undo.minutes||trip.restPurposeByPlaceId[undo.id]!==undo.purpose||Boolean(trip.breakMinutesByPlaceId[undo.id])||!trip.canChangePlace(undo.id);
  if(changed||trip.toggleSaved(undo.id)===false)setNotice('추가한 뒤 일정이 바뀌었어요. 현재 선택을 보존하려고 자동으로 되돌리지 않았습니다.');
  else setNotice('방금 더한 장소만 일정에서 뺐어요.');setUndo(null);
 }
 return <details data-planner-tool="course" className="place-evidence" onToggle={event=>{if(!event.currentTarget.open)search.cancel();}}><summary>한 장소에서 코스 이어 담기</summary>
  <section aria-label="한 장소에서 코스 확장" style={{...courseCard,marginTop:12}}>
   <h3 style={{margin:0,fontSize:24}}>좋아하는 곳에서, 다음 풍경으로</h3><p style={courseCopy}>담아둔 장소 가까이에서 식사·휴식·관광을 하나씩 더해보세요.</p>
   {anchor?<><div style={courseGrid}><label style={courseLabel}>어느 장소 다음에 갈까요?<select style={courseInput} value={anchor.id} onChange={event=>{setAnchorId(event.target.value);setChosenId('');}}>{trip.orderedSavedPlaces.map(place=><option key={place.id} value={place.id}>{place.name}</option>)}</select></label><label style={courseLabel}>이어갈 활동<select style={courseInput} value={purpose} onChange={event=>{setPurpose(event.target.value as CoursePurpose);setChosenId('');}}><option value="visit">관광 이어가기</option><option value="food">식사하기</option><option value="rest">쉬어 갈 곳 찾기</option></select></label><label style={courseLabel}>가까운 범위<select style={courseInput} value={radius} onChange={event=>{setRadius(Number(event.target.value));setChosenId('');}}>{[3,5,10].map(value=><option key={value} value={value}>직선 {value}km 이내</option>)}</select></label></div>
   <p style={courseCopy}>필요한 편의 {profiles.length}개를 유지합니다. {purpose==='rest'?'자연·휴양 장소를 비교하며, 앉을 자리와 실제 휴식 여건은 장소 정보에서 확인해 주세요.':'직선거리로 가까운 순서를 비교하며 실제 보행 경로와는 다를 수 있어요.'}</p>
   <label style={{...courseLabel,display:'flex',alignItems:'center',minHeight:44}}><input type="checkbox" checked={unknown} onChange={event=>{setUnknown(event.target.checked);setChosenId('');}}/>필요한 편의가 미확인인 곳도 살펴보기</label>
   <div className="travel-book-actions" style={courseActions}><button type="button" aria-busy={search.busy} disabled={search.busy||!profiles.length||!requestedThemes} onClick={()=>{setNotice('');void search.search();}}>{search.busy?'가까운 후보를 찾는 중…':data?'같은 조건으로 후보 다시 찾기':'같은 편의로 후보 찾기'}</button>{search.busy&&<button type="button" onClick={search.cancel}>찾기 중단</button>}</div>
   <p style={courseCopy} role="status">{notice||search.notice||(data?`반경 안에서 비교할 후보 ${candidates.length}곳`:'활동에 맞는 후보를 찾아주세요.')}</p>
   {data&&<p style={courseCopy}>{data.generatedAt?`자료 조회 ${new Date(data.generatedAt).toLocaleString('ko-KR')}`:''} · 한국관광공사 · 검색 결과 안에서 최대 6곳을 비교합니다.</p>}
   <div style={courseGrid}>{candidates.map(row=><article key={row.place.id} style={courseCard}><h4 style={{margin:0,fontSize:20}}>{row.place.name}</h4><p style={courseCopy}>{row.place.city} · 직선 약 {row.distanceKm.toFixed(1)}km · 이동 약 {row.travelMinutes}분 추정</p><p style={courseCopy}>{row.unknownKeys.length?`필요한 편의 ${row.unknownKeys.length}개 미확인`:'요청한 편의정보 확인'}</p><div className="travel-book-actions" style={courseActions}><button type="button" onClick={()=>onSelectPlace(row.place)}>{row.place.name} 이용 정보</button><button type="button" aria-pressed={chosenId===row.place.id} onClick={()=>{setChosenId(row.place.id);requestAnimationFrame(()=>previewHeading.current?.focus());}}>추가 미리보기</button></div></article>)}</div>
   {data&&!candidates.length&&<p style={courseCopy}>조건과 거리에 맞는 후보가 아직 없어요. 범위를 바꾸거나 다른 활동을 살펴보세요.</p>}
   {selected&&<section aria-label="추가할 장소 미리보기" style={courseCard}><h4 ref={previewHeading} tabIndex={-1} style={{margin:0,fontSize:20,scrollMarginTop:140}}>{anchor.name} → {selected.place.name}</h4><p style={courseCopy}>{trip.scheduleAssignments[anchor.id]||trip.tripDays[0]}에 한 곳을 더합니다. 이후 도착 시각은 새 머무는 시간과 이동에 따라 바뀝니다.</p><label style={courseLabel}>새 장소에서 머무는 시간<select style={courseInput} value={minutes} onChange={event=>setMinutes(Number(event.target.value))}>{[15,30,45,60,90,120].map(value=><option key={value} value={value}>{value}분</option>)}</select></label><div className="travel-book-actions" style={courseActions}><button type="button" style={coursePrimary} onClick={apply}>이 장소 이어 담기</button><button type="button" onClick={()=>setChosenId('')}>취소</button></div></section>}
   {undo&&<div className="travel-book-actions" style={courseActions}><button type="button" onClick={undoAddition}>방금 이어 담기 되돌리기</button></div>}
   </>:<p style={courseCopy}>먼저 여행지 한 곳을 일정에 담으면 주변 코스를 이어갈 수 있어요.</p>}
  </section>
 </details>;
}
