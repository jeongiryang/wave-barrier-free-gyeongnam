"use client";
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Place } from '../types';
import type { useTripSelection } from '../hooks/useTripSelection';
import { useTravelVoice } from '../hooks/useTravelVoice';
import { parseTravelCommand, type TravelCommand } from '../../../lib/voice-commands.js';
import { onTripIdentity, readOnTrip } from '../../../lib/on-trip.js';
import { type VoiceEditReceipt } from '../../../lib/voice-edit.js';
import { courseCard, courseActions, courseGrid, courseLabel, courseInput, courseCopy, coursePrimary } from './small-trip-styles';

type Props={trip:ReturnType<typeof useTripSelection>;places:Place[];current:boolean;visible:boolean;contextKey:string;onSelectPlace:(place:Place)=>void};
export default function VoiceTripControls({trip,places,current,visible,contextKey,onSelectPlace}:Props){
 const voice=useTravelVoice(),[text,setText]=useState(''),[notice,setNotice]=useState('');
 const [preview,setPreview]=useState<{command:TravelCommand;revision:string;choiceId:string}|null>(null),[undo,setUndo]=useState<{receipt:VoiceEditReceipt;contextKey:string}|null>(null);
 const heading=useRef<HTMLHeadingElement>(null),input=useRef<HTMLInputElement>(null);
 const known=[...new Map([...trip.orderedSavedPlaces,...(current?places:[])].map(place=>[place.id,place])).values()];
 const revision=JSON.stringify([trip.voiceRevision,trip.activeDay,contextKey,current,known]);
 const recognitionRevision=useRef('');
 const {listening,cancel}=voice;
 if(!visible&&preview)setPreview(null);
 useLayoutEffect(()=>{if(!visible&&listening)cancel();},[visible,listening,cancel]);
 useEffect(()=>{if(listening&&recognitionRevision.current!==revision)cancel();},[revision,listening,cancel]);
 function check(value:string){
  let command=parseTravelCommand(value,known);
  if(command.status==='next'){
   const daily=trip.orderedSavedPlaces.filter(place=>(trip.scheduleAssignments[place.id]||trip.tripDays[0])===trip.activeDay);
   try{const progress=readOnTrip(localStorage,onTripIdentity(daily,trip.activeDay),daily.map(place=>place.id),true),next=daily.find(place=>!progress.marks[place.id]);if(!next){setNotice('이 날짜에는 남은 장소가 없어요. 날짜나 여행 당일 진행 기록을 확인해 주세요.');setPreview(null);return;}command={status:'preview',action:'open',choices:[{id:next.id,name:next.name,city:next.city}]};}
   catch{setNotice('방문 기록을 읽지 못했어요. 장소 이름으로 직접 확인해 주세요.');setPreview(null);return;}
  }
  if(command.status==='unrecognized'){setNotice('장소 이름과 ‘담아줘’, ‘빼줘’, ‘정보 보여줘’ 중 하나를 말하거나 ‘다음 장소 보여줘’를 입력해 주세요.');setPreview(null);return;}
  if(command.status==='not-found'){setNotice('현재 여행지 목록이나 저장한 일정에서 장소를 찾지 못했어요. 아래의 정확한 장소 이름을 확인해 주세요.');setPreview(null);return;}
  setNotice('');setPreview({command,revision,choiceId:command.choices.length===1?command.choices[0].id:''});requestAnimationFrame(()=>heading.current?.focus());
 }
 const selected=known.find(place=>place.id===preview?.choiceId),action=preview?.command.action;
 const valid=Boolean(visible&&preview&&selected&&preview.revision===revision);
 function apply(){
  if(!valid||!selected||!action){setNotice('여행 조건이나 일정이 바뀌었어요. 명령을 다시 확인해 주세요.');setPreview(null);return;}
  if(action==='open'){input.current?.focus({preventScroll:true});setPreview(null);onSelectPlace(selected);return;}
  if(action!=='add'&&action!=='remove')return;
  if(action==='add'&&(!current||!places.some(place=>place.id===selected.id))){setNotice('현재 검색 결과의 장소만 담을 수 있어요. 필요한 편의로 여행지를 먼저 찾아주세요.');return;}
  const receipt=trip.applyVoiceEdit(action,selected,trip.activeDay);
  if(!receipt.ok){setNotice(receipt.reason);return;}
  setUndo({receipt,contextKey});setPreview(null);setNotice(`${selected.name}${action==='add'?'을 선택한 날짜의 마지막에 담았어요.':'을 일정에서 뺐어요.'} 다른 장소와 고정 약속은 유지했습니다.`);
 }
 function undoEdit(){
  if(!undo)return;
  if(contextKey!==undo.contextKey||!trip.undoVoiceEdit(undo.receipt))setNotice('그 뒤 일정이나 여행 조건이 바뀌었어요. 새 선택을 보존하려고 자동으로 되돌리지 않았습니다.');
  else setNotice('방금 한 곳을 바꾼 작업을 되돌렸어요. 날짜·순서·체류·휴식도 원래대로입니다.');
  setUndo(null);
 }
 return <details className="place-evidence" onToggle={event=>{if(!event.currentTarget.open){if(voice.listening)voice.cancel();setPreview(null);}}}><summary>말로 일정 다루기</summary><section aria-label="음성과 글로 일정 조작" style={{...courseCard,marginTop:12}}>
  <h3 style={{fontSize:26,margin:0}}>말을 확인하고, 한 곳씩</h3><p style={courseCopy}>장소를 담거나 빼고, 다음에 갈 곳의 정보를 열 수 있어요. 들은 말을 먼저 보여드리며 확인 버튼을 누른 뒤에만 실행합니다.</p>
  <label style={courseLabel}>조작할 여행 날짜<select style={courseInput} value={trip.activeDay} onChange={event=>trip.setActiveDay(event.target.value)}>{trip.tripDays.map(day=><option key={day}>{day}</option>)}</select></label>
  <p style={courseCopy} id="travel-voice-processing">음성 입력은 브라우저 제공처에서 음성을 처리할 수 있으며 인터넷 연결이 필요할 수 있어요. WAVE는 음성과 들은 말을 저장하지 않습니다. 글로도 같은 기능을 사용할 수 있습니다.</p>
  <div className="travel-book-actions" style={courseActions}>{!voice.listening?<button type="button" aria-describedby="travel-voice-processing" disabled={!trip.storageReady} onClick={()=>{setPreview(null);recognitionRevision.current=revision;voice.start(value=>{setText(value);check(value);});}}>마이크로 말하기</button>:<><button type="button" onClick={voice.stop}>듣기 마치기</button><button type="button" onClick={voice.cancel}>듣기 취소</button></>}</div><p role="status" style={courseCopy}>{voice.notice}</p>
  <form onSubmit={event=>{event.preventDefault();check(text);}}><label style={courseLabel}>말하거나 입력할 명령<input ref={input} style={courseInput} maxLength={200} value={text} disabled={voice.listening} onChange={event=>{setText(event.target.value);setPreview(null);}} placeholder="장소 이름 + 담아줘 / 빼줘 / 정보 보여줘"/></label><div className="travel-book-actions" style={courseActions}><button type="submit" disabled={!text.trim()||voice.listening||!trip.storageReady}>명령 확인</button><button type="button" disabled={voice.listening} onClick={()=>{setText('다음 장소 보여줘');check('다음 장소 보여줘');}}>다음 미방문 장소 확인</button></div></form>
  <details className="place-evidence"><summary>말할 수 있는 장소와 사용 방법</summary><p style={courseCopy}>현재 검색 결과 또는 일정에 담은 장소의 이름을 그대로 사용하세요. 같은 이름이 여러 곳이면 지역을 보고 하나를 선택합니다. ‘다음 장소’는 선택한 날짜에서 방문 완료·건너뜀 표시를 하지 않은 첫 장소입니다.</p><div style={courseGrid}>{known.map(place=><p key={place.id} style={courseCopy}>{place.name} · {place.city}</p>)}</div><p style={courseCopy}>추가는 선택한 날짜의 마지막에 한 곳을 담습니다. 고정한 장소와 그 앞의 일정 제거는 직접 일정 편집에서 확인해 주세요. 저장한 일정과 계정에 반영하려면 기존 저장 버튼을 사용합니다.</p></details>
  {preview&&<section aria-label="음성 명령 미리보기" style={courseCard}><h4 ref={heading} tabIndex={-1} style={{fontSize:22,margin:0,scrollMarginTop:150}}>이 작업을 할까요?</h4>{preview.command.choices.length>1&&<label style={courseLabel}>같은 이름의 장소 선택<select style={courseInput} value={preview.choiceId} onChange={event=>setPreview({...preview,choiceId:event.target.value})}><option value="">지역을 확인하고 선택</option>{preview.command.choices.map(place=><option key={place.id} value={place.id}>{place.name} · {place.city} · {known.find(item=>item.id===place.id)?.address||'주소 미확인'}</option>)}</select></label>}
   {selected&&<><p style={{...courseCopy,color:'var(--ink)'}}><b>{selected.name}</b> · {selected.city}<br/>{action==='open'?'이 장소의 이용 정보 열기':action==='add'?`${trip.activeDay}의 마지막에 한 곳 담기`:'이 장소 한 곳만 일정에서 빼기'}</p>{action==='add'&&<p style={courseCopy}>{selected.accessibility?.some(field=>field.state==='negative')?'맞지 않는 편의 항목이 있어요. 장소 정보를 먼저 확인하세요.':selected.accessibility?.some(field=>field.state==='unknown')||!selected.accessibility?.length?'미확인 편의가 있어요. 장소 정보를 확인한 뒤 방문해 주세요.':'제공된 편의 정보를 장소 상세에서 확인할 수 있어요.'}</p>}</>}
   {!valid&&<p role="status" style={courseCopy}>{preview.revision!==revision?'여행 조건이나 일정이 바뀌었어요. 다시 명령을 확인해 주세요.':'실제 장소를 하나 선택해 주세요.'}</p>}
   <div className="travel-book-actions" style={courseActions}><button type="button" style={coursePrimary} disabled={!valid||voice.listening} onClick={apply}>확인하고 실행</button><button type="button" onClick={()=>{setPreview(null);setNotice('취소했어요. 일정은 바꾸지 않았습니다.');input.current?.focus();}}>이 작업 취소</button></div>
  </section>}
  {undo&&<div className="travel-book-actions" style={courseActions}><button type="button" onClick={undoEdit}>방금 음성·문자 작업 되돌리기</button></div>}<p role="status" style={courseCopy}>{notice}</p>
 </section></details>;
}
