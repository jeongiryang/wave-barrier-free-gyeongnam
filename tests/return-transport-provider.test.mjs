import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as coordinates from '../lib/map-coordinates.js';
import * as budgets from '../lib/request-budget.js';
import * as transport from '../lib/transport/return-transport.js';

const code=ts.transpileModule(readFileSync(new URL('../server/transport/return-transport.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const common={contentid:'1001',title:'공식 장소',lDongRegnCd:'48',mapx:'128.691',mapy:'35.238'};
const stop={nodeid:'S1',citycode:'38010',nodenm:'장소 앞',gpslong:'128.692',gpslati:'35.238'};
const arrivals=[{routeid:'R1',routeno:'100',nodeid:'S1',arrtime:0,arrprevstationcnt:0},{routeid:'R1',routeno:'100',nodeid:'S1',arrtime:600,arrprevstationcnt:4}];
const ordered=[{routeid:'R1',nodeid:'S1',nodenm:'장소 앞',nodeord:1,updowncd:0,gpslong:'128.692',gpslati:'35.238'},{routeid:'R1',nodeid:'S2',nodenm:'다음 정류장',nodeord:2,updowncd:0,gpslong:'128.693',gpslati:'35.239'}];
function harness({key=true,commonItems=[common],stopItems=[stop],arrivalItems=arrivals,routeItems=ordered,errorAt,partialAt,timeoutAt,totalAt}={}){
 const mod={exports:{}},calls=[];let clock=Date.now();
 class LocalDate extends Date {static now(){return clock;}}
 new Function('module','exports','require','Date',code)(mod,mod.exports,name=>{
  if(name.endsWith('map-coordinates.js'))return coordinates;
  if(name.endsWith('return-transport.js'))return transport;
  if(name.endsWith('request-budget.js'))return timeoutAt?{...budgets,SERVER_BUDGET_MS:{...budgets.SERVER_BUDGET_MS,returnTransport:10}}:budgets;
  if(name.endsWith('/http'))return{json:(body,status=200,cache=false)=>({body,status,cache}),clean:value=>String(value??'')};
  if(name.endsWith('/provider-data')){
   const fetch=async(service,operation,params)=>{calls.push({service,operation,params});if(operation===timeoutAt)return new Promise(()=>{});let items=operation==='detailCommon2'?commonItems:operation==='getCrdntPrxmtSttnList'?stopItems:operation==='getSttnAcctoArvlPrearngeInfoList'?arrivalItems:operation==='getRouteAcctoThrghSttnList'?routeItems:[{routeid:'R1',startnodenm:'기점',endnodenm:'종점',startvehicletime:'0530',endvehicletime:'2300'}];return{items,total:totalAt===operation?items.length+1:items.length,partial:partialAt===operation,failed:errorAt===operation};};
   return{publicTransportKey:()=>key?'synthetic-test-key':'',commonParams:()=>({numOfRows:'1'}),fetchTourismData:(_env,service,op,params)=>fetch(service,op,params),fetchPublicTransportData:(_env,_provider,service,op,params)=>fetch(service,op,params),attemptProvider:async promise=>{const value=await promise;return value.failed?{ok:false,error:'synthetic provider failure'}:{ok:true,value};}};
  }
  throw Error(name);
 },LocalDate);
 return{calls,advance:ms=>{clock+=ms;},run:async(query='contentId=1001')=>mod.exports.handleReturnTransport(new URL('https://wave.test/api/wave?action=return-transport&'+query+'&gpsLati=37.5&gpsLong=127.5&userId=private'),{})};
}
const selection='contentId=1001&cityCode=38010&nodeId=S1';

test('return transport accepts exact public Gyeongnam records and binds selected stops and routes',async()=>{
 const h=harness(),stops=await h.run();assert.equal(stops.body.status,'stops');assert.equal(stops.cache,false);assert.equal(h.calls.length,2);assert.deepEqual(h.calls[1].params,{gpsLati:'35.238',gpsLong:'128.691',numOfRows:'8'});
 const buses=await h.run(selection);assert.equal(buses.body.routes[0].vehicles[0].seconds,0);assert.equal(h.calls.length,3);
 const route=await h.run(selection+'&routeId=R1');assert.equal(h.calls.length,5);assert.equal(route.body.direction.next.nodeId,'S2');assert.equal(route.body.times.last,'23:00');assert.equal(route.body.times.origin,'기점');assert.equal(route.body.arrivalCheckedAt,buses.body.arrivalCheckedAt);
 assert.doesNotMatch(JSON.stringify(h.calls),/37\.5|127\.5|private|serviceKey|odsay/);
 assert.equal((await h.run(selection+'&routeId=R9')).body.status,'route-unavailable');assert.equal(h.calls.length,5);
});
test('invalid requests, missing key, unrelated stop and unconfirmed location do not fan out',async()=>{
 for(const query of ['contentId=','contentId=0','contentId=1001%26x=y','contentId=1001&nodeId=S1','contentId=1001&routeId=R1','contentId=1001&cityCode=38&nodeId=S%2F1']){const h=harness();assert.equal((await h.run(query)).status,400);assert.equal(h.calls.length,0);}
 const missing=harness({key:false});assert.equal((await missing.run()).body.status,'unavailable');assert.equal(missing.calls.length,0);
 for(const place of [{...common,contentid:'9999'},{...common,lDongRegnCd:'11'},{...common,lDongRegnCd:undefined},{...common,mapx:'139.7'}]){const h=harness({commonItems:[place]});assert.equal((await h.run()).body.status,'location-unconfirmed');assert.equal(h.calls.length,1);}
 const h=harness();assert.equal((await h.run('contentId=1001&cityCode=38010&nodeId=S9')).body.status,'invalid-stop');assert.equal(h.calls.length,2);
});
test('provider empty, partial and failed data never turn into a bus or a confirmed direction',async()=>{
 assert.equal((await harness({stopItems:[]}).run()).body.status,'empty');
 assert.equal((await harness({arrivalItems:[]}).run(selection)).body.status,'no-arrivals');
 for(const option of ['errorAt','partialAt']){
  assert.equal((await harness({[option]:'detailCommon2'}).run()).status,502);
  assert.equal((await harness({[option]:'getCrdntPrxmtSttnList'}).run()).status,502);
  const failed=await harness({[option]:'getSttnAcctoArvlPrearngeInfoList'}).run(selection);assert.equal(failed.body.status,'arrivals-unavailable');assert.deepEqual(failed.body.routes,[]);
  const direction=await harness({[option]:'getRouteAcctoThrghSttnList'}).run(selection+'&routeId=R1');assert.equal(direction.body.direction.status,'unconfirmed');assert.deepEqual(direction.body.direction.stops,[]);
 }
 const incomplete=await harness({totalAt:'getRouteAcctoThrghSttnList'}).run(selection+'&routeId=R1');assert.equal(incomplete.body.direction.status,'unconfirmed');
 const noTime=await harness({errorAt:'getRouteInfoIem'}).run(selection+'&routeId=R1');assert.equal(noTime.body.times.last,'');assert.equal(noTime.body.timesCheckedAt,null);
});
test('public snapshots deduplicate and expire arrivals independently without caching failures',async()=>{
 const h=harness();await Promise.all([h.run(selection),h.run(selection)]);assert.equal(h.calls.length,3);
 await h.run(selection);assert.equal(h.calls.length,3);h.advance(11000);await h.run(selection);assert.equal(h.calls.length,4);assert.equal(h.calls.filter(call=>call.operation==='getSttnAcctoArvlPrearngeInfoList').length,2);
 const failed=harness({errorAt:'getSttnAcctoArvlPrearngeInfoList'});await failed.run(selection);await failed.run(selection);assert.equal(failed.calls.length,4);
});
test('each requested phase has a total deadline and cannot start later phases after expiry',async()=>{
 for(const timeoutAt of ['detailCommon2','getCrdntPrxmtSttnList','getSttnAcctoArvlPrearngeInfoList']){const h=harness({timeoutAt});const response=await h.run(selection+'&routeId=R1');assert.notEqual(response.body.status,'route');assert.equal(h.calls.at(-1).operation,timeoutAt);}
});
