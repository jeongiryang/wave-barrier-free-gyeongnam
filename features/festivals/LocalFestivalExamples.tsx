'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { Place } from '../planner/types';
import LocalAmenityPreview from '../planner/components/LocalAmenityPreview';

export default function LocalFestivalExamples() {
  const [enabled,setEnabled] = useState(false), [open,setOpen] = useState(false);
  useEffect(() => { const frame = requestAnimationFrame(() => setEnabled(import.meta.env.DEV && ['localhost','127.0.0.1'].includes(location.hostname))); return () => cancelAnimationFrame(frame); }, []);
  if (!enabled) return null;
  const place: Place = { id:'local-festival-preview',contentTypeId:'15',city:'경남',name:'[시연] 정원 축제',address:'시연용 주소 · 실제 행사 아님',summary:'화면 확인용 예시이며 실제 행사 일정이나 시설 정보가 아닙니다.',image:'/media/demo/garden-illustration.webp',mapX:'128.1',mapY:'35.18',score:null,features:[],details:[],source:'로컬 예시 데이터 · 실제 관광정보 아님' };
  return <section className="local-festival-examples" aria-label="축제 로컬 시연"><h2>축제·편의시설 시연</h2><p>API 연결과 별개로 확인하는 로컬 예시입니다. 실제 행사와 시설 정보가 아닙니다.</p><article className="festival-card"><button type="button" className="festival-card-photo" onClick={() => setOpen(value => !value)} aria-expanded={open}><Image unoptimized src={place.image} alt="정원 축제 시연 그림" width={400} height={240}/><span>[시연] 정원 축제</span></button><button type="button" onClick={() => setOpen(value => !value)}>화장실·쉬는 곳 지도 {open ? '접기' : '보기'}</button>{open && <LocalAmenityPreview place={place} festival/>}</article></section>;
}
