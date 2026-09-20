"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {plannerJson} from '../../planner/services/api';
import {offsetTripDate} from '../../../lib/trip-dates.js';
type Item={id:string;name:string;image?:string;startDate:string;endDate:string;city:string};
export default function LandingFestivalPreview(){
 const root=useRef<HTMLDivElement>(null);const [items,setItems]=useState<Item[]>([]);const [state,setState]=useState('idle');
 useEffect(()=>{const controller=new AbortController();let started=false;const load=()=>{if(started)return;started=true;setState('loading');const start=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const query=new URLSearchParams({region:'경남 전체',start,end:offsetTripDate(start,30),profiles:''});void plannerJson<{items:Item[]}>(`/api/festivals?${query}`,{signal:controller.signal,timeoutMs:15000}).then(data=>{if(!controller.signal.aborted){setItems(Array.isArray(data.items)?data.items.slice(0,3):[]);setState('done');}}).catch(()=>{if(!controller.signal.aborted)setState('error');});};if(typeof IntersectionObserver==='undefined'){load();return()=>controller.abort();}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){load();observer.disconnect();}},{rootMargin:'200px'});if(root.current)observer.observe(root.current);return()=>{observer.disconnect();controller.abort();};},[]);
 return <div ref={root} className="night-festival-preview"><div className="night-festival-preview-cards">{items.map(item=><Link href="/festivals" key={item.id}>{item.image&&<img src={item.image} alt="" width="180" height="130" loading="lazy"/>}<strong>{item.name}</strong><small>{item.startDate} — {item.endDate}</small><span>{item.city}</span></Link>)}</div>{!items.length&&<p role="status">{state==='loading'?'개최 예정인 축제를 확인하고 있어요.':state==='error'?'축제 목록에서 최신 일정을 확인하세요.':'다가오는 경남의 축제를 만나보세요.'}</p>}</div>;
}
