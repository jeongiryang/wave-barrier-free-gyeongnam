import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

function fixture({ strict = false, fail = false } = {}) {
  const slots = [], calls = []; let cursor = 0;
  let failure = fail ? "all" : "none";
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], (next) => { if (strict && typeof next === "function") next(slots[index]); slots[index] = typeof next === "function" ? next(slots[index]) : next; }]; },
    useRef(initial) { const index=cursor++;return slots[index]??(slots[index]={current:initial}); },
    useCallback(fn) { cursor++;return fn; },
  };
  const sdk = { MapTypeId: { ROADMAP: 1, HYBRID: 3, TRAFFIC: 4, TERRAIN: 5, BICYCLE: 6, USE_DISTRICT: 8 } };
  const map = { setMapTypeId(id) { if(["all","base"].includes(failure))throw Error("controlled SDK failure");calls.push(["base",id]); }, addOverlayMapTypeId(id) { if(["all","layer"].includes(failure))throw Error("controlled SDK failure");calls.push(["add",id]); }, removeOverlayMapTypeId(id) { if(["all","layer"].includes(failure))throw Error("controlled SDK failure");calls.push(["remove",id]); } };
  const ref={current:map};
  const source=readFileSync(new URL("../features/routing/useMapLayers.ts",import.meta.url),"utf8");
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}};
  new Function("module","exports","require","window",code)(mod,mod.exports,(name)=>{if(name==="react")return hooks;throw Error(`Unexpected runtime dependency ${name}`);},{kakao:{maps:sdk}});
  const {useMapLayers:renderLayers}=mod.exports;
  const actions=()=>{cursor=0;return renderLayers(ref);};
  return {actions,calls,ref,setFailure(value){failure=value;},replaceMap(){ref.current={...map};}};
}

test("normal layer selection agrees with the SDK",()=>{
  const f=fixture();f.actions().toggleLayer("TRAFFIC");assert.deepEqual(f.actions().activeLayers,["TRAFFIC"]);assert.deepEqual(f.calls,[["add",4]]);
  f.actions().toggleLayer("TRAFFIC");assert.deepEqual(f.actions().activeLayers,[]);assert.deepEqual(f.calls,[["add",4],["remove",4]]);
});
test("React updater replay cannot repeat SDK mutations",()=>{
  const f=fixture({strict:true});f.actions().toggleLayer("TRAFFIC");assert.deepEqual(f.calls,[["add",4]]);
});
test("a provider layer exception does not crash the event or claim selection",()=>{
  const f=fixture({fail:true});assert.doesNotThrow(()=>f.actions().toggleLayer("TRAFFIC"));assert.deepEqual(f.actions().activeLayers,[]);
});
test("a provider base-map exception does not claim skyview",()=>{
  const f=fixture({fail:true});assert.doesNotThrow(()=>f.actions().changeBaseMap("skyview"));assert.equal(f.actions().baseMap,"roadmap");
});

test("two rapid layer actions use the last committed SDK choice",()=>{
  const f=fixture(),actions=f.actions();actions.toggleLayer("TRAFFIC");actions.toggleLayer("TRAFFIC");
  assert.deepEqual(f.actions().activeLayers,[]);assert.deepEqual(f.calls,[["add",4],["remove",4]]);
});
test("a replacement map reapplies confirmed choices once even if notified twice",()=>{
  const f=fixture();f.actions().changeBaseMap("skyview");f.actions().toggleLayer("TRAFFIC");f.calls.length=0;f.replaceMap();
  f.actions().restoreMapLayers();f.actions().restoreMapLayers();
  assert.deepEqual(f.calls,[["base",3],["add",4]]);assert.equal(f.actions().baseMap,"skyview");assert.deepEqual(f.actions().activeLayers,["TRAFFIC"]);
});
test("partial map restoration exposes only applied layers and retains the requested retry",()=>{
  const f=fixture();f.actions().changeBaseMap("skyview");f.actions().toggleLayer("TRAFFIC");f.setFailure("layer");f.replaceMap();f.actions().restoreMapLayers();
  assert.equal(f.actions().baseMap,"skyview");assert.deepEqual(f.actions().activeLayers,[]);assert.equal(f.actions().layerError,true);
  f.setFailure("none");f.replaceMap();f.actions().restoreMapLayers();
  assert.deepEqual(f.actions().activeLayers,["TRAFFIC"]);assert.equal(f.actions().layerError,false);assert.equal(f.actions().layerRecovery,true);
});

test("an alternative or failed map clears applied labels but retains choices for reconnection",()=>{
  const f=fixture();f.actions().changeBaseMap("skyview");f.actions().toggleLayer("TRAFFIC");
  f.actions().clearAppliedMapLayers();
  assert.equal(f.actions().baseMap,"roadmap");assert.deepEqual(f.actions().activeLayers,[]);
  f.replaceMap();f.actions().restoreMapLayers();
  assert.equal(f.actions().baseMap,"skyview");assert.deepEqual(f.actions().activeLayers,["TRAFFIC"]);
});

for (const first of ["base", "layer"]) test(`a failed ${first} choice survives a successful independent change before reconnection`,()=>{
  const f=fixture();f.setFailure(first);
  if(first==="base") { f.actions().changeBaseMap("skyview");f.actions().toggleLayer("TRAFFIC");assert.equal(f.actions().baseMap,"roadmap");assert.deepEqual(f.actions().activeLayers,["TRAFFIC"]); }
  else { f.actions().toggleLayer("TRAFFIC");f.actions().changeBaseMap("skyview");assert.equal(f.actions().baseMap,"skyview");assert.deepEqual(f.actions().activeLayers,[]); }
  assert.equal(f.actions().layerError,true);
  f.setFailure("none");f.replaceMap();f.actions().restoreMapLayers();
  assert.equal(f.actions().baseMap,"skyview");assert.deepEqual(f.actions().activeLayers,["TRAFFIC"]);assert.equal(f.actions().layerError,false);
});

test("retrying an unapplied layer neither cancels nor duplicates its pending selection",()=>{
  const f=fixture();f.setFailure("layer");f.actions().toggleLayer("TRAFFIC");f.actions().toggleLayer("TRAFFIC");
  assert.deepEqual(f.actions().activeLayers,[]);f.setFailure("none");f.replaceMap();f.actions().restoreMapLayers();
  assert.deepEqual(f.actions().activeLayers,["TRAFFIC"]);assert.equal(f.calls.filter(([kind])=>kind==="add").length,1);
});
