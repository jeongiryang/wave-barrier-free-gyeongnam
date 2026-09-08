import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import test from "node:test";
import ts from "typescript";
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
