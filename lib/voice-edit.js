export const voiceStateKey = state => JSON.stringify(state);
const idOk=id=>typeof id==='string'&&/^[1-9]\d{0,11}$/.test(id);
/** Predict one confirmed change; the caller must recheck before applying or undoing. */
export function planVoiceEdit(state, action, place, day){
 if(!['add','remove'].includes(action)||!idOk(place?.id)||!state.days.includes(day))return{ok:false,reason:'날짜와 실제 장소를 다시 확인해 주세요.'};
 const id=place.id,exists=state.saved.includes(id),placeDay=state.assignments[id]||state.days[0];
 if(state.saved.length!==state.order.length||state.saved.some(key=>!state.order.includes(key)))return{ok:false,reason:'저장한 장소 정보를 아직 다 불러오지 못했어요. 여행지를 확인한 뒤 다시 시도해 주세요.'};
 if(action==='add'&&(exists||state.saved.length>=12))return{ok:false,reason:exists?'이미 일정에 담은 장소예요.':'일정에는 최대12곳을 담을 수 있어요.'};
 if(action==='remove'&&!exists)return{ok:false,reason:'현재 일정에 없는 장소예요.'};
 if(action==='add'&&state.fixed[id])return{ok:false,reason:'이 장소에 고정 약속이 남아 있어요. 일정 편집에서 먼저 확인해 주세요.'};
 if(action==='add'&&state.assignments[id]&&!state.days.includes(state.assignments[id]))return{ok:false,reason:'이 장소의 이전 날짜가 현재 여행 기간 밖에 있어요. 일정 편집에서 방문 날짜를 먼저 확인해 주세요.'};
 if(action==='remove'){
  if(!state.days.includes(placeDay))return{ok:false,reason:'여행 기간 밖에 있는 장소예요. 방문 날짜를 먼저 확인해 주세요.'};
  if(placeDay!==day)return{ok:false,reason:`${placeDay}에 담은 장소예요. 위에서 그 날짜를 고른 뒤 다시 확인해 주세요.`};
  const sameDay=state.order.filter(key=>(state.assignments[key]||state.days[0])===placeDay),index=sameDay.indexOf(id);
  if(state.fixed[id]||sameDay.slice(index+1).some(key=>state.fixed[key]))return{ok:false,reason:'고정한 장소와 그 앞의 일정은 음성으로 빼지 않아요. 일정 편집에서 고정 약속을 먼저 확인해 주세요.'};
 }
 const next={...state,saved:action==='add'?[...state.saved,id]:state.saved.filter(key=>key!==id),mode:'manual',order:state.order.filter(key=>key!==id),assignments:{...state.assignments},visits:{...state.visits},breaks:{...state.breaks},purposes:{...state.purposes}};
 if(action==='add'){
  // Insert at that day's end without moving other days or pins.
  let index=-1;next.order.forEach((key,i)=>{if((state.assignments[key]||state.days[0])===day)index=i;});
  next.order.splice(index<0?next.order.length:index+1,0,id);next.assignments[id]=day;
 }else{delete next.assignments[id];delete next.visits[id];delete next.breaks[id];delete next.purposes[id];}
 next.manualOrder=[...next.order];
 return{ok:true,action,place,day:action==='add'?day:placeDay,before:state,after:next,beforeKey:voiceStateKey(state),afterKey:voiceStateKey(next)};
}
export function canUndoVoiceEdit(state, receipt){return Boolean(receipt?.ok&&voiceStateKey(state)===receipt.afterKey);}
