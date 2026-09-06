import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Execute the actual hook with controlled SDK callbacks and a deterministic hook clock.
function fixture() {
  const slots = [], cleanups = [], timers = new Map(), requests = [], markers = [];
  let cursor = 0, timerId = 0, locale = "ko", disposed = false, lateWrites = 0;
  const hooks = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === "function" ? value() : value;
      return [slots[i], (next) => { if (disposed) lateWrites++; slots[i] = typeof next === "function" ? next(slots[i]) : next; }]; },
    useCallback(callback, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((v,j) => v !== old.deps[j])) slots[i] = { callback, deps }; return slots[i].callback; },
    useEffect(callback, deps) { const i = cursor++, old = slots[i]; if (!old || deps.some((v,j) => v !== old.deps[j])) { old?.cleanup?.(); slots[i] = { deps, cleanup: callback() }; cleanups[i] = () => slots[i].cleanup?.(); } },
  };
  const map = { getCenter: () => ({ lat: 35.2, lng: 128.6 }) }, mapRef = { current: map };
  let throwSearch = false;
  const window = { setTimeout(callback) { const id = ++timerId; timers.set(id,callback); return id; }, clearTimeout(id) { timers.delete(id); },
    kakao: { maps: {
      services: { Status: { OK: "OK", ZERO_RESULT: "ZERO_RESULT", ERROR: "ERROR" }, SortBy: { DISTANCE: "distance" },
        Places: class { categorySearch(code,callback) { if(throwSearch) throw Error("provider failed"); requests.push({code,callback}); } keywordSearch(code,callback) { this.categorySearch(code,callback); } } },
      LatLng: class { constructor(lat,lng) { this.lat=lat; this.lng=lng; } },
      Marker: class { constructor(options) { this.map=options.map; this.title=options.title; markers.push(this); } setMap(value) { this.map=value; } },
    } } };
  const cache = new Map();
  function load(url) {
    if(cache.has(url.href))return cache.get(url.href);
    const source=readFileSync(url,"utf8"), mod={exports:{}}; cache.set(url.href,mod.exports);
    const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const require=(name)=>{
      if(name==="react")return hooks;
      if(name==="../../components/SitePreferences")return {useSitePreferences:()=>({locale})};
      if(name.startsWith("./"))return load(new URL(name+".ts",url));
      throw Error(`Unexpected hook dependency ${name}`);
    };
    new Function("module","exports","require","window",compiled)(mod,mod.exports,require,window);
    return mod.exports;
  }
  const {useNearbyPlaces:renderNearby}=load(new URL("../features/routing/useNearbyPlaces.ts",import.meta.url));
  const actions=()=>{cursor=0; return renderNearby({kakaoMapRef:mapRef,choosePlace:()=>undefined});};
  return {actions,requests,markers,mapRef, setLocale(value){locale=value;}, throwSearch(){throwSearch=true;},
    expire(){const pending=[...timers.values()];timers.clear();pending.forEach(callback=>callback());},
    unmount(){cleanups.forEach(cleanup=>cleanup?.());disposed=true;}, lateWrites:()=>lateWrites};
}
const food={id:"food",label:"음식점",icon:"",code:"FD6"}, stay={id:"stay",label:"숙박",icon:"",code:"AD5"};
const place=(name="식당")=>({id:name,place_name:name,address_name:"경남 창원",road_address_name:"",x:"128.6",y:"35.2",distance:"125",place_url:"https://place.map.kakao.com/123"});

test("valid nearby results still render places and markers",()=>{
  const f=fixture();f.actions().searchNearby(food);f.requests[0].callback([place()],"OK");
  assert.equal(f.actions().categoryPlaces[0].place_name,"식당");assert.equal(f.markers.length,1);
});
test("ZERO_RESULT is a successful empty query without invented places",()=>{
  const f=fixture();f.actions().searchNearby(food);f.requests[0].callback([],"ZERO_RESULT");
  assert.deepEqual(f.actions().categoryPlaces,[]);assert.equal(f.markers.length,0);assert.match(f.actions().categoryMessage,/결과.*없|찾지 못/);
});
test("provider errors are not labelled as zero search results",()=>{
  const f=fixture();f.actions().searchNearby(food);f.requests[0].callback([],"ERROR");
  assert.match(f.actions().categoryMessage,/불러오지 못|다시 시도/);assert.doesNotMatch(f.actions().categoryMessage,/결과.*없|찾지 못/);
});
test("a previous category response cannot overwrite the current category",()=>{
  const f=fixture();f.actions().searchNearby(food);f.actions().searchNearby(stay);
  f.requests[1].callback([place("숙박소")],"OK");f.requests[0].callback([place("식당")],"OK");
  assert.equal(f.actions().activeCategory,"stay");assert.deepEqual(f.actions().categoryPlaces.map(p=>p.place_name),["숙박소"]);
  assert.deepEqual(f.markers.filter(m=>m.map).map(m=>m.title),["숙박소"]);
});
test("clearing the failed map invalidates a pending nearby response",()=>{
  const f=fixture();f.actions().searchNearby(food);f.actions().clearCategoryMarkers();f.mapRef.current=null;
  f.requests[0].callback([place()],"OK");assert.deepEqual(f.actions().categoryPlaces,[]);assert.equal(f.markers.filter(m=>m.map).length,0);
});
test("unmount removes markers and pending callbacks cannot write again",()=>{
  const f=fixture();f.actions().searchNearby(food);f.requests[0].callback([place()],"OK");f.actions().searchNearby(stay);f.unmount();
  f.requests[1].callback([place("숙박소")],"OK");assert.equal(f.markers.filter(m=>m.map).length,0);assert.equal(f.lateWrites(),0);
});
test("blank coordinates cannot turn into a selectable zero-zero place",()=>{
  const f=fixture();f.actions().searchNearby(food);f.requests[0].callback([{...place(),x:"",y:" "}],"OK");
  assert.deepEqual(f.actions().categoryPlaces,[]);assert.equal(f.markers.length,0);assert.match(f.actions().categoryMessage,/불러오지 못|확인할 수 없/);
});
test("a synchronous SDK failure is contained as a retryable query error",()=>{
  const f=fixture();f.throwSearch();assert.doesNotThrow(()=>f.actions().searchNearby(food));assert.match(f.actions().categoryMessage,/불러오지 못|다시 시도/);
});
test("a missing SDK callback cannot leave the query loading forever",()=>{
  const f=fixture();f.actions().searchNearby(food);f.expire();assert.match(f.actions().categoryMessage,/불러오지 못|다시 시도/);
});
test("explicit retry keeps one request in flight and ignores the timed-out callback",()=>{
  const f=fixture();f.actions().searchNearby(food);f.expire();f.actions().retryNearby();f.actions().retryNearby();
  assert.equal(f.requests.length,2);f.requests[0].callback([place("오래된 식당")],"OK");assert.deepEqual(f.actions().categoryPlaces,[]);
  f.requests[1].callback([place("현재 식당")],"OK");assert.equal(f.actions().categoryPlaces[0].place_name,"현재 식당");
  f.actions().retryNearby();assert.equal(f.requests.length,3);
});
test("closing the panel clears selection and prevents the old response from returning",()=>{
  const f=fixture();f.actions().searchNearby(food);f.actions().cancelNearby();f.requests[0].callback([place()],"OK");
  assert.equal(f.actions().activeCategory,null);assert.equal(f.actions().categoryMessage,"");assert.deepEqual(f.actions().categoryPlaces,[]);assert.equal(f.markers.length,0);
});
test("a malformed payload is an error while a mixed response explains omitted records",()=>{
  const f=fixture();f.actions().searchNearby(food);f.requests[0].callback({places:[]},"OK");assert.equal(f.actions().categoryState,"error");
  f.actions().retryNearby();f.requests[1].callback([place(),{...place("잘못된 좌표"),x:"181"}],"OK");
  assert.equal(f.actions().categoryPlaces.length,1);assert.match(f.actions().categoryMessage,/일부.*제외/);assert.equal(f.markers.length,1);
});
test("the result count and markers include all fifteen returned places",()=>{
  const f=fixture();f.actions().searchNearby(food);f.requests[0].callback(Array.from({length:15},(_,i)=>place(`장소${i}`)),"OK");
  assert.equal(f.actions().categoryPlaces.length,15);assert.equal(f.markers.length,15);assert.match(f.actions().categoryMessage,/15곳/);
});
test("unsafe external links and invalid distances cannot become actionable provider data",()=>{
  const f=fixture();f.actions().searchNearby(food);f.requests[0].callback([{...place(),place_url:"javascript:alert(1)",distance:"NaN"}],"OK");
  assert.equal(f.actions().categoryPlaces[0].place_url,"");assert.equal(f.actions().categoryPlaces[0].distance,"");
});
test("zero coordinates and distance remain real values when explicitly supplied",()=>{
  const f=fixture();f.actions().searchNearby(food);f.requests[0].callback([{...place(),x:"0",y:"0",distance:"0",place_url:"http://place.map.kakao.com/123"}],"OK");
  assert.equal(f.actions().categoryPlaces[0].distance,"0");assert.equal(f.actions().categoryPlaces[0].place_url,"https://place.map.kakao.com/123");
});
test("language changes translate pending and failed query states without another request",()=>{
  const f=fixture();f.actions().searchNearby(food);f.setLocale("en");assert.match(f.actions().categoryMessage,/Searching for restaurants/);
  f.requests[0].callback([],"ERROR");assert.match(f.actions().categoryMessage,/could not be loaded/);assert.doesNotMatch(f.actions().categoryMessage,/[가-힣]/);assert.equal(f.requests.length,1);
});
