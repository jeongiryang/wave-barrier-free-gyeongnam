export const TRIP_BUDGET_KEY = 'wave-trip-budget-v1';
export const COST_CATEGORIES = ['admission', 'food', 'stay', 'other'];
export function budgetIdentity(places, days) { return `${days.join(',')}|${places.map(place=>place.id).sort().join(',')}`; }
export function knownWon(value) {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !/^\d+$/.test(value))) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= 100000000 ? amount : null;
}
export function cleanBudget(value, ids, days) {
  const allowed = new Set(ids), rows = {}, extras = [];
  for (const [id, raw] of Object.entries(value?.admissions || {})) {
    if (!allowed.has(id) || knownWon(raw?.amount) === null) continue;
    rows[id] = { amount:knownWon(raw.amount), basis:raw.basis === 'group' ? 'group' : 'person' };
  }
  for (const item of Array.isArray(value?.extras) ? value.extras.slice(0,30) : []) {
    if (!COST_CATEGORIES.includes(item?.category) || !days.includes(item?.day) || typeof item?.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id) || extras.some(row=>row.id===item.id)) continue;
    extras.push({ id:item.id, day:item.day, category:item.category, amount:knownWon(item.amount), basis:item.basis==='person'?'person':'group', label:typeof item.label==='string'?item.label.trim().slice(0,80):'' });
  }
  const people=Number(value?.people);
  return { people:Number.isInteger(people)&&people>=1&&people<=30?people:1, target:knownWon(value?.target), targetBasis:value?.targetBasis==='person'?'person':'group', admissions:rows, extras };
}
export function readBudget(storage, identity, ids, days, strict = false) {
  try { return readSavedBudget(storage,identity,ids,days) || cleanBudget(null,ids,days); }
  catch (error) { if (strict) throw error; return cleanBudget(null,ids,days); }
}
export function readSavedBudget(storage,identity,ids,days){
  const entries=JSON.parse(storage.getItem(TRIP_BUDGET_KEY)||'[]');
  const found=Array.isArray(entries)?entries.find(item=>item?.identity===identity):null;
  return found?cleanBudget(found.value,ids,days):null;
}
export function writeBudget(storage, identity, value, ids, days) {
  const stored=storage.getItem(TRIP_BUDGET_KEY);
  let entries=[];
  try {const old=JSON.parse(stored||'[]');if(Array.isArray(old))entries=old.filter(item=>typeof item?.identity==='string'&&item.identity!==identity).slice(0,19);}catch{/* Recover malformed budget JSON only; access failures must not overwrite unread records. */}
  const clean=cleanBudget(value,ids,days);
  storage.setItem(TRIP_BUDGET_KEY,JSON.stringify([{identity,value:clean},...entries]));return clean;
}
/** Fees are deliberately not parsed from prose: adult/child/group prices need an explicit choice. */
export function summarizeBudget({places,days,assignments={},budget,routes={}}) {
  const clean=cleanBudget(budget,places.map(place=>place.id),days),rows=[];
  for(const place of places){
    const day=assignments[place.id]||days[0];if(!days.includes(day))continue;
    const admission=clean.admissions[place.id];
    rows.push({id:'entry-'+place.id,placeId:place.id,day,label:place.name+' 입장·이용',category:'admission',amount:admission?.amount??null,basis:admission?.basis||'person',source:admission?'직접 입력':'요금 미확인'});
    const route=routes[place.id],amount=route?.configured?knownWon(route.payment):null;
    const supported=route?.paymentType==='toll'||route?.paymentType==='fare';
    rows.push({id:'route-'+place.id,placeId:place.id,day,label:place.name+'까지 이동',category:'transport',amount:supported?amount:null,basis:route?.paymentType==='toll'?'group':'person',source:!supported||amount===null?'이동비 미확인':route.paymentType==='toll'?'조회 경로 통행료 · 차량 1대, 연료·주차 별도':'조회 경로 1인 요금'});
  }
  rows.push(...clean.extras.map(item=>({...item,source:'직접 입력',placeId:''})));
  const totalOf=row=>row.amount===null?null:row.amount*(row.basis==='person'?clean.people:1);
  const total=rows.reduce((sum,row)=>sum+(totalOf(row)??0),0),unknown=rows.filter(row=>row.amount===null).length;
  const target=clean.target===null?null:clean.target*(clean.targetBasis==='person'?clean.people:1);
  return {rows:rows.map(row=>({...row,total:totalOf(row)})),total,unknown,target,perPerson:Math.ceil(total/clean.people),remaining:target===null?null:target-total,people:clean.people,outOfPeriod:places.filter(place=>!days.includes(assignments[place.id]||days[0])).length,
    days:days.map(day=>({day,total:rows.filter(row=>row.day===day).reduce((sum,row)=>sum+(totalOf(row)??0),0),unknown:rows.filter(row=>row.day===day&&row.amount===null).length}))};
}
export function budgetSummaryLines(summary){
  const won=value=>Number(value).toLocaleString('ko-KR')+'원',names={food:'식사',stay:'숙박',other:'기타',admission:'입장·이용'};
  return ['여행비 계획',`인원 ${summary.people}명 · 확인한 금액 ${won(summary.total)} · 미확인 ${summary.unknown}항목`,summary.target===null?'전체 예산 미정':`전체 예산 ${won(summary.target)}`,
    ...summary.days.map(day=>`${day.day} 합계 ${won(day.total)} · 미확인 ${day.unknown}항목`),
    ...summary.rows.map(row=>`${row.day} · ${row.label||names[row.category]||row.category}: ${row.amount===null?'미확인':won(row.amount)} (${row.basis==='person'?'1인':'전체'}) · ${row.source}`),
    '미확인 및 입력하지 않은 비용은 합계에서 제외했습니다. 자동차는 차량1대 조회 통행료이며 연료·주차는 별도입니다.'];
}
