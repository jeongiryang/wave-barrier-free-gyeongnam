import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

function fixture() {
  const slots=[],effects=[],cleanups=[],frames=[],timers=new Map(),requests=[],views=[];
  let cursor=0,timerId=0,locale="ko",failure="",disposed=false,lateWrites=0;
  const hooks={
    useRef(value){const i=cursor++;return slots[i]??={current:value};},
    useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return [slots[i],next=>{if(disposed)lateWrites++;slots[i]=typeof next==="function"?next(slots[i]):next;}];},
    useCallback(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j]))slots[i]={fn,deps};return slots[i].fn;},
    useEffect(fn,deps){const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>v!==old.deps[j])){slots[i]={deps};effects.push(()=>{cleanups[i]?.();cleanups[i]=fn();});}},
  };
  const window={requestAnimationFrame(fn){frames.push(fn);return frames.length;},cancelAnimationFrame(){},setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);},kakao:{maps:{
    LatLng:class{},Roadview:class{constructor(){if(failure==="construct")throw Error("controlled");this.listeners=new Set();views.push(this);}setPanoId(id){if(failure==="pano")throw Error("controlled");this.pano=id;}relayout(){}},
    RoadviewClient:class{getNearestPanoId(_p,_r,callback){if(failure==="search")throw Error("controlled");requests.push(callback);}},
    event:{addListener(view,_event,fn){view.listeners.add(fn);},removeListener(view,_event,fn){view.listeners.delete(fn);}},
  }}};
  const mod={exports:{}},code=ts.transpileModule(readFileSync(new URL("../features/routing/useRoadviewController.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function("module","exports","require","window",code)(mod,mod.exports,name=>{if(name==="react")return hooks;if(name==="../../components/SitePreferences")return {useSitePreferences:()=>({locale})};throw Error(name);},window);
  const options={provider:"kakao",setProviderDetail(){},setPickMode(){},setToolPanel(){}};
  const actions=()=>{cursor=0;return mod.exports.useRoadviewController(options);};
  const commit=()=>{const a=actions();a.roadviewRef.current=a.roadviewOpen?{replaceChildren(){}}:null;effects.splice(0).forEach(fn=>fn());frames.splice(0).forEach(fn=>fn());return actions();};
  const open=()=>{actions().openRoadviewAt({lat:35.2,lng:128.6});return commit();};
  commit();
  return {actions,commit,open,requests,views,setFailure(v){failure=v;},setLocale(v){locale=v;},expire(){const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());},init(index=views.length-1){views[index].listeners.forEach(fn=>fn());},unmount(){cleanups.forEach(fn=>fn?.());disposed=true;},lateWrites:()=>lateWrites};
}

for(const kind of ["construct","search","pano"])test(`Roadview ${kind} exceptions become recoverable errors`,()=>{
  const f=fixture();f.setFailure(kind);assert.doesNotThrow(()=>{f.open();if(kind==="pano")f.requests[0](1);});
  assert.match(f.actions().roadviewMessage,/불러오지 못|다시 시도/);
});
test("a nearest panorama response is not yet an initialized view",()=>{
  const f=fixture();f.open();f.requests[0](1);assert.notEqual(f.actions().roadviewMessage,"");f.init();assert.equal(f.actions().roadviewMessage,"");
});
test("missing callbacks reach an error and late responses cannot revive the view",()=>{
  const f=fixture();f.open();f.expire();assert.match(f.actions().roadviewMessage,/불러오지 못|다시 시도/);f.requests[0](1);assert.equal(f.views[0].pano,undefined);
});
test("close and unmount invalidate pending SDK responses",()=>{
  const f=fixture();f.open();f.actions().closeRoadview();f.commit();f.requests[0](1);assert.equal(f.views[0].pano,undefined);
  f.open();f.unmount();f.requests[1](2);assert.equal(f.views[1].pano,undefined);assert.equal(f.lateWrites(),0);
});
test("an older response cannot replace a newer request",()=>{
  const f=fixture();f.open();f.open();f.requests[1](2);f.init();f.requests[0](null);assert.equal(f.actions().roadviewMessage,"");
});
test("empty results and locale changes do not start another request",()=>{
  const f=fixture();f.open();f.requests[0](null);assert.match(f.actions().roadviewMessage,/1km.*없/);const open=f.actions().openRoadviewAt;
  f.setLocale("en");f.commit();assert.match(f.actions().roadviewMessage,/No.*1 km/);assert.equal(f.requests.length,1);assert.equal(f.actions().openRoadviewAt,open);
});
test("panorama lookup without init still reaches the deadline",()=>{
  const f=fixture();f.open();f.requests[0](1);f.expire();assert.match(f.actions().roadviewMessage,/불러오지 못/);f.init();assert.match(f.actions().roadviewMessage,/불러오지 못/);
});
test("duplicate callbacks cannot change a panorama already being initialized",()=>{
  const f=fixture();f.open();f.requests[0](1);f.requests[0](2);assert.equal(f.views[0].pano,1);f.init();assert.equal(f.actions().roadviewMessage,"");
});
test("init before the requested panorama is applied cannot report success",()=>{
  const f=fixture();f.open();f.init();assert.notEqual(f.actions().roadviewMessage,"");f.setFailure("pano");f.requests[0](1);assert.match(f.actions().roadviewMessage,/불러오지 못/);
});
