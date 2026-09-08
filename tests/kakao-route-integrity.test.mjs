import { readFileSync } from "node:fs";
import test from "node:test";
import * as failures from "../lib/provider-failure.js";
import {createProviderRequester} from "../server/shared/provider-request.js";
import assert from "node:assert/strict";
import ts from "typescript";
import * as coordinates from "../lib/map-coordinates.js";

const source=readFileSync(new URL("../server/transport/kakao-route.ts",import.meta.url),"utf8");
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const valid=()=>({routes:[{result_code:0,summary:{duration:420,distance:2300,fare:{toll:0}},sections:[{roads:[{vertexes:[128.6819,35.2281,128.692,35.2384]}]}]}]});
async function run(body,{status=200,throwRequest=false,invalidJson=false}={}){
  const mod={exports:{}};
  new Function("module","exports","require","fetch",code)(mod,mod.exports,name=>{if(name.endsWith("provider-failure.js"))return failures;if(name.endsWith("provider-request.js"))return {requestProvider:createProviderRequester()};if(name.endsWith("map-coordinates.js"))return coordinates;if(name.endsWith("request-budget.js"))return {UPSTREAM_TIMEOUT_MS:{transport:6000}};throw Error(name);},async()=>{if(throwRequest)throw Error("controlled timeout");return {ok:status>=200&&status<300,status,json:async()=>{if(invalidJson)throw Error("controlled malformed JSON");return body;}};});
  return mod.exports.fetchKakaoRoute({KAKAO_REST_API_KEY:"fixture-not-a-real-key"},35.228,128.6818,35.2385,128.6921);
}
test("valid provider time, distance, toll and road vertices are preserved",async()=>{
  const result=await run(valid());assert.equal(result.provider.state,"connected");assert.equal(result.alternative.totalTime,7);assert.equal(result.alternative.totalDistance,2300);assert.equal(result.alternative.payment,0);
  assert.deepEqual(result.alternative.geometry,[{lng:128.6819,lat:35.2281},{lng:128.692,lat:35.2384}]);
});
for(const result_code of [1,101,102,103,104,105,106,107])test(`documented route failure ${result_code} cannot become a configured one-minute journey`,async()=>{
  const result=await run({routes:[{result_code}]});assert.equal(result.alternative,null);assert.equal(result.provider.state,"ready");
});
for(const [name,change] of [
  ["missing result code",r=>delete r.result_code], ["unknown result code",r=>r.result_code=999], ["string result code",r=>r.result_code="0"],
  ["missing summary",r=>delete r.summary], ["missing duration",r=>delete r.summary.duration], ["zero duration",r=>r.summary.duration=0], ["negative duration",r=>r.summary.duration=-20], ["blank duration",r=>r.summary.duration=""], ["invalid duration",r=>r.summary.duration="abc"],
  ["missing distance",r=>delete r.summary.distance], ["zero distance",r=>r.summary.distance=0], ["negative distance",r=>r.summary.distance=-1],
  ["missing sections",r=>delete r.sections], ["empty sections",r=>r.sections=[]], ["missing roads",r=>r.sections=[{}]], ["empty roads",r=>r.sections[0].roads=[]],
  ["missing vertices",r=>delete r.sections[0].roads[0].vertexes], ["empty vertices",r=>r.sections[0].roads[0].vertexes=[]], ["odd vertices",r=>r.sections[0].roads[0].vertexes=[128.68,35.22,128.69]],
  ["blank vertex",r=>r.sections[0].roads[0].vertexes[0]=""], ["invalid vertex",r=>r.sections[0].roads[0].vertexes[1]=Infinity], ["out-of-range vertex",r=>r.sections[0].roads[0].vertexes[1]=95],
])test(`${name} is unavailable, not a fabricated confirmed route`,async()=>{
  const body=valid();change(body.routes[0]);const result=await run(body);assert.equal(result.alternative,null);assert.equal(result.provider.state,"error");
});
for(const body of [{},null,{routes:[]},{routes:[null]}])test(`malformed response ${JSON.stringify(body)} is not a verified empty result`,async()=>{
  const result=await run(body);assert.equal(result.alternative,null);assert.equal(result.provider.state,"error");
});
for(const toll of [undefined,null,"",-1,NaN])test(`invalid optional toll ${String(toll)} stays unknown without losing a valid route`,async()=>{
  const body=valid();body.routes[0].summary.fare.toll=toll;const result=await run(body);assert.equal(result.alternative.payment,null);assert.equal(result.provider.state,"connected");
});
for(const [name,vertices] of [
  ["null island",[0,0,0.1,0.1]], ["outside service area",[139.7,35.6,139.8,35.7]],
  ["unrelated domestic journey",[127,37.5,127.01,37.51]],
  ["reversed journey",[128.692,35.2384,128.6819,35.2281]],
])test(`${name} cannot confirm the requested journey`,async()=>{
  const body=valid();body.routes[0].sections[0].roads[0].vertexes=vertices;
  const result=await run(body);assert.equal(result.alternative,null);assert.equal(result.provider.state,"error");
});
for(const status of [401,403,429,503])test(`HTTP ${status} does not publish a route`,async()=>{const result=await run(valid(),{status});assert.equal(result.alternative,null);assert.equal(result.provider.state,"error");});
test("timeout and invalid JSON remain recoverable provider errors",async()=>{for(const options of [{throwRequest:true},{invalidJson:true}]){const result=await run(valid(),options);assert.equal(result.alternative,null);assert.equal(result.provider.state,"error");}});

async function api(body){
  const compile=path=>ts.transpileModule(readFileSync(new URL(path,import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const utils={exports:{}};new Function("module","exports",compile("../server/transport/route-utils.ts"))(utils,utils.exports);
  const mod={exports:{}};
  const dependencies={
    "./kakao-route":{fetchKakaoRoute:()=>run(body)},"./odsay":{fetchOdsayRoutes:async()=>({routes:[],provider:null})},
    "./public-context":{fetchTransportContext:async()=>({providers:[{id:"kakao-drive",configured:true,state:"ready"}],context:{}})},
    "./route-utils":utils.exports,"./health":{},"../shared/observability":{recordOperationalEvent(){}},
    "../shared/http":{json:(value,status)=>new Response(JSON.stringify(value),{status})},
  };
  new Function("module","exports","require",compile("../server/transport/handler.ts"))(mod,mod.exports,name=>{if(name in dependencies)return dependencies[name];throw Error(name);});
  const response=await mod.exports.handleRouteApi(new Request("https://example.test/api/route?startLat=35.228&startLng=128.6818&endLat=35.2385&endLng=128.6921"),{});
  return response.json();
}
test("API composition exposes a confirmed road only for a verified provider route",async()=>{
  const result=await api(valid());assert.equal(result.configured,true);assert.equal(result.alternatives.length,1);assert.equal(result.alternatives[0].mode,"car");assert.equal(result.providers[0].state,"connected");
});
for(const body of [{routes:[{result_code:1}]},{routes:[{result_code:0}]},{routes:[{}]}])test(`API composition keeps ${JSON.stringify(body)} as an unconfirmed preview`,async()=>{
  const result=await api(body);assert.equal(result.configured,false);assert.equal(result.alternatives.length,1);assert.equal(result.alternatives[0].configured,false);assert.equal(result.alternatives[0].mode,"preview");assert.notEqual(result.providers[0].state,"connected");
});
