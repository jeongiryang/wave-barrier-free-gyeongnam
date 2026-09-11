"use client";
import {useEffect,useId,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import type {CommunityPostInput} from '../client/api';
import {prepareVisitPhoto} from '../client/prepare-visit-photo';

export default function CommunityVisitPhotosEditor({values,setValues,saving,onBusyChange}:{values:CommunityPostInput;setValues:Dispatch<SetStateAction<CommunityPostInput>>;saving:boolean;onBusyChange:(value:boolean)=>void}){
 const actionStyle={minHeight:44,padding:'8px 16px',border:'1px solid var(--line)',borderRadius:24,background:'var(--white)',color:'var(--blue)',fontSize:14,marginTop:8};
 const inputId=useId(),alive=useRef(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const photos=values.visitPhotos||[];
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;onBusyChange(false);};},[onBusyChange]);
 async function prepare(files:File[]){
  if(!files.length||busy)return;if(files.length+photos.length>2){setNotice('현장 사진은 최대 2장까지 첨부할 수 있어요.');return;}
  setBusy(true);onBusyChange(true);setNotice('사진을 준비하고 있어요.');
  try{
   const next=await Promise.all(files.map(prepareVisitPhoto));
   if(alive.current){setValues(current=>({...current,visitPhotos:[...(current.visitPhotos||[]),...next],photoConsent:false}));setNotice('사진을 준비했어요. 사진별로 직접 확인한 시설이나 동선을 설명해 주세요.');}
  }catch(error){if(alive.current)setNotice(error instanceof Error?error.message:'사진을 준비하지 못했어요. 다시 선택해 주세요.');}
  finally{if(alive.current){setBusy(false);onBusyChange(false);}}
 }
 return <section className="editor-field-report" aria-labelledby={inputId+'-heading'}>
  <header><div><small>직접 다녀온 기록</small><h2 id={inputId+'-heading'}>공개할 현장 사진</h2></div><p>입구·화장실·이동 동선처럼 직접 확인한 편의를 보여주세요. 사진은 연결된 장소의 방문일·경험과 함께 공개됩니다.</p></header>
  <p>얼굴, 차량 번호, 연락처가 보이면 가리거나 다른 사진을 골라 주세요. 위치·촬영기기 등 사진 메타데이터는 제거합니다.</p>
  <label htmlFor={inputId}>사진 선택 (최대 2장)<input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy||saving||photos.length>=2} onChange={event=>{const files=Array.from(event.target.files||[]);event.target.value='';void prepare(files);}}/><small>JPG·PNG·WebP, 원본 한 장당 6MB 이하</small></label>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:20}}>{photos.map((photo,index)=><figure key={index} style={{margin:0,minWidth:0}}>
   {/* eslint-disable-next-line @next/next/no-img-element -- Local attachment preview must not leave the browser for image optimization. */}
   <img src={photo.dataUrl} alt={photo.caption||`첨부한 현장 사진 ${index+1}`} width={photo.width} height={photo.height} style={{width:'100%',height:220,objectFit:'contain',borderRadius:16,background:'var(--paper)'}}/>
   <figcaption><label>사진 {index+1} 설명<input required minLength={1} maxLength={160} disabled={busy||saving} value={photo.caption} placeholder="사진에서 확인한 편의나 동선" onChange={event=>setValues(current=>({...current,visitPhotos:(current.visitPhotos||[]).map((item,i)=>i===index?{...item,caption:event.target.value}:item)}))}/></label><button type="button" style={actionStyle} disabled={busy||saving} onClick={()=>setValues(current=>({...current,visitPhotos:(current.visitPhotos||[]).filter((_,i)=>i!==index),photoConsent:false}))}>사진 {index+1} 제거</button></figcaption>
  </figure>)}</div>
  {!!photos.length&&<label className="departure-review-check"><input type="checkbox" required checked={Boolean(values.photoConsent)} disabled={busy||saving} onChange={event=>setValues(current=>({...current,photoConsent:event.target.checked}))}/>직접 촬영한 사진을 후기에 공개할게요.</label>}
  <p role="status">{notice}</p>
 </section>;
}
