"use client";
import {useEffect,useRef,useState} from 'react';
import {criteriaSignature} from '../../../lib/planner-criteria.js';
import {CLIENT_BUDGET_MS} from '../../../lib/request-budget.js';
import {planResponse} from '../services/plan-response';
import {plannerJson} from '../services/api';
import type {PlanData} from '../types';

/** Explicit shared search for small courses; no current-trip or background writes. */
export function useSmallTripSearch(region:string,themes:string,profiles:string[]) {
 const signature=criteriaSignature({region,themes,selected:profiles,locale:'ko'});
 const [result,setResult]=useState<{signature:string;data:PlanData}|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const pending=useRef<AbortController|null>(null);
 useEffect(()=>()=>pending.current?.abort(),[]);
 useEffect(()=>{pending.current?.abort();},[signature]);
 async function search(){
  if(pending.current||!region||!themes||!profiles.length)return false;
  const request=new AbortController();pending.current=request;setBusy(true);setNotice('');
  try{
   const query=new URLSearchParams({action:'plan',region,themes,profiles:profiles.join(','),locale:'ko'});
   const data=planResponse(await plannerJson<unknown>('/api/wave?'+query,{signal:request.signal,timeoutMs:CLIENT_BUDGET_MS.plan}));
   if(!data.criteria?.facilityKeys?.length)throw Error('Missing facility criteria');
   if(!request.signal.aborted){setResult({signature,data});setNotice(data.statuses.some(row=>row.state==='error'||row.partial)?'일부 정보를 불러오지 못했어요. 확인된 결과 안에서 선택할 수 있어요.':'선택한 편의를 유지한 여행 후보를 불러왔어요.');return true;}
  }catch{if(!request.signal.aborted)setNotice('여행 후보를 불러오지 못했어요. 선택한 조건을 유지했으니 잠시 후 다시 찾아주세요.');}
  finally{if(pending.current===request){pending.current=null;setBusy(false);}}
  return false;
 }
 return{data:result?.signature===signature?result.data:null,busy,notice,search,cancel:()=>{if(pending.current){pending.current.abort();setNotice('찾기를 중단했어요. 선택한 조건은 그대로입니다.');}}};
}
