"use client";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import LandingStoryDialogue from "./LandingStoryDialogue";
import HandwrittenText from "../../../components/HandwrittenText";
import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";
import NightIcon from "../../../components/NightIcon";
const JourneyPreview = lazy(() => import("./LandingJourneyPreview"));
const RegionPicker = lazy(() => import("../../../components/GyeongnamRegionPicker"));

export default function LandingChapters() {
 const en=useSitePreferences().locale==='en';
 const root=useRef<HTMLElement>(null);
 const [ready,setReady]=useState(false);
 const [region,setRegion]=useState('통영');
 const [step,setStep]=useState(0);
 useEffect(()=>{const node=root.current;if(!node)return;if(typeof IntersectionObserver!=="function"){let cancelled=false;queueMicrotask(()=>{if(!cancelled)setReady(true);});return()=>{cancelled=true;};}const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setReady(true);observer.disconnect();}},{rootMargin:'300px'});observer.observe(node);return()=>observer.disconnect();},[]);
 const href='/planner?region='+encodeURIComponent(region);
 return <section id="story" ref={root} tabIndex={-1} className="night-journey-story" aria-labelledby="horizon-how-title">
  <div className="night-journey-input" data-land-reveal>
   <LandingStoryDialogue speaker="naru">좋아! 가고 싶은 곳과 필요한 편의부터 골라보자.</LandingStoryDialogue><h2 id="horizon-how-title">{en?'Design a journey':'당신만의'}<br/><em>{en?'that feels like you.':'여행을 설계하세요'}</em></h2>
   <p>{en?'Find places that suit you, and shape your own itinerary.':'AI가 추천하는 맞춤 여행 코스로, 모두를 위한 여행을 시작하세요.'}</p>
   <div className="night-journey-tabs" role="group" aria-label={en?'Planning steps':'여행 설계 단계'}>{['지역 선택','편의 확인','일정 만들기'].map((title,index)=><button type="button" key={title} aria-pressed={step===index} onClick={()=>setStep(index)}>{en?['Destination','Facilities','Itinerary'][index]:title}</button>)}</div>
   <div className="night-journey-step" aria-live="polite">
    {step===0?<><h3>{en?'Where would you like to go?':'어디로 떠나고 싶으세요?'}</h3><div className="night-region-shortcuts">{['통영','거제','남해','하동','산청'].map(name=><button type="button" key={name} aria-pressed={region===name} onClick={()=>setRegion(name)}>{name}</button>)}</div></>:step===1?<><h3>{en?'The facilities you need':'내게 필요한 편의까지'}</h3><div className="night-journey-facilities">{[['access','접근로'],['bed','쉬어갈 곳'],['car','주차'],['people','동행 조건']].map(([icon,label])=><span key={label}><NightIcon name={icon}/>{label}</span>)}</div><p>{en?'Review official information and details that need checking.':'공식 정보와 아직 확인이 필요한 항목을 구분해 살펴보세요.'}</p></>:<><h3>{en?'Your day, in your order':'하루의 순서는, 내가 원하는 대로'}</h3><ol className="night-journey-preview">{[['장소 담기','좋아하는 여행지를 한곳에'],['순서 바꾸기','머무는 시간과 이동을 함께'],['나루와 조정하기','변경안을 확인하고 적용']].map(([title,copy])=><li key={title}><div><strong>{title}</strong><small>{copy}</small></div></li>)}</ol></>}
   </div>
   <Link className="night-primary" href={href}>{en?'Plan my trip':`${region} 여행 설계하기`} </Link>
  </div>
  <div className="night-journey-map" data-land-reveal>{ready?<Suspense fallback={<div className="night-map-loading">경남 지도를 준비하고 있어요</div>}><RegionPicker night showDecliningInfo={false} value={region} onChange={setRegion}/></Suspense>:<div className="night-map-loading">경남 18개 시·군</div>}<p className="night-map-signature"><HandwrittenText viewportSelector=".night-journey-map" text={"경남,\n새로운 시선으로"} /></p></div>
  {ready && <Suspense fallback={<div className="night-map-loading">여행 예시를 준비하고 있어요</div>}><JourneyPreview en={en}/></Suspense>}
 </section>;
}
