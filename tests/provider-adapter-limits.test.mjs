import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import ts from "typescript";
import holdPolicy from "../.github/automation/provider-hold.cjs";
import {assertProviderAvailable,ProviderBlocked} from "../scripts/provider-smoke-policy.mjs";
const root=fileURLToPath(new URL("../",import.meta.url));
// Real adapter modules with one private fixture transport; no live API requests.
function loadServer(fetchFixture) {
  const cache=new Map();
  function load(name) {
    let file=resolve(root,name);if(!existsSync(file))file+=".ts";
    if(cache.has(file))return cache.get(file).exports;
    const mod={exports:{}};cache.set(file,mod);
    const code=ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    new Function("module","exports","require","fetch",code)(mod,mod.exports,specifier=>{
      if(!specifier.startsWith("."))throw Error("Unexpected dependency");
      return load(resolve(dirname(file),specifier));
    },fetchFixture);
    return mod.exports;
  }
  return load;
}
const env={TOUR_API_SERVICE_KEY_ENCODED:"fixture-only",TAGO_API_KEY:"fixture-only",KAKAO_REST_API_KEY:"fixture-only",ODSAY_API_KEY:"fixture-only",EXPRESSWAY_API_KEY:"fixture-only"};
const scenarios=[
  ["kto",load=>load("server/shared/tourism-provider.ts").fetchTourismData(env,"KorService2","areaBasedList2",{})],
  ["tago",load=>load("server/shared/public-transport-provider.ts").fetchPublicTransportData(env,"tago","https://apis.data.go.kr/1613000/TrainInfo","GetCtyCodeList")],
  ["odsay",async load=>(await load("server/transport/odsay.ts").fetchOdsayRoutes(env,35.21,128.67,35.24,128.70)).provider],
  ["kakao-mobility",async load=>(await load("server/transport/kakao-route.ts").fetchKakaoRoute(env,35.21,128.67,35.24,128.70)).provider],
  ["expressway",load=>load("server/tourism/expressway-rests.ts").fetchThemeRests(env)],
  ["water-travel",load=>load("server/tourism/water-travel.ts").fetchWaterTravel(env,"01")],
  ["open-meteo",async load=>(await load("server/weather/handler.ts").handleWeatherApi(new Request("https://example.test/api/weather?region=Changwon"))).json()],
  ["kakao-local",async load=>(await load("server/location/handler.ts").handleLocationSearch(new Request("https://example.test/api/location?q=Changwon"),env)).json()],
];
for(const [provider,invoke] of scenarios)test(`${provider} exposes a safe 429 classification and stops warm-instance repeat calls`,async()=>{
  let calls=0;
  const load=loadServer(async()=>{calls++;return new Response(JSON.stringify({message:"private-sentinel",error:"private-sentinel"}),{status:429,headers:{"Retry-After":"90"}});});
  const call=async()=>{try{return await invoke(load);}catch(error){return error;}};
  for(let i=0;i<2;i++){
    const result=await call();assert.equal(result.failure?.kind,"rate_limited",provider);
    assert.equal(result.failure.provider,provider);assert.equal(result.failure.retryAfterMs,90000);
    assert.equal(result.failure.resetAt,null);assert.notEqual(result.state,"ready");assert.notEqual(result.state,"connected");
    assert.doesNotMatch(JSON.stringify(result),/private-sentinel|fixture-only|serviceKey|Authorization/);
  }
  assert.equal(calls,1);
});
test("ODsay array-form explicit quota is unavailable while documented no-path stays empty",async()=>{
  for(const [body,kind,state] of [
    [{error:[{code:"500",message:"Daily call limit exceeded"}]},"quota_exhausted","error"],
    [{error:[{code:"500",message:"[ApiKeyAuthFailed] secret-sentinel"}]},"auth_error","error"],
    [{error:[{code:"3",msg:"No route"}]},undefined,"ready"],
  ]){
    const load=loadServer(async()=>Response.json(body));
    const result=await load("server/transport/odsay.ts").fetchOdsayRoutes(env,35.21,128.67,35.24,128.70);
    assert.equal(result.provider.state,state);assert.equal(result.provider.failure?.kind,kind);assert.deepEqual(result.routes,[]);
    assert.doesNotMatch(JSON.stringify(result),/secret-sentinel/);
  }
});

test("a failed district is retained alongside verified places instead of a complete live status",async()=>{
  const load=loadServer(async url=>new URL(url).searchParams.get("lDongSignguCd")==="A"
    ? Response.json({response:{header:{resultCode:"0000"},body:{items:{item:[{contentid:"verified-1",title:"Verified place"}]},totalCount:1}}})
    : Response.json({resultCode:"22",resultMsg:"private-sentinel"}));
  const result=await load("server/shared/tourism-provider.ts").fetchRegionalList(env,"KorService2","areaBasedList2",{},["A","B"]);
  assert.equal(result.ok,true);assert.equal(result.value.items[0].contentid,"verified-1");
  assert.equal(result.value.partial,true);assert.equal(result.value.failures[0].kind,"quota_exhausted");
  const status=load("server/tourism/provider-model.ts").apiStatus("tour","Tourism","Places",result);
  assert.equal(status.state,"error");assert.equal(status.count,1);assert.equal(status.partial,true);
  assert.doesNotMatch(JSON.stringify(status),/private-sentinel|fixture-only|실시간 응답 반영/);
});

test("partial theme/detail aggregation retains deduplicated restrictions without mutating records",()=>{
  const load=loadServer(()=>assert.fail("Aggregation must not call a provider"));
  const {combineProviderResults}=load("server/shared/provider-attempt.ts");
  const failure={provider:"kto",operation:"detailWithTour2",kind:"quota_exhausted"};
  const items=[{contentid:"1"}];
  const attempts=[{ok:true,value:{items,total:1,partial:true,failures:[failure]}},{ok:false,error:"Unavailable",failure}];
  const before=JSON.stringify({items,attempts});
  const result=combineProviderResults(items,attempts);
  assert.equal(result.partial,true);assert.equal(result.total,1);assert.deepEqual(result.failures,[failure]);
  assert.equal(JSON.stringify({items,attempts}),before);
  assert.deepEqual(combineProviderResults([], [{ok:true,value:{items:[],total:0}}]),{items:[],total:0});
});

test("mixed and nested unknown attempts retain records and triage evidence while quota still stops smoke",async()=>{
  const load=loadServer(()=>assert.fail("Aggregation must not call a provider"));
  const {combineProviderResults,attemptProvider}=load("server/shared/provider-attempt.ts");
  const {apiStatus}=load("server/tourism/provider-model.ts");
  const failure={provider:"kto",operation:"KorWithService2/detailWithTour2",kind:"quota_exhausted"};
  const items=[{contentid:"verified-1",title:"Verified record"}];
  const good={ok:true,value:{items,total:1}};
  const quota={ok:false,error:"Quota",failure};
  const overBudget={ok:false,error:"예산 시간 안에 확인하지 못했습니다."};
  const ordinary=await attemptProvider(Promise.reject(new Error("PRIVATE_SENTINEL")));
  const nested={ok:true,value:combineProviderResults(items,[good,overBudget])};
  for(const unknown of [overBudget,ordinary,nested,{ok:true,value:{items,total:1,partial:true,failures:[]}}]) {
    const attempts=[good,quota,unknown]; const before=JSON.stringify(attempts);
    const combined=combineProviderResults(items,attempts);
    const status=apiStatus("tour","Tourism","Places",{ok:true,value:combined});
    assert.equal(combined.unclassifiedFailure,true);
    assert.equal(status.unclassifiedFailure,true);
    assert.equal(status.state,"error");assert.equal(status.partial,true);assert.equal(status.count,1);
    assert.deepEqual(combined.items,items);assert.deepEqual(combined.failures,[failure]);
    assert.equal(JSON.stringify(attempts),before);
    assert.doesNotMatch(JSON.stringify(status),/PRIVATE_SENTINEL|예산 시간 안에/);
    assert.deepEqual(holdPolicy.providerRestrictions({statuses:[status]}),[],"mixed is not provider-only evidence");
    assert.throws(()=>assertProviderAvailable({statuses:[status]}),error=>error instanceof ProviderBlocked && error.engineeringRequired===true && error.failures.length===1);
    const twice=combineProviderResults(items,[{ok:true,value:combined},quota]);
    assert.equal(twice.unclassifiedFailure,true,"nested mixed metadata must survive further aggregation");
  }
  const pure=apiStatus("tour","Tourism","Places",{ok:true,value:combineProviderResults(items,[good,quota])});
  assert.equal(pure.unclassifiedFailure,undefined);
  assert.equal(holdPolicy.providerRestrictions({statuses:[pure]}).length,1);
  assert.throws(()=>assertProviderAvailable({statuses:[pure]}),error=>error instanceof ProviderBlocked && error.engineeringRequired===false);
  const unknownOnly=apiStatus("tour","Tourism","Places",{ok:true,value:combineProviderResults(items,[good,overBudget])});
  assert.equal(unknownOnly.state,"error");assert.equal(unknownOnly.unclassifiedFailure,true);
  assert.deepEqual(holdPolicy.providerRestrictions({statuses:[unknownOnly]}),[]);
  assert.doesNotThrow(()=>assertProviderAvailable({statuses:[unknownOnly]}),"ordinary success predicates still reject an error, without a fabricated provider restriction");
});

test("all-failed district/theme aggregation preserves every cause instead of returning only the first quota",async()=>{
  const load=loadServer(async url=>new URL(url).searchParams.get("lDongSignguCd")==="A"
    ? Response.json({resultCode:"22",resultMsg:"PRIVATE_SENTINEL"})
    : new Response("PRIVATE_SENTINEL",{status:200}));
  const regional=await load("server/shared/tourism-provider.ts").fetchRegionalList(env,"KorService2","areaBasedList2",{},["A","B"]);
  assert.equal(regional.ok,false);
  assert.deepEqual(regional.failures.map(f=>f.kind).sort(),["malformed_response","quota_exhausted"]);
  const {combineFailedProviderAttempts}=load("server/shared/provider-attempt.ts");
  const combined=combineFailedProviderAttempts([regional,{ok:false,error:"예산 시간 안에 확인하지 못했습니다."}]);
  const status=load("server/tourism/provider-model.ts").apiStatus("tour","Tourism","Places",combined);
  assert.equal(status.state,"error");assert.equal(status.count,0);assert.equal(status.unclassifiedFailure,true);
  assert.deepEqual(status.failures,regional.failures);
  assert.doesNotMatch(JSON.stringify(status),/PRIVATE_SENTINEL|fixture-only/);
  assert.deepEqual(holdPolicy.providerRestrictions({statuses:[status]}),[]);
  assert.throws(()=>assertProviderAvailable({statuses:[status]}),error=>error instanceof ProviderBlocked && error.engineeringRequired);
  assert.match(readFileSync(new URL("../server/tourism/plan-builder.ts",import.meta.url),"utf8"),/if \(!successes.length\) return combineFailedProviderAttempts\(results\)/);
});
