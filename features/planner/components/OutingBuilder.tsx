"use client";
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {profiles as availableProfiles,regions,themes as availableThemes,departurePresets} from '../constants';
import type {Place} from '../types';
import {useSmallTripSearch} from '../hooks/useSmallTripSearch';
import {outingCandidates,previewOuting,outingFingerprint} from '../../../lib/small-trip.js';
import {localDate} from '../utils';
import OutingArchive from './OutingArchive';
import VisitHoursCard from './VisitHoursCard';
import {courseCard,courseGrid,courseActions,courseLabel,courseInput,courseCopy,coursePrimary} from './small-trip-styles';

export default function OutingBuilder(){
 const [region,setRegion]=useState('창원'),[profiles,setProfiles]=useState<string[]>([]),[theme,setTheme]=useState('nature'),[date,setDate]=useState(''),[time,setTime]=useState('10:00'),[hours,setHours]=useState(3),[stay,setStay]=useState(45),[originId,setOriginId]=useState('changwon'),[unknown,setUnknown]=useState(false);
 const [step,setStep]=useState(0),[pageNumber,setPageNumber]=useState(0);
 const [chosen,setChosen]=useState<string[]>([]),[review,setReview]=useState(''),[ready,setReady]=useState(false),[message,setMessage]=useState('');
 const resultHeading=useRef<HTMLHeadingElement>(null),reviewHeading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{
  setDate(localDate());
  try{const seed=JSON.parse(sessionStorage.getItem('wave-outing-entry-v1')||'null');if(seed&&Date.now()-seed.createdAt>=0&&Date.now()-seed.createdAt<3600000){if(regions.includes(seed.region))setRegion(seed.region);if(typeof seed.theme==='string'&&seed.theme.split(',').every((id:string)=>availableThemes.some(item=>item.id===id)))setTheme(seed.theme);if(Array.isArray(seed.profiles))setProfiles(availableProfiles.filter(item=>seed.profiles.includes(item.id)).map(item=>item.id));}}catch{/* A new outing remains usable without stored preferences. */}
  setReady(true);
 });return()=>cancelAnimationFrame(frame);},[]);
 const search=useSmallTripSearch(region,theme,profiles),origin=departurePresets.find(item=>item.id===originId)||departurePresets[0];
 const candidates=outingCandidates({places:[...(search.data?.places||[]),...(search.data?.explorationPlaces||[])],requiredKeys:search.data?.criteria?.facilityKeys||[],includeUnknown:unknown,origin:origin.point});
 const selected=chosen.flatMap(id=>{const row=candidates.find(item=>item.place.id===id);return row?[row.place]:[];});
 const preview=previewOuting({places:selected,date,startTime:time,hours,stayMinutes:stay,origin:origin.point});
 const selectionKey=JSON.stringify([region,profiles,theme,date,time,hours,stay,originId,unknown,selected.map(place=>place.id),search.data?.generatedAt]);
 const reviewing=Boolean(review&&review===selectionKey&&preview);
 const validInput=Boolean(date&&time&&profiles.length&&theme&&ready&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)&&Number(time.slice(0,2))*60+Number(time.slice(3))+hours*60<1440);
 async function find(){setChosen([]);setReview('');if(await search.search()){setStep(1);setPageNumber(0);requestAnimationFrame(()=>resultHeading.current?.focus());}}
 function choose(place:Place){setReview('');if(chosen.includes(place.id)){setChosen(chosen.filter(id=>id!==place.id));return;}if(selected.length>=2){setMessage('짧은 나들이는 두 곳까지 담을 수 있어요. 먼저 한 곳을 빼고 바꿔주세요.');return;}setChosen([...selected.map(item=>item.id),place.id]);setMessage('');}
 return <div style={{display:'grid',gap:24}}>
  <section aria-label="짧은 나들이 조건" hidden={step!==0} inert={!ready} style={step===0?courseCard:{display:'none'}}>
   <div><p style={courseCopy}>01 · 나에게 있는 시간</p><h2 style={{fontSize:26,margin:'8px 0'}}>몇 시간의 여유가 있나요?</h2><p style={courseCopy}>필요한 편의를 고르고 한두 곳을 천천히 만나보세요. 출발과 복귀는 아래 공개 장소를 기준으로 계산합니다.</p></div>
   <div style={courseGrid}>
    <label style={courseLabel}>여행 지역<select style={courseInput} value={region} onChange={event=>setRegion(event.target.value)}>{regions.map(value=><option key={value}>{value}</option>)}</select></label>
    <label style={courseLabel}>출발·복귀 장소<select style={courseInput} value={originId} onChange={event=>setOriginId(event.target.value)}>{departurePresets.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label style={courseLabel}>여행 날짜<input type="date" style={courseInput} value={date} onChange={event=>setDate(event.target.value)}/></label>
    <label style={courseLabel}>출발 시각<input type="time" style={courseInput} value={time} onChange={event=>setTime(event.target.value)}/></label>
    <label style={courseLabel}>쓸 수 있는 시간<select style={courseInput} value={hours} onChange={event=>setHours(Number(event.target.value))}>{[1,2,3,4,5,6].map(value=><option key={value} value={value}>{value}시간</option>)}</select></label>
    <label style={courseLabel}>한 장소에서 머무는 시간<select style={courseInput} value={stay} onChange={event=>setStay(Number(event.target.value))}>{[15,30,45,60,90,120].map(value=><option key={value} value={value}>{value}분</option>)}</select></label>
   </div>
   <fieldset style={{border:0,padding:0,margin:0}}><legend style={{fontSize:16,marginBottom:12}}>필요한 편의</legend><div className="travel-book-actions" style={courseActions}>{availableProfiles.map(item=><button type="button" key={item.id} aria-pressed={profiles.includes(item.id)} onClick={()=>setProfiles(profiles.includes(item.id)?profiles.filter(id=>id!==item.id):[...profiles,item.id])}>{profiles.includes(item.id)?'✓ ':''}{item.label}</button>)}</div></fieldset>
   <fieldset style={{border:0,padding:0,margin:0}}><legend style={{fontSize:16,marginBottom:12}}>하고 싶은 활동</legend><div className="travel-book-actions" style={courseActions}>{availableThemes.map(item=><button type="button" key={item.id} aria-pressed={theme.split(',').includes(item.id)} onClick={()=>{const next=theme.split(',').filter(Boolean);setTheme(next.includes(item.id)?next.filter(id=>id!==item.id).join(','):[...next,item.id].join(','));}}>{theme.split(',').includes(item.id)?'✓ ':''}{item.label}</button>)}</div></fieldset>
   <div className="travel-book-actions" style={courseActions}><button type="button" style={coursePrimary} disabled={!validInput||search.busy} onClick={()=>void find()}>{search.busy?'나들이를 찾는 중…':'이 시간에 나들이 찾기'}</button>{search.busy&&<button type="button" onClick={search.cancel}>찾기 중단</button>}<Link href="/planner">전체 여행 설계로 돌아가기</Link></div>
   {!validInput&&ready&&<p style={courseCopy}>날짜·편의·활동을 고르고, 같은 날 안에 돌아올 수 있는 시간대를 선택하세요.</p>}
   <p role="status" style={courseCopy}>{message||search.notice}</p>
  </section>
  {search.data&&step===1&&<section aria-label="짧은 나들이 장소 고르기" style={{display:'grid',gap:20}}>
   <div className="travel-book-actions" style={courseActions}><button type="button" onClick={()=>setStep(0)}>조건 다시 정하기</button></div><div><p style={courseCopy}>02 · 한 곳, 또는 두 곳</p><h2 ref={resultHeading} tabIndex={-1} style={{fontSize:26,margin:'8px 0',scrollMarginTop:140}}>잠깐 머물고 싶은 곳</h2><p style={courseCopy}>{region} · 한국관광공사 검색 결과 · {new Date(search.data.generatedAt).toLocaleString('ko-KR')} 조회</p></div>
   <label style={{...courseLabel,display:'flex',alignItems:'center',minHeight:44}}><input type="checkbox" checked={unknown} onChange={event=>{setUnknown(event.target.checked);setPageNumber(0);}}/>필요한 편의가 미확인인 곳도 살펴보기</label>
   <p style={courseCopy}>편의 조건으로 비교할 후보 {candidates.length}곳 · 선택 {selected.length}/2곳. 미확인 편의는 방문 전에 확인해 주세요.</p>
   <div style={courseGrid}>{candidates.slice(pageNumber*3,pageNumber*3+3).map(row=>{
    const isChosen=selected.some(item=>item.id===row.place.id),next=isChosen?selected:selected.length<2?[...selected,row.place]:[...selected.slice(0,1),row.place];
    const timing=previewOuting({places:next,date,startTime:time,hours,stayMinutes:stay,origin:origin.point});
    return <article key={row.place.id} style={courseCard}>
     {/* Remote unoptimized images need native styling because the current Image shim drops style. */}
     {/* eslint-disable-next-line @next/next/no-img-element */}
     {row.place.image&&<img width={720} height={180} src={row.place.image} alt={row.place.name} loading="lazy" style={{display:'block',width:'100%',height:180,objectFit:'cover',borderRadius:16}}/>}
     <h3 style={{fontSize:22,margin:0}}>{row.place.name}</h3><p style={courseCopy}>{row.place.city} · {row.place.address}</p><p style={courseCopy}>{row.unknownKeys.length?`요청한 편의 ${row.unknownKeys.length}개 미확인`:'요청한 편의정보 확인'}</p>
     <p style={courseCopy}>{timing?`${isChosen?'현재 선택':'이 곳을 더하면'} · ${origin.name} 복귀 ${timing.endLabel} 추정${timing.fits?'':' · 선택한 시간 초과'}`:'날짜·시간과 공개 출발 장소를 확인해 주세요.'}</p>
     <VisitHoursCard id={row.place.id} name={row.place.name} visit={timing?{day:date,...timing.entries.find(entry=>entry.place.id===row.place.id)!}:undefined}/>
     <div className="travel-book-actions" style={courseActions}><button type="button" aria-pressed={isChosen} disabled={!isChosen&&(!timing?.fits||selected.length>=2)} onClick={()=>choose(row.place)}>{isChosen?`${row.place.name} 빼기`:`${row.place.name} 나들이에 담기`}</button></div>
    </article>;
   })}</div>
   {candidates.length>3&&<div className="travel-book-actions" style={courseActions}><button type="button" disabled={pageNumber===0} onClick={()=>{setPageNumber(pageNumber-1);resultHeading.current?.focus();}}>이전 후보</button><p style={courseCopy}>{pageNumber+1} / {Math.ceil(candidates.length/3)}</p><button type="button" disabled={(pageNumber+1)*3>=candidates.length} onClick={()=>{setPageNumber(pageNumber+1);resultHeading.current?.focus();}}>다음 후보</button></div>}
   {!candidates.length&&<p style={courseCopy}>선택한 편의를 확인할 후보가 없어요. 미확인 정보도 비교하거나 다른 지역·활동을 찾아보세요.</p>}
   {selected.length>0&&<div style={courseCard}><p style={courseCopy}>담은 순서: {selected.map(place=>place.name).join(' → ')}</p>{selected.length===2&&<div className="travel-book-actions" style={courseActions}><button type="button" onClick={()=>{setChosen([...chosen].reverse());setReview('');}}>두 장소 순서 바꾸기</button></div>}<p style={courseCopy}>{preview?`${origin.name} 복귀 ${preview.endLabel} 추정 · ${preview.fits?`약 ${preview.remainingMinutes}분 여유`:`약 ${-preview.remainingMinutes}분 초과`}`:'같은 날 안에서 날짜와 시간대를 확인해 주세요.'}</p><div className="travel-book-actions" style={courseActions}><button type="button" style={coursePrimary} disabled={!preview?.fits} onClick={()=>{setReview(selectionKey);setStep(2);requestAnimationFrame(()=>reviewHeading.current?.focus());}}>이 나들이 살펴보기</button><button type="button" onClick={()=>{setChosen([]);setReview('');}}>선택한 장소 비우기</button></div></div>}
  </section>}
  {reviewing&&step===2&&preview&&<section aria-label="짧은 나들이 일정 확인" style={courseCard}><div className="travel-book-actions" style={courseActions}><button type="button" onClick={()=>setStep(1)}>장소 다시 고르기</button><button type="button" onClick={()=>setStep(0)}>조건 다시 정하기</button></div><p style={courseCopy}>03 · 나의 짧은 하루</p><h2 ref={reviewHeading} tabIndex={-1} style={{fontSize:28,margin:0,scrollMarginTop:140}}>{date}, {hours}시간의 나들이</h2><p style={courseCopy}>{time} {origin.name} 출발 → {preview.endLabel} 같은 장소 복귀 추정 · {preview.deadlineLabel}까지의 계획</p><ol style={{margin:0,paddingLeft:24}}>{preview.entries.map(entry=><li key={entry.place.id} style={{paddingBlock:12}}><strong>{entry.startsAtLabel}–{entry.endsAtLabel} {entry.place.name}</strong><p style={courseCopy}>머무는 시간 {stay}분 · 앞 장소에서 이동 {entry.travelMinutes}분 추정</p></li>)}</ol><p style={courseCopy}>이동은 직선거리를 바탕으로 계산한 참고 시간이며 실시간 교통·도보 소요가 아닙니다. {origin.name}까지 오가는 개인 이동은 포함하지 않습니다. 이용시간·휴무와 편의시설은 각 장소에서 확인한 뒤 출발하세요.</p>
   <OutingArchive key={selectionKey} input={{fingerprint:outingFingerprint([region,profiles,theme,date,time,hours,stay,originId,selected.map(place=>place.id),preview.endLabel]),title:`${region} ${hours}시간 나들이`,places:selected,region,theme,themes:theme.split(','),profiles:profiles.map(id=>availableProfiles.find(item=>item.id===id)?.label||id),travelStart:date,travelEnd:date,dayStartTime:time,scheduleAssignments:Object.fromEntries(selected.map(place=>[place.id,date])),visitMinutesByPlaceId:preview.visitMinutesByPlaceId,dayDeadlines:{[date]:{time:preview.deadlineLabel,returnMinutes:preview.returnMinutes,bufferMinutes:0}},note:`짧은 나들이: ${date} ${time} ${origin.name} 출발, ${preview.endLabel} 같은 장소 복귀 추정. ${hours}시간 중 장소마다 ${stay}분 머무르는 계획. 이동은 직선거리 기반 추정이며 개인 이동·실시간 교통·휴무는 미반영. 전체 설계에서 다시 열면 출발지를 ${origin.name}(으)로 선택하고 경로를 확인하세요.`}}/>
   <p style={courseCopy}>기존에 설계하던 여행은 유지됩니다. 저장한 일정에서 다시 열어 경로와 세부 일정을 이어 정할 수 있어요.</p>
  </section>}
 </div>;
}
