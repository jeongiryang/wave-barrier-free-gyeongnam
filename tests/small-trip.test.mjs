import test from 'node:test';
import assert from 'node:assert/strict';
import {courseCandidates,outingCandidates,previewOuting,outingFingerprint} from '../lib/small-trip.js';
import {createTravelBookSnapshot,upsertTravelBook,travelBookRestorePayload} from '../lib/travel-book.js';
const origin={lat:35.23,lng:128.68};
const place=(id,x=128.68,state='confirmed',type='12')=>({id,name:'공개 관광지 '+id,city:'창원',contentTypeId:type,mapX:String(x),mapY:'35.23',accessibility:[{key:'route',state}],source:'한국관광공사'});
const a=place('1001'),b=place('1002',128.69),c=place('1003',128.7,'unknown'),d=place('1004',128.7,'negative'),food=place('1005',128.69,'confirmed','39');
test('course candidates bind public anchor, distance, purpose and every requested need',()=>{
 const query={places:[a,b,c,d,food,{...b,id:'kakao:100'},place('1006',129.5),b],anchor:a,savedIds:[a.id],requiredKeys:['route'],purpose:'visit',radiusKm:5};
 assert.deepEqual(courseCandidates(query).map(row=>row.place.id),['1002']);
 assert.deepEqual(courseCandidates({...query,includeUnknown:true}).map(row=>row.place.id),['1002','1003']);
 assert.deepEqual(courseCandidates({...query,purpose:'food'}).map(row=>row.place.id),['1005']);
 assert.equal(courseCandidates({...query,requiredKeys:[]}).length,0);assert.equal(courseCandidates({...query,anchor:{...a,id:'fake'}}).length,0);
 assert.equal(courseCandidates({...query,savedIds:['1002']}).length,0);assert.equal(courseCandidates({...query,requiredKeys:['route','elevator']}).length,0);
});
test('short outings compare at most twelve genuine same-needs places and reject malformed choices',()=>{
 assert.deepEqual(outingCandidates({places:[a,b,c,d,a],requiredKeys:['route'],origin}).map(row=>row.place.id),['1001','1002']);
 assert.equal(outingCandidates({places:[a,c,d],requiredKeys:['route'],includeUnknown:true,origin}).length,2);
 assert.equal(outingCandidates({places:[a],requiredKeys:[],origin}).length,0);
 assert.equal(outingCandidates({places:[a],requiredKeys:['route'],origin:{lat:0,lng:0}}).length,0);
});
const request={places:[a,b],date:'2026-10-08',startTime:'10:00',hours:3,stayMinutes:45,origin};
test('outing preview includes outbound, every stay, return and finite same-day limit',()=>{
 const preview=previewOuting(request);assert.ok(preview.fits);assert.equal(preview.totalMinutes,preview.entries.at(-1).endsAt+preview.returnMinutes-600);assert.equal(preview.visitMinutesByPlaceId['1002'],45);assert.equal(preview.deadlineLabel,'13:00');
 assert.equal(previewOuting({...request,hours:1}).fits,false);assert.equal(previewOuting({...request,places:[a],hours:1}).fits,true);
 for(const bad of [{date:'2026-02-30'},{startTime:'23:00'},{hours:0},{hours:'3'},{stayMinutes:0},{places:[a,a]},{places:[a,b,c]},{places:[{...a,id:'test'}]},{origin:{lat:0,lng:0}}])assert.equal(previewOuting({...request,...bad}),null);
 assert.equal(a.visitMinutes,undefined);
});
test('outing archive namespace and note retain public origin while ordinary archive and original dates survive',()=>{
 const preview=previewOuting(request),base={region:'창원',travelStart:request.date,travelEnd:request.date,dayStartTime:request.startTime,places:[a,b],scheduleAssignments:{'1001':request.date,'1002':request.date},visitMinutesByPlaceId:preview.visitMinutesByPlaceId};
 const old=createTravelBookSnapshot({...base,note:'기존 여행 메모'}),outing=createTravelBookSnapshot({...base,fingerprint:outingFingerprint([request.date,request.startTime,3,a.id,b.id]),note:'창원중앙역 출발·복귀 추정 11:45, 경로 확인 필요',dayDeadlines:{[request.date]:{time:'13:00',returnMinutes:preview.returnMinutes,bufferMinutes:0}}});
 const books=upsertTravelBook([old],outing);assert.equal(books.length,2);assert.equal(books.find(book=>book.id===old.id).note,'기존 여행 메모');assert.match(books[0].note,/창원중앙역/);assert.deepEqual(travelBookRestorePayload(outing).schedule.visitMinutesByPlaceId,preview.visitMinutesByPlaceId);assert.equal(travelBookRestorePayload(outing).schedule.dayDeadlines[request.date].time,'13:00');
});
