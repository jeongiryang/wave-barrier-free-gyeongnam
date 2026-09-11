import test from 'node:test';
import assert from 'node:assert/strict';
import {offlineTripHtml,offlineTripText} from '../lib/trip-offline.js';
import {buildSplitReunion,defaultSplitChoice,splitSignature,splitIdentity,readSplitRecords,writeSplitRecord,deleteSplitRecord,SPLIT_REUNION_KEY,savedSplitReunionLines} from '../lib/split-reunion.js';
const day='2026-10-08',places=[1,2,3,4].map(i=>({id:String(1000+i),name:'장소'+i,contentTypeId:'12',mapX:String(128.68+i/1000),mapY:'35.24'}));
const input={places,days:[day],assignments:{},startTime:'09:00',visitMinutesByPlaceId:Object.fromEntries(places.map(p=>[p.id,15])),breakMinutesByPlaceId:{},fixedVisits:{},dayDeadlines:{},routeMinutesByPlaceId:{1002:50,1003:60,1004:40}};
const choice={...defaultSplitChoice(input,day),departureTime:'10:00',reunionTime:'12:00'};
test('offline inclusion preserves exact saved choices and refuses missing or stale originals',()=>{
 let raw=null;const storage={getItem:()=>raw,setItem:(_,value)=>{raw=value;}};
 assert.throws(()=>savedSplitReunionLines(storage,input),/저장한 합류 약속이 없어요/);
 writeSplitRecord(storage,{identity:splitIdentity(input,day),signature:splitSignature(input,day),choice,savedAt:'2026-10-01T00:00:00Z'},null);
 const lines=savedSplitReunionLines(storage,input);assert(lines.some(line=>line==='A 일정'));assert(lines.some(line=>line==='B 일정'));
 assert.throws(()=>savedSplitReunionLines(storage,{...input,visitMinutesByPlaceId:{...input.visitMinutesByPlaceId,1002:45}}),/순서나 시간이 바뀌었어요/);
 assert.throws(()=>savedSplitReunionLines(storage,{...input,places:places.slice(0,3)}),/장소가 현재 일정과 달라요/);
 const original=raw;assert.throws(()=>savedSplitReunionLines({getItem:()=>'{bad'},input));assert.equal(raw,original);
 const pack={title:'합류',schedule:[],splitLines:['<script>alert(1)</script>',...lines]};assert(offlineTripText(pack).includes('A 일정'));assert(offlineTripHtml(pack).includes('&lt;script&gt;'));assert(!offlineTripHtml(pack).includes('<script>'));assert(offlineTripText({...pack,splitLines:Array(1000).fill('x'.repeat(3000))}).length<565000);
});
test('each group keeps its selected visits and only exact original endpoint pairs reuse real routes',()=>{
 const result=buildSplitReunion(input,choice);assert(result.ok&&result.canSave);assert.deepEqual(result.branches[0].entries.map(e=>e.place.id),['1002','1004']);assert.deepEqual(result.branches[1].entries.map(e=>e.place.id),['1003','1004']);assert.deepEqual(result.branches.map(b=>b.entries.map(e=>e.travelSource)),[['route','estimate'],['estimate','route']]);assert.equal(result.branches[0].entries[0].travelMinutes,50);
 const wait=buildSplitReunion(input,{...choice,assignments:{1002:'A',1003:'A'},waitB:60});assert(wait.ok);assert.equal(wait.branches[1].entries.length,1);assert.equal(wait.branches[1].entries[0].travelSource,'estimate');
 const missing=buildSplitReunion({...input,places:places.map(p=>({...p,mapX:''})),routeMinutesByPlaceId:{}},choice);assert(missing.ok&&missing.branches.every(b=>b.unknown===2));
});
test('invalid clocks/groups, fixed visits, late reunion, later appointments and midnight are explicit',()=>{
 for(const invalid of [{departureTime:'24:00'},{reunionTime:'09:00'},{waitA:false},{assignments:{1002:'A'}},{reunionId:'1002'}])assert.equal(buildSplitReunion(input,{...choice,...invalid}).ok,false);
 assert.equal(buildSplitReunion({...input,fixedVisits:{1002:{kind:'visit',time:'',position:1}}},choice).ok,false);
 assert.equal(buildSplitReunion({...input,fixedVisits:{1001:{kind:'event',time:'10:00',position:0}}},choice).ok,false);
 assert.equal(buildSplitReunion({...input,fixedVisits:{1004:{kind:'event',time:'13:00',position:3}}},choice).ok,false);
 const late=buildSplitReunion(input,{...choice,reunionTime:'10:30'});assert(late.ok&&!late.canSave&&late.branches[0].lateMinutes>0);
 const tail=buildSplitReunion({...input,fixedVisits:{1004:{kind:'visit',time:'11:00',position:3}}},{...choice,reunionId:'1003',assignments:{1002:'A'}});assert(tail.ok&&!tail.canSave&&tail.warnings.some(text=>text.includes('고정 시각')));
 const midnight=buildSplitReunion({...input,visitMinutesByPlaceId:{...input.visitMinutesByPlaceId,1004:720}},{...choice,reunionTime:'20:00'});assert(midnight.ok&&!midnight.canSave);
});
test('separation follows the entire common prefix and unknown return still exposes certain deadline overruns',()=>{
 assert.equal(buildSplitReunion({...input,startTime:'16:00'},choice).ok,false);
 assert.equal(buildSplitReunion({...input,fixedVisits:{1001:{kind:'event',time:'15:00',position:0}}},{...choice,startId:'1002',assignments:{1003:'A'}}).ok,false);
 const unknown=buildSplitReunion({...input,dayDeadlines:{[day]:{time:'11:45',returnMinutes:null,bufferMinutes:15}}},choice);assert(unknown.ok&&!unknown.canSave&&unknown.notes.length===1&&unknown.warnings.length>0);
 const later=buildSplitReunion({...input,dayDeadlines:{[day]:{time:'20:00',returnMinutes:null,bufferMinutes:15}}},choice);assert(later.ok&&later.canSave&&later.notes.length===1);
});
test('a maximum-size twentieth record is rejected before touching a valid nineteen-record archive',()=>{
 const record={identity:'z'.repeat(200),signature:'s'.repeat(12000),choice:{...choice,assignments:Object.fromEntries(Array.from({length:10},(_,i)=>[String(100000000000+i),'A']))},savedAt:'2026-09-12T00:00:00Z'};
 let value=JSON.stringify(Array.from({length:19},(_,i)=>({...record,identity:String(i).padEnd(200,'x')}))),writes=0;const storage={getItem:()=>value,setItem:(_,next)=>{writes++;value=next;}};const before=value;assert.equal(readSplitRecords(storage).records.length,19);assert.throws(()=>writeSplitRecord(storage,record,before));assert.equal(value,before);assert.equal(writes,0);
});
test('order/duration/fixed changes invalidate saved drafts without mutating a common schedule',()=>{
 const before=JSON.stringify(input);buildSplitReunion(input,choice);assert.equal(JSON.stringify(input),before);
 const signature=splitSignature(input,day),reorder={...input,places:[places[0],places[2],places[1],places[3]]};assert.equal(splitIdentity(reorder,day),splitIdentity(input,day));assert.notEqual(splitSignature(reorder,day),signature);assert.notEqual(splitSignature({...input,visitMinutesByPlaceId:{}},day),signature);
});
test('saved split plans preserve other records and reject conflicts, malformed/full or blocked storage',()=>{
 let value=null;const storage={getItem:()=>value,setItem:(_,text)=>{value=text;}};const record={identity:splitIdentity(input,day),signature:splitSignature(input,day),choice,savedAt:'2026-09-12T00:00:00Z'};
 writeSplitRecord(storage,record,null);const before=value;assert.equal(readSplitRecords(storage).records.length,1);assert.throws(()=>writeSplitRecord(storage,record,null));assert.equal(value,before);
 assert.throws(()=>writeSplitRecord(storage,{...record,savedAt:'invalid'},before));assert.equal(value,before);
 value='{broken';assert.throws(()=>writeSplitRecord(storage,record,value));assert.equal(value,'{broken');
 value=JSON.stringify(Array.from({length:20},(_,i)=>({...record,identity:'old'+i})));const full=value;assert.throws(()=>writeSplitRecord(storage,record,full));assert.equal(value,full);deleteSplitRecord(storage,'old0',full);assert.equal(readSplitRecords(storage).records.length,19);
 assert.throws(()=>writeSplitRecord({getItem:()=>value,setItem:()=>{throw Error('quota');}},record,value));assert.equal(readSplitRecords(storage).records.length,19);assert.equal(SPLIT_REUNION_KEY,'wave-split-reunion-v1');
});
