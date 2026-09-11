import assert from 'node:assert/strict';
import test from 'node:test';
import { onTripIdentity, cleanOnTrip, readOnTrip, saveOnTrip, remainingOnTrip, ON_TRIP_KEY } from '../lib/on-trip.js';
import { offlineTripHtml, offlineTripText } from '../lib/trip-offline.js';
const day='2026-09-15',origin={lat:35.22,lng:128.68};
const places=['1001','1002','1003'].map((id,index)=>({id,name:`장소${index+1}`,mapX:String(128.68+index*.01),mapY:'35.23',contentTypeId:'12',address:'창원시 공개 장소',source:'한국관광공사',accessibility:[{key:'restroom',label:'화장실',state:'unknown',detail:'시설 확인 필요'}]}));
const base={places,day,origin,routeMinutesByPlaceId:{'1001':17,'1002':19,'1003':23},visitMinutesByPlaceId:{'1002':45},breakMinutesByPlaceId:{'1002':15}};

test('progress is scoped by day and selected public places, bounded and separate from the saved itinerary',()=>{
  const map=new Map([['wave-current-trip-v1','unchanged']]),storage={getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};
  const identity=onTripIdentity(places,day),ids=places.map(place=>place.id);
  assert.equal(identity,onTripIdentity([...places].reverse(),day));
  const state=cleanOnTrip({marks:{'1001':{state:'done',at:'2026-09-15T02:00:00Z'},'other':{state:'done'},'1002':{state:'invalid'}},cursorId:'other',clock:'29:99'},ids);
  assert.deepEqual(Object.keys(state.marks),['1001']);assert.equal(state.cursorId,'');assert.equal(state.clock,'10:00');
  for(let i=0;i<25;i++)saveOnTrip(storage,identity+'-'+i,state,ids);
  saveOnTrip(storage,identity,state,ids);assert.equal(JSON.parse(map.get(ON_TRIP_KEY)).length,20);
  assert.equal(readOnTrip(storage,identity,ids).marks['1001'].state,'done');assert.deepEqual(readOnTrip(storage,onTripIdentity(places,'2026-09-16'),ids).marks,{});
  assert.equal(map.get('wave-current-trip-v1'),'unchanged');
});

test('remaining schedule drops completed/skipped places without changing their plan and invalidates changed route endpoints',()=>{
  const initial=cleanOnTrip(null,places.map(place=>place.id));initial.clock='12:00';
  const a=remainingOnTrip({...base,progress:initial});assert.equal(a.entries[0].travelSource,'route');assert.equal(a.entries[1].visitMinutes,45);assert.equal(a.entries[1].breakMinutes,15);
  const progress={...initial,marks:{'1001':{state:'done',at:''}},cursorId:'1001'};
  const b=remainingOnTrip({...base,progress});assert.deepEqual(b.entries.map(entry=>entry.place.id),['1002','1003']);assert.equal(b.entries[0].travelMinutes,19);assert.equal(b.done,1);
  const skipped={...progress,marks:{...progress.marks,'1002':{state:'skipped',at:''}}};
  const c=remainingOnTrip({...base,progress:skipped});assert.equal(c.next.id,'1003');assert.equal(c.entries[0].travelSource,'estimate');assert.equal(c.skipped,1);assert.equal(places.length,3);
  const missing=remainingOnTrip({...base,places:places.map(place=>place.id==='1001'?{...place,mapX:'',mapY:''}:place),progress:skipped});assert.equal(missing.entries[0].travelSource,'fallback');
});

test('later restart time preserves fixed waiting, explicit rest and deadline inputs in the original plan',()=>{
  const progress={...cleanOnTrip(null,places.map(place=>place.id)),clock:'16:00'};
  const plan=remainingOnTrip({...base,progress,fixedVisits:{'1001':{time:'13:00',position:0,kind:'event'}}});
  assert.ok(plan.entries[0].lateMinutes>180);assert.equal(plan.entries[1].breakMinutes,15);assert.equal(base.visitMinutesByPlaceId['1002'],45);
  const complete={...progress,marks:Object.fromEntries(places.map(place=>[place.id,{state:'done',at:''}]))};assert.equal(remainingOnTrip({...base,progress:complete}).entries.length,0);
});

test('offline pack remains readable without network, escapes markup and never turns missing information into free or accessible',()=>{
  const progress=cleanOnTrip(null,places.map(place=>place.id)),entries=remainingOnTrip({...base,progress}).entries;
  const snapshot={title:'창원 <script>alert(1)</script>',schedule:[{day,entries}],savedAt:'2026-09-15T01:00:00Z',info:{'1001':{id:'1001',phone:'055-123-4567',hours:'09:00~18:00',fees:'무료',source:'ⓒ한국관광공사',checkedAt:'2026-09-15T00:00:00Z'}}};
  const text=offlineTripText(snapshot),html=offlineTripHtml(snapshot);
  assert.match(text,/055-123-4567/);assert.match(text,/문의처: 미확인/);assert.match(text,/이용요금: 미확인/);assert.match(text,/화장실: 미확인/);assert.match(text,/직선거리|조회한 경로/);
  assert.doesNotMatch(html,/<script|<img|<iframe|src=|href=/);assert.match(html,/&lt;script&gt;/);assert.match(html,/default-src 'none'/);assert.match(html,/<h2>2026-09-15<\/h2>/);assert.doesNotMatch(html,/mapX|128\.68|lat|lng|profile|cursorId/);
  assert.doesNotMatch(offlineTripText({...snapshot,info:{'1001':{...snapshot.info['1001'],id:'9999'}}}),/055-123-4567/);
});
